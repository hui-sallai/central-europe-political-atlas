# CSL 1.0.2 input-data schema

The unmodified `csl-data.json` fixture comes from the Citation Style Language project's v1.0.2 tag, commit `506040022f6c37846343edd36658b23e85b5b8ff`. It describes a CSL item array in JSON Schema Draft 7. The upstream MIT licence accompanies it. [Original schema](https://github.com/citation-style-language/schema/blob/506040022f6c37846343edd36658b23e85b5b8ff/schemas/input/csl-data.json) · [Licence](https://github.com/citation-style-language/schema/blob/506040022f6c37846343edd36658b23e85b5b8ff/LICENSE.txt)

`node --test tests/tooling/notebook-citation-schema.test.mjs` checks the fixture's SHA-256 and validates the actual application export offline using the Ajv installed with ESLint.

For independent reader checks, run `node --test tests/interchange/notebook-citation-readers.test.mjs` with Pandoc 3 and classic BibTeX available on PATH. The optional `PANDOC` and `BIBTEX` environment variables accept executable paths. The reader tests use synthetic Notebook data, a temporary directory and a fixed bibliography style that reports parsed fields. They run no TeX document processor.

Pandoc 3.10 imported the test titles with Chinese and Hungarian text, paired braces, literal backslashes and punctuation intact. Its BibTeX reader can drop a single unmatched brace represented by a TeX brace-name command. The native CSL-JSON and manifest retain the recorded spelling. Pandoc maps the generic BibTeX `@misc` item to an empty type when converting it to CSL-JSON. Use the native CSL export for the schema-validated item types.
