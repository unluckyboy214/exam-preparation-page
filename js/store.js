/* =========================================================
   기록 저장 (localStorage)
   - 모든 기록은 키 하나("examsite:v1")에 묶어서 저장
   - 시크릿 모드 등에서 저장소가 막혀도 페이지가 깨지지 않도록 try/catch
   - M1 에서는 기본 구조와 설정(테마)만. 풀이 기록 함수는 M3 에서 추가
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
