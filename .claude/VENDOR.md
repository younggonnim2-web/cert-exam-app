# Vendored Skills & Commands

이 디렉토리의 스킬은 외부 리포에서 복사해 온 것(vendored)이며, 버전이 고정되어 있다.
업데이트가 필요하면 원본 리포에서 최신 버전을 확인 후 수동으로 교체한다.

## 출처 및 고정 버전 (2026-08-11 기준)

### G-Stack
- 원본: https://github.com/garrytan/gstack
- 고정 커밋: `94993f7` (VERSION `1.61.0.0`) ← **2026-08-11 재-vendoring, 이전 고정본 `2300067`/`7489506` (VERSION `0.17.0.0`) 대체**
- 포함된 스킬 (⚠️ **폴더 구조 수정, 2026-08-11**: 아래 3개 스킬을 `gstack/` 하위에서 `.claude/skills/` 바로 아래로 이동함. Claude Code의 스킬 디스커버리는 `.claude/skills/{skill명}/SKILL.md` 한 단계 중첩만 인식하며, `gstack/office-hours/`처럼 두 단계로 중첩되면 스킬로 인식되지 않아 `/office-hours` 호출이 "Unknown skill" 에러로 실패했음 — 최초 재-vendoring 이후 처음 실제 호출해보고 발견):
  - `.claude/skills/office-hours/` — 아이디어 검증 (YC Office Hours 방식)
  - `.claude/skills/plan-design-review/` — UX/디자인 플랜 리뷰
  - `.claude/skills/plan-eng-review/` — 아키텍처·엔지니어링 플랜 리뷰
  - `.claude/skills/gstack/bin/` — 보조 스크립트 (gbrain/ios-qa/codex 등 신규 스크립트 다수 포함, 미사용분 존재 가능). **주의**: 위 세 스킬의 SKILL.md는 이 bin을 `~/.claude/skills/gstack/bin/...` (사용자 홈 디렉토리 절대경로)로 참조함 — 이 프로젝트처럼 로컬(project-level)에만 vendoring된 경우 해당 스크립트들은 항상 실패하고 기본값으로 폴백됨 (`2>/dev/null || 기본값` 패턴이라 에러 없이 조용히 무시됨). 텔레메트리/gbrain 연동/config persist 등 부가기능만 비활성화되고 스킬 본문(LLM 지시문) 자체는 정상 동작.
  - `.claude/skills/gstack/lib/` — 공용 유틸 (gbrain-*.ts 등 신규 파일 포함, 위와 동일한 이유로 프로젝트 로컬에서는 대부분 미사용)
- 재-vendoring 시 주요 변경점 (`v0.17.0.0` → `v1.61.0.0`):
  - AskUserQuestion이 Claude Code 2.1.89+에서 깨지던 버그 수정 (v1.61.0.0) — 재-vendoring 전에는 질문 카드가 렌더링되지 않았을 가능성 있음
  - `Scope gate` / `EXIT PLAN MODE GATE (BLOCKING)` 하드 게이트 추가
  - `gbrain`(팀 공유 브레인) preflight 연동 — 미설정 시 오버헤드 없음
  - 스킬 본문 구조가 "N-Pass 나열식" → `sections/` 하위 파일 + `Section index`/`Section self-check` 패턴으로 재편
  - CLAUDE.md의 STEP 3.5/4가 참조하는 산출물 형식(리뷰 리포트 등)이 바뀌었을 수 있으니, 다음 리뷰 실행 시 출력 포맷 확인 필요

### Superpowers
- 원본: https://github.com/obra/superpowers
- 고정 커밋: `f9b088f`
- 포함된 스킬:
  - `.claude/skills/brainstorming/` — 옵션 탐색
  - `.claude/skills/writing-plans/` — 구현 플랜 작성
  - `.claude/skills/subagent-driven-development/` — 서브에이전트 기반 구현
  - `.claude/skills/using-superpowers/` — 공통 메타 스킬
  - `.claude/skills/verification-before-completion/` — 완료 전 검증
  - `.claude/skills/using-git-worktrees/` — Git worktrees로 병렬 개발

## 업데이트 방법

```bash
# 1. 최신 소스 클론
git clone https://github.com/garrytan/gstack.git /tmp/gstack
git clone https://github.com/obra/superpowers.git /tmp/superpowers

# 2. 필요한 스킬만 덮어쓰기 (예시) — gstack 스킬은 .claude/skills/ 바로 아래에 평평하게 배치할 것
#    (gstack/office-hours/ 처럼 두 단계로 넣으면 Claude Code가 스킬로 인식하지 못함)
rsync -a --delete /tmp/gstack/office-hours/ .claude/skills/office-hours/
rsync -a --delete /tmp/gstack/bin/ .claude/skills/gstack/bin/
rsync -a --delete /tmp/superpowers/skills/writing-plans/ .claude/skills/writing-plans/

# 3. 이 파일의 고정 커밋 해시 갱신
git -C /tmp/gstack rev-parse --short HEAD
git -C /tmp/superpowers rev-parse --short HEAD
```

## 라이선스

- G-Stack: MIT (`.claude/skills/gstack/LICENSE` 참조)
- Superpowers: `.claude/skills/LICENSE-superpowers` 참조
