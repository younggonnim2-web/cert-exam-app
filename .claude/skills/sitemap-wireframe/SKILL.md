# sitemap-wireframe

`writing-plans` 완료 후 실행. `docs/plans/{slug}.md`를 읽어 브라우저에서 바로 열 수 있는 인터랙티브 HTML 사이트맵을 생성한다.

## 트리거

- `writing-plans` 완료 직후
- 사용자가 "사이트맵", "와이어프레임", "화면 흐름 확인" 언급 시

## 입력

- `docs/plans/{slug}.md` — 화면 목록, 역할(role), 탐색 흐름, 파일 구조
- 없으면 사용자에게 플랜 파일 경로를 요청

## 출력

- `docs/wireframes/{slug}-sitemap.html`
- 완료 후 사용자에게 경로를 알리고 브라우저에서 확인 요청
- 승인 없이 다음 단계(design-review / 개발) 착수 금지

---

## HTML 생성 규칙

### 기본 구조

플랜에서 다음을 추출해 섹션별로 구성한다:

1. **진입 · 공통** — 스플래시, 라우팅 가드
2. **인증 (auth)** — 로그인, OTP, 온보딩 등
3. **역할별 메인 화면** — 탭바 화면들 (role당 하나의 컬럼)
4. **서브 화면** — 탭바 없는 상세/서브 화면
5. **핵심 흐름 요약** — 주요 시나리오 텍스트 박스
6. **파일 구조** — 코드 블록

### 디자인 토큰 (고정)

```css
--auth: #7C3AED;        /* 인증 */
--customer: #1D4ED8;    /* 고객 */
--merchant: #047857;    /* 상인 */
--entry: #B45309;       /* 진입/공통 */
--neutral: #374151;
--bg: #F9FAFB;
```

역할이 다른 경우(admin, driver 등) 아래 순서로 색상 할당:
`#0891B2`, `#BE185D`, `#7C3AED`, `#D97706`

### 폰 프레임 마크업

```html
<div class="screen-card" data-id="{screenId}" data-connects-to="{targetId1},{targetId2}">
  <div class="phone {role}">
    <div class="phone-top"></div>
    <div class="screen-states">
      <!-- 상태 탭 -->
      <div class="state-tabs">
        <button class="state-tab active" data-state="default">Default</button>
        <button class="state-tab" data-state="loading">Loading</button>
        <button class="state-tab" data-state="empty">Empty</button>
        <button class="state-tab" data-state="error">Error</button>
      </div>
      <!-- 상태별 콘텐츠 -->
      <div class="screen state-content active" data-state="default">
        <!-- 실제 와이어프레임 요소 -->
      </div>
      <div class="screen state-content" data-state="loading">
        <!-- 스켈레톤 UI: 회색 블록들 -->
      </div>
      <div class="screen state-content" data-state="empty">
        <!-- 빈 상태: 아이콘 + 안내 문구 -->
      </div>
      <div class="screen state-content" data-state="error">
        <!-- 에러: 빨간 아이콘 + 재시도 버튼 -->
      </div>
    </div>
  </div>
  <div class="screen-label">{화면명}</div>
  <div class="screen-path">{파일경로}</div>
</div>
```

### ① 클릭 인터랙션 — 화면 연결 하이라이트

각 `screen-card`에 `data-id`(고유 ID)와 `data-connects-to`(연결 대상 ID들, 쉼표 구분)를 부여한다.

```javascript
document.querySelectorAll('.screen-card').forEach(card => {
  card.addEventListener('click', () => {
    // 기존 하이라이트 전부 해제
    document.querySelectorAll('.screen-card').forEach(c => {
      c.classList.remove('highlighted', 'source', 'dimmed');
    });

    const targets = (card.dataset.connectsTo || '').split(',').filter(Boolean);

    if (targets.length === 0) return;

    // 클릭한 카드: source
    card.classList.add('source');

    // 연결된 카드: highlighted
    targets.forEach(id => {
      const target = document.querySelector(`[data-id="${id.trim()}"]`);
      if (target) target.classList.add('highlighted');
    });

    // 나머지: dimmed
    document.querySelectorAll('.screen-card:not(.source):not(.highlighted)').forEach(c => {
      c.classList.add('dimmed');
    });
  });
});

// 배경 클릭 시 초기화
document.addEventListener('click', e => {
  if (!e.target.closest('.screen-card')) {
    document.querySelectorAll('.screen-card').forEach(c => {
      c.classList.remove('highlighted', 'source', 'dimmed');
    });
  }
});
```

**CSS 상태 스타일:**

```css
.screen-card { transition: opacity 0.2s, transform 0.2s; cursor: pointer; }
.screen-card.source .phone { outline: 3px solid #F59E0B; border-radius: 26px; }
.screen-card.highlighted .phone { outline: 3px solid #10B981; border-radius: 26px; }
.screen-card.highlighted { transform: scale(1.03); }
.screen-card.dimmed { opacity: 0.3; }
```

