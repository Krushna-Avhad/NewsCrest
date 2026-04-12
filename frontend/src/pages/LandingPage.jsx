// src/pages/LandingPage.jsx
import { useApp } from "../context/AppContext";
import { LogoDark } from "../components/ui/Logo";
import { Button } from "../components/ui/Primitives";
import {
  BotIcon,
  ScaleIcon,
  SparkleIcon,
  BookmarkIcon,
  BellIcon,
  NoteIcon,
  GridIcon,
  MapPinIcon,
  ZapIcon,
  SearchIcon,
  ArrowRightIcon,
  StarIcon,
  DiamondIcon,
  TrendingIcon,
  GlobeIcon,
} from "../components/ui/Icons";

const FEATURES = [
  {
    Icon: BotIcon,
    title: "AI News Chatbot",
    desc: "Ask anything, get curated news answers instantly. Natural language. Smart results.",
  },
  {
    Icon: ScaleIcon,
    title: "AI Comparison",
    desc: "Compare two news topics side-by-side. Discover similarities, differences, and insights.",
  },
  {
    Icon: TrendingIcon,
    title: "Personalised Feed",
    desc: "Your profile shapes your news. Student, professional, or general reader — it adapts.",
  },
  {
    Icon: BookmarkIcon,
    title: "Saved Articles",
    desc: "Bookmark articles for later. Organise your reading list with ease.",
  },
  {
    Icon: BellIcon,
    title: "Smart Alerts",
    desc: "Get notified only about what matters to you. No noise, just signal.",
  },
  {
    Icon: SparkleIcon,
    title: "Hatke Summaries",
    desc: "Serious news in witty, short, fun lines. Stay informed, stay entertained.",
  },
  {
    Icon: NoteIcon,
    title: "News Notes",
    desc: "Take notes linked to articles. Your personal knowledge management inside news.",
  },
  {
    Icon: GridIcon,
    title: "15+ Categories",
    desc: "Browse Finance, Tech, Sports, Health, Entertainment, Local and much more.",
  },
  {
    Icon: MapPinIcon,
    title: "Location-Aware",
    desc: "Get local news from your city alongside national and global stories.",
  },
];

const PROFILES = [
  {
    initial: "S",
    name: "Student",
    tags: ["Exams", "Internships", "Tech", "Scholarships"],
  },
  {
    initial: "IT",
    name: "IT Employee",
    tags: ["AI", "Startups", "Layoffs", "Dev"],
  },
  {
    initial: "B",
    name: "Business Person",
    tags: ["Markets", "Finance", "Startups", "Policy"],
  },
  {
    initial: "G",
    name: "General Reader",
    tags: ["World", "Local", "Sports", "Culture"],
  },
];

const WHYS = [
  {
    Icon: TrendingIcon,
    title: "Relevant News Only",
    desc: "No more scrolling through irrelevant content. Your feed is curated to you.",
  },
  {
    Icon: ZapIcon,
    title: "Less Information Overload",
    desc: "AI filters noise so you only see what genuinely matters for your life.",
  },
  {
    Icon: BotIcon,
    title: "AI-Assisted Reading",
    desc: "Summaries, comparisons, and explanations at the click of a button.",
  },
  {
    Icon: MapPinIcon,
    title: "Location-Aware Updates",
    desc: "Local city news mixed seamlessly with national and global stories.",
  },
  {
    Icon: BellIcon,
    title: "Smart Alert System",
    desc: "Profile-based alerts that know what is important before you ask.",
  },
  {
    Icon: NoteIcon,
    title: "Productivity Built-In",
    desc: "Take notes, set reminders, save articles — all inside your news portal.",
  },
];

