// src/pages/SignupPage.jsx
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { LogoOnDark } from "../components/ui/Logo";
import { Button, InputField } from "../components/ui/Primitives";
import { EyeIcon, EyeOffIcon } from "../components/ui/Icons";
import {useEffect } from "react";
import {
  CheckIcon,
  UserIcon,
  GridIcon,
  BellIcon,
  DiamondIcon,
} from "../components/ui/Icons";
import { indiaStatesCities } from "../data/indialocations";

const PROFILE_TYPES = [
  "Student",
  "IT Employee",
  "Business Person",
  "Elderly",
  "Homemaker",
  "General Reader",
];
const INTERESTS = [
  "Technology",
  "Sports",
  "Business",
  "Finance",
  "Health",
  "Science",
  "Entertainment",
  "Fashion",
  "Politics",
  "Education",
  "AI",
  "Startups",
];

const STEPS = [
  { id: 1, label: "Account", Icon: UserIcon, desc: "Basic credentials" },
  { id: 2, label: "Profile", Icon: GridIcon, desc: "Who you are" },
  { id: 3, label: "Preferences", Icon: BellIcon, desc: "Customise feed" },
];

const STEP_CONTENT = [
  {
    quote: "Your personalised news journey starts here.",
    sub: "Create your account in seconds and unlock AI-powered, profile-aware news tailored exclusively to you.",
    highlight: "Step 1 of 3 — Account Setup",
  },
  {
    quote: "News that knows who you are.",
    sub: "Tell us your profile type and location so we can surface the stories that actually matter to your life and career.",
    highlight: "Step 2 of 3 — Profile Setup",
  },
  {
    quote: "Your interests. Your alerts. Your feed.",
    sub: "Select your favourite topics and notification preferences to fine-tune your NewsCrest experience from day one.",
    highlight: "Step 3 of 3 — Preferences",
  },
];

export default function SignupPage() {
  const { setPage, signup, authLoading, authError } = useApp();
  const [step, setStep] = useState(1);
const [selectedState, setSelectedState] = useState("");
const [selectedCity, setSelectedCity] = useState("");
  // Form state
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState([]);
  // const [city, setCity] = useState("");
  // const [state, setState] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([
    "Technology",
    "AI",
    "Startups",
  ]);
  const [notifPrefs, setNotifPrefs] = useState({
    breakingNews: true,
    personalizedAlerts: true,
    dailyDigest: false,
    emailAlerts: true,
  });
  const [step1Error, setStep1Error] = useState("");

  const toggleInterest = (i) =>
    setSelectedInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const handleStep1Next = () => {
  if (!name.trim()) return setStep1Error("Please enter your full name.");

  if (!/^[a-zA-Z\s]+$/.test(name))
    return setStep1Error("Name should contain only letters.");

  if (!email.trim()) return setStep1Error("Please enter your email.");

  if (
    !passwordChecks.length ||
    !passwordChecks.upper ||
    !passwordChecks.number ||
    !passwordChecks.special
  ) {
    return setStep1Error("Password does not meet security requirements.");
  }

  if (password !== confirmPassword)
    return setStep1Error("Passwords do not match.");

  setStep1Error("");
  setStep(2);
};

  const handleSignup = async () => {
    await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      profileType,
      interests: selectedInterests,
      city: selectedCity,
      state: selectedState,
      notificationPreferences: notifPrefs,
    });
  };

  const content = STEP_CONTENT[step - 1];
