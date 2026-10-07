# 시험 대비 사이트 개발 명세 (PROJECT_SPEC)

> 새 작업 폴더(`C:\Users\user\<프로젝트명>`)의 루트에 이 파일을 두고 개발을 시작한다.
> Claude Code로 작업한다면 이 파일을 `CLAUDE.md`로 복사해 두면 매 세션 자동으로 읽힌다.

---

## 0. 시작 프롬프트 (그대로 붙여넣기용)

```
이 폴더의 PROJECT_SPEC.md를 읽고 그 내용대로 시험 대비 사이트를 만들어 줘.
- 1단계(M1)부터 순서대로 진행하고, 각 단계가 끝나면 완료 기준을 확인한 뒤 알려 줘.
- 명세에 없는 결정이 필요하면 "11. 미정 사항"의 기본값을 따르고, 따른 내용을 보고해 줘.
- 커밋 전에는 항상 "2. 공개 금지 규칙"을 점검해 줘.
- 기존 자료는 C:\SSAFY\workspace\front\exam 에 있어. 재사용할 것은 "9. 기존 exam 폴더 이전"을 따라.
```

---

## 1. 목표

- SSAFY 과목평가, 자격증 등 **여러 시험을 대비하는 정적 웹사이트**를 만든다. 특정 시험 이름에 묶이지 않게 만든다.
- **GitHub 저장소에 올리고 GitHub Pages로 배포**하는 것을 전제로 한다.
- 과목(프론트엔드, 이후 다른 과목도)별로 **이론 요약**을 보고, **문제 세트를 풀고**, **내 풀이 기록과 오답을 복습**할 수 있다.
- 문제는 개발자가 **JSON 파일을 추가하는 것만으로** 사이트에 나타나야 한다.

## 2. 공개 금지 규칙 (가장 중요)

저장소는 공개된다고 가정한다. 아래 항목은 **절대 커밋하지 않는다.**

| 구분 | 예시 | 처리 |
| --- | --- | --- |
| 강의 원본 자료 | 강의 PDF, 슬라이드, 교재 캡처 이미지 | `private/` 에만 둔다 |
| 원본을 옮기거나 변형한 자료 | PDF를 정리한 요약 md(예: 기존 `frontend_summary.md`), 실습 원본 코드·이미지 | `private/` 에만 둔다 |
| 실제 시험 기출 원문 | 시험에 나온 문제를 그대로 옮긴 것 | `private/exams/` 에만 둔다 |
| 개인 정보 | 이름, 이메일, 학번, 반·캠퍼스 정보, 개인 풀이 기록 | 코드·데이터에 넣지 않는다 |

공개 저장소에 들어가는 것은 **직접 작성한 요약, 직접 만든 예상 문제, 사이트 코드**뿐이다.

### 지켜야 할 장치

1. **`.gitignore`** (첫 커밋 전에 만든다)
   ```gitignore
   # 저작권 · 개인 자료
   private/
   *.pdf
   *.pptx
   *.hwp
   # 로컬 환경
   .vscode/
   .DS_Store
   Thumbs.db
   node_modules/
   ```
2. **공개 점검 스크립트** `scripts/check-public.js`
   - `git ls-files` 결과에 `private/`, `.pdf` 등 금지 패턴이 있거나,
   - 공개 문제 JSON의 `meta.source`가 `"self-made"`가 아니거나,
   - 파일 내용에 이메일 형식 문자열이 있으면 **실패(exit 1)** 한다.
   - `npm` 없이 `node scripts/check-public.js`로 실행한다. 원하면 git pre-commit 훅에 연결한다.
3. **git 설정**: 커밋 이메일은 GitHub의 noreply 주소를 쓴다(`git config user.email "<id>@users.noreply.github.com"`).
4. 실수로 올렸다면 파일 삭제 커밋만으로는 기록에 남는다. 이 경우 작업을 멈추고 사용자에게 알린다(히스토리 정리는 사용자 확인 후 진행).

