# Project Template (G-Stack + Superpowers)

Claude Code / Cowork 기반 프로젝트용 **재사용 템플릿**. 매 프로젝트 이 폴더를 복사해서 시작한다.

## 포함된 것

- **`.claude/skills/gstack/office-hours`** — 아이디어 검증 (G-Stack)
- **`.claude/skills/gstack/plan-design-review`** — UX/디자인 플랜 리뷰 (G-Stack)
- **`.claude/skills/brainstorming`** — 옵션 탐색 (Superpowers)
- **`.claude/skills/writing-plans`** — 구현 플랜 작성 (Superpowers)
- **`.claude/skills/subagent-driven-development`** — 서브에이전트 기반 구현 (Superpowers)
- **`.claude/skills/verification-before-completion`** — 완료 전 검증 (Superpowers)
- **`.claude/commands/kickoff`** — 킥오프 파이프라인 슬래시 커맨드
- **`.claude/commands/implement`** — 구현 파이프라인 슬래시 커맨드
- **`CLAUDE.md`** — 전역 룰 (워크플로, 금지사항, 산출물 규약)
- **`docs/{prd,plans,design-reviews}/`** — 산출물 폴더
- **`templates/`** — PRD/Plan 문서 템플릿
- **`scripts/init-project.sh`** — 플레이스홀더 치환 초기화 스크립트

## 시작하기

```bash
# 1. 템플릿 복사
cp -r project-template/ my-new-project
cd my-new-project

# 2. 초기화 (CLAUDE.md 플레이스홀더 치환)
bash scripts/init-project.sh "my-new-project" "홍길동"

# 3. git 초기화
git init && git add . && git commit -m "chore: init from template"

# 4. Claude Code 또는 Cowork에서 열기 → /kickoff 실행
```

## 워크플로 한눈에

```
아이디어
  └→ /kickoff
       ├→ office-hours         → docs/prd/{slug}.md
       ├→ brainstorming        → docs/plans/{slug}-options.md
       ├→ writing-plans        → docs/plans/{slug}.md
       └→ plan-design-review   → docs/design-reviews/{slug}.md
  └→ /implement docs/plans/{slug}.md
       ├→ subagent-driven-development
       └→ verification-before-completion
  └→ PR 생성
```

## 스킬 버전 업데이트

`.claude/VENDOR.md` 참고. 원본 리포 커밋 해시가 거기에 고정되어 있다.

## 라이선스

각 skill은 원본 리포 라이선스를 따른다 (`.claude/skills/gstack/LICENSE`, `.claude/skills/LICENSE-superpowers`).
