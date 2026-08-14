import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { researchCountries, researchIndicators, researchObservations } from "@/lib/researchData";
import { coreExtendedIndicatorIds, coreTransmissionIndicatorIds } from "@/lib/crossCountryParityData";
import type { Observation } from "@/types/Observation";

export type ParityQualityStatus = "passed" | "partial" | "pending" | "not_applicable" | "review_required";

export type CoverageMatrixRow = {
  countrySlug: string;
  countryName: string;
  indicatorId: string;
  indicatorName: string;
  expectedYears: number[];
  availableYears: number[];
  pendingYears: number[];
  missingYears: number[];
  notApplicableYears: number[];
  definitionMismatchYears: number[];
  sourceReliability: string;
  qualityStatus: ParityQualityStatus;
  modelEligibility: boolean;
  latestAvailableYear: number | null;
  latestCommonYear: number | null;
  coverageRatio: number;
  reviewReasons: string[];
};

const extendedIds = new Set<string>(coreExtendedIndicatorIds);
const parityIndicatorIds = [...coreExtendedIndicatorIds, ...coreTransmissionIndicatorIds];
const modelInputIds = new Set(modelCards.flatMap((card) => card.inputs.map((input) => input.indicator_id)));
const labels = new Map(researchIndicators.map((indicator) => [indicator.id, indicator.name_zh]));

function expectedYears(indicatorId: string) {
  return extendedIds.has(indicatorId) ? [2021, 2022, 2023, 2024, 2025] : [2023, 2024];
}

function normalizedMetadata(observation: Observation | undefined) {
  if (!observation) return { applicability: "applicable", comparability: "pending" } as const;
  const germanyBaseline = observation.country_slug === "germany" && observation.indicator === "germany_export_dependence";
  const serbiaMismatch = observation.country_slug === "serbia" && [
    "fiscal_balance_gdp",
    "government_debt_gdp",
    "government_revenue_gdp",
    "government_expenditure_gdp",
    "current_account_gdp",
  ].includes(observation.indicator);
  return {
    applicability: observation.applicability_status ?? (germanyBaseline ? "not_applicable" : "applicable"),
    comparability: observation.comparability_status
      ?? (germanyBaseline ? "not_applicable" : serbiaMismatch ? "definition_mismatch" : observation.value === null ? "pending" : "comparable"),
  } as const;
}

function reviewReasons(observations: Observation[]) {
  const reasons: string[] = [];
  const values = observations.filter((item) => item.value !== null).sort((a, b) => a.year - b.year);
  const expectedUnit = values[0]?.unit;
  if (expectedUnit && values.some((item) => item.unit !== expectedUnit)) reasons.push("unit_mismatch");
  if (new Set(observations.map((item) => `${item.country_slug}:${item.indicator}:${item.year}`)).size !== observations.length) reasons.push("duplicate_observation");

  values.forEach((item, index) => {
    if (item.value === null) return;
    const percentageIndicator = item.unit === "%" || item.unit === "% GDP" || item.unit === "% exports";
    if (percentageIndicator && (item.value < -100 || item.value > 300)) reasons.push(`impossible_percentage:${item.year}`);
    const previous = values[index - 1];
    if (!previous || previous.value === null) return;
    if (Math.sign(previous.value) !== Math.sign(item.value) && previous.value !== 0 && item.value !== 0) reasons.push(`sign_reversal:${item.year}`);
    const base = Math.max(Math.abs(previous.value), 1);
    if (Math.abs(item.value - previous.value) / base > 1.5) reasons.push(`abnormal_yoy_jump:${item.year}`);
  });

  return [...new Set(reasons)];
}

function observationRequiresReview(observation: Observation) {
  const series = researchObservations.filter(
    (item) => item.country_slug === observation.country_slug && item.indicator === observation.indicator,
  );
  return reviewReasons(series).some((reason) => {
    if (reason === "unit_mismatch" || reason === "duplicate_observation") return true;
    return Number(reason.split(":").at(-1)) === observation.year;
  });
}

