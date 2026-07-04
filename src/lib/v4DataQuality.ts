import { getExtendedIndicator, getExtendedObservations, v4TemplateIndicatorIds, type ExtendedObservation } from "./extendedData";

export const v4QualityCountrySlugs = ["poland", "hungary", "czechia", "slovakia"] as const;
export const v4QualityYears = ["2021", "2022", "2023", "2024", "2025"] as const;

export type V4QualityStatus = "pass" | "warning" | "fail";

export type V4QualityCell = {
  countrySlug: string;
  indicatorId: string;
  year: string;
  observation: ExtendedObservation | null;
  hasObservation: boolean;
  hasValue: boolean;
  isPending: boolean;
  sourceLinkPresent: boolean;
  sourceLinkFormatValid: boolean;
  unitConsistent: boolean;
  updatedAtPresent: boolean;
  isComputed: boolean;
  hasRequiredNote: boolean;
  issues: string[];
};

export type V4QualitySummary = {
  expectedCells: number;
  presentCells: number;
  officialValueCells: number;
  pendingValueCells: number;
  missingObservationCells: number;
  validSourceLinkCells: number;
  unitConsistentCells: number;
  updatedAtCells: number;
  computedCells: number;
  computedCellsWithNotes: number;
  issueCells: number;
  status: V4QualityStatus;
};

export type V4QualityGroupSummary = V4QualitySummary & {
  id: string;
  label: string;
};

const computedIndicatorIds = new Set(["trade_balance_mio_eur", "automotive_export_share"]);

function hasValidSourceUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isComputedObservation(observation: ExtendedObservation | null) {
  if (!observation) {
    return false;
  }

  const note = observation.note?.toLowerCase() ?? "";
  return computedIndicatorIds.has(observation.indicatorId) || note.includes("computed") || note.includes("计算");
}

function hasRequiredComputedNote(observation: ExtendedObservation | null) {
  if (!observation) {
    return false;
  }

  if (!isComputedObservation(observation)) {
    return true;
  }

  return Boolean(observation.note?.trim());
}

function qualityCell(countrySlug: string, indicatorId: string, year: string, observations: ExtendedObservation[]): V4QualityCell {
  const indicator = getExtendedIndicator(indicatorId);
  const observation = observations.find((item) => item.indicatorId === indicatorId && item.date === year) ?? null;
  const hasObservation = observation !== null;
  const hasValue = observation?.value !== null && observation?.value !== undefined;
  const isPending = !hasValue || observation?.status === "pending";
  const sourceLinkPresent = Boolean(observation?.sourceUrl);
  const sourceLinkFormatValid = hasValidSourceUrl(observation?.sourceUrl);
  const unitConsistent = hasObservation && observation.unit === (indicator?.unit ?? "");
  const updatedAtPresent = Boolean(observation?.updatedAt);
  const isComputed = isComputedObservation(observation);
  const hasRequiredNote = hasRequiredComputedNote(observation);
  const issues: string[] = [];

  if (!hasObservation) {
    issues.push("观测值缺失");
  }

  if (isPending) {
    issues.push("数值待接入");
  }

  if (!sourceLinkPresent) {
    issues.push("来源链接缺失");
  } else if (!sourceLinkFormatValid) {
    issues.push("来源链接格式异常");
  }

  if (!unitConsistent) {
    issues.push("单位与指标字典不一致");
  }

  if (!updatedAtPresent) {
    issues.push("更新时间缺失");
  }

  if (isComputed && !hasRequiredNote) {
    issues.push("计算值缺少备注");
  }

  return {
    countrySlug,
    indicatorId,
    year,
    observation,
    hasObservation,
    hasValue,
    isPending,
    sourceLinkPresent,
    sourceLinkFormatValid,
    unitConsistent,
    updatedAtPresent,
    isComputed,
    hasRequiredNote,
    issues,
  };
}

function summarizeCells(cells: V4QualityCell[]): V4QualitySummary {
  const expectedCells = cells.length;
  const presentCells = cells.filter((cell) => cell.hasObservation).length;
  const officialValueCells = cells.filter((cell) => cell.observation?.status === "official" && cell.hasValue).length;
  const pendingValueCells = cells.filter((cell) => cell.isPending).length;
  const missingObservationCells = cells.filter((cell) => !cell.hasObservation).length;
  const validSourceLinkCells = cells.filter((cell) => cell.sourceLinkFormatValid).length;
  const unitConsistentCells = cells.filter((cell) => cell.unitConsistent).length;
  const updatedAtCells = cells.filter((cell) => cell.updatedAtPresent).length;
  const computedCells = cells.filter((cell) => cell.isComputed).length;
  const computedCellsWithNotes = cells.filter((cell) => cell.isComputed && cell.hasRequiredNote).length;
  const issueCells = cells.filter((cell) => cell.issues.length > 0).length;
  const status: V4QualityStatus = issueCells === 0 ? "pass" : missingObservationCells > 0 || pendingValueCells > 0 ? "warning" : "fail";

  return {
    expectedCells,
    presentCells,
    officialValueCells,
    pendingValueCells,
    missingObservationCells,
    validSourceLinkCells,
    unitConsistentCells,
    updatedAtCells,
    computedCells,
    computedCellsWithNotes,
    issueCells,
    status,
  };
}

export function getV4DataQualityCells() {
  return v4QualityCountrySlugs.flatMap((countrySlug) => {
    const observations = getExtendedObservations(countrySlug);

    return v4TemplateIndicatorIds.flatMap((indicatorId) =>
      v4QualityYears.map((year) => qualityCell(countrySlug, indicatorId, year, observations)),
    );
  });
}

export function getV4DataQualitySummary() {
  const cells = getV4DataQualityCells();
  const summary = summarizeCells(cells);
  const byCountry: V4QualityGroupSummary[] = v4QualityCountrySlugs.map((countrySlug) => ({
    id: countrySlug,
    label: countrySlug,
    ...summarizeCells(cells.filter((cell) => cell.countrySlug === countrySlug)),
  }));
  const byIndicator: V4QualityGroupSummary[] = v4TemplateIndicatorIds.map((indicatorId) => {
    const indicator = getExtendedIndicator(indicatorId);

    return {
      id: indicatorId,
      label: indicator?.labelZh ?? indicatorId,
      ...summarizeCells(cells.filter((cell) => cell.indicatorId === indicatorId)),
    };
  });
  const issueCells = cells.filter((cell) => cell.issues.length > 0);

  return {
    cells,
    summary,
    byCountry,
    byIndicator,
    issueCells,
  };
}
