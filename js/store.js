/* =========================================================
   기록 저장 (localStorage)
   - 모든 기록은 키 하나("examsite:v1")에 묶어서 저장
   - 시크릿 모드 등에서 저장소가 막혀도 페이지가 깨지지 않도록 try/catch
   - 문항 키: "세트id:문항id" (오답 노트, 북마크에서 사용)
   ========================================================= */
const KEY = "examsite:v1";

function emptyData() {
  return {
    answers: {},
    essays: {},
    results: {},
    wrong: {},
    bookmarks: [],
    lastVisit: null,
    settings: {},
  };
}

// 빠진 필드를 채워서 항상 같은 모양으로 돌려준다 (구조가 바뀌면 여기서 마이그레이션)
function normalize(data) {
  const base = emptyData();
  if (!data || typeof data !== "object") return base;
  return { ...base, ...data };
}

export function load() {
  try {
    const saved = localStorage.getItem(KEY);
    return normalize(saved ? JSON.parse(saved) : null);
  } catch (e) {
    return emptyData();
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// 읽고 → 고치고 → 저장을 한 번에
export function update(fn) {
  const data = load();
  fn(data);
  save(data);
  return data;
}

export function getSetting(name, fallback = null) {
  const value = load().settings[name];
  return value === undefined ? fallback : value;
}

export function setSetting(name, value) {
  update((data) => {
    if (value === null || value === undefined) delete data.settings[name];
    else data.settings[name] = value;
  });
}

/* ---------- 풀이 기록 ---------- */
export const qKey = (setId, qid) => `${setId}:${qid}`;

// 객관식·주관식 답 저장. record 예: { picked: 2, correct: false } / { text: "name", correct: true }
// 틀리면 오답 노트에 넣고(다시 틀리면 "복습 완료"를 풀어 줌), 맞혀도 오답 노트에서는 빼지 않는다
export function saveAnswer(setId, qid, record) {
  update((data) => {
    data.answers[setId] = data.answers[setId] || {};
    data.answers[setId][qid] = { ...record, at: Date.now() };
    if (!record.correct) data.wrong[qKey(setId, qid)] = { reviewed: false };
  });
}

export function clearAnswer(setId, qid) {
  update((data) => {
    if (data.answers[setId]) delete data.answers[setId][qid];
    if (data.essays[setId]) delete data.essays[setId][qid];
  });
}

// 서술형: { text, checks, revealed, graded } 중 바뀐 것만 넘긴다
// "채점 끝내기"(graded) 이후에 채점 기준을 모두 만족하지 못했으면 오답 노트에 넣는다
export function saveEssay(setId, qid, patch) {
  update((data) => {
    data.essays[setId] = data.essays[setId] || {};
    const essay = { text: "", checks: [], ...data.essays[setId][qid], ...patch, at: Date.now() };
    data.essays[setId][qid] = essay;
    if (essay.graded && (patch.graded || patch.checks) && !essay.checks.every(Boolean)) {
      data.wrong[qKey(setId, qid)] = { reviewed: false };
    }
  });
}

// 서술형 점수: 채점 기준 체크 비율 (0 ~ 1)
export function essayScore(essay, pointCount) {
  if (!essay || !pointCount) return 0;
  return (essay.checks || []).filter(Boolean).length / pointCount;
}

// 세트 하나의 풀이(answers, essays)만 지운다. 오답 노트·북마크·점수 기록은 남김
export function resetSet(setId) {
  update((data) => {
    delete data.answers[setId];
    delete data.essays[setId];
  });
}

/* ---------- 북마크 ---------- */
export function isBookmarked(key) {
  return load().bookmarks.includes(key);
}

// 켜졌으면 true, 꺼졌으면 false 를 돌려준다
export function toggleBookmark(key) {
  let on = false;
  update((data) => {
    const i = data.bookmarks.indexOf(key);
    if (i >= 0) data.bookmarks.splice(i, 1);
    else data.bookmarks.push(key);
    on = i < 0;
  });
  return on;
}

/* ---------- 마지막으로 본 문제 ---------- */
export function setLastVisit(setId, qid) {
  update((data) => {
    data.lastVisit = { set: setId, q: qid };
  });
}
