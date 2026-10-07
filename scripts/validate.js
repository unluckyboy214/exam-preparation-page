#!/usr/bin/env node
/* =========================================================
   문제 JSON 검사 + index.json 자동 갱신 (PROJECT_SPEC.md "6-4")
   실행: node scripts/validate.js
   - data/exams/*.json    (공개: meta.source 는 반드시 "self-made")
   - private/exams/*.json (로컬 전용, 폴더가 없으면 건너뜀)
   - 오류가 하나라도 있으면 index.json 을 쓰지 않고 exit 1
   - 경고(이론에 없는 태그 등)는 알려만 주고 통과
   ========================================================= */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = ["mc", "multi", "short", "essay"];

const errors = [];
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isInt = (v) => Number.isInteger(v);
const isStrList = (v, min) => Array.isArray(v) && v.length >= min && v.every(isStr);

/* ---------- 기준 정보: 과목 목록, 과목별 이론 단원 id ---------- */
const subjects = new Set();
try {
  for (const s of readJson(path.join(ROOT, "data/subjects.json")).subjects) subjects.add(s.id);
} catch (e) {
  errors.push(`data/subjects.json → 읽을 수 없음 (${e.message})`);
}

const theoryUnits = {}; // { frontend: Set(["css-flex", ...]) }
function unitsOf(subject) {
  if (theoryUnits[subject]) return theoryUnits[subject];
  const ids = new Set();
  for (const dir of ["data/theory", "private/theory"]) {
    const file = path.join(ROOT, dir, subject + ".json");
    if (!fs.existsSync(file)) continue;
    try {
      for (const u of readJson(file).units || []) ids.add(u.id);
    } catch (e) {
      errors.push(`${dir}/${subject}.json → 읽을 수 없음 (${e.message})`);
    }
  }
  if (ids.size === 0) warnings.push(`과목 "${subject}" 의 이론 파일이 없어 태그를 확인하지 못했어요 (data/theory/${subject}.json)`);
  theoryUnits[subject] = ids;
  return ids;
}

/* ---------- 문제 한 개 검사 ---------- */
function checkQuestion(q, where, subject) {
  const err = (msg) => errors.push(`${where} → ${msg}`);
  if (!q || typeof q !== "object") return err("문항이 객체가 아님");
  if (!isStr(q.id)) err("id 가 없음");
  if (!TYPES.includes(q.type)) err(`type 은 ${TYPES.join("/")} 중 하나여야 함 (현재: ${JSON.stringify(q.type)})`);
  if (!isStr(q.question)) err("question 이 없음");
  if (q.code !== undefined && !(q.code && isStr(q.code.lang) && isStr(q.code.src))) {
    err("code 는 { lang, src } 형태여야 함");
  }
  if (q.explain !== undefined && typeof q.explain !== "string") err("explain 은 문자열이어야 함");

  // 태그: 있어야 하고, 이론 단원 id 와 맞아야 함(아니면 경고)
  if (!isStrList(q.tags, 1)) {
    warnings.push(`${where} → tags 가 비어 있음 (태그별 정답률·단원 문제 풀기에서 빠짐)`);
  } else {
    const units = unitsOf(subject);
    if (units.size === 0) return checkByType(q, err); // 이론 파일이 없으면 unitsOf 에서 한 번만 경고
    for (const t of q.tags) {
      if (!units.has(t)) warnings.push(`${where} → 태그 "${t}" 가 이론 파일(${subject}.json)에 없음`);
    }
  }
  checkByType(q, err);
}