const passwordChecks = {
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
};
useEffect(() => {
  if (!name.trim()) {
    setStep1Error("Please enter your full name.");
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    setStep1Error("Name should contain only letters.");
  } else if (!email.trim()) {
    setStep1Error("Please enter your email.");
  } else if (!password) {
    setStep1Error("Please enter a password.");
  } else if (!passwordChecks.length) {
    setStep1Error("Password must be at least 8 characters.");
  } else if (!passwordChecks.upper) {
    setStep1Error("Password must include an uppercase letter.");
  } else if (!passwordChecks.number) {
    setStep1Error("Password must include a number.");
  } else if (!passwordChecks.special) {
    setStep1Error("Password must include a special character.");
  } else if (password !== confirmPassword) {
    setStep1Error("Passwords do not match.");
  } else {
    setStep1Error("");
  }
}, [name, email, password, confirmPassword]);
const generatePassword = () => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  // Ensure at least one of each
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    special[Math.floor(Math.random() * special.length)];

  const allChars = upper + lower + numbers + special;

  // Fill remaining length
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  setPassword(password);
  setConfirmPassword(password);
};
const toggleProfileType = (p) => {
  setProfileType((prev) =>
    prev.includes(p)
      ? prev.filter((x) => x !== p)
      : [...prev, p]
  );
};
  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* Left panel */}
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
          <div className="w-12 h-[2px] bg-gold mb-6 transition-all duration-500" />
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/25 text-gold px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[1px] uppercase mb-5">
            <DiamondIcon size={6} /> {content.highlight}
          </div>
          <blockquote className="font-playfair text-[30px] font-bold text-white leading-[1.25] mb-4">
            {content.quote}
          </blockquote>
          <p className="text-white/60 text-[14px] leading-[1.7] mb-8 max-w-[340px]">
            {content.sub}
          </p>
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 transition-all duration-300 ${s.id <= step ? "opacity-100" : "opacity-30"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${s.id < step ? "bg-gold" : s.id === step ? "bg-white/20 border-2 border-gold" : "bg-white/10"}`}
                >
                  {s.id < step ? (
                    <CheckIcon size={13} className="text-maroon-dark" />
                  ) : (
                    <s.Icon size={13} className="text-white/70" />
                  )}
                </div>
                <div>
                  <div
                    className={`text-[13px] font-semibold ${s.id <= step ? "text-white" : "text-white/40"}`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[11px] text-white/35">{s.desc}</div>
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

      {/* Right form */}
      <div
        className="bg-smoke flex items-center justify-center px-12 py-10 overflow-y-auto fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="w-full max-w-[420px]">
          {/* Step pills */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 ${step > s.id ? "bg-green-500/10 text-green-700" : step === s.id ? "bg-maroon text-white" : "bg-smoke text-text-muted border border-gold/20"}`}
                >
                  {step > s.id ? <CheckIcon size={10} /> : <s.Icon size={10} />}{" "}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-[1.5px] w-6 rounded transition-all duration-300 ${step > s.id ? "bg-green-400" : "bg-gold/20"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {(authError || step1Error) && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-700">
              {step1Error || authError}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="font-playfair text-[26px] font-bold text-text-primary mb-1">
                Create your account
              </h2>
              <p className="text-[13.5px] text-text-muted mb-6">
                Basic details to get you started on NewsCrest
              </p>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Arjun Sharma"
                  value={name}
                  onChange={(e) => {
  const value = e.target.value;
  if (/^[a-zA-Z\s]*$/.test(value)) {
    setName(value);
  }
}}
                  className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)]"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)]"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Password
                </label>
                <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Create a strong password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] pr-11"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
  >
    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
  </button>
</div>
              </div>
              <div className="mt-2 text-[12px] grid grid-cols-2 gap-x-6 gap-y-2">
  <div className={`flex items-center gap-2 ${passwordChecks.length ? "text-green-600" : "text-red-500"}`}>
    <span>•</span>
    <span>At least 8 characters</span>
  </div>

  <div className={`flex items-center gap-2 ${passwordChecks.upper ? "text-green-600" : "text-red-500"}`}>
    <span>•</span>
    <span>One uppercase letter</span>
  </div>

  <div className={`flex items-center gap-2 ${passwordChecks.number ? "text-green-600" : "text-red-500"}`}>
    <span>•</span>
    <span>One number</span>
  </div>

  <div className={`flex items-center gap-2 ${passwordChecks.special ? "text-green-600" : "text-red-500"}`}>
    <span>•</span>
    <span>One special character</span>
  </div>
