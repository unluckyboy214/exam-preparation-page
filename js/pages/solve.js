/* =========================================================
   문제 풀기 (pages/solve.html)
   ?set=세트id&mode=모드  (&q=문항id 로 특정 문항부터 열기)
   - practice : 연습 모드. 답하면 바로 정답·해설을 보여 주고 기록을 저장
   - wrong    : 오답만 다시 풀기. 오답 노트에서 "복습 완료"가 아닌 문항만, 연습 모드 방식으로
   - exam     : 시험 모드. 타이머, 해설 숨김, 제출하면 한꺼번에 채점 → 결과 화면
                (&result=시각 → 그 시험의 결과 화면)
   ?subject=과목&tag=단원id : 단원 모드. 그 태그가 붙은 문항을 모든 세트에서 모아 연습 모드로
                              (문항마다 원래 세트의 기록을 쓴다)
   키보드: ← → 이전/다음, 1~9 보기 선택, B 북마크
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadExamList, loadExamSet, loadTheory } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, md, mdInline, codeBlock, enableCopyButtons, renderError } from "../render.js";
import {
  TYPE_LABEL,
  gradeResponse,
  hasResponse,
  scoreExam,
  summarize,
  totals,
  formatScore,
  preview,
} from "../quiz.js";

const MODES = ["practice", "exam", "wrong"];
const MODE_LABEL = { practice: "연습 모드", exam: "시험 모드", wrong: "오답만 다시 풀기" };

const params = new URLSearchParams(location.search);
const setId = params.get("set");
const tag = params.get("tag");
const tagMode = !setId && !!tag;
const mode = !tagMode && MODES.includes(params.get("mode")) ? params.get("mode") : "practice";

const headEl = document.getElementById("solve-head");
const layoutEl = document.querySelector(".solve-layout");
const panelEl = document.getElementById("qpanel");
const cardEl = document.getElementById("qcard");

let set; // { meta, questions, entry }  (단원 모드에서는 여러 세트의 문항을 모은 것)
const qSet = new WeakMap(); // 문항 → 원래 세트 id (단원 모드)
const sidOf = (q) => qSet.get(q) || setId;
let list = []; // 이번 화면에서 푸는 문항 [{ q, no }]  (no: 세트 안 원래 번호)
let current = 0; // list 안의 위치
let view = "solve"; // solve | intro | result
let saveTimer = null; // 글 입력 자동 저장 지연
let tickTimer = null; // 시험 타이머
let pendingMulti = []; // 연습 모드 복수 선택: 아직 제출하지 않은 선택

const isExam = () => mode === "exam";
const solveUrl = (m, extra = "") => siteUrl(`pages/solve.html?set=${encodeURIComponent(setId)}&mode=${m}${extra}`);
const theoryUrl = () =>
  siteUrl(`pages/theory.html?subject=${encodeURIComponent(params.get("subject") || "")}#${encodeURIComponent(tag)}`);
const STATUS_LABEL = { todo: "안 풂", correct: "정답", wrong: "오답", draft: "작성 중", answered: "답함" };

/* =========================================================
   기록 읽기
   ========================================================= */
// 연습·오답 모드: 저장된 답안 기록
function recordOf(q, data = store.load()) {
  if (q.type === "essay") return (data.essays[sidOf(q)] || {})[q.id] || null;
  return (data.answers[sidOf(q)] || {})[q.id] || null;
}

// 시험 모드: 아직 제출 전인 응답
function responseOf(q) {
  const session = store.getExamSession(setId);
  return session ? session.responses[q.id] || null : null;
}

function statusOf(q, data) {
  if (isExam()) {
    const session = data.examSessions[setId];
    return session && hasResponse(q, session.responses[q.id]) ? "answered" : "todo";
  }
  const r = recordOf(q, data);
  if (!r) return "todo";
  if (q.type === "essay") {
    if (!r.graded) return r.text && r.text.trim() ? "draft" : "todo";
    return (r.checks || []).length === q.points.length && r.checks.every(Boolean) ? "correct" : "wrong";
  }
  return r.correct ? "correct" : "wrong";
}

/* =========================================================
   머리말 · 모드 탭
   ========================================================= */
function modeTabs() {
  return `<nav class="chips mode-tabs" aria-label="풀이 방식">${MODES.map(
    (m) =>
      `<a class="chip" href="${solveUrl(m)}" ${m === mode ? 'aria-current="page"' : ""}>${MODE_LABEL[m]}</a>`
  ).join("")}</nav>`;
}

