# robots.txt and terms-of-use policy

**LAW / EXTERNAL LICENCE.** A site's terms of use can bind users contractually, and robots.txt is the publisher's stated
access preference.

**ATLAS POLICY.** When the two disagree, the stricter one wins. A source is blocked for automation when:
- its terms forbid robots, spiders or automated tools (statistics.sk);
- robots.txt disallows the user agent class used, including AI agents (bmi.gv.at); or
- the relevant paths are disallowed (data.bis.org query-parameter views: use the documented API or bulk files instead).

| Host | Finding | Registry status |
|---|---|---|
| statistics.sk | terms prohibit robots and spiders | blocked (include subdomains) |
| www.bmi.gv.at | robots.txt disallows Anthropic-ai, Claude-Web, ChatGPT-User | blocked |
| www.geoboundaries.org | Crawl-delay 10 | allowed, ≥10 s interval |
| data.bis.org | disallows query-parameter views | allowed for documented endpoints |
| volby.gov.cz, danewyborcze.kbw.gov.pl | no explicit reuse licence | evidence only; pending publisher |

These findings are re-checked at each data refresh, and any change is recorded in the registry with its date.
