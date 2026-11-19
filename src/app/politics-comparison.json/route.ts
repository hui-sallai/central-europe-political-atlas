import { isBallotCountry, politicalBallotElections } from "@/lib/politicalBallots";
import { admittedCountrySlugs } from "@/lib/politicalAdmission";
import { politicalComparisonCountries, politicalElectionViews } from "@/lib/politicalData";
import { nationalComparisonView, scopedComparisonView, type ComparisonIndex } from "@/lib/politicalComparisonBallots";

export const dynamic = "force-static";

/** Compact comparison fields, built from the same admitted views as the election pages. Loaded on demand. */
export function GET() {
  const national = new Map(politicalComparisonCountries().map(c => [c.slug,c.elections]));
  national.set("germany", politicalElectionViews());
  const index: ComparisonIndex = {};
  for (const slug of admittedCountrySlugs) {
    const legacy = national.get(slug);
    if (legacy) index[slug] = legacy.map(nationalComparisonView);
    else if (isBallotCountry(slug)) index[slug] = politicalBallotElections(slug).map(scopedComparisonView);
    else throw new Error("Missing comparison adapter for admitted country: " + slug);
  }
  return Response.json(index);
}