function renderHead(data) {
  let status = "";
  if (view === "solve" && !isExam()) {
    const counts = { correct: 0, wrong: 0, draft: 0, todo: 0 };
    list.forEach(({ q }) => counts[statusOf(q, data)]++);
    const done = counts.correct + counts.wrong;
    status = `
      <p>채점한 문항 ${done} / ${list.length} · 정답 ${counts.correct} · 오답 ${counts.wrong}</p>
      <div class="progress" aria-hidden="true"><span style="width:${Math.round((done / list.length) * 100)}%"></span></div>`;
  }
  headEl.innerHTML = `
    <div class="page-head solve-title">
      <p class="eyebrow">${
        tagMode
          ? `<a href="${theoryUrl()}">이론으로 돌아가기</a> · 단원 문제`
          : `<a href="${siteUrl("pages/exams.html")}">문제 목록</a> · ${MODE_LABEL[mode]}`
      }</p>
      <h1>${escapeHtml(set.meta.title)}</h1>
      ${status}
    </div>
    ${tagMode ? "" : modeTabs()}
    ${view === "solve" && isExam() ? examBar(data) : ""}`;
  if (view === "solve" && isExam()) updateTimer({ canSubmit: false });
}

/* =========================================================
   번호 패널
   ========================================================= */
function renderPanel(data) {
  const buttons = list
    .map(({ q, no }, i) => {
      const status = statusOf(q, data);
      const marked = data.bookmarks.includes(store.qKey(sidOf(q), q.id));
      const label = `${no}번 ${TYPE_LABEL[q.type]}, ${STATUS_LABEL[status]}${marked ? ", 북마크" : ""}`;
      return `<button type="button" class="qnum is-${status}${marked ? " is-marked" : ""}" data-go="${i}"
        aria-label="${escapeHtml(label)}" ${i === current ? 'aria-current="true"' : ""}>${no}</button>`;
    })
    .join("");

  const legend = isExam()
    ? `<span><span class="dot is-answered"></span>답함</span>`
    : `<span><span class="dot is-correct"></span>정답</span>
       <span><span class="dot is-wrong"></span>오답</span>
       <span><span class="dot is-draft"></span>작성 중</span>`;
  const extra = isExam()
    ? '<button type="button" class="btn small" data-action="quit-exam">시험 그만두기</button>'
    : mode === "practice"
      ? `<button type="button" class="btn small" data-action="reset">${tagMode ? "이 단원 풀이 지우기" : "이 세트 풀이 지우기"}</button>`
      : "";

  panelEl.innerHTML = `
    <p class="qpanel-title">문항</p>
    <div class="qnums">${buttons}</div>
    <p class="qpanel-legend">${legend}<span><span class="star">★</span>북마크</span></p>
    ${extra}`;
}

/* =========================================================
   문항 카드
   ========================================================= */
// 보기 목록. reveal 이면 정답/오답 색을 보여 주고 더 고를 수 없게 한다
function optionList(q, picked, reveal) {
  const answerSet = q.type === "multi" ? q.answer : [q.answer];
  return `<ol class="options">${q.options
    .map((opt, i) => {
      const cls = ["option"];
      if (reveal && answerSet.includes(i)) cls.push("is-answer");
      if (picked.includes(i)) cls.push("is-picked");
      return `<li><button type="button" class="${cls.join(" ")}" data-pick="${i}" aria-pressed="${picked.includes(i)}"
        ${reveal ? 'aria-disabled="true"' : ""}><span class="opt-num">${i + 1}</span><span class="opt-text">${mdInline(opt)}</span></button></li>`;
    })
    .join("")}</ol>`;
}

function feedback(ok, title, body) {
  return `
    <div class="feedback ${ok ? "is-ok" : "is-no"}" role="status" tabindex="-1">
      <p class="feedback-title">${title}</p>
      ${body}
      <button type="button" class="btn small" data-action="retry">다시 풀기</button>
    </div>`;
}

function rubric(q, checks, disabled = false) {
  return `
    <div class="model">
      <p class="model-title">모범 답안</p>
      ${md(q.model)}
    </div>
    <div class="rubric">
      <p class="model-title">채점 기준 — 내 답안에 들어 있으면 체크하세요</p>
      <ul class="checklist">${q.points
        .map(
          (p, i) => `
        <li><label class="check">
          <input type="checkbox" data-check="${i}" data-qid="${escapeHtml(q.id)}" ${checks[i] ? "checked" : ""} ${disabled ? "disabled" : ""} />
          <span>${mdInline(p)}</span>
        </label></li>`
        )
        .join("")}</ul>
    </div>`;
}

const shortHint = '<p class="hint">대소문자, 앞뒤 공백, 따옴표, 끝의 <code>()</code>는 무시하고 채점해요.</p>';

