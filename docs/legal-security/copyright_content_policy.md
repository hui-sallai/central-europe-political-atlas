# Copyright and content policy (Event Library, texts, images)

**LAW / EXTERNAL LICENCE (context).** News articles, photos and long quotations are protected by copyright; press publishers
also have related rights in the EU (Directive 2019/790, Art. 15).

**ATLAS POLICY.**
- Event Library entries are written in the Atlas's own words: a short factual summary plus a boundary paragraph, and a
  link to the source. No copied paragraphs, no article images, no paywalled text.
- Quotations stay short, are attributed, and appear only where they are necessary.
- Site images (OG cards, maps) are generated from Atlas-controlled data. Boundary geometry carries the required attribution.
- Third-party logos and trademarks are not used to suggest endorsement or affiliation.
- Person-level political labels such as "far-right", "populist" or "pro-Russian" are not applied to identifiable individuals.
  Party-family classifications cite their source dataset (political_person_data_policy.md).

**ENGINEERING CONTROL.** `political-person-safety:validate` scans Event Library titles and summaries for person-label terms
(`PERSON_LABEL_TERMS`). Exceptions require an entry in `person_label_review_allowlist.json` with a reviewer and reason.
The list is currently empty.
