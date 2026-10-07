# 진행 상황

> 규칙은 `AGENTS.md`의 "3. 동시 작업 규칙"을 따른다.
> 고치기 직전에 이 파일을 다시 읽고, 자기 줄만 추가하거나 지운다.

## 작업 중

| 도구 | 작업 내용 | 고칠 파일·폴더 | 시작 시각 |
| --- | --- | --- | --- |
| (없음) | | | |

## 마일스톤

- [x] M1 뼈대: 폴더 구조, `.gitignore`, `check-public.js`, 공통 레이아웃·메뉴·테마, README
- [x] M2 데이터: `data.js`, `validate.js`, 기존 모의고사 JSON 변환
- [x] M3 문제 풀기: 연습 모드, 북마크, 기록 저장
- [x] M4 시험 모드: 타이머, 제출·결과, 오답만 다시 풀기
- [ ] M5 개인 페이지: 진행률, 오답 노트, 태그 분석, 내보내기/가져오기
- [ ] M6 이론: 이론 JSON 렌더링, 단원 → 문제 연결
- [ ] M7 배포: GitHub Pages

## 완료 기록

| 날짜 | 도구 | 한 일 | 바뀐 파일 | 참고 |
| --- | --- | --- | --- | --- |
| 2026-10-07 | Claude Code | 프로젝트 규칙 파일 작성 | `AGENTS.md`, `CLAUDE.md`, `PROGRESS.md`, `PROJECT_SPEC.md`(복사) | 개발은 M1부터 시작 |
| 2026-10-07 | Claude Code | M1 뼈대 완료 | `.gitignore`, `scripts/check-public.js`, `css/style.css`, `js/app.js`, `js/store.js`, 페이지 5개, `README.md` | 테마 설정은 `store.js`의 `getSetting/setSetting`(키 `examsite:v1` 안 `settings`)으로 저장. `store.js`는 기본 구조만 있고 풀이 기록 함수는 M3에서 추가. 각 페이지는 `<body data-page="...">`로 메뉴 위치 표시 |
| 2026-10-08 | Claude Code | HTML 페이지를 `pages/` 폴더로 이동 (사용자 요청) | `pages/*.html`, `js/app.js`, `README.md`, `PROJECT_SPEC.md`(4. 폴더 구조) | `index.html`만 루트에 둠. 페이지 간 링크·경로는 `app.js`의 `siteUrl("pages/solve.html?set=...")`로 만든다(`js/app.js` 위치 기준이라 어느 페이지에서나, GitHub Pages 하위 경로에서도 맞음) |
| 2026-10-08 | Claude Code | M2 데이터 완료 | `data/`(subjects, theory 뼈대, exams), `js/data.js`, `js/render.js`(escapeHtml만), `js/pages/exams.js`, `pages/exams.html`, `scripts/validate.js`, `css/style.css`(필터·세트 카드) | **태그 = `data/theory/frontend.json`의 단원 id 17개**(본문은 M6에서 채움). 문항 id는 q1~q25, s1~s5, e1~e2. `index.json`에 `counts`·`timeLimitMin`·`source`·`version`을 추가로 넣어 목록이 세트 파일을 따로 읽지 않음. 기존 자료는 `private/`로 복사(원본 폴더는 그대로) |
| 2026-10-08 | Claude Code | M3 문제 풀기(연습 모드) 완료 | `pages/solve.html`, `js/pages/solve.js`, `js/store.js`, `js/render.js`, `css/style.css` | `render.js`: `md`/`mdInline`(마크다운-lite), `codeBlock`, `enableCopyButtons`. `store.js`: `saveAnswer`/`clearAnswer`/`saveEssay`/`essayScore`/`resetSet`/`toggleBookmark`/`setLastVisit`, 문항 키는 `qKey(set, q)` = "세트:문항". 서술형은 "채점 끝내기"(graded) 후 기준을 모두 충족해야 정답, 아니면 오답 노트. 오답 노트는 다시 맞혀도 자동으로 빠지지 않음(복습 완료는 M5에서 직접 체크). `mode=exam`은 아직 연습 모드로 열고 안내만 표시(M4) |
| 2026-10-08 | Claude Code | M4 시험 모드·오답만 다시 풀기 완료 | `js/quiz.js`(새 파일), `js/pages/solve.js`(모드별로 다시 씀), `js/store.js`, `css/style.css` | 채점·집계는 `quiz.js`(`scoreExam`, `summarize`(유형별·태그별, 약한 순), `formatScore`). `store.js`에 `examSessions`(제출 전 상태, 새로고침해도 이어짐), `addResult`/`getResult`/`updateResult`, `markWrong` 추가. 결과 기록: `{score,total,mode,at,detail:{qid:0~1},pending,usedSec,auto}` — M5 태그 분석에 `detail` 사용 가능. 결과 화면 주소 `&result=<at>`. 시험 제출 시 답한 문항은 연습 기록에도 저장, 안 푼 문항은 오답 노트에 들어감. 오답만 풀기는 "복습 완료"가 아닌 오답 노트 문항만, 열 때 오답 기록을 비우고 다시 풀게 함 |
