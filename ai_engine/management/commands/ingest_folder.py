"""
Bulk-ingest a folder tree of question papers (.pdf / .docx) into QuestionBank.

Metadata comes from the folder path:
  <root>/<Subject>/<...nested chapter folders...>/file.pdf
  - Subject = first folder under the root
  - Chapter = the nested folders between subject and the file (joined with " — ")
  - Grade / Board = --default-grade / --default-board (AI-detect override with --detect-fallback)

Everything ingested is unverified (is_verified=False) → admin review queue.
PDFs use Groq Vision (handles scanned + diagrams); .docx uses text extraction
(figures inside docx are NOT captured).

Usage (inside Docker, with the folder mounted at /app/question_bank_data):
  docker compose exec web python manage.py ingest_folder --folder /app/question_bank_data --dry-run
  docker compose exec web python manage.py ingest_folder --folder /app/question_bank_data --limit 1
  docker compose exec web python manage.py ingest_folder --folder /app/question_bank_data
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ai_engine import bulk_ingest
from ai_engine.models import SourceDocument, IngestionStatus


class Command(BaseCommand):
    help = "Bulk-ingest a folder of question papers (.pdf/.docx) into the QuestionBank."

    def add_arguments(self, parser):
        parser.add_argument("--folder", required=True, help="Root folder to walk")
        parser.add_argument("--default-grade", default="10", help="Grade when not in the path")
        parser.add_argument("--default-board", default="CBSE", help="Board when not in the path")
        parser.add_argument("--detect-fallback", action="store_true",
                            help="Use AI to detect missing chapter/grade/board per file")
        parser.add_argument("--skip-docx", action="store_true", help="Ingest PDFs only")
        parser.add_argument("--dpi", default=150, type=int, help="PDF render DPI")
        parser.add_argument("--delay", default=5, type=int, help="Seconds between Groq calls")
        parser.add_argument("--limit", default=0, type=int, help="Max files to process (0=all)")
        parser.add_argument("--start-at", default=0, type=int, help="Skip the first N discovered files (resume)")
        parser.add_argument("--reprocess", action="store_true",
                            help="Re-run files already marked done (default: skip them)")
        parser.add_argument("--api-key", default="", help="Groq API key (else GROQ_API_KEY)")
        parser.add_argument("--dry-run", action="store_true",
                            help="List files + derived metadata only — no Groq calls, no DB writes")

    # ── metadata from path ──────────────────────────────────────────────────
    def _meta_from_path(self, root, path, default_grade, default_board):
        rel = os.path.relpath(path, root)
        parts = rel.split(os.sep)
        subject = parts[0] if len(parts) > 1 else "General"
        chapter_parts = parts[1:-1]  # folders between subject and the file
        chapter = " — ".join(chapter_parts) if chapter_parts else ""
        return {"subject": subject, "chapter": chapter or subject,
                "grade": default_grade, "board": default_board,
                "chapter_missing": not chapter_parts}

    def _detect(self, path, client, is_pdf):
        """Best-effort AI metadata detection from the file's text."""
        try:
            text = ""
            if is_pdf:
                import fitz
                doc = fitz.open(path)
                text = "\n".join(p.get_text() for p in doc)[:3000]
                doc.close()
            else:
                from docx import Document
                text = "\n".join(p.text for p in Document(path).paragraphs)[:3000]
            if not text.strip():
                return {}
            prompt = ("Identify the academic details of this document. Return ONLY compact JSON: "
                      '{"subject":"","chapter":"","grade":"","board":""}\n\n' + text)
            resp = client.chat.completions.create(
                model=bulk_ingest.TEXT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=300,
            )
            return bulk_ingest.safe_json(resp.choices[0].message.content) or {}
        except Exception:
            return {}

    def handle(self, *args, **opts):
        root = opts["folder"]
        if not os.path.isdir(root):
            raise CommandError(f"Folder not found: {root}")

        # Discover files (stable order for resume); skip Office temp files (~$).
        files = []
        for dirpath, _dirs, filenames in os.walk(root):
            for fn in sorted(filenames):
                if fn.startswith("~$"):
                    continue
                low = fn.lower()
                if low.endswith(".pdf"):
                    files.append((os.path.join(dirpath, fn), "pdf"))
                elif low.endswith(".docx") and not opts["skip_docx"]:
                    files.append((os.path.join(dirpath, fn), "docx"))
        files.sort()
        if opts["start_at"]:
            files = files[opts["start_at"]:]
        if opts["limit"]:
            files = files[:opts["limit"]]

        if not files:
            self.stdout.write(self.style.WARNING("No .pdf/.docx files found."))
            return

        dry = opts["dry_run"]
        client = None
        if not dry:
            api_key = opts["api_key"] or getattr(settings, "GROQ_API_KEY", "")
            if not api_key:
                raise CommandError("Groq API key required (--api-key or GROQ_API_KEY).")
            from groq import Groq
            client = Groq(api_key=api_key)

        self.stdout.write(f"\nDiscovered {len(files)} file(s) under {root}"
                          + (" — DRY RUN (no Groq, no DB writes)\n" if dry else "\n"))

        totals = {"created": 0, "skipped": 0, "errors": 0, "files": 0, "files_skipped": 0}

        for path, kind in files:
            meta = self._meta_from_path(root, path, opts["default_grade"], opts["default_board"])

            if (opts["detect_fallback"] and not dry and (meta["chapter_missing"] or opts.get("force_detect"))):
                det = self._detect(path, client, kind == "pdf")
                for k in ("subject", "chapter", "grade", "board"):
                    if det.get(k):
                        meta[k] = det[k]

            rel = os.path.relpath(path, root)
            self.stdout.write(self.style.HTTP_INFO(
                f"\n• {rel}\n    → subject={meta['subject']} | chapter={meta['chapter']} "
                f"| grade={meta['grade']} | board={meta['board']} | {kind}"))

            if dry:
                continue

            # Skip files already fully ingested (unless --reprocess).
            try:
                fh = bulk_ingest._file_hash(path)
                existing = SourceDocument.objects.filter(file_hash=fh).first()
                if existing and existing.status == IngestionStatus.DONE and not opts["reprocess"]:
                    self.stdout.write("    already ingested — skipped")
                    totals["files_skipped"] += 1
                    continue
            except Exception:
                pass

            try:
                if kind == "pdf":
                    res = bulk_ingest.ingest_pdf(
                        path, subject=meta["subject"], chapter=meta["chapter"],
                        board=meta["board"], grade=meta["grade"], client=client,
                        dpi=opts["dpi"], delay=opts["delay"], log=lambda m: self.stdout.write(m))
                else:
                    res = bulk_ingest.ingest_docx(
                        path, subject=meta["subject"], chapter=meta["chapter"],
                        board=meta["board"], grade=meta["grade"], client=client,
                        log=lambda m: self.stdout.write(m))
                totals["created"] += res["created"]
                totals["skipped"] += res["skipped"]
                totals["errors"] += res["errors"]
                totals["files"] += 1
                self.stdout.write(f"    ✓ {res['created']} created, {res['skipped']} skipped, {res['errors']} errors")
            except Exception as exc:
                totals["errors"] += 1
                self.stdout.write(self.style.ERROR(f"    file failed: {exc}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Files processed: {totals['files']} "
            f"(skipped {totals['files_skipped']}) | "
            f"Questions created: {totals['created']}, skipped: {totals['skipped']}, errors: {totals['errors']}"
        ))
        if not dry:
            self.stdout.write("Ingested questions are unverified — review them in the admin Question Review Queue.")
