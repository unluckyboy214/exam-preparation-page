/* =========================================================
   채점·집계 (화면과 관계없는 계산만)
   - 배점: 문항당 1점, 서술형은 채점 기준 체크 비율 (PROJECT_SPEC 11. 기본값)
   ========================================================= */
export const TYPE_LABEL = { mc: "객관식", multi: "복수 선택", short: "주관식", essay: "서술형" };
export const TYPE_ORDER = ["mc", "multi", "short", "essay"];

// 주관식: 대소문자·앞뒤 공백·따옴표·끝의 () 무시
export function normalizeShort(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\(\s*\)$/, "")
    .trim();
}

export function gradeShort(q, text) {
  const mine = normalizeShort(text);
  return mine !== "" && q.answers.some((a) => normalizeShort(a) === mine);
}

export function gradeMulti(q, picked) {
  const want = [...q.answer].sort();
  const got = [...(picked || [])].sort();
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

// 객관식·복수 선택·주관식 응답 채점. resp: { picked } 또는 { text }
export function gradeResponse(q, resp) {
  if (!resp) return false;
  if (q.type === "mc") return resp.picked === q.answer;
  if (q.type === "multi") return gradeMulti(q, resp.picked);
  if (q.type === "short") return gradeShort(q, resp.text);
  return false;
}

// 답을 했는지 (빈 답은 안 한 것으로)
export function hasResponse(q, resp) {
  if (!resp) return false;
  if (q.type === "mc") return Number.isInteger(resp.picked);
  if (q.type === "multi") return Array.isArray(resp.picked) && resp.picked.length > 0;
  return typeof resp.text === "string" && resp.text.trim() !== "";
}

export const roundScore = (n) => Math.round(n * 10) / 10;

export function formatScore(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/* ---------- 시험 채점 ----------
   responses: { qid: { picked } | { text } }  (서술형은 { text })
   반환: detail { qid: 0~1 점수 }, pending [자가 채점이 남은 서술형 id], score, total */
export function scoreExam(questions, responses) {
  const detail = {};
  const pending = [];
  for (const q of questions) {
    const resp = responses[q.id];
    if (q.type === "essay") {
      detail[q.id] = 0;
      if (hasResponse(q, resp)) pending.push(q.id); // 쓴 답안만 채점 대상
    } else {
      detail[q.id] = gradeResponse(q, resp) ? 1 : 0;
    }
  }
  return { detail, pending, ...totals(questions, detail) };
}

export function totals(questions, detail) {
  const score = questions.reduce((sum, q) => sum + (detail[q.id] || 0), 0);
  return { score: roundScore(score), total: questions.length };
}

/* ---------- 유형별 · 태그별 집계 ----------
   반환: byType [{ type, label, score, count }], byTag [{ tag, title, score, count, rate }] (약한 순) */
export function summarize(questions, detail, tagTitles = {}) {
  const types = {};
  const tags = {};
  for (const q of questions) {
    if (!(q.id in detail)) continue;
    const s = detail[q.id] || 0;
    types[q.type] = types[q.type] || { score: 0, count: 0 };
    types[q.type].score += s;
    types[q.type].count++;
    for (const t of q.tags || []) {
      tags[t] = tags[t] || { score: 0, count: 0 };
      tags[t].score += s;
      tags[t].count++;
    }
  }
  const byType = TYPE_ORDER.filter((t) => types[t]).map((t) => ({
    type: t,
    label: TYPE_LABEL[t],
    score: roundScore(types[t].score),
    count: types[t].count,
  }));
  const byTag = Object.entries(tags)
    .map(([tag, v]) => ({ tag, title: tagTitles[tag] || tag, score: roundScore(v.score), count: v.count, rate: v.score / v.count }))
    .sort((a, b) => a.rate - b.rate || b.count - a.count);
  return { byType, byTag };
}

// 마크다운-lite 를 걷어 낸 짧은 미리보기 글
export function preview(text, max = 60) {
  const plain = String(text ?? "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}
