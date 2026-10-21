import type { Page } from "@playwright/test";
import { NOTEBOOK_PROJECTS_KEY } from "../../src/lib/notebookProjects";
import { NOTEBOOK_STORAGE_KEY } from "../../src/lib/researchNotebook";
// Inspect the active v1 Notebook, not the retained read-only legacy copy.
export async function activeNotebookRaw(page: Page): Promise<string> {
  return page.evaluate(async ({ registryKey, legacyKey }) => {
    const read = () => {
      const raw = localStorage.getItem(registryKey);
      if (raw === null) return localStorage.getItem(legacyKey) ?? "{}";
      const registry = JSON.parse(raw);
      return JSON.stringify(registry.projects.find((p: { id: string }) => p.id === registry.active_id).notebook);
    };
    return navigator.locks ? navigator.locks.request(registryKey, read) : read();
  }, { registryKey: NOTEBOOK_PROJECTS_KEY, legacyKey: NOTEBOOK_STORAGE_KEY });
}
