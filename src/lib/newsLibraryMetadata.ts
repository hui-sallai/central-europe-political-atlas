import historicalStore from "@/data/events/events.json";
import batchAudit from "@/data/events/news_update_2026-10-18_audit.json";
import batchVerification from "@/data/events/news_source_verification_2026-10-18.json";
import { researchEvents } from "./researchData";

// A reporting period, a batch update and the historical-store timestamp are distinct metadata.
export const newsLibraryMetadata = {
  latestEventDate: researchEvents.filter(event => event.data_status === "verified").reduce((latest, event) => event.date > latest ? event.date : latest, ""),
  latestNewsBatch: batchAudit.window.end,
  latestBatchSourceCheckedAt: batchVerification.records.filter(record => record.verification_status === "verified_exact" && researchEvents.some(event => event.id === record.news_id && event.data_status === "verified")).reduce((latest, record) => record.retrieved_at > latest ? record.retrieved_at : latest, ""),
  historicalStoreUpdatedAt: historicalStore.generated_at,
};