### 비공개 자료를 로컬에서는 쓰는 방법

- `private/exams/` 에 실제 기출 JSON을, `private/theory/` 에 원본 기반 요약을 둔다.
- 사이트는 공개 데이터와 함께 `private/` 의 목록 파일도 **있으면** 읽어 합친다. 없으면(= GitHub Pages) 조용히 무시한다.
- 결과: 내 PC(Live Server)에서는 기출까지 보이고, 배포된 사이트에는 자체 제작 자료만 보인다.

## 3. 기술 원칙

- **빌드 없는 정적 사이트**: HTML + CSS + 바닐라 JavaScript(ES Modules). 프레임워크, 번들러 없음.
  - 이유: GitHub Pages에 그대로 올라가고, 수업에서 배운 범위로 유지·수정할 수 있다.
- 데이터는 `fetch()`로 JSON을 읽는다. 따라서 로컬에서는 **Live Server 같은 HTTP 서버로 연다**(파일 더블클릭 `file://`는 fetch가 막힌다). README에 명시한다.
- 외부 라이브러리는 CDN만 허용하고 최소화한다(예: Markdown 렌더링용 `marked`, 필요할 때만).
- 모든 경로는 **상대 경로**로 쓴다. GitHub Pages 주소가 `https://<id>.github.io/<repo>/` 형태라 `/`로 시작하는 절대 경로는 깨진다.
- 라이트/다크 테마, 모바일 폭(360px)에서 가로 스크롤 없음, 키보드로 문제 풀기 가능.

## 4. 폴더 구조

```
<프로젝트>/
├─ index.html                 # 메인 (GitHub Pages 첫 화면이라 루트에 둔다)
├─ pages/                     # 나머지 페이지. 링크는 app.js 의 siteUrl() 로 만든다
│  ├─ theory.html             # 이론: 과목 목록 + 상세 (?subject=frontend)
│  ├─ exams.html              # 문제 세트 목록 (?subject=frontend 로 필터)
│  ├─ solve.html              # 문제 풀기 (?set=frontend-mock-1&mode=practice)
│  └─ my.html                 # 개인 페이지 (진도·오답·북마크)
├─ css/
│  └─ style.css               # 색상 토큰, 공통 컴포넌트
├─ js/
│  ├─ app.js                  # 공통: 상단 메뉴, 테마, 경로
│  ├─ data.js                 # JSON 로딩 (공개 + private 병합)
│  ├─ store.js                # localStorage 기록 관리
│  ├─ render.js               # 문제·코드블록 렌더링, 마크다운-lite
│  └─ pages/                  # 페이지별 스크립트 (home.js, solve.js ...)
├─ data/
│  ├─ subjects.json           # 과목 목록
│  ├─ theory/
│  │  └─ frontend.json        # 직접 작성한 이론 요약
│  └─ exams/
│     ├─ index.json           # 문제 세트 목록(매니페스트)
│     └─ frontend-mock-1.json # 직접 만든 예상 문제
├─ scripts/
│  ├─ validate.js             # 문제 JSON 검사 + index.json 자동 갱신
│  └─ check-public.js         # 공개 금지 규칙 점검
├─ private/                   # .gitignore 대상 (로컬 전용)
│  ├─ exams/index.json, *.json
│  ├─ theory/
│  └─ source/                 # 원본 PDF 등
├─ .gitignore
└─ README.md                  # 실행 방법, 문제 추가 방법, 공개 규칙 요약
```

## 5. 페이지 명세

### 5-1. 메인 (`index.html`)
- 사이트 소개 한 줄, 과목 카드(과목명, 이론 바로가기, 문제 세트 수).
- **이어서 풀기**: 마지막으로 풀던 세트와 진행률.
- **오늘의 복습**: 오답 노트에서 아직 "복습 완료"가 아닌 문제 수 → 개인 페이지로 이동.
- 상단 메뉴: 홈 · 이론 · 문제 · 내 기록, 테마 전환 버튼.

