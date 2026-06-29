import { useState } from "react";
import { useAuth, api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useMetadata } from "../lib/metadata";

type Role = "student" | "teacher";

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const meta = useMetadata();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [classGrade, setClassGrade] = useState("");
  const [board, setBoard] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  // Forgot-password modal (#7)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setShowResend(false);
    setResendStatus("");
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await api.post("auth/login/", { username, password });
        window.location.href = "/";
      } else {
        const payload: any = { name, username, mobile, password, email, role };
        if (role === "student") {
          payload.class_grade = classGrade;
          payload.board = board;
        }
        await api.post("auth/register/", payload);
        // Account created but inactive — prompt user to check email
        setErrorMsg("");
        setShowResend(false);
        setResendStatus("✓ Account created! Check your inbox for a verification link before logging in.");
      }
    } catch (err: any) {
      const data = err.response?.data;
      const detail = data?.detail ?? "";
      if (detail.includes("verify your email")) {
        setErrorMsg(detail);
        setShowResend(true);
      } else if (detail) {
        setErrorMsg(detail);
      } else if (data?.non_field_errors?.length) {
        setErrorMsg(data.non_field_errors[0]);
      } else if (data?.error) {
        setErrorMsg(data.error);
      } else if (data && typeof data === "object") {
        const firstField = Object.keys(data)[0];
        const msg = data[firstField];
        setErrorMsg(`${firstField}: ${Array.isArray(msg) ? msg[0] : msg}`);
      } else {
        setErrorMsg("An error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!username.trim()) {
      setResendStatus("Enter your username first, then resend.");
      return;
    }
    setResendStatus("Sending...");
    try {
      // Token-based resend (#26) — no credentials needed; the backend looks up
      // the unverified account by username and returns a generic message.
      const res = await api.post("auth/resend-verification/", { username });
      setResendStatus(res.data?.detail ?? "Verification email sent. Check your inbox.");
      setShowResend(false);
    } catch (err: any) {
      setResendStatus(err.response?.data?.detail ?? "Failed to resend. Try again in a moment.");
    }
  };

  const openForgot = () => {
    setForgotId(username);  // prefill with whatever they've typed
    setForgotStatus("");
    setForgotSent(false);
    setForgotOpen(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotId.trim()) {
      setForgotStatus("Enter your username or email.");
      return;
    }
    setForgotSubmitting(true);
    setForgotStatus("");
    try {
      const res = await api.post("auth/password-reset/", { username: forgotId });
      setForgotStatus(res.data?.detail ?? "If an account exists, a reset link is on its way.");
      setForgotSent(true);
    } catch (err: any) {
      setForgotStatus(err.response?.data?.detail ?? "Something went wrong. Try again in a moment.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex animate-fade-in selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Forgot-password modal (#7) */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setForgotOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/15 p-8 space-y-5 shadow-nebula"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-black font-headline text-on-surface">Reset your password</h2>
                <p className="text-xs text-outline leading-relaxed">
                  Enter your username or email and we'll send a reset link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="shrink-0 text-outline hover:text-on-surface transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {forgotSent ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-sm">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                  <span className="flex-1 leading-snug">{forgotStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="w-full py-3 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-on-surface font-bold text-sm transition-all"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <input
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                    placeholder="Username or email"
                    value={forgotId}
                    onChange={(e) => setForgotId(e.target.value)}
                  />
                </div>
                {forgotStatus && (
                  <p className="text-xs text-error leading-snug px-1">{forgotStatus}</p>
                )}
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotSubmitting
                    ? <><span className="w-4 h-4 rounded-full border-2 border-on-secondary-container/30 border-t-on-secondary-container animate-spin" /><span>Sending...</span></>
                    : <><span className="material-symbols-outlined text-lg">send</span><span>Send reset link</span></>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Theme toggle — fixed top-right, visible before auth */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full border border-outline-variant/20 bg-surface-container text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="material-symbols-outlined text-base">
          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
      {/* ── Left Half: Branding & Role Selection ─────────────────── */}
      <section className="hidden lg:flex relative w-1/2 flex-col justify-center px-12 xl:px-24 overflow-hidden bg-surface-dim">
        {/* Ambient Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[140px]" />
          {/* Floating Decorative Icons */}
          <div className="absolute top-[15%] left-[10%] opacity-20 -rotate-12">
            <span className="material-symbols-outlined text-5xl text-primary">military_tech</span>
          </div>
          <div className="absolute bottom-[20%] right-[15%] opacity-20 rotate-12">
            <span className="material-symbols-outlined text-4xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
          <div className="absolute top-[60%] left-[5%] opacity-10">
            <span className="material-symbols-outlined text-6xl text-secondary">school</span>
          </div>
          <div className="absolute top-1/2 right-[10%] opacity-15">
            <span className="material-symbols-outlined text-3xl text-primary">rocket_launch</span>
          </div>
        </div>

        {/* Brand Identity */}
        <div className="relative z-10 space-y-8">
          {/* Logo */}
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent font-headline tracking-wide">
            Envirr
          </span>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-6xl font-extrabold font-headline leading-tight tracking-tight text-on-surface">
              Master Every Concept. <br />
              <span className="text-primary">Level Up</span> Every Day.
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md font-light leading-relaxed">
              Join the next generation of learners in an environment built for high-performance academic mastery.
            </p>
          </div>

          {/* Identity Protocol — Role Selection Pills */}
          <div className="pt-8 space-y-4">
            <p className="text-xs font-label uppercase tracking-widest text-outline">Identity Protocol</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setRole("student")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  role === "student"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "bg-surface-container-low text-slate-500 hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-lg">school</span>
                <span className="font-label">Student</span>
              </button>
              <button
                onClick={() => setRole("teacher")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  role === "teacher"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "bg-surface-container-low text-slate-500 hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-lg">co_present</span>
                <span className="font-label">Teacher</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right Half: Login Form ───────────────────────────────── */}
      <section className="relative w-full lg:w-1/2 flex items-center justify-center p-6 bg-surface">
        {/* Subtle decorative overlay */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        </div>

        {/* Login Card — matches stitch nebula-glow card */}
        <div className="relative z-10 w-full max-w-md bg-surface-container p-10 rounded-2xl space-y-8 shadow-nebula border border-outline-variant/10">
          {/* Header */}
          <div className="text-center space-y-2">
            {/* Mobile logo */}
            <span className="lg:hidden text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent font-headline tracking-wide block mb-4">
              Envirr
            </span>
            <h2 className="text-2xl font-bold font-headline text-on-surface">Mission Control</h2>
            <p className="text-sm text-outline">
              {isLogin ? "Enter your credentials to resume your journey" : "Register to begin your academic orbit"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-surface-container-lowest rounded-lg p-1">
            <button
              className={`flex-1 py-2.5 rounded-md text-xs font-bold font-label tracking-widest uppercase transition-all ${
                isLogin
                  ? "bg-primary-container text-on-primary-container shadow-md"
                  : "text-outline hover:text-on-surface"
              }`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2.5 rounded-md text-xs font-bold font-label tracking-widest uppercase transition-all ${
                !isLogin
                  ? "bg-primary-container text-on-primary-container shadow-md"
                  : "text-outline hover:text-on-surface"
              }`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Registration-only fields */}
            {!isLogin && (
              <>
                {/* Mobile Role Selector */}
                <div className="lg:hidden">
                  <label className="text-xs font-label text-outline uppercase tracking-wider ml-1 block mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["student", "teacher"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-3 px-4 rounded-lg text-sm font-bold capitalize flex items-center justify-center gap-2 transition-all ${
                          role === r
                            ? "bg-primary/10 text-primary border border-primary/40"
                            : "bg-surface-container-lowest text-slate-500 border border-outline-variant/15 hover:border-primary/30"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {r === "student" ? "school" : "co_present"}
                        </span>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">Mobile Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">phone</span>
                    </div>
                    <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                      <span className="text-sm text-slate-500 font-bold pr-2 border-r border-outline-variant/20">+91</span>
                    </div>
                    <input
                      className="w-full pl-24 pr-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
                  </div>
                </div>

                {/* Email field */}
                <div className="space-y-2">
                  <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">alternate_email</span>
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
                  </div>
                </div>

                {/* Student-only fields */}
                {role === "student" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">Class</label>
                      <select
                        className="w-full px-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface focus:ring-0 focus:outline-none transition-all appearance-none cursor-pointer"
                        value={classGrade}
                        onChange={(e) => setClassGrade(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select</option>
                        {meta.grades.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">Board</label>
                      <select
                        className="w-full px-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface focus:ring-0 focus:outline-none transition-all appearance-none cursor-pointer"
                        value={board}
                        onChange={(e) => setBoard(e.target.value)}
                      >
                        <option value="">Optional</option>
                        {meta.boards.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-label text-outline uppercase tracking-wider ml-1">
                {isLogin ? "Username" : "Username (unique login ID)"}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    {isLogin ? "alternate_email" : "person"}
                  </span>
                </div>
                <input
                  data-testid="login-username"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                  placeholder={isLogin ? "commander@envirr.edu" : "johndoe"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-label text-outline uppercase tracking-wider">Access Key</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-[10px] uppercase font-bold tracking-tighter text-outline hover:text-primary transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </div>
                <input
                  data-testid="login-password"
                  className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest border-none rounded-lg text-on-surface placeholder:text-outline/50 focus:ring-0 focus:outline-none transition-all"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors"
                  onClick={() => setShowPw(!showPw)}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPw ? "visibility" : "visibility_off"}
                  </span>
                </button>
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
              </div>
            </div>

            {/* Success / info banner */}
            {resendStatus && !errorMsg && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-sm">
                <span className="material-symbols-outlined text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                <span className="flex-1 leading-snug">{resendStatus}</span>
              </div>
            )}

            {/* Inline Error Banner */}
            {errorMsg && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                  <span className="flex-1 leading-snug">{errorMsg}</span>
                  <button type="button" onClick={() => { setErrorMsg(""); setShowResend(false); }} className="shrink-0 hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                {showResend && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary text-xs font-bold transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Resend verification email
                  </button>
                )}
                {resendStatus && showResend === false && (
                  <p className="text-xs text-center text-secondary">{resendStatus}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold rounded-lg shadow-lg hover:shadow-secondary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-secondary-container/30 border-t-on-secondary-container animate-spin" /><span>Verifying...</span></>
                : <><span>{isLogin ? "Continue" : "Launch Account"}</span><span className="material-symbols-outlined text-lg">arrow_forward</span></>
              }
            </button>
          </form>

          {/* Admission Link */}
          <div className="text-center pt-2">
            <p className="text-sm text-outline">
              New recruit?{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? "Apply for Admission" : "Already have an account?"}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ── Floating Footer Pill — matches stitch ────────────────── */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-3 rounded-full border border-outline-variant/10 z-50 bg-surface-container/80 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label">All Systems Nominal</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex gap-4">
          <a className="text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors" href="#">Privacy</a>
          <a className="text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors" href="#">Help</a>
        </div>
      </footer>
    </div>
  );
}
