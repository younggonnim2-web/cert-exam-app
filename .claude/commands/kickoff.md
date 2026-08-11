---
description: "새 기능 킥오프 — office-hours → brainstorming → writing-plans 순서로 자동 진행"
---

새 기능/아이디어를 킥오프한다. 아래 순서를 정확히 지킨다:

1. **`office-hours` skill 호출** — 아이디어가 진짜 필요한지 6가지 질문으로 검증하고 `docs/prd/{slug}.md` 저장
2. 사용자에게 PRD 승인 요청
3. 승인되면 **`brainstorming` skill 호출** — 2~4개 해결 옵션 비교, `docs/plans/{slug}-options.md` 저장
4. 방향 결정 후 **`writing-plans` skill 호출** — `docs/plans/{slug}.md` 저장
5. UI/UX 포함이면 **`sitemap-wireframe` skill 호출** — `docs/wireframes/{slug}-sitemap.html` 생성, 사용자가 브라우저에서 열어 화면 구조·흐름·상태 확인 후 승인
6. 승인 후 **`plan-design-review` skill 호출** — `docs/design-reviews/{slug}.md` 저장
7. 최종 플랜을 요약해서 사용자에게 구현 착수 여부 확인

각 단계 완료 시마다 사용자에게 진행 여부를 확인하고, 승인 없이 다음 단계로 넘어가지 않는다.
