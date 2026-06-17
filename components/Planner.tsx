"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TRIP } from "@/lib/trip";
import type { Participant } from "@/lib/types";
import {
  MONTH_NAMES, DOW, iso, bestWindows, span, runDates, fmtRange, glowColor,
} from "@/lib/dates";

type Props = { initialParticipants: Participant[]; configured: boolean };

const NAME_KEY = "quando:name";
const ID_KEY = "quando:id";

export default function Planner({ initialParticipants, configured }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [myId, setMyId] = useState<string>("");
  const [myName, setMyName] = useState<string>("");
  const [mySel, setMySel] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable identity without login: a per-browser id + remembered name.
  useEffect(() => {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `u${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(ID_KEY, id);
    }
    setMyId(id);
    const savedName = localStorage.getItem(NAME_KEY) ?? "";
    setMyName(savedName);
    const mine = initialParticipants.find((p) => p.id === id);
    if (mine) { setMySel(new Set(mine.dates)); setSaved(true); }
  }, [initialParticipants]);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }

  // Everyone, with the current user's live (unsaved) selection folded in.
  const effective = useMemo<Participant[]>(() => {
    const others = participants.filter((p) => p.id !== myId);
    if (myName.trim() && mySel.size) {
      return [...others, { id: myId, name: myName.trim(), dates: [...mySel] }];
    }
    return others;
  }, [participants, myId, myName, mySel]);

  // Filter: which people the calendar is currently reflecting.
  // null = everyone (default). A Set = only those ids.
  const [includedIds, setIncludedIds] = useState<Set<string> | null>(null);
  const isIncluded = (id: string) => includedIds === null || includedIds.has(id);

  const filtered = useMemo(
    () => effective.filter((p) => isIncluded(p.id)),
    [effective, includedIds],
  );
  const filtering = includedIds !== null;

  function togglePerson(id: string) {
    setIncludedIds((prev) => {
      const all = new Set(effective.map((p) => p.id));
      const next = prev === null ? new Set(all) : new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Back to "everyone"? collapse to null.
      if (next.size === all.size && [...all].every((x) => next.has(x))) return null;
      return next;
    });
  }
  function includeEveryone() { setIncludedIds(null); }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of filtered) for (const d of p.dates) c[d] = (c[d] ?? 0) + 1;
    return c;
  }, [filtered]);

  const total = Math.max(1, filtered.length);

  const { max, runs } = useMemo(() => bestWindows(counts, TRIP.months), [counts]);
  const bestSet = useMemo(() => new Set(runs[0] ? runDates(runs[0]) : []), [runs]);

  // Short description of the active filter, for the verdict card.
  const filterLabel = useMemo(() => {
    if (!filtering) return null;
    if (filtered.length === 0) return "no-one";
    if (filtered.length <= 2) return filtered.map((p) => firstName(p, myId)).join(" & ");
    return `these ${filtered.length}`;
  }, [filtering, filtered, myId]);

  const others = participants.filter((p) => p.id !== myId);

  function toggle(s: string) {
    if (!myName.trim()) { flash("Add your name first ↑"); return; }
    setMySel((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    if (!myName.trim() || mySel.size === 0 || saving) return;
    localStorage.setItem(NAME_KEY, myName.trim());
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: myId, name: myName.trim(), dates: [...mySel] }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error ?? "Couldn't save — try again."); return; }
      setParticipants(data.participants ?? []);
      setSaved(true);
      flash(`Saved — you're on the list, ${myName.trim().split(" ")[0]}! ☀`);
    } catch {
      flash("Couldn't save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const ready = myName.trim().length > 0 && mySel.size > 0;
  const hint = mySel.size
    ? `${mySel.size} day${mySel.size > 1 ? "s" : ""} selected${saved ? " · saved" : ""}`
    : "Add your name, then tap the days you're free.";

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="mark"><span className="q">Quando</span>?</div>
          <div className="sub">{TRIP.name} · {TRIP.subtitle}</div>
        </div>
        <div className="answered">
          {others.length ? (
            <>
              <div className="dots">
                {others.slice(0, 5).map((p) => (
                  <span key={p.id} title={p.name}>{p.name[0]?.toUpperCase()}</span>
                ))}
              </div>
              <span>{others.length} {others.length === 1 ? "friend has" : "friends have"} answered</span>
            </>
          ) : (
            <span>No-one&apos;s answered yet</span>
          )}
        </div>
      </header>

      {!configured && (
        <div className="notice">
          Storage isn&apos;t connected yet, so saves won&apos;t stick. Add an Upstash Redis
          integration on Vercel (see the <code>README</code>), then redeploy. You can still
          tap around below to try it.
        </div>
      )}

      <section className="hero">
        <h1 dangerouslySetInnerHTML={{ __html: headline(TRIP.headline) }} />
        <p className="lede">
          Tap the days you&apos;re free. Every day lights up brighter the more of you can make it —
          so the answer to &ldquo;when?&rdquo; stops being an argument and starts being obvious.
        </p>

        {filtered.length === 0 && filtering ? (
          <div className="verdict empty">
            <div className="eyebrow">Filtered</div>
            <div className="vdate">No-one selected. Tap a name below to compare people.</div>
          </div>
        ) : max === 0 ? (
          <div className="verdict empty">
            <div className="eyebrow">Best date so far</div>
            <div className="vdate">Nothing yet — be the first to add your free days.</div>
          </div>
        ) : (
          <div className="verdict">
            <div className="eyebrow">☀ {filterLabel ? `Best date for ${filterLabel}` : "Best date so far"}</div>
            <div className="vdate">{fmtRange(runs[0])}</div>
            <div className="meta">
              <b>{max} of {total}</b> can make {span(runs[0]) > 1 ? "every day of it" : "it"}
              {max === total ? (filtering ? " — all of them! 🎉" : " — that's everyone! 🎉") : ""}
            </div>
            {runs.length > 1 && (
              <div className="alts">
                <span className="lbl">also good:</span>
                {runs.slice(1, 4).map((r, i) => (
                  <span className="chip" key={i}>{fmtRange(r)}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="yourow">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          placeholder="e.g. Marco"
          autoComplete="off"
          value={myName}
          onChange={(e) => { setMyName(e.target.value); setSaved(false); }}
        />
        <span className="hint">{hint}</span>
        <button className="btn" disabled={!ready || saving} onClick={save}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save my dates"}
        </button>
      </div>

      {effective.length > 0 && (
        <div className="filterbar">
          <span className="flabel">Showing</span>
          <button
            className={`fchip all${!filtering ? " active" : ""}`}
            aria-pressed={!filtering}
            onClick={includeEveryone}
          >
            Everyone
          </button>
          {effective
            .slice()
            .sort((a, b) => firstName(a, myId).localeCompare(firstName(b, myId)))
            .map((p) => {
              const on = isIncluded(p.id);
              return (
                <button
                  key={p.id}
                  className={`fchip${on ? " active" : ""}`}
                  aria-pressed={on}
                  onClick={() => togglePerson(p.id)}
                >
                  <span className="fav">{firstName(p, myId)[0]?.toUpperCase()}</span>
                  {firstName(p, myId)}
                </button>
              );
            })}
        </div>
      )}

      <div className="legend">
        <span className="scale">
          <span>Nobody</span>
          <span className="sw" style={{ background: "#fff" }} />
          <span className="sw" style={{ background: glowColor(0.34) }} />
          <span className="sw" style={{ background: glowColor(0.67) }} />
          <span className="sw" style={{ background: glowColor(1) }} />
          <span>{filtering ? "All selected free" : "Everyone free"}</span>
        </span>
        <span className="mine"><span className="ring" /> = the days you picked</span>
      </div>

      <div className="months">
        {TRIP.months.map(([y, m]) => (
          <Month
            key={`${y}-${m}`}
            year={y}
            month={m}
            counts={counts}
            total={total}
            mySel={mySel}
            bestSet={bestSet}
            today={today}
            onToggle={toggle}
          />
        ))}
      </div>

      <p className="footnote">
        No accounts, no apps. Share one link, everyone taps their free days, the brightest date wins.
      </p>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}

function headline(text: string): string {
  // Italicise "all" if present, to match the design accent.
  return text.replace(/\ball\b/i, (m) => `<em>${m}</em>`);
}

function firstName(p: Participant, myId: string): string {
  if (p.id === myId) return "You";
  return p.name.split(" ")[0] || p.name;
}

type MonthProps = {
  year: number; month: number;
  counts: Record<string, number>; total: number;
  mySel: Set<string>; bestSet: Set<string>; today: Date;
  onToggle: (s: string) => void;
};

function Month({ year, month, counts, total, mySel, bestSet, today, onToggle }: MonthProps) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < lead; i++) cells.push(<div className="cell empty" key={`e${i}`} />);

  for (let d = 1; d <= dim; d++) {
    const s = iso(year, month, d);
    const cnt = counts[s] ?? 0;
    const p = total ? cnt / total : 0;
    const past = new Date(year, month, d) < today;
    const mine = mySel.has(s);
    const best = bestSet.has(s);
    const cls = [
      "cell",
      past ? "past" : "",
      cnt === 0 ? "glow0" : "",
      mine ? "mine" : "",
      best ? "best" : "",
    ].filter(Boolean).join(" ");

    cells.push(
      <button
        key={s}
        className={cls}
        style={cnt > 0 ? { background: glowColor(p) } : undefined}
        disabled={past}
        aria-pressed={mine}
        aria-label={`${s}${cnt ? `, ${cnt} free` : ""}`}
        onClick={() => onToggle(s)}
      >
        {best && <span className="sun">☀</span>}
        {d}
        {cnt > 0 && <span className="cnt">{cnt}</span>}
      </button>,
    );
  }

  return (
    <div className="month">
      <h3>{MONTH_NAMES[month]} <span>{year}</span></h3>
      <div className="dow">{DOW.map((x) => <div key={x}>{x}</div>)}</div>
      <div className="grid">{cells}</div>
    </div>
  );
}
