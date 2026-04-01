// src/pages/NotesPage.jsx
import { useState } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button, Tabs, EmptyState } from "../components/ui/Primitives";
import {
  PinIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon,
  CalendarIcon,
  NoteIcon,
  ClockIcon,
  XIcon,
} from "../components/ui/Icons";

function formatTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoteCard({ note, onDone, onPin, onDelete, onOpenArticle }) {
  return (
    <div
      className={`card-reveal bg-white rounded-card border p-5 transition-all duration-250 hover:shadow-card-md relative ${note.pinned ? "note-pinned border-gold/40" : "border-gold-subtle"} ${note.done ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3
          className={`font-playfair text-[16px] font-bold text-text-primary leading-[1.3] flex-1 pr-2 ${note.done ? "line-through text-text-muted" : ""}`}
        >
          {note.title}
        </h3>
        <div className="flex gap-1 flex-shrink-0">
          <button
            className={`w-6 h-6 rounded-full flex items-center justify-center hover:bg-smoke transition-colors duration-200 ${note.pinned ? "text-gold-muted" : "text-text-muted"}`}
            onClick={() => onPin(note.id)}
          >
            <PinIcon size={13} />
          </button>
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
            onClick={() => onDelete(note.id)}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      <p className="text-[13.5px] text-text-secondary leading-[1.6] mb-3">
        {note.content}
      </p>

      {note.articleTitle && (
        <button
          onClick={() => onOpenArticle?.(note.articleTitle)}
          className="text-[11px] text-maroon bg-maroon/6 px-2.5 py-1 rounded-full inline-block mb-3 hover:bg-maroon/12 transition-colors duration-200 cursor-pointer text-left"
        >
          Linked: {note.articleTitle}
        </button>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gold/15">
        <div className="space-y-0.5">
          {note.due && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <CalendarIcon size={11} />
              <span>Due: {note.due}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <ClockIcon size={11} />
            <span>Created: {formatTime(note.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => onDone(note.id)}
          className={`flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-all duration-200 ${note.done ? "bg-green-500/10 text-green-700 border-green-500/20" : "border-gold/25 text-text-muted hover:border-gold hover:text-text-primary"}`}
        >
          <CheckIcon size={11} /> {note.done ? "Done" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    openArticle,
    feedArticles,
    headlines,
  } = useApp();
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", due: "" });

  const handleAdd = () => {
    if (!form.title.trim() && !form.content.trim()) return;
    addNote({
      title: form.title || "Untitled Note",
      content: form.content,
      pinned: false,
      done: false,
      status: "inprogress",
      due: form.due || null,
      articleTitle: null,
    });
    setForm({ title: "", content: "", due: "" });
    setShowForm(false);
  };

  const handleOpenArticle = (articleTitle) => {
    const allArticles = [...(headlines || []), ...(feedArticles || [])];
    const article = allArticles.find(
      (a) =>
        a.title === articleTitle ||
        a.title.includes(articleTitle?.slice(0, 20) || ""),
    );
    if (article) openArticle(article);
  };

  const filtered = notes.filter((n) => {
    if (tab === "All") return true;
    if (tab === "Pinned") return n.pinned;
    if (tab === "In Progress") return !n.done && n.status !== "completed";
    if (tab === "Completed") return n.done || n.status === "completed";
    return true;
  });

  return (
    <AppShell title="Notes">
      <div className="flex items-center justify-between mb-6 slide-in-left">
        <div>
          <h2 className="font-playfair text-2xl font-bold text-text-primary section-title-underline inline-block">
            Notes
          </h2>
          <p className="text-[13.5px] text-text-muted mt-1.5">
            {notes.length} notes · {notes.filter((n) => !n.done).length} active
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <PlusIcon size={15} /> New Note
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-card border border-gold/40 shadow-card-md p-6 mb-6 panel-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-playfair text-[18px] font-bold text-text-primary">
              New Note
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <XIcon size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                Note Title
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Give your note a title..."
                className="w-full px-4 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[14px] text-text-primary bg-white outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                Note Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Write your thoughts, ideas, or reminders..."
                rows={4}
                className="w-full px-4 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[14px] text-text-secondary bg-white outline-none focus:border-gold resize-none leading-[1.6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                Due Date (optional)
              </label>
              <div className="relative">
                <CalendarIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="date"
                  value={form.due}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due: e.target.value }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[14px] text-text-primary bg-white outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5 pt-4 border-t border-gold/20">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              Save Note
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mb-5 fade-in">
        <Tabs
          tabs={["All", "Pinned", "In Progress", "Completed"]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-card border border-gold-subtle fade-in">
          <EmptyState
            icon={<NoteIcon size={48} />}
            title="No notes here"
            desc="Switch tabs or create a new note."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onDone={(id) => {
                const current = notes.find((x) => x.id === id);
                updateNote(id, {
                  done: !current?.done,
                  status: current?.done ? "inprogress" : "completed",
                });
              }}
              onPin={(id) => {
                const current = notes.find((x) => x.id === id);
                updateNote(id, { pinned: !current?.pinned });
              }}
              onDelete={deleteNote}
              onOpenArticle={handleOpenArticle}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
