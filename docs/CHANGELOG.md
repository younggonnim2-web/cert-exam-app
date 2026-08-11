# Project Rules Changelog

> 이 프로젝트 템플릿(`CLAUDE.md` 및 관련 룰)의 변경 이력.
> 새 항목 추가 시 최신순(상단)으로 작성한다.
> 글로벌 룰(`~/.claude/rules/`) 변경 이력은 `~/.claude/rules/CHANGELOG.md` 참조.

---

## 2026-05-13

### 출처
`plan-eng-review` 스킬 필요 시점 — design-review 이후 아키텍처 검증 단계에서 해당 스킬 부재 확인.
전체 gstack 업그레이드 대신 스킬 파일만 선택 추가 (기존 스킬 동작 방식 변경 없음).

### 추가(Added)

| 항목 | 위치 | 내용 |
|---|---|---|
| `plan-eng-review` 스킬 신규 추가 | `.claude/skills/gstack/plan-eng-review/SKILL.md` | 아키텍처·데이터 플로우·엣지케이스·테스트 커버리지 등 엔지니어링 관점 플랜 리뷰. gstack `7489506` (2026-05-11) |

### 수정(Changed)

| 항목 | 위치 | 내용 |
|---|---|---|
| G-Stack 스킬 목록 갱신 | `.claude/VENDOR.md` | `plan-eng-review` 커밋 해시(`7489506`) 추가 기록 |

---

## 2026-04-28

### 출처
기획 텍스트와 실제 구현 화면 간 괴리 문제 해소 — 브라우저에서 바로 열 수 있는 인터랙티브 HTML 사이트맵 단계 추가.

### 추가(Added)

| 항목 | 위치 | 내용 |
|---|---|---|
| `sitemap-wireframe` 스킬 신규 생성 | `.claude/skills/sitemap-wireframe/SKILL.md` | `writing-plans` 완료 후 `docs/wireframes/{slug}-sitemap.html` 생성. ① 화면 간 클릭 인터랙션(연결 화면 하이라이트), ② 화면별 상태 탭(Default/Loading/Empty/Error) 포함 |
| STEP 3.5 삽입 | `CLAUDE.md` §2 필수 워크플로 | `writing-plans` → `sitemap-wireframe` → `plan-design-review` 순서로 변경. 사이트맵 승인 전 디자인 리뷰 및 개발 착수 금지 조건 추가 |
| 킥오프 파이프라인 6→7단계 확장 | `.claude/commands/kickoff.md` | `sitemap-wireframe` 단계 삽입, 이후 `plan-design-review` 진행 |

### 수정(Changed)

| 항목 | 위치 | 내용 |
|---|---|---|
| 산출물 위치 규약에 `wireframes` 추가 | `CLAUDE.md` §4 | `docs/wireframes/{feature}-sitemap.html` 경로 명시 |

---

## 2026-04-21

### 출처
[Claude Design System Prompt](https://gist.github.com/hqman/f46d5479a5b663c282c94faa8be866de) 분석 — LLM 행동 패턴 개선 원칙 적용.

### CLAUDE.md

| 항목 | 위치 | 내용 | 태그 |
|---|---|---|---|
| `채우기 콘텐츠 추가 금지` | §3 금지 사항 | 더미 텍스트/임의 통계/불필요한 섹션을 사용자 승인 없이 추가 금지 | `#6` |

---

## 작성 규칙

- 날짜: `YYYY-MM-DD`
- 변경 유형: `추가(Added)` / `수정(Changed)` / `삭제(Removed)` / `수정(Fixed)`
- 출처: 변경의 근거(링크, 이슈, 실험 결과 등) 명시
- 파일별로 묶어서 기록
