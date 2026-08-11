# Transparent model layer

v0.50 enables three deterministic, rule-based model outputs:

- Household Economic Pressure Index
- Fiscal Pressure Index
- External Vulnerability Index

Weights, normalization bounds, completeness rules, limitations, and observation traces are maintained in `src/lib/modelFramework.ts`. The layer does not use machine learning and does not generate election forecasts, scenarios, map risk layers, or a China Exposure Index.