// 연습·오답 모드의 답 영역
function practiceArea(q, rec) {
  if (q.type === "mc" || q.type === "multi") {
    const picked = rec ? [].concat(rec.picked) : q.type === "multi" ? pendingMulti : [];
    let html = q.type === "multi" ? '<p class="hint">정답을 모두 고른 뒤 제출하세요.</p>' : "";
    html += optionList(q, picked, !!rec);
    if (!rec && q.type === "multi") {
      html += `<button type="button" class="btn primary" data-action="submit-multi" ${pendingMulti.length ? "" : "disabled"}>제출</button>`;
    }
    if (rec) {
      const answerText = [].concat(q.answer).map((a) => a + 1).join(", ");
      html += feedback(rec.correct, rec.correct ? "정답이에요!" : `아쉬워요. 정답은 ${answerText}번이에요.`, md(q.explain));
    }
    return html;
  }

  if (q.type === "short") {
    if (!rec) {
      return `
        <form class="short-form" data-form="short">
          <label class="sr-only" for="short-input">답 입력</label>
          <input id="short-input" type="text" autocomplete="off" spellcheck="false" placeholder="답을 입력하세요" />
          <button type="submit" class="btn primary">확인</button>
        </form>${shortHint}`;
    }
    const body = `
      <p>내 답: <code>${escapeHtml(rec.text)}</code> · 정답: ${q.answers.map((a) => `<code>${escapeHtml(a)}</code>`).join(" / ")}</p>
      ${md(q.explain)}`;
    return feedback(rec.correct, rec.correct ? "정답이에요!" : "아쉬워요.", body);
  }

  // 서술형
  const essay = rec || { text: "", checks: [] };
  let html = essayInput(essay.text, "답안을 써 보세요. 쓰는 동안 자동으로 저장돼요.");
  if (!essay.revealed) {
    return html + '<button type="button" class="btn primary" data-action="reveal">모범 답안 보고 채점하기</button>';
  }
  html += rubric(q, essay.checks || []);
  if (!essay.graded) return html + '<button type="button" class="btn primary" data-action="grade">채점 끝내기</button>';
  const met = (essay.checks || []).filter(Boolean).length;
  const all = met === q.points.length;
  return (
    html +
    `<div class="feedback ${all ? "is-ok" : "is-no"}" role="status" tabindex="-1">
      <p class="feedback-title">채점 기준 ${q.points.length}개 중 ${met}개를 충족했어요.</p>
      ${all ? "" : "<p>빠진 기준은 오답 노트에 남겨 둘게요.</p>"}
      <button type="button" class="btn small" data-action="regrade">다시 채점하기</button>
    </div>`
  );
}

function essayInput(text, placeholder) {
  return `
    <label class="essay-label" for="essay-input">내 답안 <span class="save-state" id="save-state"></span></label>
    <textarea id="essay-input" class="essay-input" rows="8" placeholder="${placeholder}">${escapeHtml(text)}</textarea>`;
}

// 시험 모드의 답 영역: 정답·해설 없이 고르기만
function examArea(q, resp) {
  if (q.type === "mc" || q.type === "multi") {
    const picked = resp ? [].concat(resp.picked) : [];
    return (q.type === "multi" ? '<p class="hint">정답을 모두 고르세요.</p>' : "") + optionList(q, picked, false);
  }
  if (q.type === "short") {
    return `
      <label class="sr-only" for="short-input">답 입력</label>
      <input id="short-input" class="exam-short" type="text" autocomplete="off" spellcheck="false"
        placeholder="답을 입력하세요" value="${escapeHtml(resp ? resp.text : "")}" />${shortHint}`;
  }
  return essayInput(resp ? resp.text : "", "답안을 써 보세요. 모범 답안과 채점은 제출한 뒤에 볼 수 있어요.");
}

function renderCard({ focus } = {}) {
  const { q, no } = list[current];
  const data = store.load();
  const marked = data.bookmarks.includes(store.qKey(sidOf(q), q.id));
  const last = current === list.length - 1;

  let nextBtn = '<button type="button" class="btn primary" data-action="next">다음 →</button>';
  if (last) {
    nextBtn = isExam()
      ? '<button type="button" class="btn primary" data-action="submit-exam">제출하기</button>'
      : tagMode
        ? `<a class="btn" href="${theoryUrl()}">이론으로</a>`
        : `<a class="btn" href="${siteUrl("pages/exams.html")}">목록으로</a>`;
  }

  cardEl.innerHTML = `
    <article class="card question">
      <header class="question-head">
        <h2 tabindex="-1"><span class="qbadge">Q${no}</span> <span class="qtype">${TYPE_LABEL[q.type]}</span></h2>
        <button type="button" class="bookmark" data-action="bookmark" aria-pressed="${marked}"
          aria-label="북마크" title="북마크 (B)">${marked ? "★" : "☆"}</button>
      </header>
      <div class="question-text">${md(q.question)}</div>
      ${codeBlock(q.code)}
      <div class="answer-area">${isExam() ? examArea(q, responseOf(q)) : practiceArea(q, recordOf(q, data))}</div>
    </article>
    <nav class="qnav" aria-label="문항 이동">
      <button type="button" class="btn" data-action="prev" ${current === 0 ? "disabled" : ""}>← 이전</button>
      <span class="muted">${current + 1} / ${list.length}</span>
      ${nextBtn}
    </nav>
    <p class="kbd-hint">키보드: <kbd>←</kbd> <kbd>→</kbd> 이동 · <kbd>1</kbd>~<kbd>9</kbd> 보기 선택 · <kbd>B</kbd> 북마크</p>`;

  if (focus === "feedback") cardEl.querySelector(".feedback")?.focus();
  else if (focus === "title") cardEl.querySelector("h2").focus({ preventScroll: true });
  else if (focus) cardEl.querySelector(focus)?.focus();
}

