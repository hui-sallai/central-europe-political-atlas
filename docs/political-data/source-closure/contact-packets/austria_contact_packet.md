# Austria — clarification packet for BMI / Bundeswahlbehörde

Status: **prepared, not sent.** No authority has been contacted.

**Access note:** `https://www.bmi.gv.at/robots.txt` (retrieved 2026-10-03, SHA-256 `d262ff9a3e93789d700a40bfb3d5cc1aab6660a9f337f0a4240b763c4f231f14`) disallows `/` for AI agents including `Anthropic-ai`, `Claude-Web` and `ChatGPT-User` (“BLOCK ALL AI TRAINING SCRAPERS, LLM CRAWLERS & DISCOVERY ENGINES”). No further agent requests to bmi.gv.at are made; the evidence script refuses the host. Earlier agent retrievals (2026-10-02 audit; 2026-10-03 checkpoint pages) are kept local and audit-only. Any production input must come from owner-performed manual downloads.

## Institution and contact

- Institution: Bundesministerium für Inneres — Bundeswahlbehörde / election administration.
- Contact (from search results, **verify on the BMI site before sending**): `wahl@bmi.gv.at`.
- Contact page: the owner should open https://www.bmi.gv.at/ in a browser and locate the election-administration (Wahlangelegenheiten / Bundeswahlbehörde) contact manually; the agent does not fetch bmi.gv.at.
- Suggested subject: *Nachnutzung der amtlichen Ergebnisdateien der Nationalratswahlen (2002–2024) — Anwendbarkeit des Impressums*

## Exact ambiguity

BMI Impressum: *„Die Übernahme von Beiträgen ist – unter Quellenangabe – gestattet (außer für kommerzielle Zwecke).“* It is unclear whether “Beiträge” covers the official result workbooks/data files, whether the non-commercial restriction applies to factual result data, whether original files may be redistributed, and whether a more specific open-data licence exists for election files.

## Files in question (official locations; contents not inspected by the agent)

| Election | Result file | Final seat source |
|---|---|---|
| 2002 | `…/nationalratswahl_2002/files/nrw02_e_dl.zip` | seat brochures (`nrw02_brosch_mandate_bund.pdf`) |
| 2006 | `…/nationalratswahl_2006/files/nrw_06_endergebnise.xls` | `nrw_06_mandatsspiegelv.pdf` (suffix possibly *vorläufig* — to confirm) |
| 2008 | `…/nationalratswahl_2008/files/ergebnis_end.zip` | `broschuere/nrw_08_mandatsspiegel.pdf`; `mandatsspiegel8_tag_vorl_nrw08.pdf` is provisional |
| 2013 | `…/nationalratswahl_2013/files/nrw13_endgueltiges_gesamtergebnis.xlsx` | `verlautbarung_bwb_endgerg_inkl_3_ermittlungsverfahren_nrw13.pdf` (provisional table also linked) |
| 2017 | `…/nationalratswahl_2017/files/nrw17_endgueltiges_gesamtergebnis.xlsx` | `verlautbarung_bwb_endgerg_inkl_3_ermittlungsverfahren_nrw17.pdf` |
| 2019 | `…/nationalratswahl_2019/files/endgultiges_gesamtergebnis_nrw19_16102019.xlsx` | `verlautbarung_endgueltiges_ergebnis.pdf` |
| 2024 | `…/nationalratswahl_2024/files/endgueltiges_ergebnis_beschluss_bundeswahlbehoerde_16102024.xlsx` | `endgueltiger_mandatsspiegel_bf_24102024.pdf` |

(`…` = `https://www.bmi.gv.at/412/nationalratswahlen`)

## English enquiry

> Dear Sir or Madam,
>
> We maintain a non-commercial public research website on Central European data ([project URL]). We would like to use the official final results of the National Council elections 2002–2024 published on bmi.gv.at, for example the workbook “endgueltiges_ergebnis_beschluss_bundeswahlbehoerde_16102024.xlsx”.
>
> Your Impressum allows the attributed reuse of “Beiträge” except for commercial purposes. Could you please clarify:
>
> 1. Does this clause apply to the official election result workbooks and data files, or is there a more specific licence or open-data condition for election results?
> 2. Does the non-commercial restriction apply to factual result data? [Owner to confirm before sending: our website is non-commercial — no paid access, no advertising.]
> 3. May we publish normalized factual extracts (votes, vote shares, seats, turnout, party/list names) and derived vote/seat shares clearly labelled as derived on a public research website?
> 4. May we redistribute the original XLS/XLSX/ZIP files, or should we only link to your website?
> 5. Is manual download of these files by a person permitted? (We note that your robots.txt excludes AI agents; we will not use automated retrieval.)
> 6. What source attribution do you require, and how should modifications be indicated?
>
> Thank you very much. Kind regards,
> [Name], [affiliation], [contact e-mail]

