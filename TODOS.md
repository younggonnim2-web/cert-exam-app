# TODOS

`docs/plans/cert-exam-app.md` plan-design-review에서 스코프 밖으로 미룬 항목들. 우선순위 없음 — 필요해지면 꺼내 쓰는 목록.

## 오답 리뷰 화면
- **What:** 결과 화면의 오답 문항 번호를 클릭하면 해당 문항+정답+본인 선택을 보여주는 리뷰 화면.
- **Why:** 지금은 오답 번호만 나열돼서, 어디서 틀렸는지 다시 원본 PDF를 뒤져야 함.
- **Pros:** 학습 효과 직접적으로 상승. 데이터(정답)는 이미 questions.json에 있어서 추가 데이터 작업 불필요.
- **Cons:** 결과 화면에 상태(어느 문항 클릭했는지) 추가 필요, 화면 하나 더 설계해야 함.
- **Context:** plan-design-review에서 "결과화면 dead-end" 문제를 다음행동 버튼으로만 해결하고, 상세 리뷰는 별도 기능으로 미룸.
- **Depends on:** 없음, 현재 데이터 구조로 바로 가능.

## 그룹 리더보드 (Approach C)
- **What:** 지인 그룹이 같은 모의고사를 동시/비동기로 풀고 결과를 비교하는 기능.
- **Why:** office-hours 세션의 Cross-Model Perspective에서 제안됨 — "같이 푸는" 컨셉과 가장 잘 맞는 차별화 포인트.
- **Pros:** 이 프로젝트의 핵심 재미 포인트(지인과 공유) 완성.
- **Cons:** 실시간 동기화 또는 최소한 서버 저장이 필요 — 지금 클라이언트 전용 localStorage 구조를 재설계해야 함.
- **Context:** PRD Approaches Considered 참고. 인증 없는 구조에서 시작한 게 이 기능 확장 시 걸림돌이 될 수 있다고 plan-design-review에서 지적됨.
- **Depends on:** 로컬 vs 서버 저장 결정 (PRD Open Questions).

## AI 자동 해설 생성
- **What:** 문제마다 정답 해설을 AI로 자동 생성.
- **Why:** office-hours "10배 버전" 질문에 사용자가 직접 답한 항목. 현재 데이터엔 정답만 있고 해설이 없음.
- **Pros:** 학습 효과 크게 향상.
- **Cons:** LLM 파이프라인 구축 + 품질 검증 필요, 비용 발생. "주말 프로토타입"으로는 못 끝냄 (Cross-Model Perspective 평가).
- **Context:** PRD Open Questions에 이미 있던 항목.
- **Depends on:** questions.json 구조화 완료 후.

## 커스텀 404 페이지
- **What:** Next.js 기본 404 대신 앱 톤에 맞는 `app/not-found.tsx`.
- **Why:** 지인이 오타 URL을 치는 정도의 엣지케이스라 지금은 우선순위 낮음.
- **Pros:** 완성도, 브랜드 일관성.
- **Cons:** 지금 스코프에서 실사용 빈도가 낮음.
- **Context:** Task 6 plan-design-review 리뷰에서 결정.
- **Depends on:** 없음.

## 정적 생성(generateStaticParams)으로 전환
- **What:** 지금은 `[cert]/[round]` 동적 라우트 + `/api/questions`가 요청 시점에 서버에서 파일을 직접 읽는 구조. 데이터는 빌드 타임에 이미 다 확정돼 있으니(52개 고정 회차), `generateStaticParams`로 정적 페이지를 만들거나 `questions.json`을 `public/`에 두고 정적 자산으로 fetch하는 방식으로 바꿀 수 있음.
- **Why:** plan-eng-review의 outside voice(독립 서브에이전트)가 지적 — 데이터가 정적인데 런타임 파일 접근을 하고 있어서, 경로 조작(path traversal) 방어 코드(`isSafeSegment`/`certExists`/`roundExists`) 전체가 애초에 불필요했을 수 있다는 지적. 맞는 말이지만 이미 방어 코드+테스트를 다 만든 상태라 이번엔 되돌리지 않기로 결정.
- **Pros:** 공격 표면 자체가 사라짐 (막을 게 없어짐). 빌드 타임에 모든 페이지가 확정되니 런타임 에러(404/500) 케이스도 줄어듦.
- **Cons:** Task 6/7/8의 상당 부분(동적 fetch, API 라우트, 에러/로딩 상태)을 다시 써야 함 — 자격증/회차가 정적으로 고정된 지금 스코프를 벗어나 사용자별 동적 데이터가 생기면(예: 그룹 리더보드) 오히려 다시 되돌려야 할 수도 있음.
- **Context:** `docs/plans/cert-exam-app.md` Task 8 API 라우트 섹션 참고. 그룹 리더보드(위 항목)를 실제로 만들게 되면 이 결정도 같이 재검토할 것 — 동적 데이터가 생기면 정적 생성의 이점이 줄어듦.
- **Depends on:** 없음, 지금 구조 그대로도 안전(경로 검증 완료) — 성능/단순성 이유로만 고려.

## 벽시계 기준 타이머로 전환
- **What:** 지금은 탭을 닫아두면 타이머가 사실상 일시정지됨(마지막 저장값 그대로 복원). `startedAt` 기준 실제 경과시간으로 계산하도록 바꾸면 부정행위 방지 가능.
- **Why:** plan-design-review에서 "실전 몰입감"이 핵심 가치인데 타이머를 일시정지할 수 있는 게 맞냐는 질문이 나왔음. 지금은 지인 그룹 캐주얼 용도라 의도적으로 허용하기로 결정.
- **Pros:** 더 엄격한 실전 시뮬레이션.
- **Cons:** "친구끼리 봐주는" 캐주얼함이 사라짐 — 이 프로젝트 성격과 안 맞을 수 있음.
- **Context:** `docs/plans/cert-exam-app.md` Task 8 ExamTimer 섹션의 "설계 결정" 참고.
- **Depends on:** 없음, 필요해지면 바로 전환 가능.
