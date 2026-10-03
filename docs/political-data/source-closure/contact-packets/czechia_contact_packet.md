# Czechia — clarification packet for Český statistický úřad (ČSÚ)

Status: **prepared, not sent.** The owner decides whether and how to send it. No authority has been contacted.

## Institution and contact

- Institution: Český statistický úřad (Czech Statistical Office); postal address as listed on the contact page.
- Contact page: https://csu.gov.cz/kontakty
- Suggested channel (verify on the contact page before sending): information service `infoservis@csu.gov.cz` (general enquiries). Formal alternative: e-filing office `podatelna@csu.gov.cz` or the data box whose ID is listed on the contact page (copy it from the page; not reproduced here).
- Suggested subject: *Licence conditions for Chamber of Deputies election result files on volby.gov.cz (CC BY 4.0 applicability)*

## Files/products in question

| Election | Example official file (not downloaded by this audit) |
|---|---|
| 2002–2013 | `https://volby.gov.cz/opendata/ps2013/PS2013_data_20230224_xml.zip` (also `_xlsx.zip`, `_csv.zip`; registers `PS2013_reg_20230428_*`; code lists `PS2013_cisel_20230224_*`) |
| 2017 original | `https://volby.gov.cz/opendata/ps2017/ps2017_opendata.htm` → `PS2017data20171021*.zip` |
| 2017 recalculated (NSS Vol 58/2017-173) | `https://volby.gov.cz/opendata/ps2017nss/ps2017nss_opendata.htm` → `PS2017data20171122*.zip` |
| 2021 | `https://volby.gov.cz/opendata/ps2021/PS2021_data_20211010_xml.zip` (registers 20211010 and 20211111) |
| 2025 | `https://volby.gov.cz/appdata/ps2025/odata/vysledky.xml`; `https://volby.gov.cz/opendata/ps2025/PS2025data20251005_csv.zip` |

Terms: https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu — linked from the footer of https://volby.gov.cz/opendata/opendata.htm.

## Exact ambiguity

The terms state: *“Statistické informace Českého statistického úřadu zveřejněné prostřednictvím internetových stránek https://csu.gov.cz jsou licencovány v souladu s CC BY 4.0.”* The election files are published on **volby.gov.cz**, not csu.gov.cz. The volby.gov.cz pages link these terms, but a link is not an explicit statement of scope. No domain extension is assumed.

## English enquiry

> Dear Sir or Madam,
>
> We maintain a non-commercial public research website on political and economic data for Central European countries ([project URL]). We would like to use the official results of elections to the Chamber of Deputies (2002–2025) published on volby.gov.cz, for example [one example URL from the table above].
>
> Your conditions page states that statistical information published on https://csu.gov.cz is licensed under CC BY 4.0, and the volby.gov.cz open-data pages link to that page. Could you please confirm:
>
> 1. Do these CC BY 4.0 conditions apply to the machine-readable election result files (XML/CSV/XLSX) published on volby.gov.cz? (yes/no; if no, which terms apply?)
> 2. May we download these files manually? May a script retrieve the static final-result packages at a low rate (once per election)?
> 3. May we keep the original files in a private archive for reproducibility?
> 4. May we publish normalized factual extracts — votes, vote shares, seats, turnout and contestant identifiers — and derived values that are clearly labelled as derived?
> 5. May we redistribute the original files themselves, or should we only link to your website?
> 6. Is the attribution “Source: Český statistický úřad, volby.gov.cz, licence CC BY 4.0 (link to your conditions page)”, with modified or derived values marked as such, sufficient?
>
> Thank you very much. Kind regards,
> [Name], [affiliation], [contact e-mail]

## Czech draft (machine-assisted; native-speaker review recommended before sending)

> Vážená paní, vážený pane,
>
> provozujeme nekomerční veřejný výzkumný web o politických a ekonomických datech zemí střední Evropy ([URL projektu]). Rádi bychom využili oficiální výsledky voleb do Poslanecké sněmovny (2002–2025) zveřejněné na volby.gov.cz, například [jedna ukázková URL].
>
> Vaše stránka s podmínkami uvádí, že statistické informace zveřejněné prostřednictvím https://csu.gov.cz jsou licencovány v souladu s CC BY 4.0, a stránky otevřených dat na volby.gov.cz na ni odkazují. Prosíme o potvrzení:
>
> 1. Vztahují se tyto podmínky CC BY 4.0 i na strojově čitelné soubory s výsledky voleb (XML/CSV/XLSX) zveřejněné na volby.gov.cz? (ano/ne; pokud ne, jaké podmínky platí?)
> 2. Můžeme tyto soubory stahovat ručně? Může skript stahovat statické balíčky konečných výsledků s nízkou četností (jednou za volby)?
> 3. Můžeme původní soubory uchovávat v neveřejném archivu kvůli reprodukovatelnosti?
> 4. Můžeme zveřejňovat normalizované faktické výňatky — počty hlasů, podíly hlasů, mandáty, volební účast a identifikátory volebních stran — a odvozené hodnoty zřetelně označené jako odvozené?
> 5. Můžeme dále šířit samotné původní soubory, nebo máme pouze odkazovat na Vaše stránky?
> 6. Postačuje uvedení zdroje „Zdroj: Český statistický úřad, volby.gov.cz, licence CC BY 4.0 (odkaz na stránku s podmínkami)“ spolu s označením upravených nebo odvozených údajů?
>
> Děkujeme. S pozdravem,
> [Jméno], [instituce], [e-mail]

## Evidence (local archive, not redistributed)

| URL | SHA-256 | Retrieved |
|---|---|---|
| https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu | `5ddd322892a662f6d979cea4521343b4c011fe2d44dc493e78e7d4b5221d03b7` | 2026-10-03T10:04Z |
| https://volby.gov.cz/opendata/opendata.htm | `157435aa7c2966f308f89601e14def573daa839647c4d122b830c940f70637a0` | 2026-10-03T10:04Z |
| https://volby.gov.cz/opendata/ps2017nss/ps2017nss_opendata.htm | `366b4af3d965045eb56f2bc5d7333f777c3671b6ec0d4fcdf0121f221e8ce38b` | 2026-10-03T10:59Z |
| https://volby.gov.cz/opendata/ps2017/ps2017_opendata.htm | `42c50ae10f65d5a01f90416295040043cbee75e95d468731c45d69049a0d4fde` | 2026-10-03T10:59Z |
| https://volby.gov.cz/opendata/ps2021/ps2021_opendata.htm | `398e5940f8d8abfb70c678483c88e6df3457266796c607bc17a243ce726ad6f4` | 2026-10-03T10:06Z |
| https://volby.gov.cz/opendata/ps2025/ps2025_opendata.htm | `a474dcfe6ce4fa5660cb634e1c6de4f2f3495666a256be6562ba16e4516c2044` | 2026-10-03T10:04Z |

## What closes which gate (see `publisher_response_decision_matrix.json`, CZ1–CZ6)

| Answer | Gate effect |
|---|---|
| Q1 yes (CC BY 4.0 covers the volby.gov.cz files) | reuse_right → closed |
| Q4 yes | normalized_factual_republication_right → closed |
| Q5 yes / no | raw_redistribution_right → closed / blocked (normalized production may still proceed — variant 1B-B) |
| Q2 manual yes, script no | manual → closed, automated → blocked (variant 1B-manual) |
| Q6 confirmed or wording given | attribution and transformation-disclosure → closed |

**Not sufficient:** “the data are public”; a link to the general conditions without confirming the election files; an answer that covers csu.gov.cz only.
