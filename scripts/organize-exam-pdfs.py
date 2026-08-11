import re
import shutil
import sys
from pathlib import Path

import fitz  # pymupdf

BASE = Path(__file__).resolve().parent.parent / "data" / "exam-questions"
FNAME_RE = re.compile(r"^(?P<cert>.+?)(?P<date>\d{8})\((?P<tag>[^)]+)\)\.pdf$")

LOG_PATH = BASE / "_organize-log.txt"


def extract_text(pdf_path: Path) -> str:
    doc = fitz.open(pdf_path)
    parts = []
    for i, page in enumerate(doc):
        parts.append(f"--- page {i + 1} ---\n{page.get_text()}")
    return "\n\n".join(parts)


def main():
    log_lines = []
    loose_pdfs = sorted(p for p in BASE.glob("*.pdf") if p.is_file())

    if not loose_pdfs:
        log_lines.append("No loose PDFs found at data/exam-questions root.")

    for pdf_path in loose_pdfs:
        m = FNAME_RE.match(pdf_path.name)
        if not m:
            log_lines.append(f"SKIP (name pattern not recognized): {pdf_path.name}")
            continue

        cert = m.group("cert").strip()
        date_raw = m.group("date")
        date_iso = f"{date_raw[0:4]}-{date_raw[4:6]}-{date_raw[6:8]}"
        tag = m.group("tag").strip()

        target_dir = BASE / cert / date_iso
        target_dir.mkdir(parents=True, exist_ok=True)

        target_pdf = target_dir / "source.pdf"
        if target_pdf.exists():
            log_lines.append(f"SKIP (already organized): {pdf_path.name}")
            continue

        text = extract_text(pdf_path)

        raw_md = target_dir / "raw.md"
        header = (
            f"# {cert} {date_iso} 필기 기출문제\n\n"
            f"- 자격증: {cert}\n"
            f"- 시행일: {date_iso}\n"
            f"- 원본 파일: `{pdf_path.name}` ({tag})\n"
            f"- 추출 방식: pymupdf 자동 추출 (raw, 미가공)\n\n"
            f"---\n\n"
        )
        raw_md.write_text(header + text, encoding="utf-8")

        shutil.move(str(pdf_path), str(target_pdf))

        log_lines.append(f"OK: {pdf_path.name} -> {cert}/{date_iso}/ (raw.md {len(text)} chars)")

    LOG_PATH.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    print(f"done, {len(log_lines)} entries, see {LOG_PATH}")


if __name__ == "__main__":
    main()