### 5-2. 이론 (`theory.html`)
- 과목 선택 → 단원 목차(왼쪽 또는 상단) + 본문.
- 단원마다 "핵심 포인트", "자주 하는 실수", 짧은 코드 예시.
- 단원 끝에 **이 단원 문제 풀기** 버튼 → 해당 태그(`tags`)가 붙은 문제만 모아 풀기.
- 내용은 `data/theory/<과목>.json`(아래 6-3) 에서 읽는다. 원본 자료를 옮긴 요약은 `private/theory/` 로.

### 5-3. 문제 목록 (`exams.html`)
- 과목·종류(예상 문제 / 기출(로컬 전용))로 필터.
- 세트 카드: 제목, 문항 구성(객관식 n · 주관식 n · 서술형 n), 제한 시간, 내 최고 점수, 진행 상태.

### 5-4. 문제 풀기 (`solve.html`)
- 문항 유형: **객관식(단일 정답)**, **주관식(단답)**, **서술형(자가 채점)**. 확장 여지로 `multi`(복수 정답)도 스키마에 둔다.
- 모드
  - **연습 모드**: 답하면 바로 정답·해설 표시(기존 exam 사이트 방식).
  - **시험 모드**: 제한 시간 타이머, 해설 숨김, "제출"하면 한꺼번에 채점 → 결과 화면(점수, 유형·태그별 정답률, 틀린 문제 목록).
  - **오답만 다시 풀기**: 이 세트에서 틀린 문제만.
- 문항 이동: 번호 패널(푼 문제·북마크 표시), 이전/다음.
- 주관식 채점: 대소문자·앞뒤 공백·따옴표·끝의 `()` 무시, `answers` 배열 중 하나와 일치하면 정답.
- 서술형: 답안 작성(자동 저장) → 모범 답안 + 채점 기준 체크리스트로 자가 채점.
- 문제마다 **북마크(★)** 버튼.

### 5-5. 개인 페이지 (`my.html`)
- 과목·세트별 진행률과 점수 기록(최근/최고).
- **오답 노트**: 틀린 문제 목록 → 클릭하면 해당 문제로 이동, "복습 완료" 체크.
- **태그별 정답률**: 약한 단원 순으로 정렬 → 해당 이론 단원 링크.
- 북마크 목록.
- **기록 내보내기/가져오기(JSON 파일)**, 전체 초기화.
- 저장은 localStorage (아래 7). 서버·로그인은 만들지 않는다.

## 6. 데이터 형식

### 6-1. 문제 세트 매니페스트 `data/exams/index.json`
```json
{
  "sets": [
    { "id": "frontend-mock-1", "file": "frontend-mock-1.json", "subject": "frontend", "title": "프론트엔드 예상 문제 1회" }
  ]
}
```
정적 호스팅은 폴더 목록을 읽을 수 없으므로 이 목록이 필요하다. **직접 고치지 않고** `node scripts/validate.js` 가 `data/exams/*.json` 을 읽어 자동 생성한다(`private/exams/` 도 같은 방식).

