# 시험 대비 연습장

SSAFY 과목평가, 자격증 등 여러 시험을 대비하는 사이트입니다. 시험(과목)별 이론 요약을 보고, 예상 문제를 풀고, 틀린 문제를 다시 볼 수 있는 정적 웹사이트입니다.
빌드 과정 없이 HTML · CSS · 바닐라 JavaScript(ES Modules)로 만들었고, GitHub Pages로 배포합니다.

## 실행 방법

문제와 이론 데이터를 `fetch()`로 읽기 때문에 **HTTP 서버로 열어야 합니다.**
`index.html`을 더블클릭해서 `file://`로 열면 데이터를 불러오지 못합니다.

- **VS Code**: Live Server 확장을 설치한 뒤 `index.html`에서 오른쪽 클릭 → "Open with Live Server"
- **Node.js**: `npx serve .`
- **Python**: `python -m http.server 8000` 후 `http://localhost:8000` 접속

## 폴더 구조

| 경로 | 내용 |
| --- | --- |
| `index.html` | 홈 (GitHub Pages 첫 화면이라 루트에 둡니다) |
| `pages/` | 나머지 페이지 (이론, 문제 목록, 문제 풀기, 내 기록) |
| `css/style.css` | 색상 토큰, 공통 컴포넌트 |
| `js/` | 공통 스크립트(`app.js`, `data.js`, `store.js`, `render.js`)와 페이지별 스크립트(`pages/`) |
| `data/` | 과목 목록, 이론 요약, 문제 세트 JSON |
| `scripts/` | 문제 검사(`validate.js`), 공개 점검(`check-public.js`) |
| `private/` | 로컬 전용 자료. **저장소에 올라가지 않습니다** |

## 문제 추가 방법

1. `data/exams/` 에 문제 세트 JSON 파일을 만듭니다. 형식은 `PROJECT_SPEC.md`의 "6-2. 문제 세트 파일"을 따릅니다.
2. `node scripts/validate.js` 를 실행합니다. 형식을 검사하고 `data/exams/index.json` 을 자동으로 갱신합니다.
   `index.json` 은 직접 고치지 않습니다.
3. 문제의 `id` 는 한 번 배포한 뒤에는 바꾸지 않습니다. 사용자 풀이 기록의 키로 쓰입니다.

`private/` 에 넣은 강의 자료로 AI(Claude Code, Codex)에게 예상 문제 세트를 2~3개씩 만들게 하려면
[`QUESTION_MAKER.md`](QUESTION_MAKER.md) 의 "0. 요청하는 법" 양식을 복사해 요청하면 됩니다.

## 공개 규칙

이 저장소는 공개됩니다. 아래 자료는 **커밋하지 않고** `private/` 에만 둡니다.

- 강의 PDF, 슬라이드 등 원본 자료와, 그것을 옮기거나 정리한 요약
- 실제 시험 기출 문제 원문
- 이름, 이메일, 학번 같은 개인 정보와 개인 풀이 기록

공개 저장소에는 직접 작성한 요약, 직접 만든 예상 문제(`"source": "self-made"`), 사이트 코드만 들어갑니다.

커밋하기 전에 항상 점검 스크립트를 실행합니다.

```
node scripts/check-public.js
```

`private/` 폴더의 자료는 로컬에서 실행할 때만 사이트에 함께 표시되고, 배포된 사이트에는 나타나지 않습니다.

## 기록 저장

풀이 기록은 브라우저의 localStorage에만 저장됩니다. 다른 기기로 옮기려면 "내 기록" 페이지의 내보내기/가져오기를 사용하세요.
