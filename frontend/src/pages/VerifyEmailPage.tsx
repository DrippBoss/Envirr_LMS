import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../context/AuthContext";

type Stage =
  | "checking"   // GET in progress — validating token
  | "ready"      // token valid — waiting for user to click Confirm
  | "confirming" // POST in progress — activating account
  | "success"    // account activated
  | "error";     // token invalid / expired

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [stage, setStage]     = useState<Stage>("checking");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  // Step 1 — validate token on load (does NOT consume it)
  useEffect(() => {
    if (!token) {
      setStage("error");
      setMessage("No verification token found in the link.");
      return;
    }

    api.get(`auth/verify-email/?token=${token}`)
      .then(() => setStage("ready"))
      .catch(err => {
        setStage("error");
        setMessage(
          err.response?.data?.detail ??
          "This link is invalid or has already been used."
        );
      });
  }, []);

  // Step 2 — user clicks Confirm → POST consumes the token
  const handleConfirm = async () => {
    setStage("confirming");
    try {
      const res = await api.post("auth/verify-email/", { token });
      setStage("success");
      setMessage(res.data.detail);
    } catch (err: any) {
      setStage("error");
      setMessage(
        err.response?.data?.detail ??
        "Verification failed. Please request a new link."
      );
    }
  };

  const iconMap: Record<Stage, { icon: string; color: string; bg: string }> = {
    checking:   { icon: "",              color: "",                bg: "bg-primary/10"   },
    ready:      { icon: "mark_email_read", color: "text-primary",  bg: "bg-primary/10"   },
    confirming: { icon: "",              color: "",                bg: "bg-primary/10"   },
    success:    { icon: "verified",      color: "text-secondary",  bg: "bg-secondary/10" },
    error:      { icon: "error",         color: "text-error",      bg: "bg-error/10"     },
  };

  const meta = iconMap[stage];
  const isSpinning = stage === "checking" || stage === "confirming";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/10 p-10 text-center space-y-6 shadow-nebula">

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${meta.bg}`}>
          {isSpinning ? (
            <span className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin inline-block" />
          ) : (
            <span
              className={`material-symbols-outlined text-3xl ${meta.color}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {meta.icon}
            </span>
          )}
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-xl font-black font-headline text-on-surface">
            {stage === "checking"   && "Checking your link..."}
            {stage === "ready"      && "Confirm your email"}
            {stage === "confirming" && "Activating your account..."}
            {stage === "success"    && "Email verified!"}
            {stage === "error"      && "Verification failed"}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {stage === "ready"
              ? "Your link is valid. Click the button below to activate your account."
              : message}
          </p>
        </div>

        {/* CTA */}
        {stage === "ready" && (
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            Confirm My Email
          </button>
        )}

        {(stage === "success" || stage === "error") && (
          <button
            onClick={() => navigate(stage === "success" ? "/login" : "/")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-on-surface font-black text-sm transition-all"
          >
            {stage === "success" ? "Go to Login" : "Go to Dashboard"}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