function renderAll(opts) {
  const data = store.load();
  layoutEl.classList.remove("single");
  panelEl.hidden = false;
  renderHead(data);
  renderPanel(data);
  renderCard(opts);
}

/* =========================================================
   이동
   ========================================================= */
function go(index) {
  if (view !== "solve" || index < 0 || index >= list.length) return;
  flushText();
  current = index;
  pendingMulti = [];
  const q = list[current].q;
  if (!isExam()) store.setLastVisit(sidOf(q), q.id);
  const p = new URLSearchParams(location.search);
  p.set("q", tagMode ? store.qKey(sidOf(q), q.id) : q.id);
  history.replaceState(null, "", `?${p}`);
  renderAll({ focus: "title" });
  if (cardEl.getBoundingClientRect().top < 0) cardEl.scrollIntoView({ block: "start" });
}

/* =========================================================
   답하기
   ========================================================= */
function setResponse(qid, resp) {
  const session = store.getExamSession(setId);
  if (!session) return;
  if (resp) session.responses[qid] = resp;
  else delete session.responses[qid];
  store.saveExamSession(setId, session);
}

function pick(i) {
  if (view !== "solve") return;
  const { q } = list[current];
  if (!q.options) return;

  if (isExam()) {
    // 시험 모드: 제출 전까지 몇 번이든 바꿀 수 있다
    if (q.type === "mc") setResponse(q.id, { picked: i });
    else {
      const prev = responseOf(q)?.picked || [];
      const next = prev.includes(i) ? prev.filter((v) => v !== i) : [...prev, i].sort();
      setResponse(q.id, next.length ? { picked: next } : null);
    }
    renderAll({ focus: `[data-pick="${i}"]` });
    return;
  }

  if (recordOf(q)) return; // 이미 답함 → "다시 풀기"로만 바꿀 수 있음
  if (q.type === "mc") {
    store.saveAnswer(sidOf(q), q.id, { picked: i, correct: i === q.answer });
    renderAll({ focus: "feedback" });
  } else {
    pendingMulti = pendingMulti.includes(i) ? pendingMulti.filter((v) => v !== i) : [...pendingMulti, i];
    renderCard({ focus: `[data-pick="${i}"]` });
  }
}

// 입력 중인 글(주관식·서술형)을 바로 저장
function flushText() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveText();
}

function saveText() {
  const q = list[current]?.q;
  const input = document.getElementById("essay-input") || (isExam() && document.getElementById("short-input"));
  if (!q || !input) return;
  if (isExam()) setResponse(q.id, input.value.trim() ? { text: input.value } : null);
  else store.saveEssay(sidOf(q), q.id, { text: input.value });
}

/* =========================================================
   시험 모드
   ========================================================= */
function remainingMs(session) {
  return session.deadline - Date.now();
}

function formatTime(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function examBar(data) {
  const session = data.examSessions[setId];
  const answered = list.filter(({ q }) => hasResponse(q, session?.responses[q.id])).length;
  return `
    <div class="exam-bar">
      <p class="timer" role="timer" aria-live="off"><span class="bar-label">남은 시간 </span><strong id="timer">--:--</strong></p>
      <p class="muted"><span class="bar-label">답한 문항 </span>${answered} / ${list.length}</p>
      <button type="button" class="btn primary" data-action="submit-exam">제출하기</button>
    </div>`;
}

// canSubmit: 타이머에서 부를 때만 시간 초과 시 자동 제출 (그리는 중에 화면이 바뀌지 않게)
function updateTimer({ canSubmit = true } = {}) {
  const session = store.getExamSession(setId);
  const el = document.getElementById("timer");
  if (!session || !el) return;
  const left = remainingMs(session);
  el.textContent = formatTime(left);
  el.closest(".timer").classList.toggle("is-urgent", left <= 5 * 60 * 1000);
  if (left <= 0 && canSubmit) submitExam({ auto: true });
}

function startTicking() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => updateTimer(), 1000);
}

