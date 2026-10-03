# Poland — clarification packet for PKW / Krajowe Biuro Wyborcze

Status: **prepared, not sent.** No authority has been contacted.

## Institution and contact

- Institution: Państwowa Komisja Wyborcza / Krajowe Biuro Wyborcze, ul. Wiejska 10, 00-902 Warszawa, tel. 22 243 03 00 (footer of https://pkw.gov.pl/kontakt1, retrieved 2026-10-03).
- Contact page: https://pkw.gov.pl/kontakt — the page lists regional delegation mailboxes; use the **central** KBW channel shown there (central mailbox or ePUAP), not a delegation.
- Suggested subject: *Ponowne wykorzystywanie plików z wynikami wyborów do Sejmu (danewyborcze.kbw.gov.pl, 2001–2023)*

## Exact ambiguity

The DANE WYBORCZE “Informacje prawne” page exists but has no content (“Ta strona nie posiada jeszcze zawartości”). No dataset-specific reuse terms were found. Terms of other ministries are not substituted. Poland's law on open data and the re-use of public-sector information (ustawa z dnia 11 sierpnia 2021 r. o otwartych danych i ponownym wykorzystywaniu informacji sektora publicznego) is mentioned only as context; it is not treated as a licence already granted by KBW.

## Files in question (official locations; not downloaded by this audit)

| Election | Official list-result file(s) | Committee/list registry |
|---|---|---|
| 2001 | `https://danewyborcze.kbw.gov.pl/dane/2001/sejm/okr-lis-2001.xls` (districts); also gmina/powiat/obwód files | `…/dane/2001/sejm/kandsejm2001kom.xls` |
| 2005 | `https://danewyborcze.kbw.gov.pl/dane/2005/sejm/sejm2005-lis-okr.xls` | `…/dane/2005/sejm/kandsejm2005kom.xls` |
| 2007 | `https://danewyborcze.kbw.gov.pl/dane/2007/sejm/sejm2007-pow-listy.xls` (powiat level; no district file found) | `…/dane/2007/sejm/kandsejm2007.xls` |
| 2011 | `https://danewyborcze.kbw.gov.pl/dane/2011/sejmsenat/2011-sejm-pow-listy.xls` (powiat level) | `…/dane/2011/sejmsenat/komitety.zip` |
| 2015 | `https://danewyborcze.kbw.gov.pl/dane/2015/sejm/2015-gl-lis-okr.zip` | `…/dane/2015/sejm/2015-kand-sejm.xls` |
| 2019 | `https://danewyborcze.kbw.gov.pl/dane/2019/sejmsenat/wyniki_gl_na_listy_po_okregach_sejm_csv.zip` | `…/dane/2019/sejmsenat/wykaz_list_sejm_csv.zip` |
| 2023 | `https://danewyborcze.kbw.gov.pl/dane/2023/sejmsenat/wyniki_gl_na_listy_po_okregach_sejm_csv.zip` | `…/dane/2023/sejmsenat/wykaz_list_sejm_csv.zip` |

No national-total file was found in the archive; the PKW results announcement (obwieszczenie) is the candidate official source for national totals and will be identified before any national aggregation.

## English enquiry

> Dear Sir or Madam,
>
> We maintain a non-commercial public research website on Central European data ([project URL]). We would like to use the official results of the Sejm elections 2001–2023 published on danewyborcze.kbw.gov.pl, for example [one example URL from the table above].
>
> The “Informacje prawne” page of DANE WYBORCZE currently has no content, and we could not find reuse conditions for these files. Could you please tell us:
>
> 1. May these election-result files be reused, and if so, under which conditions (for example under the law on open data and the re-use of public-sector information, or a specific licence)?
> 2. May we publish normalized factual extracts (votes, vote shares, seats, turnout, electoral committee names and numbers) and derived vote/seat shares clearly labelled as derived?
> 3. May we keep the original files in a private archive for reproducibility, and may we redistribute the original files themselves?
> 4. Are there any conditions on manual download or on automated (scripted) retrieval of these static files?
> 5. What attribution do you require, and how should modifications or derived values be indicated?
>
> Thank you very much. Kind regards,
> [Name], [affiliation], [contact e-mail]

## Polish draft (machine-assisted; native-speaker review recommended before sending)

> Szanowni Państwo,
>
> prowadzimy niekomercyjny, publiczny serwis badawczy z danymi dotyczącymi państw Europy Środkowej ([adres projektu]). Chcielibyśmy wykorzystać oficjalne wyniki wyborów do Sejmu z lat 2001–2023 udostępnione w serwisie danewyborcze.kbw.gov.pl, np. [jeden przykładowy adres URL].
>
> Strona „Informacje prawne” serwisu DANE WYBORCZE nie zawiera obecnie treści i nie udało nam się znaleźć warunków ponownego wykorzystywania tych plików. Uprzejmie prosimy o informację:
>
> 1. Czy pliki z wynikami wyborów mogą być ponownie wykorzystywane, a jeśli tak, to na jakich warunkach (np. na podstawie ustawy o otwartych danych i ponownym wykorzystywaniu informacji sektora publicznego lub określonej licencji)?
> 2. Czy możemy publikować znormalizowane wyciągi faktograficzne (liczby głosów, udziały głosów, mandaty, frekwencję, nazwy i numery komitetów wyborczych) oraz wartości pochodne wyraźnie oznaczone jako pochodne?
> 3. Czy możemy przechowywać oryginalne pliki w niepublicznym archiwum w celu zapewnienia odtwarzalności oraz czy możemy rozpowszechniać same oryginalne pliki?
> 4. Czy obowiązują jakiekolwiek warunki dotyczące ręcznego pobierania lub automatycznego (skryptowego) pobierania tych statycznych plików?
> 5. W jaki sposób należy wskazać źródło oraz oznaczać zmiany lub wartości pochodne?
>
> Z wyrazami szacunku,
> [Imię i nazwisko], [instytucja], [e-mail]

## Evidence (local archive, not redistributed)

| URL | SHA-256 | Retrieved |
|---|---|---|
| https://danewyborcze.kbw.gov.pl/indexa114.html?title=Dane_Wyborcze:Informacje_prawne | `3d80457b90cf40367be2a5f865fbd5eee4b476e86b8c6cf411a7c35586b1c6fe` | 2026-10-03T10:08Z |
| https://danewyborcze.kbw.gov.pl/index2a07.html?title=Wybory_do_Sejmu_w_2001_r. | `028ae8f6cf4d3a4a9656b0adc573437691074a8811474a443a649984733f32d6` | 2026-10-03T10:54Z |
| https://danewyborcze.kbw.gov.pl/index0cff.html?title=Wybory_do_Sejmu_w_2005_r. | `26c2afaa61a602814df96e9586c5610df7d05d877ba1e1c268138f455b94b665` | 2026-10-03T10:54Z |
| https://danewyborcze.kbw.gov.pl/indexa8cd.html?title=Wybory_do_Sejmu_w_2007_r. | `864978621ff8d5fe93610030d0aa85a5ae76644fc936dfbec072e46bb6688e32` | 2026-10-03T10:54Z |
| https://danewyborcze.kbw.gov.pl/index9d55.html?title=Parlament_2011 | `539cc65f7511f0dbf3b63861ee3c64ad3fc9abe10bce9a355c8f9f4a31c17f37` | 2026-10-03T10:06Z |
| https://danewyborcze.kbw.gov.pl/index4ca9.html?title=Wybory_do_Sejmu_w_2015_r. | `422aa63eda81cb42ddd090091330f302e225260abed09b8c70e17c2f9b73c3bf` | 2026-10-03T10:54Z |
| https://danewyborcze.kbw.gov.pl/indexe16b.html?title=Parlament_2019 | `ae614a67a8e78720527c3028c45cff5196180f269d6cf5f456afd9b0dc38109a` | 2026-10-03T10:06Z |
| https://danewyborcze.kbw.gov.pl/indexc6e4.html?title=Parlament_2023 | `cb0a22035161640c541041102d1604713ae023259e5c56c48faff368dc7bc60f` | 2026-10-03T10:06Z |

## What closes which gate (decision matrix PL1–PL5)

| Answer | Gate effect |
|---|---|
| Q1 conditions stated for these files | reuse_right → closed (with those conditions) |
| Q2 yes | normalized_factual_republication_right → closed |
| Q3 redistribution no | raw_redistribution_right → blocked; normalized production may still proceed (1B-B) |
| Q4 conditions | acquisition gates per stated conditions (1B-manual if scripts excluded) |
| Q5 wording | attribution and transformation disclosure → closed |

**Not sufficient:** a reference to the general PSI law or the constitutional right to information without saying the files are available for re-use without further conditions; “the data are public”.
