const evidenceBase = "https://github.com/hui-sallai/central-europe-political-atlas/blob/994d61fe1e56e98be73292c37982db3728a09a05/";
export const portfolioCases = [
  {
    number: "01", slug: "data-pipeline", title: "Research Data Cleaning, Integration & Validation",
    description: "Traceable multi-country data, documented exceptions and independently checked trade coverage.",
    bestFor: ["Data cleaning", "Data validation", "Research data", "Web research", "Structured datasets"],
    status: "Independent project case",
    demonstrates: ["Organising multi-source observations into a consistent schema with source traceability.", "Keeping missing values, pending records and validation exceptions visible.", "Checking macro and trade data before a comparative research handoff."],
    deliverables: ["Structured research-data exports", "Validation and exception notes", "Coverage checks and a reproducible workflow"],
    pdf: "01_Research_Data_Pipeline.pdf",
    evidence: [ { label: "Research observations", path: "public/research-data/observations.json" }, { label: "Trade-network build script", path: "scripts/network/build-trade-network.mjs" }, { label: "Macro-driver observations", path: "public/research-data/macro_driver_observations.json" } ],
  },
  {
    number: "02", slug: "trade-exposure", title: "Central European Goods Trade Exposure",
    description: "A four-page goods-trade screening brief with charts, findings and practical research priorities.",
    bestFor: ["Market research", "Business intelligence", "Country research", "China-Europe research"],
    status: "Independent research brief",
    demonstrates: ["Turning eligible bilateral goods-trade data into a concise client-style brief.", "Comparing trade exposure with explicit coverage and interpretation limits.", "Separating descriptive findings from political or causal claims."],
    deliverables: ["Four-page research brief", "Charts and concise findings", "Research priorities and source notes"],
    pdf: "02_Trade_Exposure_Brief.pdf",
    evidence: [ { label: "Network metrics", path: "src/data/network/network_metrics.json" }, { label: "Network coverage", path: "src/data/network/network_coverage.json" }, { label: "Trade-network engine", path: "src/lib/networkEngine.ts" } ],
  },
  {
    number: "03", slug: "localization-qa", title: "Translation and Localization Quality Review",
    description: "Translation samples, terminology decisions and issue triage across multiple languages.",
    bestFor: ["Translation", "Localization QA", "Linguistic review", "Multilingual content QA"],
    status: "Demonstration samples with experience context",
    demonstrates: ["Reviewing meaning, terminology, consistency and audience suitability.", "Recording translation choices and actionable localization issues.", "Distinguishing professional Chinese–English and Chinese–Hungarian experience from demonstration tasks. Japanese is limited to comprehension and content QA within an agreed scope."],
    deliverables: ["Source and translation samples", "Terminology decisions and QA notes", "Issue triage with suggested corrections"],
    pdf: "03_Localization_QA_Sample_Pack.pdf",
    evidence: [ { label: "Atlas language configuration", path: "src/i18n/config.ts" }, { label: "i18n validation", path: "scripts/validation/validate-i18n.mjs" }, { label: "UI-language QA", path: "scripts/validation/run-ui-language-qa.mjs" } ],
  },
  {
    number: "04", slug: "ai-evaluation", title: "Bilingual AI Response Evaluation",
    description: "Bilingual response review with weighted scores, critical-error rules and escalation decisions.",
    bestFor: ["AI evaluation", "LLM rating", "Bilingual response review", "Content quality"],
    status: "Portfolio simulation",
    demonstrates: ["Scoring English and Chinese responses against reference facts and task instructions.", "Applying weighted criteria, a critical-error override and a consistent error taxonomy.", "Explaining acceptance, revision, rejection and unresolved-case escalation."],
    deliverables: ["Evaluation rubric", "Six bilingual worked cases and a score sheet", "Error tags, rationales and proposed corrections"],
    pdf: "04_AI_LLM_Evaluation_Simulation.pdf",
    evidence: [ { label: "Reference observation structure", path: "public/research-data/observations.json" }, { label: "Reference trade coverage", path: "src/data/network/network_coverage.json" } ],
  },
] as const;
export const portfolioEvidenceUrl = (path: string) => evidenceBase + path;
export const portfolioEvidenceNote = "Cases combine verified independent-project evidence, CV-supported professional experience and clearly labelled portfolio simulations. No paid-client outcomes are claimed for demonstration cases.";
