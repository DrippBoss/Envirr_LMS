import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../context/AuthContext";

type Stage =
  | "form"       // waiting for the user to enter a new password
  | "submitting" // POST in progress
  | "success"    // password reset
  | "error";     // token invalid / expired or request failed

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [stage, setStage] = useState<Stage>(uid && token ? "form" : "error");
  const [message, setMessage] = useState(
    uid && token ? "" : "This reset link is invalid or incomplete."
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("New password and confirm password do not match.");
      return;
    }
    setStage("submitting");
    setMessage("");
    try {
      const res = await api.post("auth/password-reset/confirm/", {
        uid,
        token,
        new_password: password,
        confirm_password: confirm,
      });
      setStage("success");
      setMessage(res.data?.detail ?? "Your password has been reset.");
    } catch (err: any) {
      // A bad/expired token is terminal; a weak-password error should let them retry.
      const detail = err.response?.data?.detail ?? "Password reset failed. Please request a new link.";
      const terminal = /invalid|expired|incomplete/i.test(detail);
      setStage(terminal ? "error" : "form");
      setMessage(detail);
    }
  };

  const isSpinning = stage === "submitting";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/10 p-10 space-y-6 shadow-nebula">

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
          stage === "success" ? "bg-secondary/10" : stage === "error" ? "bg-error/10" : "bg-primary/10"
        }`}>
          {isSpinning ? (
            <span className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin inline-block" />
          ) : (
            <span
              className={`material-symbols-outlined text-3xl ${
                stage === "success" ? "text-secondary" : stage === "error" ? "text-error" : "text-primary"
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {stage === "success" ? "verified" : stage === "error" ? "error" : "lock_reset"}
            </span>
          )}
        </div>

        {/* Heading */}
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-black font-headline text-on-surface">
            {stage === "success" ? "Password reset!" : stage === "error" ? "Reset failed" : "Choose a new password"}
          </h1>
          {(stage === "success" || stage === "error" || message) && (
            <p className={`text-sm leading-relaxed ${stage === "error" ? "text-error" : "text-slate-400"}`}>
              {message || "Enter a new password for your account below."}
            </p>
          )}
        </div>

        {/* Form */}
        {(stage === "form" || stage === "submitting") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">lock</span>
              </div>
              <input
                className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                type={showPw ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors"
                onClick={() => setShowPw(!showPw)}
              >
                <span className="material-symbols-outlined text-xl">{showPw ? "visibility" : "visibility_off"}</span>
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">lock</span>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                type={showPw ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSpinning}
              className="w-full py-3.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSpinning
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-secondary-container/30 border-t-on-secondary-container animate-spin" /><span>Resetting...</span></>
                : <><span className="material-symbols-outlined text-lg">lock_reset</span><span>Reset password</span></>
              }
            </button>
          </form>
        )}

        {/* Terminal CTAs */}
        {(stage === "success" || stage === "error") && (
          <button
            onClick={() => navigate("/login")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-on-surface font-black text-sm transition-all"
          >
            Go to Login
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
