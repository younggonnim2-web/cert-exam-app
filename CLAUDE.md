# Project Rules (CLAUDE.md)

> 이 파일은 Claude Code / Cowork가 프로젝트 작업 시 **반드시** 참조하는 전역 룰이다.
> 상단은 고정 룰, 하단의 "프로젝트별 설정"만 새 프로젝트마다 수정한다.

---

## 1. 역할

- 사용자는 **서비스 기획자 + 풀스택/서버 개발자 올라운더**이다.
- 모든 작업은 **기획 → 설계 → 구현 → 검증** 순서를 지킨다.
- 코드보다 문서가 먼저다. 문서 없이 코드부터 작성하지 않는다.

---

## 2. 필수 워크플로

아래 순서를 반드시 따른다. 건너뛰기 금지.

### STEP 1. 아이디어 검증 — `office-hours` skill
- 트리거: "새 기능", "아이디어 있어", "이거 만들까?", "이게 필요한가?"
- 산출물: `docs/prd/{feature-slug}.md`
- 통과 기준: 6가지 질문(수요, 현상 유지, 구체성, 최소 웨지, 관찰, 미래 적합성) 답변 완료

### STEP 2. 옵션 탐색 — `brainstorming` skill (superpowers)
- 트리거: PRD 승인 후, "어떻게 풀지"를 고민할 때
- 산출물: `docs/plans/{feature-slug}-options.md`
- 2~4개 대안을 비교하고 장단점 명시

### STEP 3. 플랜 작성 — `writing-plans` skill (superpowers)
- 트리거: 방향이 결정된 직후
- 산출물: `docs/plans/{feature-slug}.md`
- 플랜에는 파일별 변경 범위, 테스트 전략, 롤백 전략 포함

### STEP 3.5. 사이트맵 + 와이어프레임 — `sitemap-wireframe` skill
- 트리거: `writing-plans` 완료 직후 (UI/UX가 포함된 플랜 전부)
- 산출물: `docs/wireframes/{feature-slug}-sitemap.html`
- 포함 내용:
  - 화면 간 클릭 인터랙션 (연결된 화면 하이라이트)
  - 화면별 상태 탭 (Default / Loading / Empty / Error)
  - 핵심 탐색 흐름 요약
- 통과 기준: 사용자가 브라우저에서 열어 화면 구조·흐름·상태 전부 확인 및 승인
- **승인 전 디자인 리뷰 및 개발 착수 금지**

### STEP 4. UX/디자인 리뷰 — `plan-design-review` skill
- 트리거: UI/UX가 포함된 플랜 전부
- 산출물: `docs/design-reviews/{feature-slug}.md`
- 각 디자인 차원 0~10점 + 10점 만들기 위한 수정안

### STEP 5. 구현 — `subagent-driven-development` skill (superpowers)
- 트리거: 플랜 승인 후 실제 코드 작성 시
- 작업 분해 → 서브에이전트 실행 → 통합 → 검증
- **절대 혼자 3개 이상의 파일을 동시 변경하지 않는다**
- 병렬 작업이 필요하면 `using-git-worktrees` skill 활용 (메인 브랜치 오염 방지)

### STEP 6. 완료 검증 — `verification-before-completion` skill
- 머지/배포 직전 필수 체크리스트 실행
- 커밋 직전 **security-reviewer 에이전트**(글로벌 `~/.claude/agents/security-reviewer.md`) 실행 — 시크릿 노출, 입력 검증, OWASP Top 10 체크. CRITICAL/HIGH 이슈는 커밋 전 해결

---

## 3. 금지 사항

- PRD(`docs/prd/*`) 없이 코드 작성 금지
- 플랜(`docs/plans/*`) 없이 3파일 이상 수정 금지
- 테스트 없이 로직 변경 금지
- Secrets(.env 등) 커밋 금지
- 근거 없는 라이브러리 추가 금지
- 채우기 콘텐츠 추가 금지: 빈 공간을 채우기 위한 더미 텍스트, 임의 통계/수치, 불필요한 섹션을 사용자 승인 없이 추가하지 마라. 추가가 필요하다고 판단되면 먼저 물어라. (#6)

---

## 4. 산출물 위치 규약

| 종류 | 위치 |
|------|------|
| PRD / 아이디어 검증 | `docs/prd/` |
| 옵션 탐색 / 브레인스토밍 | `docs/plans/{feature}-options.md` |
| 구현 플랜 | `docs/plans/{feature}.md` |
| 사이트맵 + 와이어프레임 | `docs/wireframes/{feature}-sitemap.html` |
| 디자인 리뷰 | `docs/design-reviews/` |
| 스킬 / 커맨드 | `.claude/skills/`, `.claude/commands/` |

파일명은 `kebab-case`, 날짜가 필요하면 `YYYY-MM-DD-{slug}.md`.

---

## 5. 커밋 & PR 규칙

- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- PR 본문에는 관련 PRD / Plan 파일 링크 필수
- 테스트 없이 머지 금지 (핫픽스 제외, 사유 기재)

---

## 6. 툴/스킬 호출 우선순위

1. 사용자가 명시한 스킬 > 아래 순서
2. 기획 단계: `office-hours` → `brainstorming`
3. 설계 단계: `writing-plans` → `plan-design-review`
4. 구현 단계: `subagent-driven-development`
5. 검증 단계: `verification-before-completion`

---

# ── 아래는 프로젝트별 설정 (매 프로젝트 수정) ──

## Project Meta
- 프로젝트명: `{PROJECT_NAME}`
- 시작일: `{START_DATE}`
- 기획자/오너: `{OWNER}`

## 기술 스택
- **Frontend**: `{e.g. Next.js 15 + TypeScript + Tailwind}`
- **Backend**: `{e.g. NestJS / FastAPI / Spring Boot}`
- **DB**: `{e.g. PostgreSQL + Prisma}`
- **Infra**: `{e.g. AWS / Vercel / Supabase}`
- **Auth**: `{e.g. NextAuth / Clerk / 자체}`

## 코드 컨벤션
- 린터: `{eslint + prettier / biome}`
- 테스트: `{vitest / jest / pytest}`
- 커버리지 하한: `{80%}`

## 환경 변수
- `.env.example` 최신 유지 필수
- 실제 값은 `.env.local` (gitignored)

## 배포
- 브랜치 전략: `{trunk / git-flow}`
- 배포 대상: `{main → prod, develop → staging}`
