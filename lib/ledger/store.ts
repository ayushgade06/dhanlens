"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { EventNote } from "../domain/types";

// Notes and demo preferences only. No credentials or broker data are ever written here.
const KEY = "dhanlens.ledger.v1";
const HISTORY_LIMIT = 5;

const noteSchema = z.object({
  eventId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  preEventNote: z.string(),
  noteHistory: z.array(z.object({ note: z.string(), at: z.string() })),
  watchItems: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })),
  reflection: z.string(),
  reviewedAt: z.string().optional(),
  isSeed: z.boolean().optional(),
});
const storeSchema = z.record(z.string(), noteSchema);

export type Notes = Record<string, EventNote>;

const listeners = new Set<() => void>();
const seedMaps = new WeakMap<EventNote[], Notes>();
let cache: { raw: string | null; seed: EventNote[]; value: Notes } | undefined;

function seedMap(seed: EventNote[]): Notes {
  let map = seedMaps.get(seed);
  if (!map) seedMaps.set(seed, (map = Object.fromEntries(seed.map((n) => [n.eventId, n]))));
  return map;
}

function read(seed: EventNote[]): Notes {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode): fall back to the seed, in memory only.
  }
  if (cache && cache.raw === raw && (raw !== null || cache.seed === seed)) return cache.value;
  let value = seedMap(seed);
  if (raw !== null) {
    try {
      const parsed = storeSchema.safeParse(JSON.parse(raw));
      if (parsed.success) value = parsed.data;
    } catch {
      // Corrupt JSON: ignore it rather than crash the ledger.
    }
  }
  cache = { raw, seed, value };
  return value;
}

function write(next: Notes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return; // nothing persisted, so nothing to announce
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export interface Ledger {
  notes: Notes;
  save(eventId: string, suggestedWatchItems: string[]): void;
  remove(eventId: string): void;
  /** Saves a revised pre-event note, keeping the previous text in a short history. */
  setPreEventNote(eventId: string, note: string): void;
  patch(eventId: string, change: Partial<Pick<EventNote, "watchItems" | "reflection" | "reviewedAt">>): void;
  /** Clears all local notes and restores the seeded demo note. */
  reset(): void;
}

export function useLedger(seed: EventNote[]): Ledger {
  const notes = useSyncExternalStore(
    subscribe,
    () => read(seed),
    () => seedMap(seed),
  );

  const update = (eventId: string, fn: (note: EventNote, now: string) => EventNote) => {
    const current = read(seed);
    const note = current[eventId];
    if (!note) return;
    const now = new Date().toISOString();
    write({ ...current, [eventId]: { ...fn(note, now), updatedAt: now, isSeed: undefined } });
  };

  return {
    notes,
    save(eventId, suggestedWatchItems) {
      const current = read(seed);
      if (current[eventId]) return;
      const now = new Date().toISOString();
      write({
        ...current,
        [eventId]: {
          eventId,
          createdAt: now,
          updatedAt: now,
          preEventNote: "",
          noteHistory: [],
          watchItems: suggestedWatchItems.map((label) => ({ id: crypto.randomUUID(), label, done: false })),
          reflection: "",
        },
      });
    },
    remove(eventId) {
      const next = { ...read(seed) };
      delete next[eventId];
      write(next);
    },
    setPreEventNote(eventId, text) {
      update(eventId, (note, now) =>
        text === note.preEventNote
          ? note
          : {
              ...note,
              preEventNote: text,
              noteHistory: note.preEventNote
                ? [{ note: note.preEventNote, at: now }, ...note.noteHistory].slice(0, HISTORY_LIMIT)
                : note.noteHistory,
            },
      );
    },
    patch(eventId, change) {
      update(eventId, (note) => ({ ...note, ...change }));
    },
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // nothing stored
      }
      listeners.forEach((l) => l());
    },
  };
}
