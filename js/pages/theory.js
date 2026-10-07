/* =========================================================
   이론 (pages/theory.html)
   - ?subject=frontend : 그 과목의 단원 목차 + 본문 (없으면 과목 목록)
   - #단원id 로 바로 그 단원으로 이동 (태그 = 단원 id)
   - 단원 끝 "이 단원 문제 풀기" → 그 태그가 붙은 문제만 모아 풀기
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadSubjects, loadExamList, loadExamSet, loadTheory } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, md, mdInline, codeBlock, enableCopyButtons, renderError } from "../render.js";
import { formatScore } from "../quiz.js";

const root = document.getElementById("theory-root");
const subjectId = new URLSearchParams(location.search).get("subject");

const tagUrl = (tag) =>
  siteUrl(`pages/solve.html?subject=${encodeURIComponent(subjectId)}&tag=${encodeURIComponent(tag)}`);

/* ---------- 과목 목록 ---------- */
async function showSubjects() {
  const subjects = await loadSubjects();
  const counts = await Promise.all(subjects.map((s) => loadTheory(s.id).then((t) => t.units.length).catch(() => 0)));
  root.innerHTML = `<div class="grid">${subjects
    .map(
      (s, i) => `
      <article class="card">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="muted">${escapeHtml(s.description)}</p>` : ""}
        <p>단원 ${counts[i]}개</p>
        <div class="actions"><a class="btn primary" href="${siteUrl(`pages/theory.html?subject=${encodeURIComponent(s.id)}`)}">이론 보기</a></div>
      </article>`
    )
    .join("")}</div>`;
}

/* ---------- 태그별 문항 수와 내 정답률 ---------- */
async function tagStats() {
  const list = (await loadExamList()).filter((s) => s.subject === subjectId);
  const sets = await Promise.all(list.map((e) => loadExamSet(e.id).catch(() => null)));
  const data = store.load();
  const stats = {}; // { tag: { count, solved, score } }
  sets.forEach((set) => {
    if (!set) return;
    const setId = set.entry.id;
    for (const q of set.questions) {
      let s = null; // 최근 기록 점수 (채점 전이면 null)
      if (q.type === "essay") {
        const e = (data.essays[setId] || {})[q.id];
        if (e && e.graded) s = (e.checks || []).filter(Boolean).length / q.points.length;
      } else {
        const a = (data.answers[setId] || {})[q.id];
        if (a) s = a.correct ? 1 : 0;
      }
      for (const tag of q.tags || []) {
        const t = (stats[tag] = stats[tag] || { count: 0, solved: 0, score: 0 });
        t.count++;
        if (s !== null) {
          t.solved++;
          t.score += s;
        }
      }
    }
  });
  return stats;
}

/* ---------- 단원 ---------- */
function unitHtml(unit, stat) {
  const list = (items) => (items || []).map((p) => `<li>${mdInline(p)}</li>`).join("");
  const count = stat ? stat.count : 0;
  const mine =
    stat && stat.solved
      ? `<span class="muted">내 정답률 ${Math.round((stat.score / stat.solved) * 100)}% (${formatScore(stat.score)}/${stat.solved})</span>`
      : "";

  return `
    <section class="card unit" id="${escapeHtml(unit.id)}" aria-labelledby="${escapeHtml(unit.id)}-title">
      <h2 id="${escapeHtml(unit.id)}-title">${escapeHtml(unit.title)}
        ${unit.isPrivate ? '<span class="tag tag-private">로컬 전용</span>' : ""}</h2>
      ${unit.points && unit.points.length ? `<div class="unit-points"><h3>핵심 포인트</h3><ul>${list(unit.points)}</ul></div>` : ""}
      ${unit.body ? `<div class="unit-body">${md(unit.body)}</div>` : ""}
      ${(unit.examples || []).map(codeBlock).join("")}
      ${unit.pitfalls && unit.pitfalls.length ? `<div class="warn"><p class="box-title">자주 하는 실수</p><ul>${list(unit.pitfalls)}</ul></div>` : ""}
      <footer class="unit-foot">
        ${
          count
            ? `<a class="btn primary" href="${tagUrl(unit.id)}">이 단원 문제 풀기 (${count}문항)</a>`
            : '<span class="btn" aria-disabled="true">이 단원 문제가 아직 없어요</span>'
        }
        ${mine}
      </footer>
    </section>`;
}

async function showSubject() {
  const [subjects, theory, stats] = await Promise.all([loadSubjects(), loadTheory(subjectId), tagStats()]);
  const subject = subjects.find((s) => s.id === subjectId);
  const title = theory.title || (subject && subject.title) || subjectId;
  document.title = `${title} 이론 · SSAFY 과목평가 대비`;
  document.querySelector(".page-head h1").textContent = `${title} 이론`;
  document.querySelector(".page-head p").textContent = "단원별 핵심 요약이에요. 단원 끝에서 그 단원 문제만 모아 풀 수 있어요.";

  const toc = theory.units
    .map((u) => `<li><a href="#${encodeURIComponent(u.id)}" data-toc="${escapeHtml(u.id)}">${escapeHtml(u.title)}</a></li>`)
    .join("");
  root.innerHTML = `
    <div class="theory-layout">
      <nav class="toc" aria-label="단원 목차">
        <details class="toc-box" open>
          <summary>단원 목차 (${theory.units.length})</summary>
          <ol>${toc}</ol>
        </details>
      </nav>
      <div class="units">${theory.units.map((u) => unitHtml(u, stats[u.id])).join("")}</div>
    </div>`;

  // 좁은 화면에서는 목차를 접어 두고, 창 크기가 바뀌면 다시 맞춘다
  const narrow = matchMedia("(max-width: 860px)");
  const fitToc = () => (root.querySelector(".toc-box").open = !narrow.matches);
  fitToc();
  narrow.addEventListener("change", fitToc);
  highlightToc();
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

// 지금 읽고 있는 단원을 목차에서 표시
function highlightToc() {
  const links = root.querySelectorAll("[data-toc]");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle("on", a.dataset.toc === entry.target.id));
      }
    },
    { rootMargin: "-80px 0px -70% 0px" }
  );
  root.querySelectorAll(".unit").forEach((u) => observer.observe(u));
}

async function main() {
  enableCopyButtons();
  try {
    if (subjectId) await showSubject();
    else await showSubjects();
  } catch (error) {
    renderError(root, error);
  }
}

main();
