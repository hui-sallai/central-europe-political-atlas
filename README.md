# Central Europe Political Atlas

Research-oriented public prototype for a V4 political and economic atlas.

Initial scope:

- Poland
- Hungary
- Czechia
- Slovakia

Version `0.1` focuses on Chinese-language pages, dynamic data structure readiness,
country profiles, regional map placeholders, China economic cooperation, weekly
news summaries, and methodology notes.

## Local Preview

Use webpack-backed dev mode on this Windows machine:

```powershell
pnpm dev
```

The `dev` script intentionally runs `next dev --webpack`. The default Turbopack
dev server can fail in this environment when spawned in the background with:

```text
TurbopackInternalError ... spawning node pooled process ... Access denied
```

Production build check:

```powershell
pnpm build
```
