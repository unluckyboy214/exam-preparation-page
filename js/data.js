/* =========================================================
   데이터 불러오기 (JSON)
   - 경로는 이 파일(js/data.js) 위치 기준으로 사이트 루트를 계산
     → 어느 페이지에서 불러도, GitHub Pages 하위 경로에서도 맞음
   - 공개 데이터(data/)와 로컬 전용 데이터(private/)를 합친다.
     private/ 가 없으면(= GitHub Pages) 조용히 건너뛴다
   ========================================================= */
const ROOT = new URL("../", import.meta.url);

export class LoadError extends Error {
  constructor(path, what = "파일을") {
    super(`${what} 불러오지 못했어요 (경로: ${path})`);
    this.path = path;
  }
}

// 같은 파일을 여러 번 요청하지 않도록 기억해 둔다
const cache = new Map();

function getJson(path, { optional = false, what } = {}) {
  const key = path + (optional ? "?optional" : "");
  if (!cache.has(key)) {
    const job = fetch(new URL(path, ROOT), { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .catch(() => {
        if (optional) return null;
        cache.delete(key); // 실패는 기억하지 않음 (다시 시도할 수 있게)
        throw new LoadError(path, what);
      });
    cache.set(key, job);
  }
  return cache.get(key);
}

/* ---------- 과목 ---------- */
export async function loadSubjects() {
  const json = await getJson("data/subjects.json", { what: "과목 목록 파일을" });
  return json.subjects || [];
}

/* ---------- 문제 세트 목록 (공개 + private 병합) ---------- */
// 각 항목: index.json 의 내용 + path(파일 경로) + isPrivate
export async function loadExamList() {
  const [pub, priv] = await Promise.all([
    getJson("data/exams/index.json", { what: "문제 목록 파일을" }),
    getJson("private/exams/index.json", { optional: true }),
  ]);
  const list = [];
  const seen = new Set();
  const add = (sets, dir, isPrivate) => {
    for (const s of sets || []) {
      if (seen.has(s.id)) continue; // validate.js 가 막지만 혹시 몰라 앞의 것을 쓴다
      seen.add(s.id);
      list.push({ ...s, path: `${dir}/${s.file}`, isPrivate });
    }
  };
  add(pub.sets, "data/exams", false);
  if (priv) add(priv.sets, "private/exams", true);
  return list;
}

/* ---------- 문제 세트 하나 ---------- */
export async function loadExamSet(setId) {
  const entry = (await loadExamList()).find((s) => s.id === setId);
  if (!entry) throw new LoadError(`세트 id "${setId}"`, "문제 세트를");
  const set = await getJson(entry.path, { what: "문제 파일을" });
  return { ...set, entry };
}

/* ---------- 이론 (공개 + private 병합) ---------- */
// private/theory/<과목>.json 이 있으면 그 단원을 뒤에 붙인다 (isPrivate 표시, 같은 id 는 공개 쪽 우선)
export async function loadTheory(subject) {
  const [pub, priv] = await Promise.all([
    getJson(`data/theory/${subject}.json`, { what: "이론 파일을" }),
    getJson(`private/theory/${subject}.json`, { optional: true }),
  ]);
  if (!priv || !Array.isArray(priv.units)) return pub;
  const ids = new Set(pub.units.map((u) => u.id));
  const extra = priv.units.filter((u) => u && u.id && !ids.has(u.id)).map((u) => ({ ...u, isPrivate: true }));
  return { ...pub, units: [...pub.units, ...extra] };
}
