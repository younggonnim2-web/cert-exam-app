---
description: "승인된 플랜을 subagent-driven-development 방식으로 구현"
---

인자로 받은 플랜 파일(`docs/plans/{slug}.md`)을 구현한다.

1. 플랜 파일을 Read로 읽고 요약
2. 작업을 3~7개 서브태스크로 분해
3. **`subagent-driven-development` skill 호출** — 각 서브태스크를 서브에이전트로 실행
4. 모든 서브태스크 완료 후 **`verification-before-completion` skill 호출** — 린트/테스트/타입 검증
5. 변경 요약과 다음 액션(PR 생성, 리뷰 요청 등) 제시

절대 3개 이상의 파일을 직접 동시 수정하지 말고 반드시 서브에이전트로 분산한다.