## German draft (machine-assisted; native-speaker review recommended before sending)

> Sehr geehrte Damen und Herren,
>
> wir betreiben eine nichtkommerzielle, öffentlich zugängliche Forschungswebsite zu Daten aus Mitteleuropa ([Projekt-URL]). Wir möchten die amtlichen Endergebnisse der Nationalratswahlen 2002–2024 nutzen, die auf bmi.gv.at veröffentlicht sind, zum Beispiel die Arbeitsmappe „endgueltiges_ergebnis_beschluss_bundeswahlbehoerde_16102024.xlsx“.
>
> Ihr Impressum gestattet die Übernahme von Beiträgen unter Quellenangabe, außer für kommerzielle Zwecke. Wir bitten um Klärung:
>
> 1. Gilt diese Regelung auch für die amtlichen Ergebnis-Arbeitsmappen und Datendateien der Wahlen, oder gibt es eine spezifischere Lizenz bzw. Open-Data-Bedingung für Wahlergebnisse?
> 2. Gilt die Einschränkung auf nichtkommerzielle Zwecke auch für faktische Ergebnisdaten? [Vor dem Versand vom Betreiber zu bestätigen: Unsere Website ist nichtkommerziell – kein kostenpflichtiger Zugang, keine Werbung.]
> 3. Dürfen wir normalisierte faktische Auszüge (Stimmen, Stimmenanteile, Mandate, Wahlbeteiligung, Partei-/Listennamen) sowie klar als abgeleitet gekennzeichnete Stimmen- und Mandatsanteile auf einer öffentlichen Forschungswebsite veröffentlichen?
> 4. Dürfen wir die Originaldateien (XLS/XLSX/ZIP) weiterverbreiten, oder sollen wir ausschließlich auf Ihre Website verlinken?
> 5. Ist das manuelle Herunterladen dieser Dateien durch eine Person zulässig? (Wir haben gesehen, dass Ihre robots.txt KI-Agenten ausschließt; wir verzichten auf automatisierten Abruf.)
> 6. Welche Quellenangabe verlangen Sie, und wie sollen Änderungen gekennzeichnet werden?
>
> Mit freundlichen Grüßen
> [Name], [Institution], [E-Mail]

## Evidence (local archive, not redistributed)

| URL | SHA-256 | Retrieved |
|---|---|---|
| https://www.bmi.gv.at/impressum/ | `d3f42c254b0f55302833b68754e633912ca8a0d9931097616d1aa4ed4ed4c355` | 2026-10-03T10:05Z |
| https://www.bmi.gv.at/robots.txt | `d262ff9a3e93789d700a40bfb3d5cc1aab6660a9f337f0a4240b763c4f231f14` | 2026-10-03T10:57Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2024/ | `5ee02a3fe7527bdb48630512b2f4edb70318b0a427787b13baa8cc51a95ef61c` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2019/ | `e97a5af8f969d5d1e141b58b5ebf47091906aa90c7934ffeb6c2401395efbaae` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2017/ | `de248dccef73b50a046e98335d7f7940a67182abf5b3b7cb8a486bb75ae3559e` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2013/ | `5bfa37129a4656d86c9f4ecadfc968b403edfcc93281ff78b599d92ae2f69e88` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2008/ | `2d233ddc64c3d844ed1904df58a46aa04fb594105096c11489971f8942982597` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2006/ | `fe9f46cf818c3e28ae30bca600677d96afe9fa09ec6e2023f025fb3bb4385202` | 2026-10-03T10:06Z |
| https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2002/ | `164da09854db2d0dc1398cd938b66cb492c7b1804c7897de835e405acac336af` | 2026-10-03T10:06Z |

## What closes which gate (decision matrix AT1–AT5)

| Answer | Gate effect |
|---|---|
| Q1 clause applies (or specific licence named) | reuse_right → closed with the stated restriction |
| Q2 non-commercial applies | record restriction; owner confirms non-commercial deployment (rule G5); never recorded as unrestricted open reuse |
| Q3 yes | normalized_factual_republication_right → closed |
| Q4 no | raw_redistribution_right → blocked; normalized production may still proceed (1B-B) |
| Q5 yes | manual → closed; automated stays blocked → **manual_only** (1B-manual) |
| Q6 wording | attribution and transformation disclosure → closed |

**Not sufficient:** confirmation that the pages are public; an answer about photos or press texts only.
