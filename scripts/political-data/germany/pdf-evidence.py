"""Read selected official source pages; emit evidence, never canonical records."""
import json
import sys
import pdfplumber

with pdfplumber.open(sys.argv[1]) as document:
    pages = []
    for number in map(int, sys.argv[2:]):
        page = document.pages[number - 1]
        pages.append({"pdf_page": number, "text": page.extract_text(layout=False) or ""})
    print(json.dumps({"page_count": len(document.pages), "pages": pages}, ensure_ascii=False))
