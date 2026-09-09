# Aggregate-shock Panel LP — v1.8

This offline research module supplies the fixed-eight-country group workbench.
It does not alter the 44 frozen single-country LP models. IK and panel path-level
inference remain registry-only.

## Reproduce the numerical checks

Use the project Python environment with NumPy and SciPy. The ordinary replay is
offline and does not require R:

```sh
pnpm panel-lp:reference
pnpm panel-lp:build
pnpm panel-lp:validate
```

`panel-lp:build` writes only the new panel data directory. It resets publication
readiness to false. Validation is read-only unless `--write-summary` is supplied.
The write option records completed numerical checks, not release approval.

To regenerate genuine reference fixtures, clone
`TinchoAlmuzara/PanelLocalProjections` **outside this repository**, check out
`4fd72b97edc9fe6dc65dd34c32e96e7100a1b873`, and provide its absolute path:

```sh
pnpm panel-lp:reference --author-repository /path/to/external/reference
```

This requires R and the author's `tidyverse`, `pracma`, `lubridate`, `fixest`
dependencies, plus `jsonlite` for this independent harness. The harness checks
the commit and five file SHA256 values before sourcing the unmodified R file.
Package versions and actual output are recorded in the reference fixtures.
No author implementation is vendored: the pinned repository has no root license.
The MATLAB implementation was source-audited, **not numerically executed**.

Five R/Python cases cover a single shock without FE, heterogeneous characteristics
with country FE, joint shocks with two characteristics, contrast-only joint shocks
with country/time FE, and joint shocks with country FE plus 11 seasonal dummies.
The joint-shock IK negative case is caught and recorded as unsupported; the
production estimator rejects small-sample requests before estimation.

## Estimation boundaries

- Fixed AT/DE/SK/SI euro group and CZ/HU/PL/RO non-euro group.
- HICP/IPI use cumulative monthly log differences; unemployment/yield use
  cumulative first differences in percentage points.
- Joint frozen JK MP/CBI inputs, each normalized by 0.25. Zero months stay in.
- Country FE baseline, no full time FE; HICP has 11 month-of-year controls.
- Contrast-only country/time FE is secondary difference-only robustness.
- Horizon-specific reference sample, `p_h=min(h,p_max)` and
  `p_max=ceil((T_eff-H)^(1/3))`. Calendar gaps are not bridged by row shifts.
- Time-cluster score sandwich without HC1 or small-sample multiplier; normal
  90/95/99 pointwise intervals. No panel simultaneous bands or state dependence.
- Each retained month must contain all eight countries; no seven-country fallback.

The independent validator uses explicit dummy regressions and QR influence
functions to check the production demeaning/sandwich implementation. It also
tests duplicated-country invariance, row-order invariance and calendar gaps.

## Release validation

All four outcomes have a numerically validated 24-month path. Each
horizon retains 100–129 time clusters (800–1,032 country-month rows). These are
not 800–1,032 independent shocks.

The canonical method is active only in a validated release. Browser checks cover
all 32 selector/view combinations and a 390-pixel viewport. CI replays the author
fixtures, independent QR/time-score checks, 1,200 real-data checks, structural UI
tests and all frozen-output and release gates before deployment. After a numerical
rebuild resets readiness, revalidate publication gates before activating it again.

The existing `local-projections/lp_cross_country_comparability.json` is protected
by the v1.73 byte-level hash manifest. New group-comparison metadata lives in
`panel-local-projections/lp_cross_country_comparability.json` as an additive
extension; no original hash is updated or bypassed. Group-difference availability
is true; the country-pair formal-test flag remains false.