function startExam() {
  const now = Date.now();
  store.saveExamSession(setId, { startedAt: now, deadline: now + set.meta.timeLimitMin * 60 * 1000, responses: {} });
  history.replaceState(null, "", `?set=${encodeURIComponent(setId)}&mode=exam`);
  view = "solve";
  current = 0;
  renderAll({ focus: "title" });
  startTicking();
}

function submitExam({ auto = false } = {}) {
  if (view !== "solve") return;
  flushText();
  const session = store.getExamSession(setId);
  if (!session) return;

  if (!auto) {
    const left = list.filter(({ q }) => !hasResponse(q, session.responses[q.id])).length;
    const msg = left ? `아직 답하지 않은 문항이 ${left}개 있어요. 제출할까요?` : "제출하고 채점할까요?";
    if (!confirm(msg)) return;
  }
  clearInterval(tickTimer);

  const questions = set.questions;
  const scored = scoreExam(questions, session.responses);

  // 풀이 기록·오답 노트에도 반영 (연습 모드와 같은 저장소)
  for (const q of questions) {
    const resp = session.responses[q.id];
    if (q.type === "essay") {
      if (hasResponse(q, resp)) {
        store.saveEssay(sidOf(q), q.id, { text: resp.text, revealed: true, graded: false, checks: q.points.map(() => false) });
      } else store.markWrong(sidOf(q), q.id);
    } else if (hasResponse(q, resp)) {
      store.saveAnswer(sidOf(q), q.id, { ...resp, correct: gradeResponse(q, resp) });
    } else store.markWrong(sidOf(q), q.id);
  }

  const at = Date.now();
  store.addResult(setId, {
    score: scored.score,
    total: scored.total,
    mode: "exam",
    at,
    detail: scored.detail,
    pending: scored.pending,
    usedSec: Math.round((Math.min(at, session.deadline) - session.startedAt) / 1000),
    auto,
  });
  store.clearExamSession(setId);
  history.replaceState(null, "", `?set=${encodeURIComponent(setId)}&mode=exam&result=${at}`);
  showResult(at, { auto });
}

function quitExam() {
  if (!confirm("시험을 그만둘까요? 지금까지 고른 답은 저장되지 않아요.")) return;
  clearInterval(tickTimer);
  store.clearExamSession(setId);
  showIntro();
}

/* ---------- 시험 시작 화면 ---------- */
function singleView(html) {
  layoutEl.classList.add("single");
  panelEl.hidden = true;
  panelEl.innerHTML = "";
  renderHead(store.load());
  cardEl.innerHTML = html;
}

function showIntro() {
  view = "intro";
  const counts = set.entry.counts || {};
  const composition = Object.keys(TYPE_LABEL)
    .filter((t) => counts[t])
    .map((t) => `${TYPE_LABEL[t]} ${counts[t]}`)
    .join(" · ");
  const results = store.load().results[setId] || [];
  const lastExam = [...results].reverse().find((r) => r.mode === "exam");

  singleView(`
    <article class="card intro">
      <h2>시험 보기 전에</h2>
      <ul>
        <li>${set.questions.length}문항 (${escapeHtml(composition)}) · 제한 시간 <strong>${set.meta.timeLimitMin}분</strong></li>
        <li>정답과 해설은 <strong>제출한 뒤에</strong> 한꺼번에 보여 줘요.</li>
        <li>시간이 다 되면 <strong>자동으로 제출</strong>돼요.</li>
        <li>새로고침하거나 창을 닫아도 남은 시간 안에서 이어서 풀 수 있어요.</li>
        <li>서술형은 제출한 뒤 모범 답안을 보고 직접 채점해요.</li>
      </ul>
      <div class="actions">
        <button type="button" class="btn primary" data-action="start-exam">시험 시작</button>
        ${
          lastExam
            ? `<a class="btn" href="${solveUrl("exam", `&result=${lastExam.at}`)}">지난 결과 보기 (${formatScore(lastExam.score)} / ${lastExam.total}점)</a>`
            : ""
        }
      </div>
    </article>`);
  cardEl.querySelector("[data-action='start-exam']").focus();
}

