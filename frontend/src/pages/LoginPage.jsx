// src/pages/LoginPage.jsx

import { useState } from "react";
import { useApp } from "../context/AppContext";
import { LogoOnDark } from "../components/ui/Logo";
import { Button, InputField } from "../components/ui/Primitives";
import {
  EyeIcon,
  EyeOffIcon,
  DiamondIcon,
  BotIcon,
  ScaleIcon,
  BellIcon,
  BookmarkIcon,
} from "../components/ui/Icons";

const FEATURES = [
  { Icon: BotIcon, text: "AI Chatbot & Comparison Tools" },
  { Icon: BellIcon, text: "Smart Alerts for What Matters" },
  { Icon: BookmarkIcon, text: "Saved Articles & Notes" },
  { Icon: ScaleIcon, text: "Personalised For You Feed" },
];

export default function LoginPage() {
  const { setPage, login, authLoading, authError } = useApp();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    await login(email.trim(), password);
  };

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* Left branding panel */}
      <div className="bg-gradient-to-br from-maroon via-[#8a1a1a] to-maroon-dark flex flex-col justify-between px-14 py-12 relative overflow-hidden slide-in-left">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5" />
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
          <blockquote className="font-playfair text-[34px] font-bold text-white leading-[1.2] mb-5">
            The <em className="text-gold not-italic">smartest</em> news
            <br />
            experience you'll
            <br />
            ever have.
          </blockquote>
          <p className="text-white/60 text-[14px] leading-[1.7] mb-8 max-w-[340px]">
            Personalised, AI-powered, and built around you. Welcome back to
            NewsCrest — where news adapts to your world.
          </p>
          <div className="space-y-3.5">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-gold" />
                </div>
                <span className="text-[13.5px] text-white/80">{text}</span>
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

      {/* Right login form */}
      <div
        className="bg-smoke flex items-center justify-center px-12 py-10 fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="font-playfair text-[30px] font-bold text-text-primary mb-1.5">
              Welcome back
            </h2>
            <p className="text-[14px] text-text-muted">
              Sign in to your NewsCrest account
            </p>
          </div>

          {authError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-700">
              {authError}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5 tracking-[0.3px]">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)]"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5 tracking-[0.3px]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)] pr-11"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer"
              >
                {showPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-7">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-maroon" defaultChecked />
              <span className="text-[13px] text-text-secondary">
                Remember me
              </span>
            </label>
            
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center"
            onClick={handleLogin}
            disabled={authLoading}
          >
            {authLoading ? "Signing in..." : "Sign In to NewsCrest"}
          </Button>

          <p className="text-center text-[13px] text-text-muted mt-6">
            Don't have an account?{" "}
            <span
              className="text-maroon font-semibold cursor-pointer hover:underline"
              onClick={() => setPage("signup")}
            >
              Create one free
            </span>
          </p>

          <div className="mt-8 pt-6 border-t border-gold/20 text-center">
            <p className="text-[11px] text-text-muted">
              By signing in, you agree to our{" "}
              <a className="text-maroon cursor-pointer hover:underline">
                Terms
              </a>{" "}
              &{" "}
              <a className="text-maroon cursor-pointer hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}