### 6-2. 문제 세트 파일
```json
{
  "meta": {
    "id": "frontend-mock-1",
    "subject": "frontend",
    "title": "프론트엔드 예상 문제 1회",
    "source": "self-made",
    "timeLimitMin": 60,
    "version": 1
  },
  "questions": [
    {
      "id": "q1",
      "type": "mc",
      "tags": ["css-specificity"],
      "question": "다음 코드에서 `Hello`의 최종 글자색은?",
      "code": { "lang": "html", "src": "<p id=\"msg\">Hello</p>" },
      "options": ["black", "orange", "red", "blue"],
      "answer": 0,
      "explain": "`!important`는 인라인 스타일보다도 강하다."
    },
    {
      "id": "s1",
      "type": "short",
      "tags": ["html-form"],
      "question": "radio 버튼을 한 그룹으로 묶는 속성 이름은?",
      "answers": ["name"],
      "explain": "같은 `name`끼리 하나만 선택된다."
    },
    {
      "id": "e1",
      "type": "essay",
      "tags": ["js-this"],
      "question": "일반 함수와 화살표 함수의 this 차이를 서술하시오.",
      "model": "모범 답안 (문단은 빈 줄로 구분)",
      "points": ["채점 기준 1", "채점 기준 2"]
    }
  ]
}
```
규칙
- `meta.source`: 공개 폴더는 반드시 `"self-made"`. 실제 기출은 `"past-exam"` 이고 `private/exams/` 에만 둔다.
- `id`는 세트 안에서 유일하고, **한 번 배포한 뒤에는 바꾸지 않는다**(사용자 기록의 키가 된다). 내용을 크게 고치면 `meta.version`을 올린다.
- `answer`는 0부터 센다. `code`는 선택.
- 텍스트 필드는 **마크다운-lite**만 허용: `` `코드` ``, `**굵게**`, 빈 줄 = 문단. HTML은 이스케이프해서 출력한다(XSS 방지, innerHTML에 원문 삽입 금지).
- `tags`는 이론 단원 id와 맞춘다(6-3). 태그별 정답률, "이 단원 문제 풀기"에 쓰인다.

### 6-3. 이론 파일 `data/theory/<과목>.json`
```json
{
  "subject": "frontend",
  "title": "프론트엔드",
  "units": [
    {
      "id": "css-specificity",
      "title": "CSS 우선순위",
      "points": ["`!important` > 인라인 > id > class > 요소"],
      "body": "본문 (마크다운-lite)",
      "pitfalls": ["명시도가 같을 때만 나중 규칙이 이긴다"],
      "examples": [{ "lang": "css", "src": "#a { color: red; }" }]
    }
  ]
}
```

### 6-4. `scripts/validate.js` 가 검사할 것
- 필수 필드, `type`별 필수 필드(`mc`: options 2개 이상 + answer 범위, `short`: answers 1개 이상, `essay`: model + points).
- 세트 안 `id` 중복, 공개 폴더의 `source` 값.
- `tags`가 이론 파일에 없는 단원이면 경고.
- 통과하면 `index.json` 을 다시 쓴다.

## 7. 기록 저장 (localStorage)

- 키는 하나로 묶는다: `examsite:v1`. 구조 예:
  ```json
  {
    "answers": { "frontend-mock-1": { "q1": { "picked": 0, "correct": true, "at": 1730000000000 } } },
    "essays":  { "frontend-mock-1": { "e1": { "text": "...", "checks": [true, false] } } },
    "results": { "frontend-mock-1": [ { "score": 23, "total": 30, "mode": "exam", "at": 1730000000000 } ] },
    "wrong":   { "frontend-mock-1:q1": { "reviewed": false } },
    "bookmarks": ["frontend-mock-1:q1"],
    "lastVisit": { "set": "frontend-mock-1", "q": "q1" }
  }
  ```
- 모든 읽기/쓰기는 `store.js` 를 거치고 `try/catch`로 감싼다(시크릿 모드에서도 페이지가 깨지지 않게).
- 키 이름의 `v1`로 버전을 관리하고, 구조가 바뀌면 마이그레이션 함수를 둔다.
- 기록은 브라우저에만 남는다는 안내와 **내보내기/가져오기**를 개인 페이지에 둔다.
- 개인 기록은 저장소로 커밋하지 않는다.

## 8. 화면·코드 품질 기준