/* ---------- 유형별 필수 필드 ---------- */
function checkByType(q, err) {
  switch (q.type) {
    case "mc":
      if (!isStrList(q.options, 2)) err("options 는 문자열 2개 이상");
      else if (!isInt(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        err(`answer 는 0 ~ ${q.options.length - 1} 사이 정수 (현재: ${JSON.stringify(q.answer)})`);
      }
      break;
    case "multi":
      if (!isStrList(q.options, 2)) err("options 는 문자열 2개 이상");
      else if (
        !Array.isArray(q.answer) ||
        q.answer.length === 0 ||
        new Set(q.answer).size !== q.answer.length ||
        !q.answer.every((a) => isInt(a) && a >= 0 && a < q.options.length)
      ) {
        err(`answer 는 0 ~ ${q.options.length - 1} 사이 정수의 배열 (중복 없이 1개 이상)`);
      }
      break;
    case "short":
      if (!isStrList(q.answers, 1)) err("answers 는 문자열 1개 이상");
      break;
    case "essay":
      if (!isStr(q.model)) err("model(모범 답안) 이 없음");
      if (!isStrList(q.points, 1)) err("points(채점 기준) 는 문자열 1개 이상");
      break;
  }
}

/* ---------- 문제 세트 파일 하나 검사 → index 항목 반환 ---------- */
function checkSet(file, isPublic) {
  const name = rel(file);
  let set;
  try {
    set = readJson(file);
  } catch (e) {
    errors.push(`${name} → JSON 을 읽을 수 없음 (${e.message})`);
    return null;
  }
  const before = errors.length;
  const err = (msg) => errors.push(`${name} → ${msg}`);
  const meta = set.meta || {};
  const fileId = path.basename(file, ".json");

  if (!isStr(meta.id)) err("meta.id 가 없음");
  else if (meta.id !== fileId) err(`meta.id("${meta.id}")와 파일 이름("${fileId}")이 달라요`);
  if (!isStr(meta.subject)) err("meta.subject 가 없음");
  else if (!subjects.has(meta.subject)) warnings.push(`${name} → 과목 "${meta.subject}" 이 data/subjects.json 에 없음`);
  if (!isStr(meta.title)) err("meta.title 이 없음");
  if (!isStr(meta.source)) err("meta.source 가 없음");
  else if (isPublic && meta.source !== "self-made") {
    err(`공개 폴더의 meta.source 는 "self-made" 여야 함 (현재: "${meta.source}"). 기출은 private/exams/ 로`);
  }
  if (!(typeof meta.timeLimitMin === "number" && meta.timeLimitMin > 0)) err("meta.timeLimitMin 은 0보다 큰 숫자");
  if (!(isInt(meta.version) && meta.version >= 1)) err("meta.version 은 1 이상 정수");

  if (!Array.isArray(set.questions) || set.questions.length === 0) {
    err("questions 가 비어 있음");
    return null;
  }

  const seen = new Set();
  const counts = { mc: 0, multi: 0, short: 0, essay: 0 };
  set.questions.forEach((q, i) => {
    const where = `${name} [${i + 1}번${q && q.id ? ` ${q.id}` : ""}]`;
    checkQuestion(q, where, meta.subject);
    if (q && isStr(q.id)) {
      if (seen.has(q.id)) errors.push(`${where} → id "${q.id}" 가 세트 안에서 중복`);
      seen.add(q.id);
    }
    if (q && counts[q.type] !== undefined) counts[q.type]++;
  });

  if (errors.length > before) return null;
  return {
    id: meta.id,
    file: path.basename(file),
    subject: meta.subject,
    title: meta.title,
    source: meta.source,
    timeLimitMin: meta.timeLimitMin,
    version: meta.version,
    counts,
  };
}

/* ---------- 폴더 단위 처리 ---------- */
const allIds = new Map(); // 세트 id → 파일 (공개 + private 전체에서 유일해야 함)

function processDir(dir, isPublic) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return null;
  const files = fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .sort();
  const sets = [];
  for (const f of files) {
    const entry = checkSet(path.join(full, f), isPublic);
    if (!entry) continue;
    if (allIds.has(entry.id)) {
      errors.push(`${dir}/${f} → 세트 id "${entry.id}" 가 ${allIds.get(entry.id)} 와 중복`);
      continue;
    }
    allIds.set(entry.id, `${dir}/${f}`);
    sets.push(entry);
  }
  return { dir, sets };
}

const results = [processDir("data/exams", true), processDir("private/exams", false)].filter(Boolean);

/* ---------- 결과 ---------- */
for (const w of warnings) console.warn("⚠ " + w);
if (errors.length) {
  console.error(`✗ 오류 ${errors.length}건 — index.json 을 갱신하지 않았어요`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

for (const { dir, sets } of results) {
  const out = path.join(ROOT, dir, "index.json");
  fs.writeFileSync(out, JSON.stringify({ sets }, null, 2) + "\n");
  const total = sets.reduce((n, s) => n + s.counts.mc + s.counts.multi + s.counts.short + s.counts.essay, 0);
  console.log(`✓ ${dir}: 세트 ${sets.length}개 · 문항 ${total}개 → ${dir}/index.json 갱신`);
}
