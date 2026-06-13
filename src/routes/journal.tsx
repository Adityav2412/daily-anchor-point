import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, formatISTDate } from "@/lib/ist";
import { Shuffle, Trash2, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Journal — LIFE" }] }),
  component: JournalPage,
});

const QUESTIONS: { key: keyof NonNullable<ReturnType<typeof useToday>["journal"]>; label: string; placeholder: string }[] = [
  { key: "feeling", label: "How are you feeling?", placeholder: "A few words is enough…" },
  { key: "wentWell", label: "What went well today?", placeholder: "Anything small counts." },
  { key: "difficult", label: "What was difficult today?", placeholder: "No judgment." },
  { key: "tomorrow", label: "One thing for tomorrow?", placeholder: "Just one." },
];

function JournalPage() {
  const today = useToday();
  const allDays = useStore((s) => s.days);
  const memory = useStore((s) => s.memoryJar ?? []);
  const [past, setPast] = useState<string | null>(null);
  const [surprise, setSurprise] = useState<{ text: string; dateKey: string } | null>(null);
  const [editMemId, setEditMemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const drawSurprise = () => {
    if (!memory.length) return;
    const pick = memory[Math.floor(Math.random() * memory.length)];
    setSurprise({ text: pick.text, dateKey: pick.dateKey });
  };

  const pastDays = useMemo(() => {
    const tk = istDateKey();
    return Object.keys(allDays)
      .filter((k) => k !== tk && allDays[k].journal && Object.values(allDays[k].journal!).some(Boolean))
      .sort((a, b) => b.localeCompare(a));
  }, [allDays]);

  return (
    <AppShell title="Journal" subtitle="Lightweight reflection.">
      <div className="space-y-4 stagger">
        {/* Today's reflection */}
        <div className="card-paper p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Today</div>
          <div className="space-y-3">
            {QUESTIONS.map((q) => (
              <JournalField
                key={q.key}
                label={q.label}
                placeholder={q.placeholder}
                value={today.journal?.[q.key] ?? ""}
                onSave={(v) => actions.setJournal({ [q.key]: v || undefined } as any)}
              />
            ))}
          </div>
        </div>

        {/* Memory Jar */}
        <section>
          <header className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-xl tracking-tight">Memory Jar</h2>
            <button
              onClick={drawSurprise}
              disabled={!memory.length}
              className="rounded-full bg-lavender text-[#1A1C1A] px-3 py-1.5 text-xs font-semibold press flex items-center gap-1 disabled:opacity-40"
            >
              <Shuffle size={12} /> Surprise me
            </button>
          </header>

          {surprise && (
            <div className="card-cream p-5 text-center mb-3 animate-fade-up">
              <div className="text-3xl mb-2">🏆</div>
              <p className="font-display text-[20px] leading-snug">"{surprise.text}"</p>
              <p className="text-[11px] text-muted-foreground mt-2">{formatISTDate(surprise.dateKey)}</p>
              <button onClick={drawSurprise} className="text-[11px] text-sage font-semibold mt-3 press">Draw another</button>
            </div>
          )}

          {memory.length === 0 ? (
            <div className="card-paper p-6 text-center text-sm text-muted-foreground italic">
              Wins you log on Today will collect here.
            </div>
          ) : (
            <div className="space-y-2">
              {memory.slice(0, 30).map((m) => (
                <div key={m.id} className="card-paper p-3 flex items-start gap-2">
                  <span className="text-base mt-0.5">🏆</span>
                  {editMemId === m.id ? (
                    <>
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
                        className="flex-1 rounded-full bg-muted px-3 py-1.5 text-sm outline-none" />
                      <button onClick={() => { actions.updateMemory(m.id, editText); setEditMemId(null); }} className="text-sage press"><Check size={14} /></button>
                      <button onClick={() => setEditMemId(null)} className="text-muted-foreground press"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{m.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatISTDate(m.dateKey)}</p>
                      </div>
                      <button onClick={() => { setEditMemId(m.id); setEditText(m.text); }} className="text-muted-foreground hover:text-foreground press p-1"><Pencil size={12} /></button>
                      <button onClick={() => actions.removeMemory(m.id)} className="text-muted-foreground hover:text-foreground press p-1"><Trash2 size={12} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past days */}
        {pastDays.length > 0 && (
          <section>
            <h2 className="font-display text-lg mb-2 px-1">Previous days</h2>
            <div className="space-y-2">
              {pastDays.slice(0, 14).map((k) => {
                const j = allDays[k].journal!;
                return (
                  <button
                    key={k}
                    onClick={() => setPast(past === k ? null : k)}
                    className="w-full card-paper p-4 text-left press"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatISTDate(k)}</div>
                    {past === k ? (
                      <div className="mt-2 space-y-2 animate-fade-up">
                        {QUESTIONS.map((q) => j[q.key] && (
                          <div key={q.key}>
                            <div className="text-[10px] text-muted-foreground">{q.label}</div>
                            <p className="text-sm mt-0.5">{j[q.key]}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/70 mt-1 truncate">
                        {[j.feeling, j.wentWell, j.difficult, j.tomorrow].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function JournalField({ label, placeholder, value, onSave }: { label: string; placeholder: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <div>
      <label className="text-[11px] text-muted-foreground block mb-1">{label}</label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-muted p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
      />
    </div>
  );
}
