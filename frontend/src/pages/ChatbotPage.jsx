// src/pages/ChatbotPage.jsx
import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button } from "../components/ui/Primitives";
import { chatbotAPI } from "../services/api";
import {
  SendIcon,
  BotIcon,
  SearchIcon,
  TrendingIcon,
  GlobeIcon,
  ZapIcon,
} from "../components/ui/Icons";

const SUGGESTIONS = [
  { label: "Latest AI news", query: "Latest AI news" },
  {
    label: "What happened in India today?",
    query: "What happened in India today?",
  },
  { label: "Sports updates", query: "Sports updates" },
  { label: "Health advisories", query: "Health advisories" },
];

const QUICK_CMDS = [
  { Icon: TrendingIcon, label: "Top Headlines" },
  { Icon: GlobeIcon, label: "Global Politics" },
  { Icon: ZapIcon, label: "Breaking News" },
  { Icon: SearchIcon, label: "Search Topic" },
];

export default function ChatbotPage() {
  const { openArticle, chatbotInitialQuery, setChatbotInitialQuery } = useApp();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
  { role: 'bot', text: 'Hi! I am your NewsCrest assistant. Ask me anything about the news!' }
]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Start session on mount
  useEffect(() => {
    chatbotAPI
      .startSession()
      .then((id) => {
        setSessionId(id);
        // Auto-send initial query from Daily Brief if present
        if (chatbotInitialQuery) {
          setChatbotInitialQuery(null);
          setTimeout(() => send(chatbotInitialQuery), 500);
        }
      })
      .catch(() => {
        const fallbackId = "local-" + Date.now();
        setSessionId(fallbackId);
        if (chatbotInitialQuery) {
          setChatbotInitialQuery(null);
          setTimeout(() => send(chatbotInitialQuery), 500);
        }
      });
  }, []);

  // Inside ChatbotPage.jsx
const send = async (queryOverride) => {
  const queryText = queryOverride || input;
  if (!queryText.trim()) return;

  const userMessage = { role: 'user', text: queryText };
  
  setMessages(prev => [...prev, userMessage]);
  setInput(""); 
  setTyping(true); // 🔥 Fix: Use setTyping, not setLoading

  try {
    const resp = await chatbotAPI.sendMessage(sessionId, queryText);

    const botMessage = { 
      role: 'ai', // 🔥 Fix: Match this to "ai" so your CSS/Icons work
      text: resp.text, 
      news: resp.news 
    };

    setMessages(prev => [...prev, botMessage]);
  } catch (err) {
    setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting. Try again?" }]);
  } finally {
    setTyping(false); // 🔥 Fix: Use setTyping
  }
};

  return (
    <AppShell title="AI Chatbot">
      <div
        className="grid grid-cols-[1fr_300px] gap-6"
        style={{ height: "calc(100vh - 130px)" }}
      >
        {/* Chat main */}
        <div className="flex flex-col bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden slide-in-left">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gold/25 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-maroon flex items-center justify-center">
              <BotIcon size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[13.5px] font-semibold text-text-primary">
                NewsCrest AI
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block pulse-dot" />
                {sessionId ? "Online · Ready to help" : "Connecting..."}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.query)}
                    className="bg-white border border-gold-subtle rounded-full px-3.5 py-1.5 text-[12.5px] text-text-secondary cursor-pointer hover:border-gold hover:text-maroon hover:bg-lemon transition-all duration-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[13px] ${msg.role === "ai" ? "bg-maroon text-white" : "bg-wheat text-maroon"}`}
                >
                  {msg.role === "ai" ? (
                    <BotIcon size={15} className="text-white" />
                  ) : msg.role === "user" ? (
                    "✦"
                  ) : (
                    "A"
                  )}
                </div>
                <div className="max-w-[70%]">
                  <div
                    className={`px-4 py-3 rounded-[16px] text-[14px] leading-[1.55] ${msg.role === "ai" ? "bg-white border border-gold-subtle text-text-primary rounded-tl-[4px]" : "bg-maroon text-white rounded-tr-[4px]"}`}
                  >
                    {msg.text}
                  </div>
                  {msg.news?.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.news.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          onClick={() => openArticle(a)}
                          className="bg-smoke border border-gold-subtle rounded-[12px] p-3 cursor-pointer hover:border-gold hover:shadow-card transition-all duration-200"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-[1px] text-maroon mb-1">
                            {a.category}
                          </div>
                          <div className="font-playfair text-[13px] font-semibold text-text-primary leading-[1.35]">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-text-muted mt-1">
                            {a.source} · {a.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-3 fade-in">
                <div className="w-9 h-9 rounded-full bg-maroon flex items-center justify-center flex-shrink-0">
                  <BotIcon size={15} className="text-white" />
                </div>
                <div className="bg-white border border-gold-subtle rounded-[16px] rounded-tl-[4px] px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-tan pulse-soft"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-gold/25 flex gap-3 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about any news topic..."
              disabled={typing}
              className="flex-1 px-4 py-2.5 border-[1.5px] border-gold/25 rounded-[12px] text-[14px] text-text-primary bg-smoke outline-none placeholder:text-text-muted focus:border-gold focus:bg-white transition-all duration-200 disabled:opacity-60"
            />
            <button
              onClick={() => send()}
              disabled={typing || !input.trim()}
              className="w-10 h-10 bg-maroon rounded-[10px] flex items-center justify-center text-white cursor-pointer hover:bg-maroon-dark transition-colors duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-card border border-gold-subtle shadow-card p-5 panel-slide-up">
            <h4 className="font-playfair text-[16px] font-bold text-text-primary mb-4">
              Quick Commands
            </h4>
            <div className="space-y-2">
              {QUICK_CMDS.map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  className="w-full flex items-center gap-3 p-3 rounded-[10px] border border-gold-subtle text-left cursor-pointer hover:border-gold hover:bg-lemon transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-[8px] bg-maroon/8 flex items-center justify-center text-maroon group-hover:bg-maroon group-hover:text-white transition-all duration-200">
                    <Icon size={14} />
                  </div>
                  <span className="text-[13px] font-medium text-text-primary">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-lemon rounded-card border border-gold/35 p-5 fade-in">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted mb-3">
              Pro Tip
            </div>
            <p className="text-[13px] text-text-secondary leading-[1.6]">
              Try asking: "Summarise today's top 3 stories" or "What's important
              for IT professionals today?"
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