- 색상은 `:root` CSS 변수(토큰)로 정의하고 다크 모드를 `prefers-color-scheme` + 수동 전환(`data-theme`) 둘 다 지원.
- 코드 블록은 구문 강조 + 복사 버튼(기존 exam의 `common.js` 하이라이터 재사용).
- 선택지는 `button` 또는 `tabindex` + Enter/Space로 고를 수 있게.
- 주석과 화면 문구는 한국어. 문구는 쉬운 말로.
- 에러 처리: JSON을 못 읽으면 화면에 "문제 파일을 불러오지 못했어요 (경로: …)"를 보여 준다.

## 9. 기존 `exam` 폴더 이전

출처: `C:\SSAFY\workspace\front\exam`

| 기존 파일 | 처리 |
| --- | --- |
| `css/style.css` 색 토큰, 퀴즈·코드블록 스타일 | 새 `css/style.css` 로 가져와 정리 |
| `js/common.js` 의 하이라이터, store 도우미, 테마 | `render.js`, `store.js`, `app.js` 로 나눠 이전 |
| `data/mock-exam.json` (직접 만든 예상 문제 32개) | 6-2 스키마로 변환해 `data/exams/frontend-mock-1.json` 으로 (공개 가능) |
| `frontend_summary.md` (강의 PDF 정리본) | **`private/theory/`** 로 (공개 금지) |
| `pdf/` 강의 원본 | **`private/source/`** 로 (공개 금지) |
| `pages/01~05` (ws3 실습 코드 해설), `assets/img/book` | 실습 원본 코드·이미지를 포함하므로 **`private/`** 로. 공개하려면 직접 쓴 설명과 예제로 다시 작성 |

## 10. 개발 순서와 완료 기준

| 단계 | 내용 | 완료 기준 |
| --- | --- | --- |
| M1 뼈대 | 폴더 구조, `.gitignore`, `check-public.js`, 공통 레이아웃·메뉴·테마, README | 빈 페이지 5개가 메뉴로 오가고, `check-public.js` 가 통과 |
| M2 데이터 | `data.js`(공개+private 병합), `validate.js`, 기존 모의고사 JSON 변환 | `node scripts/validate.js` 통과, 목록 페이지에 세트가 나옴 |
| M3 문제 풀기 | 연습 모드(3가지 유형), 북마크, 기록 저장 | 32문제 모두 풀리고 새로고침해도 기록 유지 |
| M4 시험 모드 | 타이머, 제출·결과 화면, 오답만 다시 풀기 | 시간 초과 시 자동 제출, 태그별 정답률 표시 |
| M5 개인 페이지 | 진행률, 오답 노트, 태그 분석, 내보내기/가져오기 | 내보낸 파일을 초기화 후 가져오면 기록 복원 |
| M6 이론 | 이론 JSON 렌더링, 단원 → 문제 연결 | 단원에서 "이 단원 문제 풀기"로 해당 태그 문제만 풀림 |
| M7 배포 | GitHub Pages 설정, 실제 주소에서 동작 확인 | 배포 주소에서 모든 페이지·데이터 로딩 정상, `private` 자료가 보이지 않음 |

각 단계가 끝날 때마다 `check-public.js` 를 실행하고, 커밋은 사용자가 요청할 때만 한다.

## 11. 미정 사항 (기본값)

| 항목 | 기본값 | 바꿀 때 |
| --- | --- | --- |
| 사이트 이름 | "시험 대비 연습장" (`js/app.js`의 `SITE_NAME`) | 사용자가 정하면 교체 |
| 다룰 과목 | 프론트엔드부터 시작, `subjects.json` 에 추가하는 방식으로 확장 | — |
| 이론 본문 형식 | JSON(6-3) | 긴 글이 많아지면 Markdown 파일 + `marked` CDN으로 전환 |
| 점수 배점 | 문항당 동일 배점, 서술형은 채점 기준 체크 비율 | 세트 `meta`에 `scoring` 필드 추가 |
| 여러 기기 동기화 | 없음(내보내기/가져오기로 대체) | 필요해지면 별도 논의 |