export default function LandingPage() {
  const { setPage, user } = useApp();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const NAV_LINKS = [
    { label: "Features", id: "features" },
    { label: "Categories", id: "profiles" },
    { label: "About", id: "why" },
  ];

  return (
    <div className="bg-smoke min-h-screen">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-[200] px-[60px] py-4 flex items-center bg-smoke/92 backdrop-blur-[12px] border-b border-gold/30">
        <button
          onClick={() =>
            user
              ? setPage("dashboard")
              : window.scrollTo({ top: 0, behavior: "smooth" })
          }
          className="bg-transparent border-none cursor-pointer p-0"
        >
          <LogoDark size="md" />
        </button>
        <div className="flex gap-8 ml-12">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={label}
              onClick={() => scrollTo(id)}
              className="text-[13.5px] text-text-secondary font-medium cursor-pointer hover:text-maroon transition-colors duration-200 bg-transparent border-none p-0"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-3 items-center">
          <Button variant="ghost" size="sm" onClick={() => setPage("login")}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => setPage("signup")}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-[140px] pb-[100px] px-[60px] grid grid-cols-2 gap-[60px] items-center max-w-[1280px] mx-auto">
        <div className="fade-in">
          <div className="inline-flex items-center gap-2 bg-maroon/8 border border-maroon/20 text-maroon px-3.5 py-1.5 rounded-full text-[11.5px] font-bold tracking-[1px] uppercase mb-5">
            <DiamondIcon size={8} className="text-gold" />
            AI-Powered News Intelligence
          </div>
          <h1 className="font-playfair text-[60px] font-extrabold leading-[1.1] text-text-primary mb-5">
            Not just news.
            <br />
            <em className="text-maroon not-italic">Your</em> news.
          </h1>
          <p className="text-[17px] text-text-secondary leading-[1.7] mb-9 max-w-[480px]">
            NewsCrest delivers hyper-personalised, AI-curated news based on who
            you are — not what the algorithm decides. Smart summaries, local
            updates, intelligent alerts.
          </p>
          <div className="flex gap-3.5 items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setPage("signup")}
            >
              Get Started Free
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => setPage("login")}
            >
              Explore News <ArrowRightIcon size={16} />
            </Button>
          </div>
          <div className="flex gap-8 mt-12 pt-8 border-t border-gold/30">
            {[
              ["15+", "News Categories"],
              ["10", "AI Features"],
              ["4", "User Personas"],
            ].map(([val, lab]) => (
              <div key={lab}>
                <div className="font-playfair text-[28px] font-bold text-maroon">
                  {val}
                </div>
                <div className="text-[12px] text-text-muted">{lab}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div
          className="relative slide-in-right"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="bg-gradient-to-br from-maroon to-maroon-dark rounded-[24px] p-6 shadow-[0_24px_60px_rgba(116,21,21,0.3)]">
            <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold px-3 py-1.5 rounded-full text-[11px] font-semibold mb-4 pulse-soft">
              <DiamondIcon size={6} />
              AI Personalisation Active
            </div>
            {/* Mini preview cards */}
            <div className="space-y-3">
              {[
                {
                  tag: "For You · Technology",
                  title: "OpenAI GPT-5 Released — What It Means for Developers",
                  meta: "TechCrunch · 2h ago · 4 min read",
                  accent: false,
                },
                {
                  tag: "Breaking · Finance",
                  title: "RBI Holds Rates: What It Means for Your EMIs",
                  meta: "Bloomberg · 30m ago",
                  accent: true,
                },
                {
                  tag: "Hatke · Politics",
                  title:
                    "Parliament discovers WiFi. Internet says: Proceed with caution.",
                  meta: "",
                  accent: false,
                  italic: true,
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className={`rounded-[14px] p-4 border ${c.accent ? "bg-gold/15 border-gold/30" : "bg-white/8 border-white/10"}`}
                >
                  <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-white/60 mb-1.5">
                    {c.tag}
                  </div>
                  <div
                    className={`font-playfair text-[13px] font-semibold text-white leading-[1.4] ${c.italic ? "italic" : ""}`}
                  >
                    {c.title}
                  </div>
                  {c.meta && (
                    <div className="text-[10px] text-white/40 mt-1.5">
                      {c.meta}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              {["12 Saved", "3 Alerts", "5 Notes"].map((chip) => (
                <div
                  key={chip}
                  className="text-[10px] font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full"
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Gold Divider ── */}
      <div
        className="h-px mx-[60px]"
        style={{
          background: "linear-gradient(90deg,transparent,#DAA520,transparent)",
        }}
      />

      {/* ── Features ── */}
      <section
        id="features"
        className="py-[80px] px-[60px] max-w-[1280px] mx-auto"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-maroon/8 border border-maroon/20 text-maroon px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] uppercase mb-4">
            What We Offer
          </div>
          <h2 className="font-playfair text-[42px] font-bold text-text-primary leading-[1.2]">
            Intelligent features for
            <br />
            <em className="text-maroon not-italic">smarter</em> reading
          </h2>
          <p className="text-[15px] text-text-secondary mt-4 max-w-[520px] mx-auto">
            Every feature is designed to reduce noise, amplify relevance, and
            make news consumption a pleasure.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="card-reveal bg-white rounded-card border border-gold-subtle p-6 shadow-card hover:shadow-card-md hover:-translate-y-1 transition-all duration-250 group"
            >
              <div className="w-10 h-10 rounded-[10px] bg-maroon/8 flex items-center justify-center text-maroon mb-4 group-hover:bg-maroon group-hover:text-white transition-all duration-300">
                <Icon size={20} />
              </div>
              <h3 className="font-playfair text-[17px] font-bold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-[13.5px] text-text-secondary leading-[1.6]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Profiles ── */}
      <section
        id="profiles"
        className="py-[80px] px-[60px] max-w-[1280px] mx-auto"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-maroon/8 border border-maroon/20 text-maroon px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] uppercase mb-4">
            Built For Everyone
          </div>
          <h2 className="font-playfair text-[42px] font-bold text-text-primary leading-[1.2]">
            News that knows
            <br />
            <em className="text-maroon not-italic">who you are</em>
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-5">
          {PROFILES.map(({ initial, name, tags }) => (
            <div
              key={name}
              className="card-reveal bg-white rounded-card border border-gold-subtle p-6 text-center shadow-card hover:shadow-card-md hover:-translate-y-1 hover:border-gold/50 transition-all duration-250"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-maroon to-maroon-dark flex items-center justify-center text-white font-playfair font-bold text-xl mx-auto mb-3">
                {initial}
              </div>
              <h3 className="font-playfair text-[17px] font-bold text-text-primary mb-0.5">
                {name}
              </h3>
              <p className="text-[12px] text-text-muted mb-3">
                Personalised for
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-medium bg-maroon/8 text-maroon px-2.5 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      
      {/* ── Profiles ── */}
      <section id="profiles" className="py-[80px] px-[60px] max-w-[1280px] mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-maroon/8 border border-maroon/20 text-maroon px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] uppercase mb-4">Built For Everyone</div>
          <h2 className="font-playfair text-[42px] font-bold text-text-primary leading-[1.2]">
            News that knows<br /><em className="text-maroon not-italic">who you are</em>
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-5">
          {PROFILES.map(({ initial, name, tags }) => (
            <div key={name} className="card-reveal bg-white rounded-card border border-gold-subtle p-6 text-center shadow-card hover:shadow-card-md hover:-translate-y-1 hover:border-gold/50 transition-all duration-250">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-maroon to-maroon-dark flex items-center justify-center text-white font-playfair font-bold text-xl mx-auto mb-3">
                {initial}
              </div>
              <h3 className="font-playfair text-[17px] font-bold text-text-primary mb-0.5">{name}</h3>
              <p className="text-[12px] text-text-muted mb-3">Personalised for</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {tags.map(t => (
                  <span key={t} className="text-[11px] font-medium bg-maroon/8 text-maroon px-2.5 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

{/* ── Why Choose Us ── */}
      <section id="why" className="bg-wheat py-[80px] px-[60px]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-maroon/8 border border-maroon/20 text-maroon px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] uppercase mb-4">Why NewsCrest</div>
            <h2 className="font-playfair text-[42px] font-bold text-text-primary leading-[1.2]">
              The <em className="text-maroon not-italic">intelligent</em> way<br />to stay informed
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {WHYS.map(({ Icon, title, desc }) => (
              <div key={title} className="card-reveal flex gap-4 bg-white/70 rounded-card p-5 border border-gold-subtle hover:shadow-card transition-all duration-200">
                <div className="w-10 h-10 rounded-[10px] bg-maroon/8 flex items-center justify-center text-maroon flex-shrink-0 mt-0.5">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-playfair text-[17px] font-bold text-text-primary mb-1.5">{title}</h3>
                  <p className="text-[13.5px] text-text-secondary leading-[1.6]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-maroon to-maroon-dark py-[80px] px-[60px] text-center">
        <div className="max-w-[640px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] uppercase mb-5">
            Join NewsCrest Today
          </div>
          <h2 className="font-playfair text-[42px] font-extrabold text-white leading-[1.2] mb-3.5">
            Start reading news
            <br />
            that's truly yours
          </h2>
          <p className="text-white/60 text-[16px] mb-9">
            Sign up in 2 minutes. Set your profile. Get personalised news
            instantly.
          </p>
          <div className="flex gap-3.5 justify-center">
            <Button variant="gold" size="lg" onClick={() => setPage("signup")}>
              Create Free Account
            </Button>
            <button
              onClick={() => setPage("login")}
              className="px-8 py-3.5 text-[15px] font-semibold text-white border-[1.5px] border-white/40 rounded-[12px] cursor-pointer hover:bg-white/10 transition-colors duration-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-maroon-dark border-t border-white/10 pt-14 pb-6 px-[60px]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-4 gap-10 mb-12">
            <div>
              <LogoDark size="md" className="[&>span]:text-white" />
              <p className="text-[13px] text-white/45 mt-3 leading-[1.7]">
                An AI-powered personalised news portal delivering intelligence,
                not just information.
              </p>
            </div>
            {[
              {
                title: "Features",
                links: [
                  "AI Chatbot",
                  "AI Comparison",
                  "Saved Articles",
                  "Notes",
                  "Hatke",
                ],
              },
              {
                title: "Categories",
                links: ["Technology", "Finance", "Sports", "Health", "World"],
              },
              {
                title: "Company",
                links: ["About", "Contact", "Privacy", "Terms"],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h5 className="font-playfair font-bold text-white/80 mb-4">
                  {title}
                </h5>
                <div className="space-y-2.5">
                  {links.map((l) => (
                    <a
                      key={l}
                      className="block text-[13px] text-white/45 hover:text-white cursor-pointer transition-colors duration-200"
                    >
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex justify-between items-center">
            <p className="text-[12px] text-white/40">
              © 2026 NewsCrest. All rights reserved.
            </p>
            <p className="text-[12px] text-white/25">
              Not just news. <em>Your</em> news.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
