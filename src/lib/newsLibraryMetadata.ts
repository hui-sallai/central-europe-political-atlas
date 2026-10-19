import historicalStore from "@/data/events/events.json";
import batchAudit from "@/data/events/news_update_2026-10-18_audit.json";
import { researchEvents } from "./researchData";

// A reporting period, a batch update and the historical-store timestamp are distinct metadata.
export const newsLibraryMetadata = {
  latestEventDate: researchEvents.filter(event => event.data_status === "verified").reduce((latest, event) => event.date > latest ? event.date : latest, ""),
  latestNewsBatch: batchAudit.window.end,
  historicalStoreUpdatedAt: historicalStore.generated_at,
};
