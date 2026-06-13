import { useState } from "react";
import { useAuth, api } from "../context/AuthContext";
import { useMetadata } from "../lib/metadata";

function InputField({
  icon, label, type = "text", value, onChange, placeholder, disabled,
}: {
  icon: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-12 pr-10 py-3.5 bg-surface-container-highest border border-outline-variant/10 rounded-xl text-sm text-on-surface placeholder:text-slate-600 focus:ring-0 focus:outline-none focus:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{show ? "visibility" : "visibility_off"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Alert({ type, message, onClose }: { type: "error" | "success"; message: string; onClose: () => void }) {
  const isError = type === "error";
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
      isError ? "bg-error/10 border-error/30 text-error" : "bg-secondary/10 border-secondary/30 text-secondary"
    }`}>
      <span className="material-symbols-outlined text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isError ? "error" : "check_circle"}
      </span>
      <span className="flex-1 leading-snug">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70 transition-opacity">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const meta = useMetadata();

  // Profile form state
  const [name, setName]           = useState(user?.name ?? "");
  const [mobile, setMobile]       = useState(user?.mobile ?? "");
  const [username, setUsername]   = useState(user?.username ?? "");
  const [email, setEmail]         = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatar_url ?? "");
  const [classGrade, setClassGrade] = useState(user?.profile?.class_grade ?? "");
  const [board, setBoard]         = useState(user?.profile?.board ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAlert, setProfileAlert]   = useState<{ type: "error" | "success"; msg: string } | null>(null);

  // Password form state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwAlert, setPwAlert]       = useState<{ type: "error" | "success"; msg: string } | null>(null);

  // Email verification state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationAlert, setVerificationAlert]     = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const hasPendingEmail = !!user?.pending_email;

  const handleSendVerification = async () => {
    setSendingVerification(true);
    setVerificationAlert(null);
    try {
      const res = await api.post("auth/send-verification/");
      setVerificationAlert({ type: "success", msg: res.data.detail });
    } catch (err: any) {
      setVerificationAlert({ type: "error", msg: err.response?.data?.detail ?? "Failed to send email." });
    } finally {
      setSendingVerification(false);
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await api.patch("auth/me/", { email: user?.email });
      await refreshUser();
      setEmail(user?.email ?? "");
      setVerificationAlert({ type: "success", msg: "Email change cancelled." });
    } catch {
      setVerificationAlert({ type: "error", msg: "Failed to cancel. Try again." });
    }
  };

  const initials = (user?.name || user?.username || "?").slice(0, 2).toUpperCase();
  const roleColors: Record<string, string> = {
    student: "bg-primary/10 text-primary border-primary/20",
    teacher: "bg-secondary/10 text-secondary border-secondary/20",
    admin:   "bg-tertiary/10 text-tertiary border-tertiary/20",
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileAlert(null);
    try {
      await api.patch("auth/me/", { name, mobile, username, email, avatar_url: avatarUrl, class_grade: classGrade, board });
      await refreshUser();
      setProfileAlert({ type: "success", msg: "Profile updated successfully." });
    } catch (err: any) {
      const data = err.response?.data ?? {};
      const firstKey = Object.keys(data)[0];
      const msg = firstKey
        ? `${firstKey}: ${Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]}`
        : "Failed to update profile.";
      setProfileAlert({ type: "error", msg });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwAlert(null);
    try {
      await api.post("auth/change-password/", {
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmPw,
      });
      setPwAlert({ type: "success", msg: "Password changed successfully. You remain logged in." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? "Failed to change password.";
      setPwAlert({ type: "error", msg: detail });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-16">
      <div className="max-w-2xl mx-auto px-4 md:px-6">

        {/* ── Profile Header ───────────────────────────────────────── */}
        <section className="mt-8 mb-6">
          <div className="flex items-center gap-5 p-6 bg-surface-container rounded-2xl border border-outline-variant/10">
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-black text-primary">{initials}</span>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-lg font-black font-headline text-on-surface truncate">{user?.name || user?.username}</h1>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border capitalize ${roleColors[user?.role ?? "student"]}`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">@{user?.username}</p>
              <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              {user?.profile?.class_grade && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Class {user.profile.class_grade} · {user.profile.board}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Email Status Banners ─────────────────────────────────── */}

        {/* Pending email change */}
        {hasPendingEmail && (
          <section className="mb-6">
            <div className="flex flex-col gap-3 px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>forward_to_inbox</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Email change pending</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    A verification link was sent to{" "}
                    <span className="text-primary font-bold">{user?.pending_email}</span>.
                    Click it to confirm the change. Your current email{" "}
                    <span className="text-on-surface font-bold">{user?.email}</span> is still active.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-black hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {sendingVerification
                    ? <><span className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /><span>Resending...</span></>
                    : <><span className="material-symbols-outlined text-sm">send</span><span>Resend Link</span></>
                  }
                </button>
                <button
                  onClick={handleCancelEmailChange}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/20 text-slate-400 hover:text-on-surface text-xs font-black transition-all"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Cancel Change
                </button>
              </div>
              {verificationAlert && (
                <Alert type={verificationAlert.type} message={verificationAlert.msg} onClose={() => setVerificationAlert(null)} />
              )}
            </div>
          </section>
        )}

        {/* Unverified email (no pending change) */}
        {!user?.email_verified && !hasPendingEmail && (
          <section className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 bg-tertiary/5 border border-tertiary/20 rounded-2xl">
              <div className="flex items-start gap-3 flex-1">
                <span className="material-symbols-outlined text-tertiary text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_unread</span>
                <div>
                  <p className="text-sm font-bold text-on-surface">Email not verified</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verify <span className="text-tertiary font-bold">{user?.email}</span> to secure your account.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-tertiary/10 border border-tertiary/20 text-tertiary text-xs font-black hover:bg-tertiary/20 transition-all disabled:opacity-50"
                >
                  {sendingVerification
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-tertiary/30 border-t-tertiary animate-spin" /><span>Sending...</span></>
                    : <><span className="material-symbols-outlined text-sm">send</span><span>Send Verification Email</span></>
                  }
                </button>
                {verificationAlert && (
                  <Alert type={verificationAlert.type} message={verificationAlert.msg} onClose={() => setVerificationAlert(null)} />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Verified and no pending change */}
        {user?.email_verified && !hasPendingEmail && (
          <section className="mb-6">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-secondary/5 border border-secondary/15 rounded-2xl">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <p className="text-sm text-secondary font-bold">Email verified</p>
            </div>
          </section>
        )}

        {/* ── Edit Profile ─────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">manage_accounts</span>
                <h2 className="text-base font-black font-headline text-on-surface">Edit Profile</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Update your personal information</p>
            </div>

            <form onSubmit={handleProfileSave} className="px-6 py-5 space-y-4">
              <InputField icon="badge" label="Full Name" value={name} onChange={setName} placeholder="e.g. Rahul Sharma" />

              {/* Mobile with +91 prefix */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile Number</label>
                <div className="relative group flex items-center bg-surface-container-highest border border-outline-variant/10 rounded-xl focus-within:border-primary/40 transition-all">
                  <span className="material-symbols-outlined text-xl text-slate-500 ml-4 shrink-0">phone</span>
                  <span className="text-sm text-slate-500 font-bold px-2 border-r border-outline-variant/20 shrink-0">+91</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3.5 bg-transparent text-sm text-on-surface placeholder:text-slate-600 focus:ring-0 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <InputField icon="person" label="Username (login ID)" value={username} onChange={setUsername} placeholder="johndoe" />
                <div className="space-y-1.5">
                  <InputField
                    icon="alternate_email"
                    label={hasPendingEmail ? "Email (change pending)" : "Email"}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    disabled={hasPendingEmail}
                  />
                  {hasPendingEmail && (
                    <p className="text-[11px] text-slate-500 ml-1">Cancel the pending change above to enter a different email.</p>
                  )}
                </div>
              </div>

              <InputField icon="link" label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />

              {user?.role === "student" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Class</label>
                    <select
                      value={classGrade}
                      onChange={e => setClassGrade(e.target.value)}
                      className="w-full px-4 py-3.5 bg-surface-container-highest border border-outline-variant/10 rounded-xl text-sm text-on-surface focus:ring-0 focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select class</option>
                      {meta.grades.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Board</label>
                    <select
                      value={board}
                      onChange={e => setBoard(e.target.value)}
                      className="w-full px-4 py-3.5 bg-surface-container-highest border border-outline-variant/10 rounded-xl text-sm text-on-surface focus:ring-0 focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select board</option>
                      {meta.boards.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {profileAlert && (
                <Alert type={profileAlert.type} message={profileAlert.msg} onClose={() => setProfileAlert(null)} />
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-3.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-sm rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {profileSaving
                  ? <><span className="w-4 h-4 rounded-full border-2 border-on-secondary-container/30 border-t-on-secondary-container animate-spin" /><span>Saving...</span></>
                  : <><span>Save Changes</span><span className="material-symbols-outlined text-lg">check</span></>
                }
              </button>
            </form>
          </div>
        </section>

        {/* ── Change Password ──────────────────────────────────────── */}
        <section className="mb-6">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">lock_reset</span>
                <h2 className="text-base font-black font-headline text-on-surface">Change Password</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Min 8 chars · uppercase · lowercase · number · special character
              </p>
            </div>

            <form onSubmit={handlePasswordSave} className="px-6 py-5 space-y-4">
              <InputField icon="lock" label="Current Password" type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
              <InputField icon="lock_open" label="New Password" type="password" value={newPw} onChange={setNewPw} placeholder="••••••••" />
              <InputField icon="lock_open" label="Confirm New Password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />

              {pwAlert && (
                <Alert type={pwAlert.type} message={pwAlert.msg} onClose={() => setPwAlert(null)} />
              )}

              <button
                type="submit"
                disabled={pwSaving}
                className="w-full py-3.5 bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 hover:text-primary text-on-surface-variant font-black text-sm rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pwSaving
                  ? <><span className="w-4 h-4 rounded-full border-2 border-slate-500/30 border-t-slate-300 animate-spin" /><span>Updating...</span></>
                  : <><span>Update Password</span><span className="material-symbols-outlined text-lg">key</span></>
                }
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
