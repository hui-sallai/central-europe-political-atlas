"use client";

import { ChinaExposureCoverageMatrix } from "@/components/ChinaExposureCoverageMatrix";
import { chinaEvidenceCoverageMatrix, chinaExposureCoverageAudit, chinaExposureRankingGate, chinaSectorLinkageMatrix, chinaTradeHistoricalSeries } from "@/lib/chinaExposureModel";

export function ChinaExposureDataPanel() {
  return <ChinaExposureCoverageMatrix matrix={chinaEvidenceCoverageMatrix} audit={chinaExposureCoverageAudit} history={chinaTradeHistoricalSeries} sectors={chinaSectorLinkageMatrix} rankingGate={chinaExposureRankingGate} />;
}
