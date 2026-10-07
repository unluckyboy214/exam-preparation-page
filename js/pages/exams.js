/* =========================================================
   문제 세트 목록 (pages/exams.html)
   - ?subject=frontend : 과목 필터
   - ?kind=mock | past : 종류 필터 (예상 문제 / 기출(로컬 전용))
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadSubjects, loadExamList } from "../data.js";
import { load } from "../store.js";
import { escapeHtml, renderError } from "../render.js";

const TYPE_LABEL = { mc: "객관식", multi: "복수 선택", short: "주관식", essay: "서술형" };
const KIND_LABEL = { all: "전체", mock: "예상 문제", past: "기출 (로컬 전용)" };

const filtersEl = document.getElementById("filters");
const listEl = document.getElementById("list");

const params = new URLSearchParams(location.search);
const state = {
  subject: params.get("subject") || "all",
  kind: params.get("kind") || "all",
};

const kindOf = (set) => (set.source === "past-exam" ? "past" : "mock");

function composition(counts) {
  return Object.keys(TYPE_LABEL)
    .filter((t) => counts && counts[t] > 0)
    .map((t) => `${TYPE_LABEL[t]} ${counts[t]}`)
    .join(" · ");
}

function totalOf(counts) {
  return Object.values(counts || {}).reduce((a, b) => a + b, 0);
}

// 내 기록에서 진행 상태와 최고 점수 계산
function myStatus(set, record) {
  const total = totalOf(set.counts);
  const done = new Set([
    ...Object.keys(record.answers[set.id] || {}),
    ...Object.keys(record.essays[set.id] || {}),
  ]).size;
  const results = record.results[set.id] || [];
  const best = results.reduce((b, r) => (!b || r.score / r.total > b.score / b.total ? r : b), null);
  return { total, done, best };
}

function setCard(set, subjectTitle, record) {
  const { total, done, best } = myStatus(set, record);
  const solveUrl = (mode) => siteUrl(`pages/solve.html?set=${encodeURIComponent(set.id)}&mode=${mode}`);
  const progress =
    done === 0 ? "아직 안 풀었어요" : done >= total ? "모두 풀었어요" : `${done} / ${total} 문항 풀었어요`;
  const bestText = best ? `최고 ${best.score} / ${best.total}점` : "최고 점수 없음";

  return `
    <article class="card set-card">
      <p class="set-meta">
        <span>${escapeHtml(subjectTitle)}</span>
        ${set.isPrivate ? '<span class="tag tag-private">로컬 전용</span>' : ""}
        ${kindOf(set) === "past" ? '<span class="tag">기출</span>' : ""}
      </p>
      <h3>${escapeHtml(set.title)}</h3>
      <p class="muted">${escapeHtml(composition(set.counts))} · 제한 시간 ${escapeHtml(set.timeLimitMin)}분</p>
      <p class="set-status">
        <span>${progress}</span>
        <span>${bestText}</span>
      </p>
      <div class="progress" aria-hidden="true"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></div>
      <div class="actions">
        <a class="btn primary" href="${solveUrl("practice")}">연습 모드</a>
        <a class="btn" href="${solveUrl("exam")}">시험 모드</a>
      </div>
    </article>`;
}

function chips(name, options, current) {
  return options
    .map(
      ([value, label]) =>
        `<button type="button" class="chip" data-${name}="${escapeHtml(value)}" aria-pressed="${value === current}">${escapeHtml(label)}</button>`
    )
    .join("");
}

function syncUrl() {
  const p = new URLSearchParams();
  if (state.subject !== "all") p.set("subject", state.subject);
  if (state.kind !== "all") p.set("kind", state.kind);
  const query = p.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function render(subjects, sets) {
  const titles = Object.fromEntries(subjects.map((s) => [s.id, s.title]));
  const hasPast = sets.some((s) => kindOf(s) === "past");
  if (!hasPast) state.kind = "all"; // 기출이 없으면(배포 사이트) 종류 필터를 숨긴다

  filtersEl.innerHTML = `
    <div class="chips" role="group" aria-label="과목">
      ${chips("subject", [["all", "전체 과목"], ...subjects.map((s) => [s.id, s.title])], state.subject)}
    </div>
    ${
      hasPast
        ? `<div class="chips" role="group" aria-label="종류">${chips("kind", Object.entries(KIND_LABEL), state.kind)}</div>`
        : ""
    }`;

  const shown = sets.filter(
    (s) => (state.subject === "all" || s.subject === state.subject) && (state.kind === "all" || kindOf(s) === state.kind)
  );
  const record = load();
  listEl.innerHTML = shown.length
    ? shown.map((s) => setCard(s, titles[s.subject] || s.subject, record)).join("")
    : '<p class="empty">조건에 맞는 문제 세트가 없어요.</p>';
}

async function main() {
  try {
    const [subjects, sets] = await Promise.all([loadSubjects(), loadExamList()]);
    render(subjects, sets);

    filtersEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      if (btn.dataset.subject) state.subject = btn.dataset.subject;
      if (btn.dataset.kind) state.kind = btn.dataset.kind;
      syncUrl();
      render(subjects, sets);
    });
  } catch (error) {
    renderError(listEl, error);
  }
}

main();
