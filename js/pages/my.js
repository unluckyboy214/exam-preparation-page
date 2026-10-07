/* =========================================================
   내 기록 (pages/my.html)
   - 세트별 진행률·점수, 오답 노트(복습 완료 체크), 단원(태그)별 정답률, 북마크
   - 기록 내보내기/가져오기(JSON 파일), 전체 초기화
   - 기록은 이 브라우저의 localStorage 에만 있다
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadSubjects, loadExamList, loadExamSet, loadTheory } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, renderError } from "../render.js";
import { TYPE_LABEL, formatScore, preview, summarize } from "../quiz.js";

const root = document.getElementById("my-root");

let subjects = []; // [{ id, title }]
let sets = []; // [{ entry, questions }]  (불러오지 못한 세트는 questions: null)
let tagTitles = {}; // { 과목: { 태그: 단원 제목 } }
let wrongFilter = "todo"; // todo | done | all

const solveUrl = (setId, mode, qid) =>
  siteUrl(`pages/solve.html?set=${encodeURIComponent(setId)}&mode=${mode}${qid ? `&q=${encodeURIComponent(qid)}` : ""}`);
const theoryUrl = (subject, tag) =>
  siteUrl(`pages/theory.html?subject=${encodeURIComponent(subject)}${tag ? `#${encodeURIComponent(tag)}` : ""}`);
const formatDate = (at) => new Date(at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

// "세트:문항" 키 → { set, q, no } (못 찾으면 q 가 null)
function lookup(key) {
  const i = key.indexOf(":");
  const setId = key.slice(0, i);
  const qid = key.slice(i + 1);
  const set = sets.find((s) => s.entry.id === setId);
  const index = set && set.questions ? set.questions.findIndex((q) => q.id === qid) : -1;
  return { setId, qid, set, q: index >= 0 ? set.questions[index] : null, no: index + 1 };
}

// 세트가 여러 개일 때만 어느 세트의 문제인지 보여 준다
function setName(e) {
  return sets.length > 1 ? `<span class="muted small">${escapeHtml(e.set.entry.title)}</span>` : "";
}

function bar(rate) {
  return `<div class="progress" aria-hidden="true"><span style="width:${Math.round(rate * 100)}%"></span></div>`;
}

/* ---------- 세트별 진행률·점수 ---------- */
function progressSection(data) {
  const cards = sets
    .map(({ entry }) => {
      const total = Object.values(entry.counts || {}).reduce((a, b) => a + b, 0);
      const done = store.doneCount(data, entry.id);
      const results = data.results[entry.id] || [];
      const recent = results[results.length - 1];
      const best = results.reduce((b, r) => (!b || r.score / r.total > b.score / b.total ? r : b), null);
      const subject = subjects.find((s) => s.id === entry.subject);
      return `
      <article class="card set-card">
        <p class="set-meta"><span>${escapeHtml(subject ? subject.title : entry.subject)}</span>
          ${entry.isPrivate ? '<span class="tag tag-private">로컬 전용</span>' : ""}</p>
        <h3>${escapeHtml(entry.title)}</h3>
        <p class="set-status"><span>푼 문항 ${done} / ${total}</span><span>${Math.round((done / (total || 1)) * 100)}%</span></p>
        ${bar(done / (total || 1))}
        <dl class="score-list">
          <div><dt>최근 시험</dt><dd>${recent ? `${formatScore(recent.score)} / ${recent.total}점 <span class="muted">${formatDate(recent.at)}</span>` : "없음"}</dd></div>
          <div><dt>최고 점수</dt><dd>${best ? `${formatScore(best.score)} / ${best.total}점` : "없음"}</dd></div>
          <div><dt>시험 횟수</dt><dd>${results.length}회</dd></div>
        </dl>
        <div class="actions">
          <a class="btn primary" href="${solveUrl(entry.id, "practice")}">이어서 풀기</a>
          ${recent ? `<a class="btn" href="${solveUrl(entry.id, "exam")}&result=${recent.at}">최근 결과</a>` : ""}
        </div>
      </article>`;
    })
    .join("");
  return `
    <section class="section" id="progress" aria-labelledby="progress-title">
      <h2 id="progress-title">진행률과 점수</h2>
      <div class="grid">${cards || '<p class="empty">문제 세트가 없어요.</p>'}</div>
    </section>`;
}

