"use client";
import { createContext, startTransition, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, parseNotebook, pruneNotebook, serializeNotebook, type EvidenceDraft, type ResearchNotebook } from "@/lib/researchNotebook";
type StorageState = "loading" | "ready" | "memory" | "corrupt";
type NotebookContext = { notebook: ResearchNotebook | null; state: StorageState; error: boolean; raw: string | null; add: (draft: EvidenceDraft) => void; update: (transform: (value: ResearchNotebook) => ResearchNotebook) => void; replace: (value: ResearchNotebook) => void; clear: () => void };
const Context = createContext<NotebookContext | null>(null);
export function ResearchNotebookProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [notebook, setNotebook] = useState<ResearchNotebook | null>(null);
  const [state, setState] = useState<StorageState>("loading"); const [error, setError] = useState(false); const [raw, setRaw] = useState<string | null>(null);
  const current = useRef<ResearchNotebook | null>(null); const storageState = useRef<StorageState>("loading");
  const accept = (value: ResearchNotebook, status: StorageState) => { current.current = value; storageState.current = status; setNotebook(value); setState(status); };
  useEffect(() => {
    // Locale changes must not discard unsaved in-memory edits after a quota error.
    if (current.current && storageState.current === "memory") return;
    const read = () => {
      try { const text = window.localStorage.getItem(NOTEBOOK_STORAGE_KEY); setRaw(text); if (text !== null) { try { accept(parseNotebook(text), "ready"); } catch { accept(emptyNotebook(locale, PLATFORM_VERSION), "corrupt"); } } else accept(emptyNotebook(locale, PLATFORM_VERSION), "ready"); }
      catch { accept(emptyNotebook(locale, PLATFORM_VERSION), "memory"); }
    };
    // A low-priority hydration update must not interrupt suspended page metadata.
    const timer = window.setTimeout(() => startTransition(read), 0);
    const changed = (event: StorageEvent) => { if (event.key === NOTEBOOK_STORAGE_KEY) read(); };
    window.addEventListener("storage", changed);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", changed); };
  }, [locale]);
  useEffect(() => {
    if (state !== "memory" || !notebook || !(notebook.items.length || notebook.title || notebook.research_question || notebook.user_notes)) return;
    const leaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leaving);
    return () => window.removeEventListener("beforeunload", leaving);
  }, [state, notebook]);
  const save = (value: ResearchNotebook, replace = false) => {
    if (!replace && ["loading", "corrupt"].includes(storageState.current)) { setError(true); return; }
    let text: string; try { text = serializeNotebook(value); } catch { setError(true); return; }
    setError(false);
    try { window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, text); setRaw(text); accept(value, "ready"); }
    catch { accept(value, "memory"); }
  };
  const update = (transform: (value: ResearchNotebook) => ResearchNotebook) => { if (!current.current) return; try { save({ ...pruneNotebook(transform(current.current)), updated_at: new Date().toISOString() }); } catch { setError(true); } };
  return <Context.Provider value={{ notebook, state, error, raw, update,
    add: draft => { if (!current.current) return; try { save(addNotebookEvidence(current.current, draft, PLATFORM_VERSION)); } catch { setError(true); } },
    replace: value => save(value, true), clear: () => save(emptyNotebook(locale, PLATFORM_VERSION), true),
  }}>{children}</Context.Provider>;
}
export function useResearchNotebook() { const value = useContext(Context); if (!value) throw Error("Notebook provider missing"); return value; }