function comparableObservation(countrySlug: string, indicatorId: string, year: number) {
  const observation = researchObservations.find(
    (item) => item.country_slug === countrySlug && item.indicator === indicatorId && item.year === year,
  );
  const metadata = normalizedMetadata(observation);
  return observation && observation.value !== null && metadata.applicability === "applicable" && metadata.comparability === "comparable" && !observationRequiresReview(observation)
    ? observation
    : undefined;
}

function latestCommonYear(indicatorId: string) {
  const years = expectedYears(indicatorId);
  const applicableCountries = researchCountries.filter((country) => !(country.slug === "germany" && indicatorId === "germany_export_dependence"));
  const comparableCountries = applicableCountries.filter((country) => {
    const countryRows = years.map((year) => researchObservations.find(
      (item) => item.country_slug === country.slug && item.indicator === indicatorId && item.year === year,
    ));
    return !countryRows.some((row) => normalizedMetadata(row).comparability === "definition_mismatch");
  });
  return [...years].reverse().find((year) => comparableCountries.every((country) => comparableObservation(country.slug, indicatorId, year))) ?? null;
}

const commonYears = new Map(parityIndicatorIds.map((indicatorId) => [indicatorId, latestCommonYear(indicatorId)]));

export const coverageMatrix: CoverageMatrixRow[] = researchCountries.flatMap((country) => parityIndicatorIds.map((indicatorId) => {
  const years = expectedYears(indicatorId);
  const observations = years.map((year) => researchObservations.find(
    (item) => item.country_slug === country.slug && item.indicator === indicatorId && item.year === year,
  ));
  const availableYears = observations.filter((item) => item?.value !== null && normalizedMetadata(item).comparability === "comparable").map((item) => item!.year);
  const notApplicableYears = observations.filter((item) => normalizedMetadata(item).applicability === "not_applicable").map((item) => item?.year).filter((year): year is number => year !== undefined);
  const definitionMismatchYears = observations.filter((item) => normalizedMetadata(item).comparability === "definition_mismatch").map((item) => item?.year).filter((year): year is number => year !== undefined);
  const pendingYears = observations.filter((item) => item && item.value === null && normalizedMetadata(item).comparability === "pending").map((item) => item!.year);
  const missingYears = years.filter((year) => !observations.some((item) => item?.year === year));
  const applicableYearCount = years.length - notApplicableYears.length;
  const reasons = reviewReasons(observations.filter((item): item is Observation => Boolean(item)));
  const reliability = [...new Set(observations.filter(Boolean).map((item) => item!.source_reliability))].sort().join("/") || "D";
  const qualityStatus: ParityQualityStatus = notApplicableYears.length === years.length
    ? "not_applicable"
    : reasons.some((reason) => reason.startsWith("unit_mismatch") || reason.startsWith("impossible_percentage") || reason.startsWith("duplicate"))
      ? "review_required"
      : definitionMismatchYears.length > 0 || reasons.length > 0
        ? "partial"
        : pendingYears.length > 0 || missingYears.length > 0
          ? "pending"
          : "passed";
  const commonYear = commonYears.get(indicatorId) ?? null;
  const commonYearObservation = commonYear === null ? undefined : comparableObservation(country.slug, indicatorId, commonYear);
  const indicator = researchIndicators.find((item) => item.id === indicatorId);
  const modelEligibility = Boolean(
    modelInputIds.has(indicatorId)
    && indicator?.future_model_candidate
    && commonYearObservation
    && (commonYearObservation.source_reliability === "A" || commonYearObservation.source_reliability === "B")
    && !reasons.some((reason) => reason.startsWith("unit_mismatch") || reason.startsWith("impossible_percentage") || reason.startsWith("duplicate")),
  );

  return {
    countrySlug: country.slug,
    countryName: country.name_zh,
    indicatorId,
    indicatorName: labels.get(indicatorId) ?? indicatorId,
    expectedYears: years,
    availableYears,
    pendingYears,
    missingYears,
    notApplicableYears,
    definitionMismatchYears,
    sourceReliability: reliability,
    qualityStatus,
    modelEligibility,
    latestAvailableYear: availableYears.at(-1) ?? null,
    latestCommonYear: commonYear,
    coverageRatio: applicableYearCount === 0 ? 1 : availableYears.length / applicableYearCount,
    reviewReasons: reasons,
  };
}));

