import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Investigation } from "./types";

export type WatchItem = {
  query: string;
  note: string;
  added: string;
};

type OsintState = {
  current: Investigation | null;
  history: Investigation[];
  watchlist: WatchItem[];
  ethicsAccepted: boolean;
  setCurrent: (inv: Investigation | null) => void;
  remember: (inv: Investigation) => void;
  acceptEthics: () => void;
  addWatch: (query: string, note?: string) => void;
  removeWatch: (query: string) => void;
  clearHistory: () => void;
};

export const useOsintStore = create<OsintState>()(
  persist(
    (set, get) => ({
      current: null,
      history: [],
      watchlist: [],
      ethicsAccepted: false,
      setCurrent: (inv) => set({ current: inv }),
      remember: (inv) => {
        const history = [
          inv,
          ...get().history.filter((h) => h.query !== inv.query),
        ].slice(0, 16);
        set({ current: inv, history });
      },
      acceptEthics: () => set({ ethicsAccepted: true }),
      addWatch: (query, note = "") => {
        const q = query.trim();
        if (!q) return;
        if (get().watchlist.some((w) => w.query === q)) return;
        set({
          watchlist: [
            { query: q, note, added: new Date().toISOString() },
            ...get().watchlist,
          ].slice(0, 40),
        });
      },
      removeWatch: (query) =>
        set({
          watchlist: get().watchlist.filter((w) => w.query !== query),
        }),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "omnitrace-v1",
      partialize: (s) => ({
        history: s.history.map((h) => ({
          ...h,
          sources: h.sources.map((src) => ({
            ...src,
            data: undefined,
          })),
        })),
        watchlist: s.watchlist,
        ethicsAccepted: s.ethicsAccepted,
      }),
    },
  ),
);
