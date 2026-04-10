import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/Primitives";

export default function ForgotPasswordPage() {
  const { setPage } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return;

    try {
      setLoading(true);

      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      localStorage.setItem("resetEmail", email);
      setPage("otp"); // reuse OTP page
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-smoke">
      <div className="w-full max-w-[400px] bg-white p-6 rounded-[12px] border">
        <h2 className="text-xl font-bold mb-4">Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-4 py-2 rounded-[10px] mb-4"
        />

        <Button onClick={handleSendOtp} disabled={loading}>
          {loading ? "Sending..." : "Send OTP"}
        </Button>
      </div>
    </div>
  );
}