function yearList(years: number[]) {
  return years.join("/");
}

export function getPriorityGaps(countrySlug: string, limit = 5) {
  const rows = coverageMatrix.filter((row) => row.countrySlug === countrySlug);
  return rows
    .filter((row) => row.definitionMismatchYears.length || row.pendingYears.length || row.missingYears.length || row.qualityStatus === "review_required")
    .sort((a, b) => {
      const priority = (row: CoverageMatrixRow) => row.definitionMismatchYears.length ? 0 : row.qualityStatus === "review_required" ? 1 : row.pendingYears.some((year) => year < 2025) ? 2 : 3;
      return priority(a) - priority(b) || a.indicatorName.localeCompare(b.indicatorName, "zh-CN");
    })
    .slice(0, limit)
    .map((row) => {
      if (row.definitionMismatchYears.length) return `${row.indicatorName}：定义不一致，暂不进入十国比较`;
      if (row.qualityStatus === "review_required") return `${row.indicatorName}：异常值规则标记复核`;
      const years = [...row.pendingYears, ...row.missingYears].sort();
      return `${row.indicatorName}：${yearList(years)} 待接入`;
    });
}

export const countryParitySummaries = researchCountries.map((country) => {
  const rows = coverageMatrix.filter((row) => row.countrySlug === country.slug);
  const applicable = rows.reduce((total, row) => total + row.expectedYears.length - row.notApplicableYears.length, 0);
  const reviewedYearCount = (row: CoverageMatrixRow) => {
    const explicitYears = new Set(row.reviewReasons.flatMap((reason) => {
      const year = Number(reason.split(":").at(-1));
      return Number.isInteger(year) ? [year] : [];
    }));
    return row.reviewReasons.some((reason) => reason === "unit_mismatch" || reason === "duplicate_observation")
      ? row.availableYears.length
      : row.availableYears.filter((year) => explicitYears.has(year)).length;
  };
  const partial = rows.reduce((total, row) => total + row.definitionMismatchYears.length + reviewedYearCount(row), 0);
  const complete = rows.reduce((total, row) => total + row.availableYears.length - reviewedYearCount(row), 0);
  const pending = rows.reduce((total, row) => total + row.pendingYears.length + row.missingYears.length, 0);
  const modelReady = rows.filter((row) => row.modelEligibility).length;
  const outputAvailability = Object.fromEntries(modelOutputs.filter((output) => output.country_slug === country.slug).map((output) => [output.model_id, output.availability]));
  return {
    countrySlug: country.slug,
    countryName: country.name_zh,
    applicable,
    complete,
    partial,
    pending,
    coverageRatio: applicable === 0 ? 1 : rows.reduce((total, row) => total + row.availableYears.length, 0) / applicable,
    modelReady,
    priorityGaps: getPriorityGaps(country.slug),
    outputAvailability,
  };
});

export function getCountryParitySummary(countrySlug: string) {
  return countryParitySummaries.find((summary) => summary.countrySlug === countrySlug);
}

export const parityQaSummary = {
  version: "v0.76",
  matrixRows: coverageMatrix.length,
  applicableCells: countryParitySummaries.reduce((total, row) => total + row.applicable, 0),
  completeCells: countryParitySummaries.reduce((total, row) => total + row.complete, 0),
  partialCells: countryParitySummaries.reduce((total, row) => total + row.partial, 0),
  pendingCells: countryParitySummaries.reduce((total, row) => total + row.pending, 0),
  reviewRequiredRows: coverageMatrix.filter((row) => row.qualityStatus === "review_required" || row.qualityStatus === "partial").length,
  latestCommonYears: Object.fromEntries(commonYears),
};
