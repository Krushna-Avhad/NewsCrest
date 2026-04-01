// src/pages/ProfilePage.jsx
import { useState } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button, Toggle } from "../components/ui/Primitives";
import {
  EditIcon,
  LogOutIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/ui/Icons";

const INTERESTS_ALL = [
  "Technology",
  "AI",
  "Startups",
  "Finance",
  "Sports",
  "Science",
  "Business",
  "Health",
  "Entertainment",
  "Politics",
  "Education",
];

function SettingsSection({ title, action, children }) {
  return (
    <div className="bg-white rounded-card border border-gold-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-gold/20 flex items-center justify-between">
        <h4 className="font-playfair text-[15px] font-bold text-text-primary">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function SettingsRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gold/15 last:border-b-0">
      <div className="text-[13.5px] font-medium text-text-primary">{label}</div>
      <div className="text-[13px] text-text-muted">{value}</div>
    </div>
  );
}

export default function ProfilePage() {
  const {
    setPage,
    readingPrefs,
    setReadingPrefs,
    user,
    updateProfile,
    logout,
    savedArticles,
    notes,
  } = useApp();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    city: user?.city || "",
    state: user?.state || "",
    interests: user?.interests || [],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [showPassForm, setShowPassForm] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passForm, setPassForm] = useState({ old: "", newP: "", confirm: "" });
  const [passSaved, setPassSaved] = useState(false);

  const [notifState, setNotifState] = useState({
    breakingNews: user?.notificationPreferences?.breakingNews ?? true,
    personalizedAlerts:
      user?.notificationPreferences?.personalizedAlerts ?? true,
    dailyDigest: user?.notificationPreferences?.dailyDigest ?? false,
    emailAlerts: user?.notificationPreferences?.emailAlerts ?? true,
  });

  const toggleInterest = (i) =>
    setEditForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        name: editForm.name,
        city: editForm.city,
        state: editForm.state,
        interests: editForm.interests,
        notificationPreferences: notifState,
      });
      setProfileSaved(true);
      setEditing(false);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (_) {}
    setSavingProfile(false);
  };

  const handleSavePassword = () => {
    if (passForm.newP && passForm.newP === passForm.confirm) {
      setPassSaved(true);
      setTimeout(() => {
        setPassSaved(false);
        setShowPassForm(false);
        setPassForm({ old: "", newP: "", confirm: "" });
      }, 2000);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  const ACCOUNT_INFO = [
    { label: "Full Name", value: user?.name || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Profile Type", value: user?.profileType || "—" },
    {
      label: "Location",
      value: [user?.city, user?.state].filter(Boolean).join(", ") || "—",
    },
    { label: "Member Since", value: memberSince },
  ];

  return (
    <AppShell title="Profile & Settings">
      {/* Profile hero */}
      <div className="bg-gradient-to-br from-maroon to-maroon-dark rounded-[20px] p-7 mb-7 flex items-center justify-between slide-in-left">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-gold/40 flex items-center justify-center font-playfair text-[26px] font-bold text-white">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-playfair text-[24px] font-bold text-white mb-0.5">
              {user?.name || "User"}
            </h2>
            <p className="text-white/60 text-[13px]">
              {user?.profileType} ·{" "}
              {[user?.city, user?.state].filter(Boolean).join(", ") ||
                "Location not set"}
            </p>
            <p className="text-white/40 text-[12px] mt-1">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {[
            [String(savedArticles?.length || 0), "Saved"],
            [String(notes?.filter((n) => !n.done).length || 0), "Active Notes"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="text-center bg-white/10 rounded-[12px] px-4 py-3 border border-white/10"
            >
              <div className="font-playfair text-[22px] font-bold text-white">
                {v}
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-[0.5px]">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Account Info */}
          <SettingsSection
            title="Account Information"
            action={
              <button
                onClick={() => {
                  setEditing((v) => !v);
                  setEditForm({
                    name: user?.name || "",
                    city: user?.city || "",
                    state: user?.state || "",
                    interests: user?.interests || [],
                  });
                }}
                className="flex items-center gap-1.5 text-[12px] font-medium text-maroon hover:underline cursor-pointer"
              >
                <EditIcon size={13} /> {editing ? "Cancel" : "Edit"}
              </button>
            }
          >
            {editing ? (
              <div className="p-5 space-y-4">
                {[
                  ["Full Name", "name", "text", "Arjun Sharma"],
                  ["City", "city", "text", "Pune"],
                  ["State", "state", "text", "Maharashtra"],
                ].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                      {label}
                    </label>
                    <input
                      type={type}
                      placeholder={ph}
                      value={editForm[key]}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[14px] text-text-primary bg-white outline-none focus:border-gold transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-2">
                    Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS_ALL.map((i) => (
                      <button
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all duration-200 ${editForm.interests.includes(i) ? "bg-maroon text-white border-maroon" : "bg-white text-text-secondary border-gold/30 hover:border-gold hover:text-maroon"}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
                {profileSaved && (
                  <p className="text-[12px] text-green-600">
                    ✓ Profile updated successfully
                  </p>
                )}
              </div>
            ) : (
              ACCOUNT_INFO.map(({ label, value }) => (
                <SettingsRow key={label} label={label} value={value} />
              ))
            )}
          </SettingsSection>

          {/* Interests display */}
          {!editing && user?.interests?.length > 0 && (
            <SettingsSection title="Your Interests">
              <div className="p-5 flex flex-wrap gap-2">
                {user.interests.map((i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-maroon/8 text-maroon rounded-full text-[12.5px] font-medium"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </SettingsSection>
          )}

          {/* Password */}
          <SettingsSection
            title="Password & Security"
            action={
              <button
                onClick={() => setShowPassForm((v) => !v)}
                className="text-[12px] font-medium text-maroon hover:underline cursor-pointer"
              >
                {showPassForm ? "Cancel" : "Change Password"}
              </button>
            }
          >
            {showPassForm ? (
              <div className="p-5 space-y-4">
                {[
                  ["Current Password", "old", showOldPass, setShowOldPass],
                  ["New Password", "newP", showNewPass, setShowNewPass],
                  [
                    "Confirm New Password",
                    "confirm",
                    showConfirmPass,
                    setShowConfirmPass,
                  ],
                ].map(([label, key, show, setShow]) => (
                  <div key={key}>
                    <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        placeholder="••••••••"
                        value={passForm[key]}
                        onChange={(e) =>
                          setPassForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 pr-10 border-[1.5px] border-gold/25 rounded-[10px] text-[14px] text-text-primary bg-white outline-none focus:border-gold transition-colors"
                      />
                      <button
                        onClick={() => setShow((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer"
                      >
                        {show ? (
                          <EyeOffIcon size={15} />
                        ) : (
                          <EyeIcon size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSavePassword}
                  >
                    {passSaved ? "✓ Saved!" : "Update Password"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 text-[13.5px] text-text-muted">
                Password last changed: recently
              </div>
            )}
          </SettingsSection>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Reading Preferences */}
          <SettingsSection title="Reading Preferences">
            {[
              {
                label: "Feed Layout",
                key: "feedLayout",
                opts: ["Card Grid", "List Grid"],
              },
              {
                label: "Text Size",
                key: "textSize",
                opts: ["Small", "Medium", "Large"],
              },
              {
                label: "Language",
                key: "language",
                opts: ["English", "Hindi", "Marathi"],
              },
            ].map(({ label, key, opts }) => (
              <div
                key={key}
                className="px-5 py-3.5 border-b border-gold/15 last:border-b-0"
              >
                <div className="text-[12px] font-semibold text-text-secondary mb-2">
                  {label}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {opts.map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setReadingPrefs((p) => ({ ...p, [key]: opt }))
                      }
                      className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all duration-200 cursor-pointer ${readingPrefs?.[key] === opt ? "bg-maroon text-white border-maroon" : "bg-white text-text-secondary border-gold/25 hover:border-gold hover:text-maroon"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notification Preferences">
            {[
              ["Breaking News", "breakingNews"],
              ["Personalised Alerts", "personalizedAlerts"],
              ["Daily Email Digest", "dailyDigest"],
              ["Email Alerts", "emailAlerts"],
            ].map(([label, key], i, arr) => (
              <div
                key={key}
                className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-gold/15" : ""}`}
              >
                <span className="text-[13px] text-text-primary">{label}</span>
                <input
                  type="checkbox"
                  className="accent-maroon w-4 h-4 cursor-pointer"
                  checked={notifState[key]}
                  onChange={(e) =>
                    setNotifState((s) => ({ ...s, [key]: e.target.checked }))
                  }
                />
              </div>
            ))}
            <div className="px-5 py-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </SettingsSection>

          {/* Danger zone */}
          <div className="bg-white rounded-card border border-red-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100">
              <h4 className="font-playfair text-[15px] font-bold text-red-700">
                Account Actions
              </h4>
            </div>
            <div className="p-5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-red-600 hover:bg-red-50 border-red-200"
                onClick={logout}
              >
                <LogOutIcon size={14} /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