</div>
                <button
  type="button"
  onClick={generatePassword}
  className="text-[12px] text-maroon font-semibold mt-2 hover:underline"
>
  Suggest strong password
</button>
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
  <input
    type={showConfirmPassword ? "text" : "password"}
    placeholder="Re-enter password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] pr-11"
  />
  <button
    type="button"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
  >
    {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
  </button>
</div>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center mt-2"
                onClick={handleStep1Next}
              >
                Continue to Profile
              </Button>
              <p className="text-center text-[13px] text-text-muted mt-5">
                Already have an account?{" "}
                <span
                  className="text-maroon font-semibold cursor-pointer hover:underline"
                  onClick={() => setPage("login")}
                >
                  Sign in
                </span>
              </p>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h2 className="font-playfair text-[26px] font-bold text-text-primary mb-1">
                Your profile type
              </h2>
              <p className="text-[13.5px] text-text-muted mb-6">
                This shapes your personalised news feed
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {PROFILE_TYPES.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggleProfileType(p)}
                    className={`p-3.5 rounded-[12px] border-[1.5px] text-left cursor-pointer transition-all duration-200 ${profileType.includes(p) ? "border-maroon bg-maroon/5 shadow-[0_0_0_1px_#741515]" : "border-gold/25 hover:border-gold/50 hover:bg-smoke"}`}
                  >
                    <div
                      className={`text-[13.5px] font-semibold ${profileType.includes(p) ? "text-maroon" : "text-text-primary"}`}
                    >
                      {p}
                    </div>
                    {profileType.includes(p) && (
                      <div className="text-[11px] text-maroon/60 mt-0.5">
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
  {/* City */}
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      City
    </label>
    <select
      value={selectedCity}
      onChange={(e) => setSelectedCity(e.target.value)}
      disabled={!selectedState}
      className="w-full px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm 
                 border border-gray-200 focus:outline-none focus:ring-2 
                 focus:ring-maroon/60 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <option value="">Select City</option>
      {selectedState &&
        indiaStatesCities[selectedState].map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
    </select>
  </div>

  {/* State */}
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      State
    </label>
    <select
      value={selectedState}
      onChange={(e) => {
        setSelectedState(e.target.value);
        setSelectedCity("");
      }}
      className="w-full px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm 
                 border border-gray-200 focus:outline-none focus:ring-2 
                 focus:ring-maroon/60"
    >
      <option value="">Select State</option>
      {Object.keys(indiaStatesCities).map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>
  </div>
</div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 justify-center"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1 justify-center"
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 className="font-playfair text-[26px] font-bold text-text-primary mb-1">
                Your interests
              </h2>
              <p className="text-[13.5px] text-text-muted mb-5">
                Select topics you care about
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {INTERESTS.map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border cursor-pointer transition-all duration-200 ${selectedInterests.includes(i) ? "bg-maroon text-white border-maroon" : "bg-white text-text-secondary border-gold/30 hover:border-gold hover:text-maroon"}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="mb-5">
                <h3 className="text-[13px] font-semibold text-text-secondary mb-2">
                  Notification preferences
                </h3>
                <div className="bg-white rounded-[12px] border border-gold/20 overflow-hidden">
                  {[
                    ["Breaking News Alerts", "breakingNews"],
                    ["Profile-Based Alerts", "personalizedAlerts"],
                    ["Daily Email Digest", "dailyDigest"],
                    ["Email Alerts", "emailAlerts"],
                  ].map(([label, key], i, arr) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-gold/15" : ""}`}
                    >
                      <span className="text-[13px] text-text-primary">
                        {label}
                      </span>
                      <input
                        type="checkbox"
                        className="accent-maroon w-4 h-4"
                        checked={notifPrefs[key]}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 justify-center"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1 justify-center"
                  onClick={handleSignup}
                  disabled={authLoading}
                >
                  {authLoading ? "Creating account..." : "Start Reading"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
