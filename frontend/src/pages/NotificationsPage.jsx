// src/pages/NotificationsPage.jsx
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button } from "../components/ui/Primitives";
import {
  ZapIcon, MapPinIcon, TrendingIcon, UserIcon,
  XIcon, CheckIcon, BellIcon, MailIcon, RefreshIcon,
} from "../components/ui/Icons";

// ── Type config ───────────────────────────────────────────────────────────────
const ALERT_TYPE_MAP = {
  breaking:     { label: "Breaking",  Icon: ZapIcon,      bg: "bg-red-500/10",   color: "text-red-600"    },
  location:     { label: "Local",     Icon: MapPinIcon,   bg: "bg-green-500/10", color: "text-green-600"  },
  trending:     { label: "Trending",  Icon: TrendingIcon, bg: "bg-gold/15",      color: "text-yellow-700" },
  personalized: { label: "For You",   Icon: UserIcon,     bg: "bg-maroon/8",     color: "text-maroon"     },
  interest:     { label: "Interest",  Icon: UserIcon,     bg: "bg-maroon/8",     color: "text-maroon"     },
  daily_digest: { label: "Digest",    Icon: BellIcon,     bg: "bg-blue-500/10",  color: "text-blue-600"   },
  default:      { label: "Update",    Icon: BellIcon,     bg: "bg-smoke",        color: "text-text-muted" },
};

function getType(type) {
  return ALERT_TYPE_MAP[type] || ALERT_TYPE_MAP.default;
}

function formatDate(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const {
    alerts, alertCount,
    markAlertRead, markAllAlertsRead, deleteAlert, loadAlerts,
    user,
  } = useApp();

  const emailSentCount = alerts.filter((a) => a.isEmailSent).length;

  return (
    <AppShell title="Notifications">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6 slide-in-left">
        <div>
          <h2 className="font-playfair text-2xl font-bold text-text-primary section-title-underline inline-block">
            Notifications
          </h2>
          <p className="text-[13.5px] text-text-muted mt-1.5 flex items-center gap-2 flex-wrap">
            {alertCount > 0 ? (
              <>
                <span className="font-semibold text-maroon">{alertCount}</span>
                {" "}unread alert{alertCount !== 1 ? "s" : ""}
              </>
            ) : "All caught up"}
            {emailSentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                <MailIcon size={10} />{emailSentCount} emailed
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadAlerts} className="flex items-center gap-1.5">
            <RefreshIcon size={13} />Refresh
          </Button>
          {alertCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAlertsRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* ── Left: alert list ── */}
        <div>
          {alerts.length === 0 ? (
            <div className="bg-white rounded-card border border-gold-subtle text-center py-20 fade-in">
              <div className="w-14 h-14 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
                <BellIcon size={28} className="text-text-muted opacity-40" />
              </div>
              <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
                No notifications yet
              </h3>
              <p className="text-[13.5px] text-text-muted max-w-[260px] mx-auto leading-[1.6]">
                Personalised news alerts will appear here automatically after you log in.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden">
              {alerts.map((n, i) => {
                const t   = getType(n.type);
                const { Icon } = t;
                const id  = n._id || n.id;
                return (
                  <div
                    key={id}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    className={`slide-in-right flex items-start gap-3.5 px-5 py-4 border-b border-gold/15 last:border-b-0 transition-colors duration-200 ${
                      n.isRead
                        ? "hover:bg-smoke/60"
                        : "bg-maroon/[0.03] hover:bg-maroon/[0.05]"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${t.bg}`}>
                      <Icon size={16} className={t.color} />
                    </div>

                    {/* Body */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => markAlertRead(id)}
                    >
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.5px] ${t.color}`}>
                          {t.label}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-maroon flex-shrink-0 pulse-dot" />
                        )}
                        {n.priority === "urgent" && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                            Urgent
                          </span>
                        )}
                        {n.isEmailSent && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-[0.5px]">
                            <MailIcon size={8} />Emailed
                          </span>
                        )}
                      </div>

                      <p className={`text-[13.5px] leading-[1.4] line-clamp-2 transition-all duration-200 ${
                        n.isRead ? "font-normal text-text-secondary" : "font-bold text-text-primary"
                      }`}>
                        {n.title}
                      </p>

                      {n.message && (
                        <p className="text-[12px] text-text-muted mt-0.5 line-clamp-1">
                          {n.message}
                        </p>
                      )}

                      <div className="text-[11px] text-text-muted mt-1">
                        {formatDate(n.createdAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.isRead && (
                        <button
                          title="Mark as read"
                          onClick={() => markAlertRead(id)}
                          className="w-7 h-7 rounded-full hover:bg-green-50 flex items-center justify-center text-text-muted hover:text-green-600 transition-colors duration-200"
                        >
                          <CheckIcon size={13} />
                        </button>
                      )}
                      <button
                        title="Delete"
                        onClick={() => deleteAlert(id)}
                        className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors duration-200"
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* How it works */}
          <div className="bg-lemon rounded-card border border-gold/35 p-4 fade-in">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted mb-3">
              How Alerts Work
            </div>
            <div className="space-y-3">
              {[
                { icon: "🔑", text: "Alerts are sent automatically when you log in" },
                { icon: "🎯", text: "Matches news to your interests from Profile" },
                { icon: "📧", text: "Top articles are also emailed to you" },
                { icon: "🔔", text: "Breaking news alerts run every hour" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2">
                  <span className="text-[14px] flex-shrink-0 mt-0.5">{icon}</span>
                  <p className="text-[12px] text-text-secondary leading-[1.5]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Your preferences */}
          <div className="bg-white rounded-card border border-gold-subtle shadow-card p-4 fade-in">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-text-muted mb-3">
              Your Preferences
            </div>
            {user?.notificationPreferences ? (
              <div className="space-y-2">
                {[
                  ["Breaking News",  user.notificationPreferences.breakingNews],
                  ["Personalised",   user.notificationPreferences.personalizedAlerts],
                  ["Email Alerts",   user.notificationPreferences.emailAlerts],
                  ["Daily Digest",   user.notificationPreferences.dailyDigest],
                ].map(([label, enabled]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-text-secondary">{label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-smoke text-text-muted border border-gold/20"
                    }`}>
                      {enabled ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-text-muted pt-2 leading-[1.5]">
                  Edit in Profile → Notification Preferences
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-text-muted">Log in to see your preferences.</p>
            )}
          </div>

          {/* Stats */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-card border border-gold-subtle shadow-card p-4 fade-in">
              <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-text-muted mb-3">
                Alert Stats
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total",   value: alerts.length,              color: "text-text-primary" },
                  { label: "Unread",  value: alertCount,                 color: "text-maroon"       },
                  { label: "Emailed", value: emailSentCount,             color: "text-blue-600"     },
                  { label: "Read",    value: alerts.length - alertCount, color: "text-green-600"    },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-smoke rounded-[10px] p-3 text-center">
                    <div className={`font-playfair text-[22px] font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-[0.5px]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
