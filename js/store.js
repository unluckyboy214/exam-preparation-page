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
    examSessions: {}, // 제출 전 시험 진행 상태 (세트별)
    settings: {},
  };
}

// 빠진 필드를 채우고, 모양이 다른 필드는 기본값으로 바꿔서 항상 같은 모양으로 돌려준다
// (구조가 바뀌면 여기서 마이그레이션)
function normalize(data) {
  const base = emptyData();
  if (!data || typeof data !== "object" || Array.isArray(data)) return base;
  for (const key of Object.keys(base)) {
    const value = data[key];
    if (value === undefined) continue;
    if (Array.isArray(base[key]) ? Array.isArray(value) : base[key] === null || (typeof value === "object" && !Array.isArray(value))) {
      base[key] = value;
    }
  }
  return base;
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

// 답하지 않은 문항 등 답안 기록 없이 오답 노트에만 넣을 때
export function markWrong(setId, qid) {
  update((data) => {
    data.wrong[qKey(setId, qid)] = { reviewed: false };
  });
}

/* ---------- 시험 모드 ----------
   진행 상태: { startedAt, deadline, responses: { qid: { picked } | { text } } }
   새로고침하거나 창을 닫아도 이어서 풀 수 있게 저장한다 */
export function getExamSession(setId) {
  return load().examSessions[setId] || null;
}

export function saveExamSession(setId, session) {
  update((data) => {
    data.examSessions[setId] = session;
  });
}

export function clearExamSession(setId) {
  update((data) => {
    delete data.examSessions[setId];
  });
}

/* ---------- 점수 기록 ----------
   { score, total, mode, at, detail: { qid: 0~1 }, pending: [서술형 id], usedSec, auto } */
export function addResult(setId, result) {
  update((data) => {
    data.results[setId] = data.results[setId] || [];
    data.results[setId].push(result);
  });
}

export function getResult(setId, at) {
  return (load().results[setId] || []).find((r) => r.at === at) || null;
}

// at 으로 찾은 결과를 fn 으로 고친다 (서술형 채점 반영 등)
export function updateResult(setId, at, fn) {
  update((data) => {
    const r = (data.results[setId] || []).find((x) => x.at === at);
    if (r) fn(r);
  });
}

/* ---------- 오답 노트 ---------- */
export function setReviewed(key, reviewed) {
  update((data) => {
    if (data.wrong[key]) data.wrong[key].reviewed = reviewed;
  });
}

export function removeWrong(key) {
  update((data) => {
    delete data.wrong[key];
  });
}

/* ---------- 내보내기 · 가져오기 · 초기화 ---------- */
const EXPORT_APP = "examsite";

export function exportData() {
  return { app: EXPORT_APP, version: 1, exportedAt: new Date().toISOString(), data: load() };
}

// 내보낸 파일 내용을 검사해서 기록 객체로 바꾼다. 형식이 틀리면 Error
export function parseImport(json) {
  const obj = typeof json === "string" ? JSON.parse(json) : json;
  if (!obj || typeof obj !== "object") throw new Error("기록 파일 형식이 아니에요.");
  const raw = obj.app === EXPORT_APP ? obj.data : obj;
  const looksLikeRecord = raw && typeof raw === "object" && ["answers", "results", "wrong", "bookmarks"].some((k) => k in raw);
  if (!looksLikeRecord) throw new Error("이 사이트에서 내보낸 기록 파일이 아니에요.");
  return normalize(raw);
}

// 지금 기록을 통째로 바꾼다 (가져오기)
export function replaceAll(data) {
  return save(normalize(data));
}

// 전체 초기화 (테마 같은 설정도 함께 지워진다)
export function resetAll() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- 집계 도우미 ---------- */
// 세트에서 푼 문항 수 (객관식·주관식 답 + 서술형 기록)
export function doneCount(data, setId) {
  return new Set([...Object.keys(data.answers[setId] || {}), ...Object.keys(data.essays[setId] || {})]).size;
}
