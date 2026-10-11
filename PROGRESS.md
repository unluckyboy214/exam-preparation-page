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
- [x] M5 개인 페이지: 진행률, 오답 노트, 태그 분석, 내보내기/가져오기
- [x] M6 이론: 이론 JSON 렌더링, 단원 → 문제 연결
- [x] M7 배포: GitHub Pages

## 완료 기록

| 날짜 | 도구 | 한 일 | 바뀐 파일 | 참고 |
| --- | --- | --- | --- | --- |
| 2026-10-07 | Claude Code | 프로젝트 규칙 파일 작성 | `AGENTS.md`, `CLAUDE.md`, `PROGRESS.md`, `PROJECT_SPEC.md`(복사) | 개발은 M1부터 시작 |
| 2026-10-07 | Claude Code | M1 뼈대 완료 | `.gitignore`, `scripts/check-public.js`, `css/style.css`, `js/app.js`, `js/store.js`, 페이지 5개, `README.md` | 테마 설정은 `store.js`의 `getSetting/setSetting`(키 `examsite:v1` 안 `settings`)으로 저장. `store.js`는 기본 구조만 있고 풀이 기록 함수는 M3에서 추가. 각 페이지는 `<body data-page="...">`로 메뉴 위치 표시 |
| 2026-10-08 | Claude Code | HTML 페이지를 `pages/` 폴더로 이동 (사용자 요청) | `pages/*.html`, `js/app.js`, `README.md`, `PROJECT_SPEC.md`(4. 폴더 구조) | `index.html`만 루트에 둠. 페이지 간 링크·경로는 `app.js`의 `siteUrl("pages/solve.html?set=...")`로 만든다(`js/app.js` 위치 기준이라 어느 페이지에서나, GitHub Pages 하위 경로에서도 맞음) |
| 2026-10-08 | Claude Code | M2 데이터 완료 | `data/`(subjects, theory 뼈대, exams), `js/data.js`, `js/render.js`(escapeHtml만), `js/pages/exams.js`, `pages/exams.html`, `scripts/validate.js`, `css/style.css`(필터·세트 카드) | **태그 = `data/theory/frontend.json`의 단원 id 17개**(본문은 M6에서 채움). 문항 id는 q1~q25, s1~s5, e1~e2. `index.json`에 `counts`·`timeLimitMin`·`source`·`version`을 추가로 넣어 목록이 세트 파일을 따로 읽지 않음. 기존 자료는 `private/`로 복사(원본 폴더는 그대로) |
| 2026-10-08 | Claude Code | M3 문제 풀기(연습 모드) 완료 | `pages/solve.html`, `js/pages/solve.js`, `js/store.js`, `js/render.js`, `css/style.css` | `render.js`: `md`/`mdInline`(마크다운-lite), `codeBlock`, `enableCopyButtons`. `store.js`: `saveAnswer`/`clearAnswer`/`saveEssay`/`essayScore`/`resetSet`/`toggleBookmark`/`setLastVisit`, 문항 키는 `qKey(set, q)` = "세트:문항". 서술형은 "채점 끝내기"(graded) 후 기준을 모두 충족해야 정답, 아니면 오답 노트. 오답 노트는 다시 맞혀도 자동으로 빠지지 않음(복습 완료는 M5에서 직접 체크). `mode=exam`은 아직 연습 모드로 열고 안내만 표시(M4) |
| 2026-10-08 | Claude Code | M4 시험 모드·오답만 다시 풀기 완료 | `js/quiz.js`(새 파일), `js/pages/solve.js`(모드별로 다시 씀), `js/store.js`, `css/style.css` | 채점·집계는 `quiz.js`(`scoreExam`, `summarize`(유형별·태그별, 약한 순), `formatScore`). `store.js`에 `examSessions`(제출 전 상태, 새로고침해도 이어짐), `addResult`/`getResult`/`updateResult`, `markWrong` 추가. 결과 기록: `{score,total,mode,at,detail:{qid:0~1},pending,usedSec,auto}` — M5 태그 분석에 `detail` 사용 가능. 결과 화면 주소 `&result=<at>`. 시험 제출 시 답한 문항은 연습 기록에도 저장, 안 푼 문항은 오답 노트에 들어감. 오답만 풀기는 "복습 완료"가 아닌 오답 노트 문항만, 열 때 오답 기록을 비우고 다시 풀게 함 |
| 2026-10-08 | Claude Code | M5 개인 페이지 + 홈 화면 완료 | `pages/my.html`, `js/pages/my.js`, `index.html`, `js/pages/home.js`, `js/store.js`, `css/style.css` | `store.js`: `setReviewed`/`removeWrong`/`exportData`/`parseImport`/`replaceAll`/`resetAll`/`doneCount` 추가, `normalize`가 모양이 틀린 필드를 기본값으로 바꿈(가져오기 대비). 가져오기는 합치지 않고 **통째로 바꿈**. 단원별 정답률은 문항마다 최근 기록 기준. 홈: 이어서 풀기(진행 중 시험 포함), 오늘의 복습, 과목 카드. 이론 링크는 `pages/theory.html?subject=...#태그` 형식(M6에서 단원 id로 앵커를 만들어야 함) |
| 2026-10-08 | Claude Code | M6 이론 완료 | `data/theory/frontend.json`(17단원 본문 직접 작성), `pages/theory.html`, `js/pages/theory.js`, `js/pages/solve.js`(단원 모드), `js/data.js`, `css/style.css` | 이론 본문은 강의 자료를 옮기지 않고 새로 씀. 단원 섹션 id = 태그라서 `theory.html?subject=frontend#태그`로 바로 이동. 단원 모드: `solve.html?subject=..&tag=..` → 과목의 모든 세트에서 태그 문항을 모아 연습 모드로, 기록은 문항의 원래 세트에 저장(`sidOf(q)`). `loadTheory`는 `private/theory/<과목>.json`이 있으면 단원을 뒤에 붙임(로컬 전용 표시). `private/theory/frontend_summary.md`는 화면에서 쓰지 않음 |
| 2026-10-08 | Claude Code | M7 배포 완료 | (코드 변경 없음) `origin` 연결, `main` 브랜치 push | 주소: https://unluckyboy214.github.io/exam-preparation-page/ — Pages 설정은 `main` / root (legacy 빌드, 첫 배포 약 6분). 배포 주소에서 페이지·JS·데이터 21개 200, `private/` 404, 풀이·시험·이론·단원 문제·내 기록 동작 확인. push 전에는 `node scripts/check-public.js` 필수 |
| 2026-10-08 | Claude Code | 문제 생성 안내 문서 작성 | `QUESTION_MAKER.md`(새 파일), `README.md`, `AGENTS.md`(읽을 파일에 한 줄 추가) | 사용자가 `private/source/`에 자료를 넣고 요청하면 이 문서대로 세트 2~3개 생성. 새로 쓴 문제만 `data/exams/`(self-made), 기출·애매한 것은 `private/exams/`(past-exam). 세트 id는 `<과목>-mock-<다음 번호>` |
| 2026-10-08 | Claude Code | 사이트 이름을 "시험 대비 연습장"으로 변경 (사용자 요청: SSAFY 외 자격증 등 여러 시험용) | `js/app.js`(`SITE_NAME`), `index.html`, `pages/*.html`, `js/pages/theory.js`, `js/pages/solve.js`, `README.md`, `PROJECT_SPEC.md`(1. 목표, 2. 표, 11. 사이트 이름) | 화면 제목은 JS에서 `SITE_NAME`을 쓰고, HTML `<title>`에는 같은 이름을 직접 적어 둠(이름을 바꿀 땐 둘 다) |
| 2026-10-08 | Claude Code | 시험(단체) → 과목 → 회차 묶음·정렬 추가 (사용자 요청) | `data/subjects.json`(`groups` 추가, 과목에 `group`), `js/data.js`(`loadCatalog`, `sortSets`), `js/pages/exams.js`(시험 필터·묶음 제목), `home.js`·`theory.js`·`my.js`(시험별 제목), `scripts/validate.js`(group 검사), `css/style.css`, `PROJECT_SPEC.md`(6-0 추가, 5-3), `QUESTION_MAKER.md`(7장) | `loadExamList()`가 이미 정렬된 목록을 돌려줌(회차는 id 숫자 순, mock-2 < mock-10). 과목 id는 시험을 통틀어 유일해야 하므로 새 시험 과목은 `adsp-analysis`처럼 시험 id를 앞에 붙임. GitHub Pages는 JS를 10분 캐시하므로 배포 직후엔 Ctrl+F5 |
| 2026-10-11 | Claude Code | 프론트엔드 예상 문제 2~4회 생성 (QUESTION_MAKER, 사용자 요청: 난이도 세트별 쉬움·중간·어려움) | `data/exams/frontend-mock-2.json`·`-3.json`·`-4.json`(새 파일), `data/exams/index.json`(validate), `data/theory/frontend.json`(단원 3개 추가) | 2회 쉬움(개념), 3회 중간(코드 읽기 위주), 4회 어려움(비교·여러 개념). 모두 self-made, 세트당 객관식 25·주관식 5·서술형 2, 60분. 새 단원 `css-grid`, `css-responsive`, `js-function`을 `units` 끝에 추가하고 본문은 직접 씀(태그 20개). 코드 문제 출력은 node로 확인. 자료 PDF가 이미지형이라 `private/theory/frontend_summary.md`로 범위를 확인함 |
| 2026-10-11 | Claude Code | 이론 요약 보충 (사용자가 준 시험 범위와 대조해 빠진 부분 추가) | `data/theory/frontend.json` | 단원 id는 그대로, 내용만 추가·수정. 템플릿 리터럴(js-types), input 타입·disabled/readonly·method 기본 GET(html-form), 배열 구조 분해 기본값·나머지와 splice 끼워 넣기(js-array-object), classList 반환값·삽입 위치 정리(js-dom), 이벤트 이름에 on 금지·캡처링(js-event), 타이머를 js-bom으로 옮김(js-event에는 안내 한 줄), settled·체인 흐름(js-async), 공유 범위·직렬화 용어·출처 정의(js-storage), 마진 상쇄 예외(css-box-model), 인라인 padding·img/input 크기(html-elements), section 제목·heading 계층(html-semantic) |
| 2026-10-11 | Claude Code | 이론 목차를 Part → 단원 2단계로 바꾸고 단원 세분화 (사용자 요청) | `data/theory/frontend.json`(`parts` 추가, 단원 25개), `js/pages/theory.js`, `css/style.css`(이론), `scripts/validate.js`(parts 검사), `data/exams/frontend-mock-1~4.json`(tags 일부, 4회 문장 2곳), `PROJECT_SPEC.md`(5-2, 6-3, 6-4), `QUESTION_MAKER.md`(7장) | Part 8개. 새 단원 `html-input`, `css-margin-collapse`, `js-variable`, `js-copy`, `js-event-loop`로 나눔(기존 id는 그대로, 제목만 다듬음). 해당 문항 16개의 태그를 새 단원으로 옮김(문항 id·정답 변경 없음). 단원 번호는 화면에서 `Part-순서`(예: 3-2)로 자동 계산. 이론 `units` 순서를 parts 순서와 맞춤. `**굵게**` 안에 백틱이 있으면 마크다운-lite가 처리 못 하므로 그런 문장 7곳을 고침 |
| 2026-10-11 | Claude Code | 이론을 표 중심으로 재구성 (사용자 요청: 표로 정리할 내용은 문장으로 풀지 않기) | `data/theory/frontend.json`(25단원 points·tables·body 다시 씀, 표 68개), `js/render.js`(`mdTable` 추가, `mdInline` 개선), `js/pages/theory.js`, `css/style.css`(`.md-table`), `scripts/validate.js`(tables 모양 검사), `PROJECT_SPEC.md`(6-3, 6-4), `QUESTION_MAKER.md`(7장) | 단원에 선택 필드 `tables: [{ caption, head, rows }]` 추가, 핵심 포인트 다음에 표로 그림. `mdInline`이 이제 굵게 안의 코드(`**\`a\`가**`)와 두 겹 백틱(`` `` ` `` ``)을 처리함 → 문제 화면에도 적용됨. 표의 JS 결과값은 node로 대조함. 단원 id·제목·Part·문항 태그는 그대로 |
| 2026-10-11 | Claude Code | 이론 요약 작성 안내 문서 추가 (사용자 요청) | `THEORY_MAKER.md`(새 파일), `AGENTS.md`(읽을 파일 4번), `README.md`, `QUESTION_MAKER.md`(7장에 링크) | 대원칙: ① 경로를 받으면 그 안의 자료를 모두 읽는다 ② 시험 구성·목차를 받으면 요약 목차를 그에 맞춘다 ③ 자료의 표·그림·코드를 최대한 활용(표는 `tables`로, 그림은 표·예시로). 공개 원칙(자료의 표·이미지를 그대로 베끼지 않음), Part→단원 설계, 단원 필드 규칙, 체크리스트, 보고 형식 포함 |
