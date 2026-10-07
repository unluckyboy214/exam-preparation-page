/* =========================================================
   홈 (index.html)
   - 이어서 풀기: 마지막으로 풀던 세트와 진행률 (+ 진행 중인 시험)
   - 오늘의 복습: 오답 노트에서 "복습 완료"가 아닌 문제 수
   - 과목 카드: 과목명, 이론 바로가기, 문제 세트 수
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadSubjects, loadExamList } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, renderError } from "../render.js";

const root = document.getElementById("home-root");

const solveUrl = (setId, mode, extra = "") => siteUrl(`pages/solve.html?set=${encodeURIComponent(setId)}&mode=${mode}${extra}`);
const totalOf = (entry) => Object.values(entry.counts || {}).reduce((a, b) => a + b, 0);

function continueCard(data, sets) {
  const rows = [];

  // 진행 중인 시험 (시간이 남은 것만)
  for (const [setId, session] of Object.entries(data.examSessions)) {
    const entry = sets.find((s) => s.id === setId);
    const left = session.deadline - Date.now();
    if (!entry || left <= 0) continue;
    rows.push(`
      <li><a href="${solveUrl(setId, "exam")}">
        <strong>${escapeHtml(entry.title)}</strong> <span class="tag">시험 중</span>
        <span class="muted">남은 시간 약 ${Math.ceil(left / 60000)}분</span></a></li>`);
  }

  const last = data.lastVisit;
  const entry = last && sets.find((s) => s.id === last.set);
  if (entry) {
    const total = totalOf(entry);
    const done = store.doneCount(data, entry.id);
    rows.push(`
      <li><a href="${solveUrl(entry.id, "practice", `&q=${encodeURIComponent(last.q)}`)}">
        <strong>${escapeHtml(entry.title)}</strong>
        <span class="muted">푼 문항 ${done} / ${total}</span>
        <span class="progress" aria-hidden="true"><span style="width:${Math.round((done / (total || 1)) * 100)}%"></span></span></a></li>`);
  }

  return `
    <article class="card home-card">
      <h2>이어서 풀기</h2>
      ${
        rows.length
          ? `<ul class="link-list">${rows.join("")}</ul>`
          : `<p class="muted">아직 푼 문제가 없어요.</p>
             <div class="actions"><a class="btn primary" href="${siteUrl("pages/exams.html")}">문제 고르기</a></div>`
      }
    </article>`;
}

function reviewCard(data) {
  const todo = Object.values(data.wrong).filter((w) => !w.reviewed).length;
  return `
    <article class="card home-card">
      <h2>오늘의 복습</h2>
      ${
        todo
          ? `<p class="big-number"><strong>${todo}</strong> 문제</p>
             <p class="muted">오답 노트에서 아직 복습하지 않은 문제예요.</p>
             <div class="actions"><a class="btn primary" href="${siteUrl("pages/my.html#wrong")}">오답 노트 보기</a></div>`
          : '<p class="muted">복습할 오답이 없어요. 새 문제를 풀어 보세요!</p>'
      }
    </article>`;
}

function subjectCards(subjects, sets) {
  return subjects
    .map((s) => {
      const count = sets.filter((x) => x.subject === s.id).length;
      return `
      <article class="card">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="muted">${escapeHtml(s.description)}</p>` : ""}
        <p>문제 세트 ${count}개</p>
        <div class="actions">
          <a class="btn primary" href="${siteUrl(`pages/exams.html?subject=${encodeURIComponent(s.id)}`)}">문제 풀기</a>
          <a class="btn" href="${siteUrl(`pages/theory.html?subject=${encodeURIComponent(s.id)}`)}">이론 보기</a>
        </div>
      </article>`;
    })
    .join("");
}

// 시험(단체)별로 묶는다. subjects 는 이미 시험 → 과목 순서로 정렬돼 있다
function subjectSection(subjects, sets) {
  const groups = [];
  for (const s of subjects) {
    let g = groups[groups.length - 1];
    if (!g || g.id !== s.group) groups.push((g = { id: s.group, title: s.groupTitle, items: [] }));
    g.items.push(s);
  }
  return groups
    .map((g) => `<h3 class="group-title">${escapeHtml(g.title)}</h3><div class="grid">${subjectCards(g.items, sets)}</div>`)
    .join("");
}

async function main() {
  try {
    const [subjects, sets] = await Promise.all([loadSubjects(), loadExamList()]);
    const data = store.load();
    root.innerHTML = `
      <div class="home-grid">
        ${continueCard(data, sets)}
        ${reviewCard(data)}
      </div>
      <section class="section" aria-labelledby="subjects-title">
        <h2 id="subjects-title">시험별 과목</h2>
        ${subjectSection(subjects, sets)}
      </section>`;
  } catch (error) {
    renderError(root, error);
  }
}

main();
