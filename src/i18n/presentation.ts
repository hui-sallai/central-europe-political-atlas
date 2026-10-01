// Stable-ID presentation overlays. Canonical country/indicator records remain unchanged.
export const countryDescriptions: Record<string, string> = {
  poland: "The largest V4 country and an important reference for comparing regional security, EU policy, energy transition and trade with China.",
  hungary: "One of the most representative V4 cases of economic cooperation with China, with priority research on batteries, automotive supply chains, logistics and infrastructure projects.",
  czechia: "A Central European industrial country offering scope for future thematic analysis of differences between economic relations with China, industrial policy and political change.",
  slovakia: "Located in the centre of the V4, with a prominent automotive supply chain, euro-area membership and value for regional comparison.",
  germany: "A core economy and EU policy hub within the ten-country scope, providing a benchmark for industrial supply chains, energy, trade and economic relations with China.",
  austria: "A bridge between the German-speaking area and Central and Eastern Europe, important for comparisons of finance, manufacturing, transport and EU neighbourhood policy.",
  romania: "An important intersection of the Black Sea, the Balkans and industrial relocation in Central and Eastern Europe, relevant to energy, ports, agriculture, manufacturing and trade with China.",
  slovenia: "A smaller economy at an Alpine–Adriatic transport and supply-chain node, relevant to ports, logistics, manufacturing and intra-EU comparison.",
  croatia: "Connecting Central Europe, the Balkans and the Adriatic, Croatia is an important case for observing ports, tourism, energy, logistics and infrastructure cooperation with China.",
  serbia: "A key case of Chinese cooperation in Balkan infrastructure, mining, energy and manufacturing, and an important non-EU comparison case.",
};
export const indicatorNames: Record<string, string> = {
  real_gdp_growth: "Real GDP growth", hicp_inflation: "HICP inflation", unemployment_rate: "Unemployment rate", gdp_per_capita_eur: "GDP per capita",
  hicp_monthly_index: "Monthly HICP index", hicp_annual_rate: "Annual HICP inflation", unemployment_rate_monthly: "Monthly unemployment (seasonally adjusted)", industrial_production_index: "Industrial production (seasonally and calendar adjusted)",
};
export const analysisNames: Record<string, string> = {
  panel_local_projections: "Panel Local Projections", composite_indicators: "Composite indicators", panel_econometrics: "Panel econometrics", network_dependency: "Trade network analysis", event_window_analysis: "Descriptive event-window analysis", macro_driver_explorer: "Macro-driver exploration", reduced_form_var: "Reduced-form VAR", svar: "Structural VAR", event_study: "Formal causal event study", local_projections: "Local Projections", bayesian_var: "Bayesian VAR", causal_policy_analysis: "Causal policy analysis", monetary_policy_identification: "Monetary-policy shock identification",
};
export function englishUnit(unit: string): string { return ({ "欧元": "EUR", "百万欧元": "Million EUR", "欧元/kWh": "EUR/kWh", "美元": "USD", "指数": "Index", "人": "People", "百分比": "%" } as Record<string, string>)[unit] ?? unit; }
export function englishCapital(capital: string): string { return capital.includes(" / ") ? capital.split(" / ").at(-1)! : capital; }
