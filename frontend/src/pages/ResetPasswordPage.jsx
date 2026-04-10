import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/Primitives";

export default function ResetPasswordPage() {
  const { setPage } = useApp();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  useEffect(() => {
    if (!passwordChecks.length)
      setError("Min 8 characters");
    else if (!passwordChecks.upper)
      setError("Add uppercase");
    else if (!passwordChecks.number)
      setError("Add number");
    else if (!passwordChecks.special)
      setError("Add special character");
    else setError("");
  }, [password]);

  const handleReset = async () => {
    const email = localStorage.getItem("resetEmail");
    const otp = localStorage.getItem("resetOtp");

    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        otp,
        newPassword: password,
      }),
    });

    localStorage.removeItem("resetEmail");
    localStorage.removeItem("resetOtp");

    setPage("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-smoke">
      <div className="w-[400px] bg-white p-6 rounded border">
        <h2 className="text-xl font-bold mb-4">Reset Password</h2>

        <input
          type="password"
          placeholder="New password"
          className="w-full border px-4 py-2 mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-sm mb-2 text-red-500">{error}</div>

        <Button
          onClick={handleReset}
          disabled={!!error || !password}
        >
          Reset Password
        </Button>
      </div>
    </div>
  );
}