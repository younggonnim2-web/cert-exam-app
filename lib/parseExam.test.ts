import { describe, it, expect } from 'vitest'
import { parseExam } from './parseExam'

const SAMPLE = `# 유기농업기능사 2016-07-10 필기 기출문제

- 자격증: 유기농업기능사
- 시행일: 2016-07-10

---

--- page 1 ---
유기농업기능사             ◐2016년 07월 10일 필기 기출문제 ◑
전자문제집 CBT : www.comcbt.com
최강 자격증 기출문제 전자문제집 CBT : www.comcbt.com
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
2. 작물이 받는 냉해의 종류가 아닌 것은?
   ❶ 생태형냉해
② 지연형냉해
   ③ 병해형냉해
④ 장해형냉해
1과목 : 작물재배
3. 다음 중 토양의 것은?
   ① 보기1
❷ 보기2
   ③ 보기3
④ 보기4
2과목 : 토양관리
`

describe('parseExam', () => {
  it('extracts question text, choices, and 1-indexed answer', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions).toHaveLength(3)
    expect(questions[0]).toEqual({
      id: '유기농업기능사-2016-07-10-001',
      number: 1,
      text: '잎의 가장자리에 있는 수공에서 물이 나오는 현상은?',
      choices: ['일액현상', '일비현상', '증산작용', 'Apoplast'],
      answer: 1,
      subject: '작물재배',
    })
  })

  it('assigns subject based on the following subject marker', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[1].subject).toBe('작물재배')
    expect(questions[2].subject).toBe('토양관리')
  })

  it('detects answer 2 correctly (bold circled digit in second position)', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[2].answer).toBe(2)
  })

  it('throws instead of silently defaulting when no bold marker is found', () => {
    const brokenSample = `--- page 1 ---
1. 정답 표시가 깨진 문제
   ① 보기1
① 보기2
   ① 보기3
① 보기4
`
    expect(() => parseExam(brokenSample, '유기농업기능사', '2099-01-01')).toThrow(
      /문항 1.*정답 표시/
    )
  })

  it('correctly parses the last choice (④) when its text is split across lines, without corrupting choice 3', () => {
    const lastChoiceSplitSample = `--- page 1 ---
1. 마지막 보기가 줄바꿈된 문제
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④
줄바뀐네번째보기
1과목 : 작물재배
`
    const questions = parseExam(lastChoiceSplitSample, '유기농업기능사', '2099-01-02')
    expect(questions).toHaveLength(1)
    expect(questions[0].choices).toEqual([
      '일액현상',
      '일비현상',
      '증산작용',
      '줄바뀐네번째보기',
    ])
  })

  it('throws when a choice ends up empty after parsing', () => {
    const emptyChoiceSample = `--- page 1 ---
1. 보기 하나가 비어있는 문제
   ❶ 보기1
② 보기2
   ③ 보기3
④
1과목 : 작물재배
`
    expect(() => parseExam(emptyChoiceSample, '유기농업기능사', '2099-01-03')).toThrow(
      /문항 1/
    )
  })

  it('throws when the file has zero subject markers instead of silently assigning empty subjects', () => {
    const noSubjectSample = `--- page 1 ---
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
`
    expect(() =>
      parseExam(noSubjectSample, '유기농업기능사', '2099-01-04')
    ).toThrow(/유기농업기능사\/2099-01-04/)
  })

  // 아래부터는 scripts/generate-questions.ts를 실제 52개 raw.md 파일에 돌려서 발견한
  // 실전 포맷 변형을 그대로 재현하는 테스트다. 합성 최소 예제가 아니라 실제 원문에서
  // 그대로 복사한 줄을 fixture로 사용한다 (출처는 각 테스트에 명시).

  it('splits two choices glued on one line with a wide gap (유기농업기능사 2010-07-11 문항3, "③...  ④...")', () => {
    // 원문: data/exam-questions/유기농업기능사/2010-07-11/raw.md 25-28행.
    // 원문 문항 번호는 3번이지만, 파서의 순차번호 가드(직전 문제+1만 새 블록으로
    // 인정)를 만족시키기 위해 최소 fixture에서는 1번으로 다시 매겼다. 지문/보기
    // 텍스트는 원문 그대로다.
    const gluedWideGapSample = `--- page 1 ---
1. 작물 재배전 경운작업의 효과와 거리가 먼 것은?
   ❶ 토양입단 형성
  ② 잡초경감
   ③ 토양유기물 분해 촉진  ④ 해충경감
1과목 : 작물재배
`
    const questions = parseExam(gluedWideGapSample, '유기농업기능사', '2010-07-11')
    expect(questions).toHaveLength(1)
    expect(questions[0].choices).toEqual([
      '토양입단 형성',
      '잡초경감',
      '토양유기물 분해 촉진',
      '해충경감',
    ])
    expect(questions[0].answer).toBe(1)
  })

  it('splits two glued choices on both choice lines of the same question (종자기능사 2002-01-27 문항23)', () => {
    // 원문: data/exam-questions/종자기능사/2002-01-27/raw.md 147-150행.
    // 순차번호 가드를 만족시키기 위해 원문 23번을 최소 fixture에서는 1번으로
    // 다시 매겼다. 지문/보기 텍스트는 원문 그대로다.
    const gluedBothLinesSample = `--- page 1 ---
1. 자가수분 식물을 F 이후 계속 자식(自殖)시켜 나갈 때 일어
나는 변화는?
    ❶ homo도가 증가된다. ② homo도가 변하지 아니한다.
    ③ homo도가 감소된다. ④ homo도는 50%에 가까워진다.
1과목 : 육종
`
    const questions = parseExam(gluedBothLinesSample, '종자기능사', '2002-01-27')
    expect(questions).toHaveLength(1)
    expect(questions[0].choices).toEqual([
      'homo도가 증가된다.',
      'homo도가 변하지 아니한다.',
      'homo도가 감소된다.',
      'homo도는 50%에 가까워진다.',
    ])
    expect(questions[0].answer).toBe(1)
  })

  it('does NOT split lines where choice text legitimately contains multiple circled digits as content (유기농업기능사 2006-07-16 문항35)', () => {
    // 원문: data/exam-questions/유기농업기능사/2006-07-16/raw.md 220-225행
    // 이 문제는 보기 자체가 "①, ②" 같은 원문자 나열이다. 글루드-마커 분리 로직이
    // 이런 줄까지 잘못 쪼개면 보기 개수가 틀어지거나 내용이 깨진다.
    // 순차번호 가드를 만족시키기 위해 원문 35번을 최소 fixture에서는 1번으로
    // 다시 매겼다. 지문/보기 텍스트는 원문 그대로다.
    const embeddedEnumerationSample = `--- page 1 ---
1. 다음 중 질소기아현상을 옳게 설명한 것으로 묶은 것은?

    ❶ ①, ②
② ②, ③, ④
    ③ ①, ②, ③, ④
④ ①, ③, ④
1과목 : 토양관리
`
    const questions = parseExam(embeddedEnumerationSample, '유기농업기능사', '2006-07-16')
    expect(questions).toHaveLength(1)
    expect(questions[0].choices).toEqual(['①, ②', '②, ③, ④', '①, ②, ③, ④', '①, ③, ④'])
    expect(questions[0].answer).toBe(1)
  })

  it('excludes the trailing 전자문제집 CBT answer-key footer from the last question (유기농업기능사 2010-03-28 문항60)', () => {
    // 원문: data/exam-questions/유기농업기능사/2010-03-28/raw.md 385-404행 부근
    // 꼬리말의 단독 원문자 줄(④, ③ ...)이 마지막 문항의 보기를 덮어써 빈 보기로
    // 만들거나(정답표 vs 문항60 보기 개수가 어긋나며) 깨진 텍스트를 이어붙인다.
    // 순차번호 가드를 만족시키기 위해 원문 59/60번을 최소 fixture에서는 1/2번으로
    // 다시 매겼다. 지문/보기 텍스트(꼬리말 포함)는 원문 그대로다.
    const footerBoundarySample = `--- page 1 ---
1. 더미 문항
    ❶ 보기1
② 보기2
    ③ 보기3
④ 보기4
3과목 : 유기축산
2. 유기축산물 생산시 제한적으로 치료용동물용의약품을 사용
할 수 있는 조건은?
    ❶ 가축 질병방지를 위한 적절한 조치를 취했음에도 불구하
고 질병이 발생하여 수의사의 처방 및 감독 하에서 일시
적으로 사용.
    ② 가축질병 예방에도 불구하고 질병이 발생하여 인증기관
의 감독 하 에서 지속적으로 사용.
    ③ 가축의 건강과 복지 유지를 위하여 지속적으로 사용.
    ④ 일정한 부위를 치료할 때만 수의사의 처방 및 감독 하에
서 일시적으로 사용.
전자문제집 CBT 홈페이지 : www.comcbt.com
기출문제 및 해설집 다운로드  : www.comcbt.com/xe
전자문제집 CBT 앱(구글플레이) : [다운로드]
전자문제집 CBT란?
종이 문제집이 아닌 인터넷으로 문제를 풀고 자동으로 채점하며
모의고사, 오답 노트, 해설까지 제공하는 무료 기출문제 학습 프
로그램으로 실제 시험에서 사용하는 OMR 형식의 CBT를 제공합
니다.
PC 버전 및 모바일 버전 완벽 연동
교사용/학생용 관리기능도 제공합니다.
1
2
3
4
④
③
④
③
`
    const questions = parseExam(footerBoundarySample, '유기농업기능사', '2010-03-28')
    expect(questions).toHaveLength(2)
    const q60 = questions.find((q) => q.number === 2)
    expect(q60?.choices).toEqual([
      '가축 질병방지를 위한 적절한 조치를 취했음에도 불구하고 질병이 발생하여 수의사의 처방 및 감독 하에서 일시적으로 사용.',
      '가축질병 예방에도 불구하고 질병이 발생하여 인증기관의 감독 하 에서 지속적으로 사용.',
      '가축의 건강과 복지 유지를 위하여 지속적으로 사용.',
      '일정한 부위를 치료할 때만 수의사의 처방 및 감독 하에서 일시적으로 사용.',
    ])
    expect(q60?.answer).toBe(1)
    expect(q60?.subject).toBe('유기축산')
  })

  it('assigns subject correctly when the marker is missing its leading digit (종자기능사 2011-02-13 136행 "과목 : 종자(임의구분)")', () => {
    // 원문: data/exam-questions/종자기능사/2011-02-13/raw.md 126-136행
    // "1과목"이어야 할 자리에 숫자가 빠져 "과목 : 종자(임의구분)"으로만 적혀 있다.
    // 기존 정규식(^\d+과목)은 이를 과목 마커로 인식하지 못해 문항 20의 보기 4번
    // 텍스트 뒤에 "과목 : 종자(임의구분)"이 그대로 이어붙는 조용한 오염이 발생했다.
    // 순차번호 가드를 만족시키기 위해 원문 20번을 최소 fixture에서는 1번으로
    // 다시 매겼다. 지문/보기 텍스트는 원문 그대로다.
    const missingDigitSubjectMarkerSample = `--- page 1 ---
1. 종자가 수분을 흡수하는 과정 중에 일어나는 현상으로 틀
린 것은?
    ① 종자의 흡수는 물의 침윤과 삼투에 의한다.
    ② 종자가 물을 흡수하는 상태는 종피의 성질과 세포벽의
성직이 작용한다.
    ③ 식물의 종자를 일시에 발아시키고자 할때에는 침종을
하는데, 침수시 스며든 물은 종자 내에서 가수분해를
돕고 단 당류가 발아에 이용될 수 있도록 돕는다.
    ❹ 저장양분인 전분ㆍ지방ㆍ단백질 등은 형태의 변화 없이
조직 내에서 이용된다.
과목 : 종자(임의구분)
`
    const questions = parseExam(
      missingDigitSubjectMarkerSample,
      '종자기능사',
      '2011-02-13'
    )
    expect(questions).toHaveLength(1)
    expect(questions[0].subject).toBe('종자(임의구분)')
    expect(questions[0].answer).toBe(4)
    // 보기 4번 텍스트에 마커 텍스트("과목")가 섞여 들어가면 안 된다
    expect(questions[0].choices[3]).not.toContain('과목')
    expect(questions[0].choices[3]).toBe(
      '저장양분인 전분ㆍ지방ㆍ단백질 등은 형태의 변화 없이조직 내에서 이용된다.'
    )
  })

  it('does not mistake a decimal number wrapped to the start of a line for a new question (유기농업기능사 2014-01-26 문항22)', () => {
    // 원문: data/exam-questions/유기농업기능사/2014-01-26/raw.md 150-161행.
    // pymupdf가 "...퇴비를 주어 용적밀도를 1.325에서 1.06으로 낮추었다..." 문장을
    // 줄바꿈하면서 "1.325..."가 물리적 줄 맨 앞에 오게 됐다. 기존 isQuestionStart는
    // 이를 새 문제("1.")로 오인해 실제 22번 문제의 보기들이 엉뚱한 블록으로 흘러가고
    // 22번은 보기 없이 "정답 표시를 찾지 못함" 에러로 실패했다.
    // 아래 fixture는 원문의 22/23번 문항을 최소 재현을 위해 1/2번으로 다시 번호를
    // 매겼을 뿐, 지문·보기 텍스트(문제의 소수점 줄바꿈 포함)는 원문 그대로다.
    const decimalNumberFalsePositiveSample = `--- page 1 ---
1. 토양의 입자밀도가 2.65인 토양에 퇴비를 주어 용적밀도를
1.325에서 1.06으로 낮추었다. 다음 중 바르게 설명한 것
은?
    ① 토양의 공극이 25%에서 30%로 증가하였다.
    ❷ 토양의 공극이 50%에서 60%로 증가하였다.
    ③ 토양의 고상이 25%에서 30%로 증가하였다.
    ④ 토양의 고상이 50%에서 60%로 증가하였다.
2. 작물의 생육에 가장 적합하다고 생각되는 토양구조는?
    ① 판상구조
❷ 입상구조
    ③ 주상구조
④ 괴상구조
1과목 : 토양관리
`
    const questions = parseExam(
      decimalNumberFalsePositiveSample,
      '유기농업기능사',
      '2014-01-26'
    )
    expect(questions).toHaveLength(2)
    expect(questions[0].number).toBe(1)
    expect(questions[0].choices).toEqual([
      '토양의 공극이 25%에서 30%로 증가하였다.',
      '토양의 공극이 50%에서 60%로 증가하였다.',
      '토양의 고상이 25%에서 30%로 증가하였다.',
      '토양의 고상이 50%에서 60%로 증가하였다.',
    ])
    expect(questions[0].answer).toBe(2)
    expect(questions[1].number).toBe(2)
    expect(questions[1].choices).toEqual(['판상구조', '입상구조', '주상구조', '괴상구조'])
    expect(questions[1].answer).toBe(2)
  })

  it('strips the repeating page-break header even when it does not start the line (종자기능사 2011-02-13 136-143행)', () => {
    // 표본검수(Step 7) 중 발견: data/exam-questions/종자기능사/2011-02-13/raw.md
    // 136-143행. 페이지가 넘어갈 때마다 "{자격증명}             ◐...년 ...월 ...일
    // 필기 기출문제 ◑" 헤더가 반복되는데, 기존 노이즈 필터(^◐.*◑$)는 줄이 ◐로
    // 시작해야만 매칭되어 이 줄(자격증명이 앞에 붙음)을 걸러내지 못했다. 그 결과
    // 직전 문항의 마지막 보기 뒤에 헤더 텍스트가 그대로 이어붙는 조용한 오염이
    // 발생했다 — 보기가 비어있지 않아 기존 안전장치(빈 보기 체크)도 못 잡아냈다.
    // 순차번호 가드를 만족시키기 위해 원문 20/21번을 최소 fixture에서는 1/2번으로
    // 다시 매겼다. 지문/보기/헤더 텍스트는 원문 그대로다.
    const pageBreakHeaderSample = `--- page 1 ---
1. 종자가 수분을 흡수하는 과정 중에 일어나는 현상으로 틀
린 것은?
    ① 종자의 흡수는 물의 침윤과 삼투에 의한다.
    ② 종자가 물을 흡수하는 상태는 종피의 성질과 세포벽의
성직이 작용한다.
    ③ 식물의 종자를 일시에 발아시키고자 할때에는 침종을
하는데, 침수시 스며든 물은 종자 내에서 가수분해를
돕고 단 당류가 발아에 이용될 수 있도록 돕는다.
    ❹ 저장양분인 전분ㆍ지방ㆍ단백질 등은 형태의 변화 없이
조직 내에서 이용된다.
과목 : 종자(임의구분)


--- page 2 ---
종자기능사                 ◐2011년 02월 13일 필기 기출문제 ◑
전자문제집 CBT : www.comcbt.com
최강 자격증 기출문제 전자문제집 CBT : www.comcbt.com
2. 불임과 관계되는 환경요인으로 가장 거리가 먼 것은?
    ① 영양
② 광선
    ❸ 토양
④ 병해충
2과목 : 작물육종
`
    const questions = parseExam(pageBreakHeaderSample, '종자기능사', '2011-02-13')
    expect(questions).toHaveLength(2)
    expect(questions[0].choices[3]).toBe(
      '저장양분인 전분ㆍ지방ㆍ단백질 등은 형태의 변화 없이조직 내에서 이용된다.'
    )
    expect(questions[0].choices[3]).not.toContain('종자기능사')
    expect(questions[0].choices[3]).not.toContain('◐')
    expect(questions[1].choices).toEqual(['영양', '광선', '토양', '병해충'])
  })

  it('does not lose the first subject when two subject markers appear back-to-back with no question between them (유기농업기능사 2016-07-10 원문 119-126행, 240-242행 — pymupdf가 "1과목 : 작물재배"와 "2과목 : 토양관리"를 문제 하나 사이에 두지 않고 연달아 추출)', () => {
    // 원문에서 이 두 마커는 문항 21 직후에 붙어서 나온다. 기존 구현은 마커를 문제
    // 번호를 키로 쓰는 오브젝트에 저장해 뒤 마커("토양관리")가 앞 마커("작물재배")를
    // 덮어써, 작물재배 과목 전체(이 회차 60문항 중 21문항)가 통째로 사라지는 결과를
    // 낳았다 — 과목별 연습 화면에서 "작물재배" 탭에 문제가 하나도 안 뜨는 버그로
    // 실제 확인됨.
    //
    // 이 프로젝트의 기존(정상 동작하는) 마커 배정 규칙은 "마커가 나온 시점의 지문
    // 내용"이 아니라 "다음 마커가 나오기 전까지"를 기준으로 과목을 소급 배정한다
    // (예: 2016-04-02 원문에서도 "작물의 기원지" 문항이 내용상 작물재배처럼
    // 보여도 다음 마커 전까지는 이전 과목으로 묶인다 — 정상 케이스에서 이미
    // 그렇게 동작 중이므로 이 테스트도 같은 규칙을 따른다). 따라서 글루드 마커
    // 그룹(1과목/2과목) 다음에 오는 문제들은 "2과목: 토양관리"가 실제로 마감되는
    // 다음 마커(3과목) 전까지 전부 토양관리로 묶이고, 3과목 마커 이후 문제만
    // 유기농업일반이 된다.
    //
    // 순차번호 가드를 만족시키기 위해 원문 문항 번호를 최소 재현에서는 1~5번으로
    // 다시 매겼다. 지문/보기 텍스트는 원문 그대로다.
    const backToBackMarkerSample = `--- page 1 ---
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
2. 다음 중 토양의 양분 보유력을 가장 증대시킬 수 있는 영농
방법은?
    ❶ 부식질 유기물의 시용
② 질소비료의 시용
    ③ 모래의 객토
④ 경운의 실시
1과목 : 작물재배
2과목 : 토양관리
3. 물에 의한 침식을 가장 받기 쉬운 토성은?
    ❶ 식토
② 양토
    ③ 사토
④ 사양토
4. 유기농업 생산체계의 목표가 아닌 것은?
    ❶ 작물 및 축산물 생산성 최대화를 추구한다.
② 토양미생물의 활동을 촉진하는 농업을 추구한다.
    ③ 병해충저항성 작물을 재배한다.
④ 유기물순환을 촉진한다.
3과목 : 유기농업일반
5. 유기축산물 인증기준으로 옳은 것은?
    ❶ 무항생제 사료를 급여한다.
② 성장촉진제를 사용한다.
    ③ 항생제를 예방적으로 사용한다.
④ 합성 첨가제를 사용한다.
`
    const questions = parseExam(backToBackMarkerSample, '유기농업기능사', '2016-07-10')
    expect(questions).toHaveLength(5)
    expect(questions[0].subject).toBe('작물재배')
    expect(questions[1].subject).toBe('작물재배')
    expect(questions[2].subject).toBe('토양관리')
    expect(questions[3].subject).toBe('토양관리')
    expect(questions[4].subject).toBe('유기농업일반')
  })

  it('throws instead of silently dropping a subject when glued markers leave it with no room (유기농업기능사 2007-07-15 원문 130-131행, 375행 — "2과목"/"3과목" 마커가 각각 문항 수 사이에 두지 않고 붙어 나오다가, 이월된 마지막 과목이 자리 잡을 문제가 실제 마지막 문항 뒤에 하나도 남지 않음)', () => {
    // 원문 구조: "1과목 : 작물재배"와 "2과목 : 토양관리"가 문항 21 직후에 붙어서
    // 나오고(3단계 정상 처리 대상), "3과목 : 유기농업일반"은 이 회차의 실제 마지막
    // 문항(60번) 바로 뒤에 단독으로 나온다. 이월 로직이 "토양관리"를 문항 60에서
    // 마감시키면, 원래 "유기농업일반" 자신의 몫이었던 문항이 하나도 남지 않는다 —
    // 원본 PDF 추출이 이 회차의 과목 경계 정보를 이미 잃어버렸다는 뜻이므로, 추측해서
    // 잘못된 과목을 배정하는 대신 명시적으로 실패시켜야 한다.
    // 순차번호 가드를 만족시키기 위해 최소 재현에서는 원문 문항 번호를 1~3번으로
    // 다시 매겼다.
    const noRoomForLastSubjectSample = `--- page 1 ---
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
1과목 : 작물재배
2과목 : 토양관리
2. 물에 의한 침식을 가장 받기 쉬운 토성은?
    ❶ 식토
② 양토
    ③ 사토
④ 사양토
3. 다음 중 포식성 천적은?
    ① 기생벌
② 세균
    ❸ 무당벌레
④ 선충
3과목 : 유기농업일반
`
    expect(() =>
      parseExam(noRoomForLastSubjectSample, '유기농업기능사', '2007-07-15')
    ).toThrow(/유기농업일반/)
  })
})
