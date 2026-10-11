/* =========================================================
   이론 (pages/theory.html)
   - ?subject=frontend : 그 과목의 단원 목차 + 본문 (없으면 과목 목록)
   - #단원id 로 바로 그 단원으로 이동 (태그 = 단원 id)
   - 단원 끝 "이 단원 문제 풀기" → 그 태그가 붙은 문제만 모아 풀기
   ========================================================= */
import { siteUrl, SITE_NAME } from "../app.js";
import { loadSubjects, loadExamList, loadExamSet, loadTheory } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, md, mdInline, mdTable, codeBlock, enableCopyButtons, renderError } from "../render.js";
import { formatScore } from "../quiz.js";

const root = document.getElementById("theory-root");
const subjectId = new URLSearchParams(location.search).get("subject");

const tagUrl = (tag) =>
  siteUrl(`pages/solve.html?subject=${encodeURIComponent(subjectId)}&tag=${encodeURIComponent(tag)}`);

/* ---------- 과목 목록 ---------- */
async function showSubjects() {
  const subjects = await loadSubjects();
  const counts = await Promise.all(subjects.map((s) => loadTheory(s.id).then((t) => t.units.length).catch(() => 0)));
  const card = (s, i) => `
      <article class="card">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="muted">${escapeHtml(s.description)}</p>` : ""}
        <p>단원 ${counts[i]}개</p>
        <div class="actions"><a class="btn primary" href="${siteUrl(`pages/theory.html?subject=${encodeURIComponent(s.id)}`)}">이론 보기</a></div>
      </article>`;
  // 시험(단체)별로 제목을 달아 묶는다 (subjects 는 이미 시험 → 과목 순서)
  const groups = [];
  subjects.forEach((s, i) => {
    let g = groups[groups.length - 1];
    if (!g || g.id !== s.group) groups.push((g = { id: s.group, title: s.groupTitle, cards: [] }));
    g.cards.push(card(s, i));
  });
  root.innerHTML =
    groups.map((g) => `<h2 class="group-title">${escapeHtml(g.title)}</h2><div class="grid">${g.cards.join("")}</div>`).join("") ||
    '<p class="empty">과목이 없어요.</p>';
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

/* ---------- Part 묶음 ----------
   theory.parts = [{ id, title, units: [단원 id...] }] (선택)
   - parts 가 없으면 Part 제목 없이 단원만 차례로 보여 준다
   - parts 에 없는 단원(로컬 전용 등)은 마지막 묶음으로 모은다 */
function groupUnits(theory) {
  const units = theory.units || [];
  if (!Array.isArray(theory.parts) || theory.parts.length === 0) return [{ id: "", title: "", units }];
  const byId = new Map(units.map((u) => [u.id, u]));
  const used = new Set();
  const parts = theory.parts.map((p) => {
    const list = (p.units || []).map((id) => byId.get(id)).filter((u) => u && !used.has(u.id));
    list.forEach((u) => used.add(u.id));
    return { id: p.id, title: p.title, units: list };
  });
  const rest = units.filter((u) => !used.has(u.id));
  if (rest.length) {
    const allPrivate = rest.every((u) => u.isPrivate);
    parts.push({ id: "part-etc", title: allPrivate ? "로컬 전용 단원" : "기타", units: rest });
  }
  return parts.filter((p) => p.units.length);
}

/* ---------- 단원 ---------- */
function unitHtml(unit, stat, no) {
  const list = (items) => (items || []).map((p) => `<li>${mdInline(p)}</li>`).join("");
  const count = stat ? stat.count : 0;
  const mine =
    stat && stat.solved
      ? `<span class="muted">내 정답률 ${Math.round((stat.score / stat.solved) * 100)}% (${formatScore(stat.score)}/${stat.solved})</span>`
      : "";

  return `
    <section class="card unit" id="${escapeHtml(unit.id)}" aria-labelledby="${escapeHtml(unit.id)}-title">
      <h3 class="unit-title" id="${escapeHtml(unit.id)}-title">${no ? `<span class="unit-no">${no}</span>` : ""}${escapeHtml(unit.title)}
        ${unit.isPrivate ? '<span class="tag tag-private">로컬 전용</span>' : ""}</h3>
      ${unit.points && unit.points.length ? `<div class="unit-points"><h4>핵심 포인트</h4><ul>${list(unit.points)}</ul></div>` : ""}
      ${(unit.tables || []).map(mdTable).join("")}
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
  document.title = `${title} 이론 · ${SITE_NAME}`;
  document.querySelector(".page-head h1").textContent = `${title} 이론`;
  document.querySelector(".page-head p").textContent = "단원별 핵심 요약이에요. 단원 끝에서 그 단원 문제만 모아 풀 수 있어요.";

  // Part 번호 · 단원 번호 (예: Part 1 → 1-1, 1-2 …). Part 가 하나뿐이고 제목이 없으면 단원 번호만
  const parts = groupUnits(theory);
  const titled = parts.some((p) => p.title);
  const unitNo = (pi, ui) => (titled ? `${pi + 1}-${ui + 1}` : `${ui + 1}`);
  const tocUnits = (p, pi) =>
    p.units
      .map(
        (u, ui) =>
          `<li><a href="#${encodeURIComponent(u.id)}" data-toc="${escapeHtml(u.id)}"><span class="toc-no">${unitNo(pi, ui)}</span>${escapeHtml(u.title)}</a></li>`
      )
      .join("");
  const toc = titled
    ? parts
        .map(
          (p, pi) => `
          <li class="toc-part">
            <a class="toc-part-title" href="#${encodeURIComponent(p.id)}">Part ${pi + 1}. ${escapeHtml(p.title)}</a>
            <ol>${tocUnits(p, pi)}</ol>
          </li>`
        )
        .join("")
    : tocUnits(parts[0], 0);
  const body = parts
    .map((p, pi) => {
      const units = p.units.map((u, ui) => unitHtml(u, stats[u.id], unitNo(pi, ui))).join("");
      if (!titled) return units;
      return `
        <section class="part" id="${escapeHtml(p.id)}" aria-labelledby="${escapeHtml(p.id)}-title">
          <h2 class="part-title" id="${escapeHtml(p.id)}-title"><span class="part-no">Part ${pi + 1}</span>${escapeHtml(p.title)}</h2>
          ${units}
        </section>`;
    })
    .join("");
  root.innerHTML = `
    <div class="theory-layout">
      <nav class="toc" aria-label="단원 목차">
        <details class="toc-box" open>
          <summary>단원 목차 (${titled ? `Part ${parts.length} · ` : ""}단원 ${theory.units.length})</summary>
          <ol class="${titled ? "toc-parts" : ""}">${toc}</ol>
        </details>
      </nav>
      <div class="units">${body}</div>
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
        root.querySelectorAll(".toc-part").forEach((p) => p.classList.toggle("on", !!p.querySelector("a.on")));
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
