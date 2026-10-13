"use client";

import { useState } from "react";
import { Lock, Plus, X } from "lucide-react";
import type { EventNote } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { useAppData } from "./app-data";
import { buttonClass, DemoTag, fieldClass } from "./ui";

/** Remounted via `key` whenever the stored text changes, so the draft always starts from it. */
function NoteDraft({
  initial,
  onSave,
  label,
  placeholder,
}: {
  initial: string;
  onSave: (text: string) => void;
  label: string;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(initial);
  const dirty = draft !== initial;
  return (
    <>
      <textarea
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className={fieldClass}
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={!dirty} onClick={() => onSave(draft.trim())} className={buttonClass}>
          Save note
        </button>
        <span className="text-xs text-muted" aria-live="polite">
          {dirty ? "Unsaved changes" : initial ? "Saved in this browser" : ""}
        </span>
      </div>
    </>
  );
}

/** Pre-event note and watch items for a saved event. The note locks once the event is released. */
export function LedgerNotes({ note, released }: { note: EventNote; released: boolean }) {
  const { ledger } = useAppData();
  const [newItem, setNewItem] = useState("");
  const setItems = (watchItems: EventNote["watchItems"]) => ledger.patch(note.eventId, { watchItems });

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h4 className="label">Pre-event note</h4>
          {note.isSeed && <DemoTag>Seeded demo note</DemoTag>}
          {released && (
            <span className="label inline-flex items-center gap-1 text-muted">
              <Lock size={11} aria-hidden="true" /> Locked at release
            </span>
          )}
        </div>
        {released ? (
          <p className="border-l-2 border-muted pl-3 text-sm italic">{note.preEventNote || "No note was written before the event."}</p>
        ) : (
          <NoteDraft
            key={note.preEventNote}
            initial={note.preEventNote}
            label="Pre-event note"
            placeholder="e.g. I want to watch management's margin guidance."
            onSave={(text) => ledger.setPreEventNote(note.eventId, text)}
          />
        )}
        <p className="mt-1.5 font-mono text-xs text-muted">
          Saved {formatDateTime(note.createdAt)} · last edited {formatDateTime(note.updatedAt)}
        </p>
        {note.noteHistory.length > 0 && (
          <details className="mt-1.5 text-sm">
            <summary className="label cursor-pointer text-muted hover:text-fg">Earlier versions ({note.noteHistory.length})</summary>
            <ul className="mt-1.5 space-y-1.5">
              {note.noteHistory.map((h) => (
                <li key={h.at} className="border-l border-rule pl-3 text-muted">
                  {h.note}
                  <span className="block font-mono text-xs">replaced {formatDateTime(h.at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div>
        <h4 className="label mb-1.5">What to watch</h4>
        <ul className="divide-y divide-rule border-y border-rule">
          {note.watchItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 py-1.5">
              <input
                id={`watch-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={() => setItems(note.watchItems.map((w) => (w.id === item.id ? { ...w, done: !w.done } : w)))}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              <label htmlFor={`watch-${item.id}`} className={`flex-1 text-sm ${item.done ? "text-muted line-through" : ""}`}>
                {item.label}
              </label>
              <button
                type="button"
                aria-label={`Remove “${item.label}”`}
                onClick={() => setItems(note.watchItems.filter((w) => w.id !== item.id))}
                className="p-1 text-muted hover:text-fg"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          {note.watchItems.length === 0 && <li className="py-2 text-sm text-muted">Nothing on the list yet.</li>}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const label = newItem.trim();
            if (!label) return;
            setItems([...note.watchItems, { id: crypto.randomUUID(), label, done: false }]);
            setNewItem("");
          }}
        >
          <input
            aria-label="Add something to watch"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add your own observation to watch"
            className={fieldClass}
          />
          <button type="submit" disabled={!newItem.trim()} className={buttonClass}>
            <Plus size={14} aria-hidden="true" /> Add
          </button>
        </form>
        <p className="mt-1.5 text-xs text-muted">Observations to check, not trade instructions. No consensus-estimate source is configured.</p>
      </div>
    </div>
  );
}

/** Post-event reflection: the "learn" step. */
export function Reflection({ note, canReview }: { note: EventNote; canReview: boolean }) {
  const { ledger } = useAppData();
  return (
    <div>
      <NoteDraft
        key={note.reflection}
        initial={note.reflection}
        label="What I want to remember"
        placeholder="What was released, what the market did in the window, and what you want to remember."
        onSave={(text) => ledger.patch(note.eventId, { reflection: text })}
      />
      {canReview && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => ledger.patch(note.eventId, { reviewedAt: note.reviewedAt ? undefined : new Date().toISOString() })}
            className={buttonClass}
          >
            {note.reviewedAt ? "Reopen review" : "Mark as reviewed"}
          </button>
          {note.reviewedAt && <span className="font-mono text-xs text-muted">Reviewed {formatDateTime(note.reviewedAt)}</span>}
        </div>
      )}
    </div>
  );
}
