# Network access policy

**ENGINEERING CONTROL.** `network_acquisition_registry.json` lists every host that scripts may contact automatically or
manually. Hosts that are only cited in documentation are listed as `reference_hosts`. `canAcquire(registry, url, mode)`
returns blocked for:
- any unknown host;
- hosts with status `blocked`;
- automated mode where `automation_allowed` is false.

`legal-security:validate` checks that every host referenced in `scripts/` is registered, and that blocked hosts appear only in
documented evidence paths (`blocked_host_exception_paths`).

**ATLAS POLICY.**
- Identify honestly. Do not spoof a browser, and do not rotate IPs or user agents.
- Respect `Crawl-delay` (geoBoundaries: at least 10 s) and fetch at modest rates.
- Never bypass logins, paywalls, CAPTCHAs or rate limits.
- Store downloaded raw files in gitignored staging or `local-evidence/` only. Never publish a raw file whose licence is not
  cleared for raw redistribution.
- Automated collection from `statistics.sk` (terms prohibit robots) and `www.bmi.gv.at` (robots.txt disallows AI agents)
  is **blocked**.