/* ---------- 오답 노트 ---------- */
function wrongSection(data) {
  const entries = Object.entries(data.wrong).map(([key, w]) => ({ key, reviewed: !!w.reviewed, ...lookup(key) }));
  // 세트 목록 순서 → 문항 순서
  const order = (e) => sets.findIndex((s) => s.entry.id === e.setId) * 10000 + (e.no || 9999);
  entries.sort((a, b) => order(a) - order(b));

  const todo = entries.filter((e) => !e.reviewed).length;
  const done = entries.length - todo;
  const shown = entries.filter((e) => wrongFilter === "all" || (wrongFilter === "done") === e.reviewed);

  const items = shown
    .map((e) => {
      const check = `<label class="check review-check">
          <input type="checkbox" data-review="${escapeHtml(e.key)}" ${e.reviewed ? "checked" : ""} />
          <span>복습 완료</span></label>`;
      if (!e.q) {
        return `<li class="note-item is-missing">
          <span class="muted">${escapeHtml(e.key)} — 문제를 찾을 수 없어요 (세트가 바뀌었거나 지워졌어요)</span>
          <button type="button" class="btn small" data-remove-wrong="${escapeHtml(e.key)}">목록에서 지우기</button></li>`;
      }
      return `<li class="note-item${e.reviewed ? " is-reviewed" : ""}">
        <a href="${solveUrl(e.setId, "practice", e.qid)}">
          <span class="qbadge">Q${e.no}</span> <span class="qtype">${TYPE_LABEL[e.q.type]}</span>
          <span class="wrong-preview">${escapeHtml(preview(e.q.question))}</span>
          ${setName(e)}
        </a>
        ${check}
      </li>`;
    })
    .join("");

  // 세트마다 "오답만 다시 풀기" 바로가기
  const retry = sets
    .filter(({ entry }) => entries.some((e) => e.setId === entry.id && !e.reviewed && e.q))
    .map(({ entry }) => `<a class="btn small" href="${solveUrl(entry.id, "wrong")}">${escapeHtml(entry.title)} 오답만 다시 풀기</a>`)
    .join("");

  const chip = (value, label) =>
    `<button type="button" class="chip" data-wrong-filter="${value}" aria-pressed="${wrongFilter === value}">${label}</button>`;

  return `
    <section class="section" id="wrong" aria-labelledby="wrong-title">
      <h2 id="wrong-title">오답 노트</h2>
      <p class="muted">틀린 문제를 다시 보고, 이해했으면 "복습 완료"를 체크하세요. 복습 완료한 문제는 "오답만 다시 풀기"에서 빠져요.</p>
      <div class="chips" role="group" aria-label="오답 노트 보기">
        ${chip("todo", `복습 전 ${todo}`)}${chip("done", `복습 완료 ${done}`)}${chip("all", `전체 ${entries.length}`)}
      </div>
      ${retry ? `<div class="chips retry-links">${retry}</div>` : ""}
      ${
        shown.length
          ? `<ul class="note-list">${items}</ul>`
          : `<p class="empty">${entries.length ? "이 조건에 맞는 문제가 없어요." : "아직 틀린 문제가 없어요."}</p>`
      }
    </section>`;
}

/* ---------- 단원(태그)별 정답률 ---------- */
// 문항마다 가장 최근 기록으로 점수(0~1)를 매긴다. 채점 전 서술형은 뺀다
function recordScore(q, data, setId) {
  if (q.type === "essay") {
    const e = (data.essays[setId] || {})[q.id];
    if (!e || !e.graded) return null;
    return (e.checks || []).filter(Boolean).length / q.points.length;
  }
  const a = (data.answers[setId] || {})[q.id];
  return a ? (a.correct ? 1 : 0) : null;
}

