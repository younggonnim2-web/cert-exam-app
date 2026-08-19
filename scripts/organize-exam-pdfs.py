import re
import shutil
import sys
from pathlib import Path

import fitz  # pymupdf

BASE = Path(__file__).resolve().parent.parent / "data" / "exam-questions"
FNAME_RE = re.compile(r"^(?P<cert>.+?)(?P<date>\d{8})\((?P<tag>[^)]+)\)\.pdf$")

LOG_PATH = BASE / "_organize-log.txt"


def extract_page_column_aware(page) -> str:
    # 원본 PDF는 2단 레이아웃이다. page.get_text()의 기본(플레인) 순서는 항상 시각적
    # 읽기 순서(왼쪽 단 전체 -> 오른쪽 단 전체)와 일치하지 않는다 — 특히 "N과목 : ..."
    # 구분 박스처럼 별도 스타일(배경 박스)로 그려지는 요소는 y좌표상 왼쪽 단 중간에
    # 있어도 PDF 내부적으로는 그 페이지의 다른 모든 텍스트 블록보다 나중에 그려진
    # 오브젝트라 추출 스트림에서 훨씬 뒤(오른쪽 단 마지막 문항 뒤)에 나타난다. 실제
    # 조경기능사 2016-07-10 원문에서 확인: "3과목" 박스가 시각적으로는 35번/36번 사이인데
    # 추출 스트림에서는 49번(오른쪽 단 마지막 문항) 뒤에 나왔다 — 파서가 마커를
    # "그 위치까지의 문제들"에 배정하는 3단계 로직과 결합해 36~49번 전부가 앞 과목으로
    # 잘못 태깅되는 결과로 이어졌다 (조경기능사 7개 회차, 이미 배포됐던 종자기능사
    # 4개 회차에서 실측 확인).
    #
    # 해결: 텍스트를 순서대로 읽는 대신, 블록 단위(get_text("dict"))로 뽑아 x좌표
    # 중심이 페이지 중앙보다 왼쪽/오른쪽인지로 두 그룹으로 나누고, 각 그룹 내에서
    # y좌표로 정렬한 뒤 "왼쪽 단 전체 -> 오른쪽 단 전체" 순서로 이어붙인다. 이러면
    # 진짜 시각적 읽기 순서와 일치한다. 헤더처럼 폭이 넓어 중앙에 걸치는 블록은 어느
    # 쪽으로 분류되든 상관없다 — lib/parseExam.ts의 노이즈 필터가 위치와 무관하게
    # 내용으로 걸러내기 때문이다.
    # 조경기능사 2014-10-11은 컬럼 재정렬로도 안 고쳐진다: 같은 시각적 한 줄이
    # pymupdf 상에서 여러 "line" 오브젝트로 쪼개져 있는데, 그 line들의 block 내부
    # 배열 순서 자체가 x좌표 순서를 따르지 않는다. 블록의 line 순서를 좌표(y, x)로
    # 재정렬해서 고쳐보려 했으나, 이미 정상 동작하던 유기농업기능사 2012-07-22에서
    # 서로 다른 두 문항의 조각("...증시 함"과 "-→NO2")이 뒤섞여 붙는 조용한 오염을
    # 새로 만들어냈다 — 파싱은 성공(에러 없음)하지만 내용이 틀린, 발견하기 가장
    # 어려운 유형의 손상이다. 실전 검증(전체 재추출 + git diff로 기존 정답 대조)에서
    # 발견하고 폐기했다. 이 프로젝트 전체의 원칙(잘못된 정답을 조용히 배포하느니
    # 실패시키는 게 낫다)에 따라, block 내부 line 순서는 pymupdf가 준 그대로
    # 신뢰한다 — 조경기능사 2014-10-11 회차 하나가 파싱 실패로 남더라도, 이미
    # 정상 동작하는 나머지 101개 회차의 정확성이 우선이다.
    mid_x = page.rect.width / 2
    blocks = [b for b in page.get_text("dict")["blocks"] if b.get("lines")]

    def block_text(block) -> str:
        lines = ["".join(span["text"] for span in line["spans"]) for line in block["lines"]]
        return "\n".join(lines)

    def center_x(block) -> float:
        x0, _, x1, _ = block["bbox"]
        return (x0 + x1) / 2

    left = sorted((b for b in blocks if center_x(b) < mid_x), key=lambda b: b["bbox"][1])
    right = sorted((b for b in blocks if center_x(b) >= mid_x), key=lambda b: b["bbox"][1])
    texts = [block_text(b) for b in left + right]
    return "\n\n".join(t for t in texts if t.strip())


def extract_text(pdf_path: Path) -> str:
    doc = fitz.open(pdf_path)
    parts = []
    for i, page in enumerate(doc):
        parts.append(f"--- page {i + 1} ---\n{extract_page_column_aware(page)}")
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


def reextract_all():
    # 이미 organize된(=source.pdf가 회차 폴더로 옮겨진) 회차들을 컬럼 인식 추출로 다시
    # 뽑는다 — extract_page_column_aware 도입 전에 만들어진 raw.md를 전부 갱신하기 위한
    # 일회성 마이그레이션. main()의 loose-PDF 워크플로우와 달리 파일을 옮기지 않고
    # 기존 source.pdf를 그대로 두고 raw.md만 덮어쓴다.
    log_lines = []
    source_pdfs = sorted(BASE.glob("*/*/source.pdf"))

    for source_pdf in source_pdfs:
        round_dir = source_pdf.parent
        date_iso = round_dir.name
        cert = round_dir.parent.name
        raw_md = round_dir / "raw.md"

        orig_filename = f"{cert}{date_iso.replace('-', '')}(교사용).pdf"
        tag = "교사용"
        if raw_md.exists():
            m = re.search(r"원본 파일: `([^`]+)` \(([^)]+)\)", raw_md.read_text(encoding="utf-8"))
            if m:
                orig_filename, tag = m.group(1), m.group(2)

        text = extract_text(source_pdf)
        header = (
            f"# {cert} {date_iso} 필기 기출문제\n\n"
            f"- 자격증: {cert}\n"
            f"- 시행일: {date_iso}\n"
            f"- 원본 파일: `{orig_filename}` ({tag})\n"
            f"- 추출 방식: pymupdf 자동 추출, 2단 컬럼 인식 재정렬 (raw, 미가공)\n\n"
            f"---\n\n"
        )
        raw_md.write_text(header + text, encoding="utf-8")
        log_lines.append(f"REEXTRACT: {cert}/{date_iso} -> raw.md ({len(text)} chars)")

    LOG_PATH.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    print(f"done, {len(log_lines)} rounds reextracted, see {LOG_PATH}")


if __name__ == "__main__":
    if "--reextract" in sys.argv:
        reextract_all()
    else:
        main()