/* ---------- 결과 화면 ---------- */
let tagTitles = {};

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}분 ${s}초` : `${s}초`;
}

function bar(rate) {
  return `<div class="progress" aria-hidden="true"><span style="width:${Math.round(rate * 100)}%"></span></div>`;
}

function showResult(at, { auto = false } = {}) {
  view = "result";
  const result = store.getResult(setId, at);
  if (!result) {
    singleView(`<div class="note"><p>시험 결과를 찾지 못했어요. 기록이 지워졌을 수 있어요.</p>
      <p><a href="${solveUrl("exam")}">시험 모드 처음으로</a></p></div>`);
    return;
  }
  const questions = set.questions;
  const { byType, byTag } = summarize(questions, result.detail, tagTitles);
  const rate = result.total ? result.score / result.total : 0;
  const pending = questions.filter((q) => result.pending.includes(q.id));
  const wrongs = questions
    .map((q, i) => ({ q, no: i + 1 }))
    .filter(({ q }) => (result.detail[q.id] ?? 0) < 1 && !result.pending.includes(q.id));
  const when = new Date(result.at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

  const typeRows = byType
    .map(
      (t) => `<tr><th scope="row">${t.label}</th><td>${formatScore(t.score)} / ${t.count}</td><td>${bar(t.score / t.count)}</td></tr>`
    )
    .join("");
  const tagRows = byTag
    .map(
      (t) => `<tr>
        <th scope="row"><a href="${siteUrl(`pages/theory.html?subject=${encodeURIComponent(set.meta.subject)}#${encodeURIComponent(t.tag)}`)}">${escapeHtml(t.title)}</a></th>
        <td>${Math.round(t.rate * 100)}% <span class="muted">(${formatScore(t.score)}/${t.count})</span></td>
        <td>${bar(t.rate)}</td></tr>`
    )
    .join("");

  const pendingHtml = pending
    .map((q) => {
      const essay = (store.load().essays[sidOf(q)] || {})[q.id] || { text: "", checks: [] };
      const no = questions.indexOf(q) + 1;
      return `
      <article class="card pending-essay" data-essay="${escapeHtml(q.id)}">
        <h3><span class="qbadge">Q${no}</span> 서술형</h3>
        <div class="question-text">${md(q.question)}</div>
        ${codeBlock(q.code)}
        <div class="my-answer"><p class="model-title">내 답안</p>${md(essay.text) || '<p class="muted">(비어 있음)</p>'}</div>
        ${rubric(q, essay.checks || [])}
        <button type="button" class="btn primary" data-action="grade-pending" data-qid="${escapeHtml(q.id)}">채점 끝내기</button>
      </article>`;
    })
    .join("");

  const wrongHtml = wrongs
    .map(
      ({ q, no }) => `<li><a href="${solveUrl("practice", `&q=${encodeURIComponent(q.id)}`)}">
        <span class="qbadge">Q${no}</span> <span class="qtype">${TYPE_LABEL[q.type]}</span>
        <span class="wrong-preview">${escapeHtml(preview(q.question))}</span></a></li>`
    )
    .join("");

  singleView(`
    <section class="card result-hero" aria-labelledby="result-title">
      <h2 id="result-title" tabindex="-1">시험 결과</h2>
      ${auto ? '<p class="warn-text">시간이 다 되어 자동으로 제출했어요.</p>' : ""}
      <p class="score-big"><strong>${formatScore(result.score)}</strong> / ${result.total}점 <span class="muted">(${Math.round(rate * 100)}%)</span></p>
      <p class="muted">${when} · 걸린 시간 ${formatDuration(result.usedSec || 0)}</p>
      ${pending.length ? `<p class="note-text">서술형 ${pending.length}문항은 아래에서 직접 채점하면 점수에 더해져요.</p>` : ""}
      <div class="actions">
        ${wrongs.length ? `<a class="btn primary" href="${solveUrl("wrong")}">오답만 다시 풀기</a>` : ""}
        <a class="btn" href="${solveUrl("exam")}">다시 시험 보기</a>
        <a class="btn" href="${siteUrl("pages/exams.html")}">목록으로</a>
      </div>
    </section>

    ${pending.length ? `<section class="section"><h2>서술형 채점</h2>${pendingHtml}</section>` : ""}

    <section class="section">
      <h2>유형별 점수</h2>
      <div class="table-wrap"><table class="stat-table"><tbody>${typeRows}</tbody></table></div>
    </section>

    <section class="section">
      <h2>단원(태그)별 정답률 <span class="muted small">약한 단원부터</span></h2>
      <div class="table-wrap"><table class="stat-table"><tbody>${tagRows}</tbody></table></div>
    </section>

    <section class="section">
      <h2>틀린 문제 ${wrongs.length}개</h2>
      ${wrongs.length ? `<ol class="wrong-list">${wrongHtml}</ol>` : '<p class="empty">틀린 문제가 없어요. 잘했어요!</p>'}
    </section>`);
  cardEl.querySelector("#result-title").focus();
}

function gradePending(qid) {
  const q = set.questions.find((x) => x.id === qid);
  const box = cardEl.querySelector(`[data-essay="${CSS.escape(qid)}"]`);
  if (!q || !box) return;
  const checks = [...box.querySelectorAll("[data-check]")].map((c) => c.checked);
  store.saveEssay(setId, qid, { checks, graded: true });
  const at = Number(new URLSearchParams(location.search).get("result"));
  store.updateResult(setId, at, (r) => {
    r.detail[qid] = checks.filter(Boolean).length / q.points.length;
    r.pending = r.pending.filter((id) => id !== qid);
    Object.assign(r, totals(set.questions, r.detail));
  });
  showResult(at);
}

/* =========================================================
   버튼 동작
   ========================================================= */
function handleAction(action, btn) {
  const q = list[current]?.q;
  switch (action) {
    case "prev":
      return go(current - 1);
    case "next":
      return go(current + 1);
    case "bookmark":
      if (view !== "solve") return;
      store.toggleBookmark(store.qKey(sidOf(q), q.id));
      return renderAll({ focus: ".bookmark" });
    case "retry":
      store.clearAnswer(sidOf(q), q.id);
      pendingMulti = [];
      return renderAll({ focus: ".option, #short-input, #essay-input" });
    case "submit-multi":
      store.saveAnswer(sidOf(q), q.id, { picked: [...pendingMulti].sort(), correct: gradeResponse(q, { picked: pendingMulti }) });
      pendingMulti = [];
      return renderAll({ focus: "feedback" });
    case "reveal":
      flushText();
      store.saveEssay(sidOf(q), q.id, { revealed: true, checks: q.points.map(() => false) });
      renderAll();
      return cardEl.querySelector(".model")?.scrollIntoView({ block: "nearest" });
    case "grade":
      store.saveEssay(sidOf(q), q.id, { graded: true });
      return renderAll({ focus: "feedback" });
    case "regrade":
      store.saveEssay(sidOf(q), q.id, { revealed: false, graded: false, checks: [] });
      return renderAll({ focus: "#essay-input" });
    case "reset":
      if (!confirm(`${tagMode ? "이 단원 문항의" : "이 세트의"} 풀이 기록을 지울까요? (오답 노트, 북마크, 점수 기록은 남아요)`)) return;
      if (tagMode) list.forEach((item) => store.clearAnswer(sidOf(item.q), item.q.id));
      else store.resetSet(setId);
      return renderAll();
    case "start-exam":
      return startExam();
    case "submit-exam":
      return submitExam();
    case "quit-exam":
      return quitExam();
    case "grade-pending":
      return gradePending(btn.dataset.qid);
  }
}

/* =========================================================
   이벤트
   ========================================================= */
function bindEvents() {
  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) return go(Number(goBtn.dataset.go));
    const pickBtn = e.target.closest("[data-pick]");
    if (pickBtn) return pick(Number(pickBtn.dataset.pick));
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn && !actionBtn.disabled) handleAction(actionBtn.dataset.action, actionBtn);
  });

  // 연습 모드 주관식 제출
  cardEl.addEventListener("submit", (e) => {
    if (e.target.dataset.form !== "short") return;
    e.preventDefault();
    const { q } = list[current];
    const text = e.target.querySelector("input").value;
    if (!text.trim()) return;
    store.saveAnswer(sidOf(q), q.id, { text: text.trim(), correct: gradeResponse(q, { text }) });
    renderAll({ focus: "feedback" });
  });

  // 글 입력 자동 저장 (서술형, 시험 모드 주관식)
  cardEl.addEventListener("input", (e) => {
    if (e.target.id !== "essay-input" && !(isExam() && e.target.id === "short-input")) return;
    const state = document.getElementById("save-state");
    if (state) state.textContent = "저장 중…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveText();
      if (state) state.textContent = "저장됨";
      const data = store.load();
      renderHead(data);
      renderPanel(data);
    }, 400);
  });

  // 연습 모드 서술형 채점 기준 체크
  cardEl.addEventListener("change", (e) => {
    if (view !== "solve" || !e.target.matches("[data-check]")) return;
    const { q } = list[current];
    const checks = [...cardEl.querySelectorAll("[data-check]")].map((c) => c.checked);
    store.saveEssay(sidOf(q), q.id, { checks });
    const data = store.load();
    renderHead(data);
    renderPanel(data);
    if (recordOf(q, data)?.graded) renderCard({ focus: `[data-check="${e.target.dataset.check}"]` });
  });

  document.addEventListener("keydown", (e) => {
    if (view !== "solve" || e.altKey || e.ctrlKey || e.metaKey) return;
    // 글자를 입력하는 중에는 단축키를 쓰지 않는다
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const { q } = list[current];
    if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "b" || e.key === "B") handleAction("bookmark");
    else if (/^[1-9]$/.test(e.key) && q.options && Number(e.key) <= q.options.length) pick(Number(e.key) - 1);
    else return;
    e.preventDefault();
  });

  // 페이지를 떠날 때 쓰던 글 저장
  window.addEventListener("pagehide", flushText);
}

/* =========================================================
   시작
   ========================================================= */
// 오답만 다시 풀기: 오답 노트에서 "복습 완료"가 아닌 문항.
// 지금 기록이 오답이면 다시 풀 수 있게 비운다 (서술형은 쓴 글은 남기고 채점만 비움)
function prepareWrongList() {
  const data = store.load();
  const items = set.questions
    .map((q, i) => ({ q, no: i + 1 }))
    .filter(({ q }) => {
      const w = data.wrong[store.qKey(sidOf(q), q.id)];
      return w && !w.reviewed;
    });
  for (const { q } of items) {
    if (statusOf(q, data) !== "wrong") continue;
    if (q.type === "essay") store.saveEssay(sidOf(q), q.id, { revealed: false, graded: false, checks: [] });
    else store.clearAnswer(sidOf(q), q.id);
  }
  return items;
}

// 단원 모드: 과목의 모든 세트에서 태그가 붙은 문항을 모은다
async function loadTagSet() {
  const subject = params.get("subject");
  const entries = (await loadExamList()).filter((e) => !subject || e.subject === subject);
  const sets = await Promise.all(entries.map((e) => loadExamSet(e.id)));
  const questions = [];
  for (const s of sets) {
    for (const q of s.questions) {
      if (!(q.tags || []).includes(tag)) continue;
      qSet.set(q, s.entry.id);
      questions.push(q);
    }
  }
  const theory = subject ? await loadTheory(subject).catch(() => null) : null;
  const unit = theory && theory.units.find((u) => u.id === tag);
  return { meta: { title: `${unit ? unit.title : tag} 문제`, subject }, questions, entry: {} };
}

async function main() {
  if (!setId && !tagMode) {
    headEl.innerHTML = `<div class="page-head"><h1>문제 풀기</h1></div>
      <div class="note"><p>풀 문제 세트를 고르지 않았어요. <a href="${siteUrl("pages/exams.html")}">문제 목록</a>에서 골라 주세요.</p></div>`;
    return;
  }
  try {
    set = tagMode ? await loadTagSet() : await loadExamSet(setId);
  } catch (error) {
    renderError(headEl, error);
    return;
  }
  document.title = `${set.meta.title} · ${MODE_LABEL[mode]} · SSAFY 과목평가 대비`;
  enableCopyButtons();
  bindEvents();

  if (isExam()) {
    // 단원 이름(태그 제목)은 결과 화면에서만 쓰므로 실패해도 넘어간다
    tagTitles = await loadTheory(set.meta.subject)
      .then((t) => Object.fromEntries((t.units || []).map((u) => [u.id, u.title])))
      .catch(() => ({}));
    list = set.questions.map((q, i) => ({ q, no: i + 1 }));

    const resultAt = Number(params.get("result"));
    const session = store.getExamSession(setId);
    if (resultAt) return showResult(resultAt);
    if (!session) return showIntro();
    // 진행 중인 시험 이어서 (시간이 이미 지났으면 바로 제출)
    view = "solve";
    const found = list.findIndex(({ q }) => q.id === params.get("q"));
    current = found >= 0 ? found : 0;
    if (remainingMs(session) <= 0) return submitExam({ auto: true });
    renderAll();
    startTicking();
    return;
  }

  list = mode === "wrong" ? prepareWrongList() : set.questions.map((q, i) => ({ q, no: i + 1 }));
  if (list.length === 0 && tagMode) {
    view = "empty";
    singleView(`<div class="empty"><p>이 단원에 붙은 문제가 아직 없어요.</p>
      <p><a href="${theoryUrl()}">이론으로 돌아가기</a></p></div>`);
    return;
  }
  if (list.length === 0) {
    view = "empty";
    singleView(`<div class="empty">
      <p>다시 풀 오답이 없어요.</p>
      <p><a href="${solveUrl("practice")}">연습 모드로 풀기</a> · <a href="${solveUrl("exam")}">시험 보기</a></p></div>`);
    return;
  }

  // 시작 문항: ?q= → 이 세트에서 마지막으로 본 문항 → 첫 문항
  const last = store.load().lastVisit;
  const startId = params.get("q") || (last && last.set === setId ? last.q : null);
  const found = list.findIndex(({ q }) => (tagMode ? store.qKey(sidOf(q), q.id) : q.id) === startId);
  current = found >= 0 ? found : 0;
  store.setLastVisit(sidOf(list[current].q), list[current].q.id);
  renderAll();
}

main();