function tagSection(data) {
  const blocks = subjects
    .map((subject) => {
      const questions = [];
      const detail = {};
      for (const { entry, questions: qs } of sets) {
        if (entry.subject !== subject.id || !qs) continue;
        for (const q of qs) {
          const s = recordScore(q, data, entry.id);
          if (s === null) continue;
          const key = `${entry.id}:${q.id}`; // 세트가 여러 개여도 문항이 겹치지 않게
          questions.push({ ...q, id: key });
          detail[key] = s;
        }
      }
      if (!questions.length) return "";
      const { byTag } = summarize(questions, detail, tagTitles[subject.id] || {});
      const rows = byTag
        .map(
          (t) => `<tr>
          <th scope="row"><a href="${theoryUrl(subject.id, t.tag)}">${escapeHtml(t.title)}</a></th>
          <td>${Math.round(t.rate * 100)}% <span class="muted">(${formatScore(t.score)}/${t.count})</span></td>
          <td>${bar(t.rate)}</td></tr>`
        )
        .join("");
      return `${subjects.length > 1 ? `<h3>${escapeHtml(subject.title)}</h3>` : ""}
        <div class="table-wrap"><table class="stat-table"><tbody>${rows}</tbody></table></div>`;
    })
    .join("");

  return `
    <section class="section" id="tags" aria-labelledby="tags-title">
      <h2 id="tags-title">단원별 정답률 <span class="muted small">약한 단원부터</span></h2>
      <p class="muted">문항마다 가장 최근에 푼 결과로 계산해요. 단원 이름을 누르면 이론으로 가요.</p>
      ${blocks || '<p class="empty">아직 푼 문제가 없어요.</p>'}
    </section>`;
}

/* ---------- 북마크 ---------- */
function bookmarkSection(data) {
  const items = data.bookmarks
    .map((key) => {
      const e = lookup(key);
      const remove = `<button type="button" class="btn small" data-unmark="${escapeHtml(key)}" aria-label="북마크 해제">★ 해제</button>`;
      if (!e.q) return `<li class="note-item is-missing"><span class="muted">${escapeHtml(key)} — 문제를 찾을 수 없어요</span>${remove}</li>`;
      return `<li class="note-item">
        <a href="${solveUrl(e.setId, "practice", e.qid)}">
          <span class="qbadge">Q${e.no}</span> <span class="qtype">${TYPE_LABEL[e.q.type]}</span>
          <span class="wrong-preview">${escapeHtml(preview(e.q.question))}</span>
          ${setName(e)}
        </a>${remove}</li>`;
    })
    .join("");
  return `
    <section class="section" id="bookmarks" aria-labelledby="bookmarks-title">
      <h2 id="bookmarks-title">북마크 ${data.bookmarks.length}개</h2>
      ${items ? `<ul class="note-list">${items}</ul>` : '<p class="empty">북마크한 문제가 없어요. 문제를 풀 때 ☆ 를 눌러 보세요.</p>'}
    </section>`;
}

/* ---------- 기록 관리 ---------- */
function dataSection() {
  return `
    <section class="section" id="data" aria-labelledby="data-title">
      <h2 id="data-title">기록 관리</h2>
      <div class="card">
        <p>기록은 <strong>이 브라우저에만</strong> 저장돼요. 브라우저 데이터를 지우거나 다른 기기·브라우저로 옮기면 사라지니,
          가끔 내보내기로 파일을 받아 두세요.</p>
        <div class="actions">
          <button type="button" class="btn primary" data-action="export">기록 내보내기 (JSON 파일)</button>
          <label class="btn file-btn">기록 가져오기
            <input type="file" id="import-file" accept=".json,application/json" />
          </label>
          <button type="button" class="btn danger" data-action="reset-all">전체 초기화</button>
        </div>
        <p class="hint">가져오기를 하면 지금 기록이 파일의 기록으로 <strong>바뀌어요</strong>. 전체 초기화는 테마 설정까지 지워요.</p>
        <p id="data-msg" class="data-msg" role="status"></p>
      </div>
    </section>`;
}