### ② 화면 상태 병렬 탭

각 폰 프레임 안에 상태 탭(Default / Loading / Empty / Error)을 두고 탭 클릭으로 전환한다.

**상태별 와이어프레임 패턴:**

| 상태 | 표현 방법 |
|------|----------|
| Default | 실제 데이터가 채워진 정상 화면 |
| Loading | 회색 스켈레톤 블록 (`background: #E5E7EB; border-radius: 4px; animation: pulse 1.5s infinite`) |
| Empty | 중앙에 아이콘 블록(40×40, `#F3F4F6`) + 안내 텍스트 + 액션 버튼(해당 시) |
| Error | 빨간 아이콘 블록 + "오류가 발생했습니다" 텍스트 + "다시 시도" 버튼 |

```javascript
document.querySelectorAll('.state-tab').forEach(tab => {
  tab.addEventListener('click', e => {
    e.stopPropagation(); // 화면 클릭 이벤트 버블링 방지
    const card = tab.closest('.screen-card');
    const state = tab.dataset.state;

    card.querySelectorAll('.state-tab').forEach(t => t.classList.remove('active'));
    card.querySelectorAll('.state-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    card.querySelector(`.state-content[data-state="${state}"]`).classList.add('active');
  });
});
```

**상태 탭 CSS:**

```css
.state-tabs {
  display: flex; background: #F3F4F6;
  border-bottom: 1px solid #E5E7EB; flex-shrink: 0;
}
.state-tab {
  flex: 1; font-size: 5.5px; padding: 3px 0;
  border: none; background: none; cursor: pointer;
  color: #9CA3AF; font-weight: 600;
}
.state-tab.active { color: #1D4ED8; border-bottom: 2px solid #1D4ED8; background: #fff; }
.state-content { display: none; }
.state-content.active { display: flex; flex-direction: column; gap: 4px; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton { background: #E5E7EB; border-radius: 4px; animation: pulse 1.5s infinite; }
```

### 와이어프레임 요소 클래스 (재사용)

```css
/* 기본 요소들 — farmgo-sitemap.html 스타일 유지 */
.wf-header    /* 상단 헤더 바 */
.wf-card      /* 정보 카드 */
.wf-card.highlight  /* 강조 카드 */
.wf-btn.primary / .secondary / .kakao / .apple / .gray / .green / .danger
.wf-input     /* 입력 필드 */
.wf-tabbar    /* 하단 탭바 */
.wf-tab / .wf-tab.active
.wf-divider   /* 구분선 */
.wf-badge.blue / .green / .orange
.wf-row       /* 수평 정렬 행 */
.wf-avatar    /* 원형 아바타 */
.wf-img / .wf-map  /* 이미지/지도 플레이스홀더 */
.wf-section-label  /* 섹션 소제목 */
.wf-list-item /* 리스트 행 */
```

---

## 작성 지침

1. **플랜 문서를 먼저 꼼꼼히 읽는다.** 화면 목록, 역할 분리, 탐색 흐름, 파일 경로를 모두 파악한 후 HTML을 작성한다.
2. **data-id는 파일 경로 기반**으로 짓는다. 예: `customer-home`, `auth-login`, `merchant-schedule-new`
3. **data-connects-to는 플랜의 탐색 흐름 기준**으로 설정한다. 버튼/액션이 어느 화면으로 이동하는지 플랜에서 확인.
4. **상태가 의미 없는 화면**(스플래시, 리다이렉트 등)은 상태 탭을 생략하고 Default만 표시한다.
5. **Loading 상태**는 스켈레톤 블록만으로 충분하다. 실제 레이아웃 구조와 같은 위치에 회색 블록 배치.
6. **Empty 상태**에는 반드시 사용자가 취할 수 있는 액션 버튼을 포함한다 (예: "일정 등록하기", "예약하기").
7. **핵심 흐름 요약 섹션**에는 플랜에서 명시된 주요 시나리오(비로그인 흐름, 역할 전환 등)를 step-by-step으로 기술한다.
8. 생성 후 사용자에게 반드시 **브라우저에서 직접 열어 확인**하도록 안내한다.

---

## 사용자 승인 기준

- [ ] 전체 화면 목록이 플랜과 일치하는가
- [ ] 화면 간 연결(클릭 흐름)이 기획 의도와 맞는가
- [ ] Loading / Empty / Error 상태가 각 화면에 적절히 정의되었는가
- [ ] 누락된 화면이나 잘못된 분기가 없는가

승인 완료 후 → `plan-design-review` (UI/UX 포함 시) 또는 `subagent-driven-development`로 진행.
