"use client";
import { createContext, startTransition, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { NOTEBOOK_STORAGE_KEY, type EvidenceDraft, type ResearchNotebook } from "@/lib/researchNotebook";
import { NOTEBOOK_PROJECTS_KEY, NotebookProjectStore, type ProjectView } from "@/lib/notebookProjects";
type NotebookContext = ProjectView & {
  add: (draft: EvidenceDraft) => void; update: (transform: (value: ResearchNotebook) => ResearchNotebook) => void;
  replace: (value: ResearchNotebook) => Promise<boolean>; clear: () => Promise<boolean>;
  createProject: (title: string, imported?: ResearchNotebook) => Promise<boolean>; switchProject: (id: string) => Promise<boolean>;
  deleteProject: () => Promise<boolean>; retrySave: () => Promise<boolean>; recoverCopy: () => Promise<boolean>;
};
const Context = createContext<NotebookContext | null>(null);
export function ResearchNotebookProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [store] = useState(() => new NotebookProjectStore(locale, PLATFORM_VERSION, {
    get: key => key === NOTEBOOK_STORAGE_KEY ? window.localStorage.getItem(NOTEBOOK_STORAGE_KEY) : window.localStorage.getItem(NOTEBOOK_PROJECTS_KEY),
    set: (key, value) => { if (key !== NOTEBOOK_PROJECTS_KEY) throw Error("Legacy storage is read-only"); window.localStorage.setItem(NOTEBOOK_PROJECTS_KEY, value); },
    lock: operation => {
      if (!navigator.locks) return Promise.reject(Error("Safe browser locking unavailable"));
      return navigator.locks.request(NOTEBOOK_PROJECTS_KEY, operation);
    },
  }));
  const [view, setView] = useState(() => store.view());
  useEffect(() => {
    const unsubscribe = store.subscribe(setView);
    // Low-priority hydration preserves suspended page metadata and first-use read-only behavior.
    const timer = window.setTimeout(() => startTransition(() => store.load()), 0);
    const changed = (event: StorageEvent) => { if (event.key === null || event.key === NOTEBOOK_PROJECTS_KEY || event.key === NOTEBOOK_STORAGE_KEY) store.storageChanged(event.key, event.newValue); };
    window.addEventListener("storage", changed);
    return () => { window.clearTimeout(timer); unsubscribe(); window.removeEventListener("storage", changed); };
  }, [store]);
  useLayoutEffect(() => {
    if (view.state !== "memory" && !view.busy) return;
    const leaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leaving);
    return () => window.removeEventListener("beforeunload", leaving);
  }, [view.state, view.busy]);
  // Capture the project target: a delayed collector must never land in a newly selected project.
  const target = view.activeId;
  return <Context.Provider value={{ ...view,
    add: draft => { store.add(target, draft); }, update: transform => { store.update(target, transform); },
    replace: value => store.replace(target, value), clear: () => store.clear(target),
    createProject: (title, imported) => store.create(title, imported), switchProject: id => store.switchTo(id),
    deleteProject: () => store.delete(target), retrySave: () => store.retry(), recoverCopy: () => store.recoverCopy(),
  }}>{children}</Context.Provider>;
}
export function useResearchNotebook() { const value = useContext(Context); if (!value) throw Error("Notebook provider missing"); return value; }
