#!/usr/bin/env python3
"""PDF text extractor for the crawl screenplay corpus.

Uses PyMuPDF (fitz) to extract text from text-based PDFs. Scanned/image-only
PDFs (where PyMuPDF returns near-empty text) are skipped — they would need OCR,
which is out of scope for the deterministic corpus build.

Outputs the extracted text to stdout (UTF-8), or prints "SKIP: <reason>" to
stdout and exits 0 if the PDF should be skipped.

Usage: python scripts/extract_pdf.py <path-to-pdf>
"""
import sys
import fitz  # PyMuPDF


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from a PDF. Returns empty string if image-only/scanned."""
    doc = fitz.open(pdf_path)
    try:
        pages = []
        total_images = 0
        for page in doc:
            text = page.get_text()
            total_images += len(page.get_images())
            pages.append(text)
        full_text = "\n".join(pages).strip()
        # Heuristic: if we got almost no text but the PDF has many image-heavy
        # pages, it's a scanned PDF that needs OCR — skip it.
        if len(full_text) < 100 and total_images > 3:
            return ""
        return full_text
    finally:
        doc.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf-path>", file=sys.stderr)
        sys.exit(2)
    pdf_path = sys.argv[1]
    try:
        text = extract_pdf_text(pdf_path)
    except Exception as e:
        print(f"SKIP: extraction error: {e}")
        sys.exit(0)
    if len(text) < 500:
        print(f"SKIP: too short ({len(text)} chars) — likely scanned/image PDF")
        sys.exit(0)
    # Write text to stdout as UTF-8 regardless of platform default
    sys.stdout.buffer.write(text.encode("utf-8"))


if __name__ == "__main__":
    main()