/* ---------- 그리기 ---------- */
function render({ keepFocus } = {}) {
  const data = store.load();
  const focusKey = keepFocus && document.activeElement?.dataset;
  root.innerHTML = `
    <nav class="chips my-toc" aria-label="이 페이지 목차">
      <a class="chip" href="#progress">진행률</a><a class="chip" href="#wrong">오답 노트</a>
      <a class="chip" href="#tags">단원별 정답률</a><a class="chip" href="#bookmarks">북마크</a><a class="chip" href="#data">기록 관리</a>
    </nav>
    ${progressSection(data)}
    ${wrongSection(data)}
    ${tagSection(data)}
    ${bookmarkSection(data)}
    ${dataSection()}`;

  // 다시 그린 뒤 누르던 체크박스·버튼에 포커스를 돌려준다
  if (focusKey) {
    const [name, value] = Object.entries(focusKey)[0] || [];
    if (name) root.querySelector(`[data-${name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${CSS.escape(value)}"]`)?.focus();
  }
}

function message(text, isError = false) {
  const el = document.getElementById("data-msg");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("is-error", isError);
}

function download() {
  const blob = new Blob([JSON.stringify(store.exportData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date(); // 파일 이름은 내 컴퓨터 날짜로 (toISOString 은 UTC 라 하루 어긋날 수 있음)
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  a.download = `examsite-기록-${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message("기록 파일을 내려받았어요.");
}

async function importFile(file) {
  try {
    const data = store.parseImport(await file.text());
    if (!confirm("지금 기록을 이 파일의 기록으로 바꿀까요? 지금 기록은 사라져요.")) return;
    if (!store.replaceAll(data)) throw new Error("브라우저에 저장하지 못했어요. (저장 공간이 막혀 있을 수 있어요)");
    render();
    message("기록을 가져왔어요.");
  } catch (error) {
    message(`가져오지 못했어요: ${error instanceof SyntaxError ? "JSON 파일이 아니에요." : error.message}`, true);
  }
}

function bindEvents() {
  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.wrongFilter) {
      wrongFilter = t.dataset.wrongFilter;
      render({ keepFocus: true });
    } else if (t.dataset.removeWrong) {
      store.removeWrong(t.dataset.removeWrong);
      render();
    } else if (t.dataset.unmark) {
      store.toggleBookmark(t.dataset.unmark);
      render();
    } else if (t.dataset.action === "export") {
      download();
    } else if (t.dataset.action === "reset-all") {
      if (!confirm("모든 기록(풀이, 점수, 오답 노트, 북마크, 설정)을 지울까요? 되돌릴 수 없어요.")) return;
      store.resetAll();
      render();
      message("모든 기록을 지웠어요.");
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.review) {
      store.setReviewed(e.target.dataset.review, e.target.checked);
      render({ keepFocus: true });
    } else if (e.target.id === "import-file" && e.target.files[0]) {
      importFile(e.target.files[0]);
      e.target.value = "";
    }
  });
}

async function main() {
  try {
    const [subjectList, list] = await Promise.all([loadSubjects(), loadExamList()]);
    subjects = subjectList;
    // 세트 하나를 못 읽어도 나머지는 보여 준다
    sets = await Promise.all(
      list.map((entry) =>
        loadExamSet(entry.id)
          .then((s) => ({ entry, questions: s.questions }))
          .catch(() => ({ entry, questions: null }))
      )
    );
    const theories = await Promise.all(subjects.map((s) => loadTheory(s.id).catch(() => null)));
    subjects.forEach((s, i) => {
      tagTitles[s.id] = Object.fromEntries(((theories[i] && theories[i].units) || []).map((u) => [u.id, u.title]));
    });
  } catch (error) {
    renderError(root, error);
    return;
  }
  bindEvents();
  render();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

main();
