// src/pages/OtpPage.jsx
import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { LogoOnDark } from "../components/ui/Logo";
import { Button } from "../components/ui/Primitives";
import { DiamondIcon, CheckIcon, ShieldIcon } from "../components/ui/Icons";

export default function OtpPage() {
  const {
    setPage,
    verifyOtp,
    resendOtp,
    pendingOtpEmail,
    authLoading,
    authError,
  } = useApp();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(120);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // If user lands here without going through signup, send them back
  useEffect(() => {
    if (!pendingOtpEmail) setPage("signup");
  }, [pendingOtpEmail, setPage]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerify();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    pasted.split("").forEach((ch, i) => {
      if (i < 6) next[i] = ch;
    });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < 6) return;
    await verifyOtp(pendingOtpEmail, otp);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    const ok = await resendOtp(pendingOtpEmail);
    setResendLoading(false);
    if (ok) {
      setResendSuccess(true);
      setResendTimer(120);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const otpFilled = digits.every((d) => d !== "");
  const maskedEmail = pendingOtpEmail
    ? pendingOtpEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* ── Left decorative panel — identical pattern to SignupPage ── */}
      <div className="bg-gradient-to-br from-maroon via-[#8a1a1a] to-maroon-dark flex flex-col justify-between px-14 py-12 relative overflow-hidden slide-in-left">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-white/5" />

        <div
          className="relative z-10 cursor-pointer"
          onClick={() => setPage("landing")}
        >
          <LogoOnDark size="lg" />
          <p className="text-white/40 text-[11px] tracking-[2px] uppercase mt-1">
            Intelligence · News · You
          </p>
        </div>

        <div className="relative z-10">
          <div className="w-12 h-[2px] bg-gold mb-6" />
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/25 text-gold px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[1px] uppercase mb-5">
            <DiamondIcon size={6} /> One Last Step
          </div>
          <blockquote className="font-playfair text-[30px] font-bold text-white leading-[1.25] mb-4">
            Verify your identity to get started.
          </blockquote>
          <p className="text-white/60 text-[14px] leading-[1.7] mb-8 max-w-[340px]">
            We've sent a 6-digit code to your email. Enter it within 10 minutes to activate your
            NewsCrest account and unlock your personalised news feed.
          </p>

          {/* Steps — Account ✓, Profile ✓, Preferences ✓, Verify (active) */}
          <div className="space-y-3">
            {[
              { label: "Account", done: true },
              { label: "Profile", done: true },
              { label: "Preferences", done: true },
              { label: "Verify Email", done: false, active: true },
            ].map((s) => (
              <div
                key={s.label}
                className={`flex items-center gap-3 ${s.done || s.active ? "opacity-100" : "opacity-30"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    s.done
                      ? "bg-gold"
                      : s.active
                      ? "bg-white/20 border-2 border-gold"
                      : "bg-white/10"
                  }`}
                >
                  {s.done ? (
                    <CheckIcon size={13} className="text-maroon-dark" />
                  ) : (
                    <ShieldIcon size={13} className="text-white/70" />
                  )}
                </div>
                <div>
                  <div
                    className={`text-[13px] font-semibold ${s.done || s.active ? "text-white" : "text-white/40"}`}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/30 text-[11px]">
            <DiamondIcon size={6} className="text-gold/50" />
            <span>Not just news. Your news.</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="bg-smoke flex items-center justify-center px-12 py-10 overflow-y-auto fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-maroon/8 border border-maroon/15 flex items-center justify-center mx-auto mb-6">
            <ShieldIcon size={30} className="text-maroon" />
          </div>

          <h2 className="font-playfair text-[26px] font-bold text-text-primary mb-1 text-center">
            Check your email
          </h2>
          <p className="text-[13.5px] text-text-muted mb-1 text-center">
            We sent a 6-digit verification code to
          </p>
          <p className="text-[14px] font-semibold text-maroon mb-7 text-center">
            {maskedEmail}
          </p>

          {/* Error */}
          {authError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-700">
              {authError}
            </div>
          )}

          {/* Resend success */}
          {resendSuccess && (
            <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-700 flex items-center gap-2">
              <CheckIcon size={14} />
              New OTP sent successfully! Check your inbox.
            </div>
          )}

          {/* 6-digit OTP boxes */}
          <div className="flex gap-3 justify-center mb-7" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-[22px] font-bold rounded-[12px] border-[2px] outline-none transition-all duration-200 bg-white font-inter
                  ${
                    d
                      ? "border-maroon text-maroon shadow-[0_0_0_3px_rgba(116,21,21,0.12)]"
                      : "border-gold/30 text-text-primary focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)]"
                  }`}
              />
            ))}
          </div>

          {/* Verify button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center mb-4"
            onClick={handleVerify}
            disabled={!otpFilled || authLoading}
          >
            {authLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          {/* Resend */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-[13px] text-text-muted">
                Resend code in{" "}
                <span className="font-semibold text-maroon tabular-nums">
                  {Math.floor(resendTimer/60)}:{String(resendTimer%60).padStart(2,"0")}
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-[13px] text-maroon font-semibold cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? "Sending…" : "Resend verification code"}
              </button>
            )}
          </div>

          <div className="divider-gold my-6" />

          <p className="text-center text-[12.5px] text-text-muted">
            Wrong email?{" "}
            <span
              className="text-maroon font-semibold cursor-pointer hover:underline"
              onClick={() => setPage("signup")}
            >
              Go back to signup
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
