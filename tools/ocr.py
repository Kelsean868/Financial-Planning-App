"""
OCR scanned PDFs / images -> text files.

Setup (one-time, already done on this machine):
    winget install --id UB-Mannheim.TesseractOCR
    pip install pymupdf pytesseract pillow

Usage:
    python tools/ocr.py "some/scanned.pdf" "another/brochure.jpg" ...

Renders at 200 DPI with PyMuPDF (no poppler needed), uses the PDF's native text
layer where present (free and perfect), and only OCRs pages that are actually
scanned images. Output goes to .firecrawl/ocr/<stem>.txt

NOTE: OCR output is a LEAD, not a source of truth. Digit noise is common in rate
tables — verify every figure against the source PDF before encoding it.
"""
import sys, io, time
from pathlib import Path
import fitz
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

OUT = Path(__file__).resolve().parent.parent / ".firecrawl" / "ocr"
OUT.mkdir(parents=True, exist_ok=True)

DPI = 200                      # plenty for body text; 300 doubles runtime for little gain
CONFIG = "--oem 3 --psm 6"     # psm 6 = uniform block of text; good for books and slides
NATIVE_TEXT_MIN = 120          # chars on a page before we trust the native layer


def ocr_pdf(path: Path, max_pages: int | None = None) -> str:
    doc = fitz.open(str(path))
    n = len(doc) if max_pages is None else min(max_pages, len(doc))
    out = []
    for i in range(n):
        page = doc[i]
        native = (page.get_text() or "").strip()
        if len(native) > NATIVE_TEXT_MIN:
            out.append(f"\n--- p{i+1} ---\n{native}")
            continue
        pix = page.get_pixmap(dpi=DPI)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        out.append(f"\n--- p{i+1} [OCR] ---\n{pytesseract.image_to_string(img, config=CONFIG).strip()}")
        if (i + 1) % 20 == 0:
            print(f"    ...{i+1}/{n}", flush=True)
    doc.close()
    return "\n".join(out)


def ocr_image(path: Path) -> str:
    return pytesseract.image_to_string(Image.open(str(path)), config=CONFIG).strip()


def main(argv: list[str]) -> None:
    if not argv:
        print(__doc__)
        return
    for t in (Path(p) for p in argv):
        if not t.exists():
            print(f"MISSING: {t}")
            continue
        dest = OUT / (t.stem[:70].replace(" ", "_") + ".txt")
        if dest.exists() and dest.stat().st_size > 500:
            print(f"SKIP (already done): {t.name}")
            continue
        t0 = time.time()
        print(f"OCR: {t.name}", flush=True)
        try:
            text = ocr_image(t) if t.suffix.lower() in {".jpg", ".jpeg", ".png"} else ocr_pdf(t)
            dest.write_text(text, encoding="utf-8")
            print(f"  -> {len(text):,} chars in {time.time()-t0:.0f}s -> {dest.name}", flush=True)
        except Exception as e:
            print(f"  ERROR: {e}")


if __name__ == "__main__":
    main(sys.argv[1:])
