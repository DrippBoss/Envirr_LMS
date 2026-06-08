import re

# ── Profanity word list ──────────────────────────────────────────────────────
_PROFANITY: set[str] = {
    # English — core
    "fuck", "fucker", "fucking", "fucked", "fucks", "fck", "fuk",
    "shit", "shitting", "shitty", "shits", "sht",
    "bitch", "bitches", "bitchy", "btch",
    "asshole", "asshat", "ass",
    "bastard", "bastards",
    "cunt", "cunts",
    "dick", "dicks", "dickhead",
    "cock", "cocks",
    "pussy", "pussies",
    "whore", "whores",
    "slut", "sluts",
    "motherfucker", "motherfucking", "mf",
    "nigger", "nigga",
    "faggot", "fag",
    "retard", "retarded",
    "idiot", "moron", "imbecile",
    "damn", "damned",
    "crap",
    "piss", "pissed",
    "bollocks", "wanker", "tosser", "twat",
    "dumbass", "jackass", "dipshit", "douchebag",
    # Hinglish / common Indian slang
    "chutiya", "chutiye", "chut",
    "bhenchod", "bhench0d", "bhen", "bc",
    "madarchod", "madar", "mc",
    "bhosdike", "bhosd",
    "randi", "randwa",
    "harami", "haramzada", "haramkhor",
    "kamine", "kamina",
    "gaandu", "gandu",
    "loda", "lauda", "lund",
    "saala", "sala",
    "bsdk", "mck",
    # Roman Urdu / Punjabi
    "kutta", "kutti",
    "suar", "suarni",
    "haraami",
    "behenchod",
}

# ── Contact info & social platform patterns ──────────────────────────────────
_CONTACT_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Email addresses (handles spaces around @: "user @ domain.com")
    (re.compile(r'\b[A-Za-z0-9._%+\-]+\s*@\s*[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', re.I),
     "email addresses"),

    # Phone numbers — Indian (10-digit 6-9 start) + international
    (re.compile(
        r'(\+91[\s\-.]?)?[6-9]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}'
        r'|\b\d{5}[\s\-.]\d{5}\b'
        r'|\b\d{10}\b'
        r'|\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}',
        re.I),
     "phone numbers"),

    # Instagram
    (re.compile(
        r'instagram\.com|instagr\.am|ig\.me'
        r'|(?<!\w)(insta|ig)(?!\w)'
        r'|my\s+(?:insta|ig)\b'
        r'|follow\s+me\b',
        re.I),
     "Instagram contact info"),

    # Snapchat
    (re.compile(
        r'snapchat\.com|snap\.chat'
        r'|(?<!\w)snap(?!\w)'
        r'|add\s+me\s+on\s+snap'
        r'|snap\s*:\s*\w',
        re.I),
     "Snapchat contact info"),

    # Discord
    (re.compile(
        r'discord\.gg|discord\.com|discordapp\.com'
        r'|(?<!\w)discord(?!\w)'
        r'|discord\s*:\s*\w',
        re.I),
     "Discord contact info"),

    # WhatsApp
    (re.compile(r'wa\.me|whatsapp\.com|(?<!\w)whatsapp(?!\w)|watsapp|wap\s+me', re.I),
     "WhatsApp contact info"),

    # Telegram
    (re.compile(r't\.me/|telegram\.me|(?<!\w)telegram(?!\w)', re.I),
     "Telegram contact info"),

    # Facebook
    (re.compile(r'facebook\.com|fb\.com|fb\.me|(?<!\w)facebook(?!\w)', re.I),
     "Facebook contact info"),

    # Twitter / X
    (re.compile(r'twitter\.com|(?<!\w)twitter(?!\w)|x\.com/[A-Za-z]', re.I),
     "Twitter/X contact info"),

    # LinkedIn
    (re.compile(r'linkedin\.com|(?<!\w)linkedin(?!\w)', re.I),
     "LinkedIn contact info"),

    # Kik
    (re.compile(r'(?<!\w)kik(?!\w)|kik\s*:\s*\w', re.I),
     "Kik contact info"),

    # Signal
    (re.compile(r'signal\.me|signal\.org|(?<!\w)signal\s+me(?!\w)', re.I),
     "Signal contact info"),

    # Reddit
    (re.compile(r'reddit\.com|(?<!\w)u/[A-Za-z0-9_]{3,20}(?!\w)', re.I),
     "Reddit contact info"),

    # TikTok / YouTube
    (re.compile(r'tiktok\.com|youtube\.com|youtu\.be', re.I),
     "social media links"),

    # Generic sharing-intent phrases (platform-independent)
    (re.compile(
        r'\b(?:dm|pm)\s+me\b'
        r'|\badd\s+me\s+on\b'
        r'|\bfind\s+me\s+on\b'
        r'|\btext\s+me\s+(?:on|at)\b'
        r'|\breach\s+me\s+(?:on|at)\b'
        r'|\bhit\s+me\s+up\b'
        r'|\bmessage\s+me\s+on\b'
        r'|\bcontact\s+me\s+(?:on|at)\b',
        re.I),
     "contact-sharing phrases"),

    # Generic URLs (must come last)
    (re.compile(r'https?://|www\.', re.I),
     "URLs"),
]


class ModerationResult:
    def __init__(self, blocked: bool, reason: str = ""):
        self.blocked = blocked
        self.reason  = reason

    def __bool__(self):
        return not self.blocked


def _remove_spaces(text: str) -> str:
    """Collapse single spaces between single characters: 'i n s t a' → 'insta'."""
    return re.sub(r'(?<=[A-Za-z0-9]) (?=[A-Za-z0-9])', '', text)


def _normalise(text: str) -> str:
    """
    Prepare text for profanity matching:
    - Remove inter-character spaces (evasion via spacing)
    - Strip asterisks / common leet-speak substitutions
    - Lowercase and collapse whitespace
    """
    text = _remove_spaces(text)
    # Unmask asterisk-replaced letters: f*ck → fuck, sh*t → shit
    text = re.sub(r'\*', '', text)
    text = text.lower()
    text = text.replace("@", "a").replace("0", "o").replace("1", "i")
    text = text.replace("3", "e").replace("$", "s").replace("!", "i")
    text = text.replace("+", "t").replace("4", "a").replace("5", "s")
    text = text.replace("7", "t").replace("8", "b")
    return re.sub(r'\s+', ' ', text).strip()


def check_message(text: str) -> ModerationResult:
    """
    Returns ModerationResult.blocked=True if the message contains
    profanity or contact information, with a human-readable reason.
    """
    if not text or not text.strip():
        return ModerationResult(blocked=False)

    # 1. De-spaced copy for contact detection too (handles "i n s t a g r a m")
    despaced = _remove_spaces(text)

    # 2. Contact info check (original + de-spaced variants)
    for pattern, label in _CONTACT_PATTERNS:
        if pattern.search(text) or pattern.search(despaced):
            return ModerationResult(
                blocked=True,
                reason=f"Sharing {label} is not allowed in study group chats."
            )

    # 3. Profanity check on fully normalised text
    normalised = _normalise(text)
    words = re.findall(r"[a-z']+", normalised)
    for word in words:
        if word in _PROFANITY:
            return ModerationResult(
                blocked=True,
                reason="Please keep the chat respectful. Abusive language is not allowed."
            )

    return ModerationResult(blocked=False)
