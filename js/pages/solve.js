/* =========================================================
   문제 풀기 (pages/solve.html)
   - ?set=세트id&mode=practice  (시험 모드·오답만 풀기는 M4)
   - &q=문항id 로 특정 문항부터 열기
   - 연습 모드: 답하면 바로 정답·해설을 보여 주고 기록을 저장
   - 키보드: ← → 이전/다음, 1~9 보기 선택, B 북마크
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadExamSet } from "../data.js";
import * as store from "../store.js";
import { escapeHtml, md, mdInline, codeBlock, enableCopyButtons, renderError } from "../render.js";

const TYPE_LABEL = { mc: "객관식", multi: "복수 선택", short: "주관식", essay: "서술형" };

const params = new URLSearchParams(location.search);
const setId = params.get("set");
const requestedMode = params.get("mode") || "practice";

const headEl = document.getElementById("solve-head");
const panelEl = document.getElementById("qpanel");
const cardEl = document.getElementById("qcard");

let set; // { meta, questions, entry }
let current = 0; // 지금 보고 있는 문항 번호(0부터)
let essayTimer = null;

/* ---------- 채점 ---------- */
// 주관식: 대소문자·앞뒤 공백·따옴표·끝의 () 무시
function normalizeShort(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\(\s*\)$/, "")
    .trim();
}

function gradeShort(q, text) {
  const mine = normalizeShort(text);
  return mine !== "" && q.answers.some((a) => normalizeShort(a) === mine);
}

function gradeMulti(q, picked) {
  const want = [...q.answer].sort();
  const got = [...picked].sort();
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

/* ---------- 기록 읽기 ---------- */
function recordOf(q, data = store.load()) {
  if (q.type === "essay") return (data.essays[setId] || {})[q.id] || null;
  return (data.answers[setId] || {})[q.id] || null;
}

// todo(안 풂) / correct / wrong / draft(서술형 작성 중)
function statusOf(q, data) {
  const r = recordOf(q, data);
  if (!r) return "todo";
  if (q.type === "essay") {
    if (!r.graded) return r.text && r.text.trim() ? "draft" : "todo";
    return (r.checks || []).length === q.points.length && r.checks.every(Boolean) ? "correct" : "wrong";
  }
  return r.correct ? "correct" : "wrong";
}

const STATUS_LABEL = { todo: "안 풂", correct: "정답", wrong: "오답", draft: "작성 중" };

/* ---------- 머리말: 제목, 진행 상황 ---------- */
function renderHead(data) {
  const qs = set.questions;
  const counts = { correct: 0, wrong: 0, draft: 0, todo: 0 };
  qs.forEach((q) => counts[statusOf(q, data)]++);
  const done = counts.correct + counts.wrong;

  headEl.innerHTML = `
    <div class="page-head solve-title">
      <p class="eyebrow"><a href="${siteUrl("pages/exams.html")}">문제 목록</a> · 연습 모드</p>
      <h1>${escapeHtml(set.meta.title)}</h1>
      <p>채점한 문항 ${done} / ${qs.length} · 정답 ${counts.correct} · 오답 ${counts.wrong}</p>
    </div>
    ${
      requestedMode !== "practice"
        ? '<div class="note"><p>시험 모드와 오답만 풀기는 아직 준비 중이에요. 지금은 연습 모드로 열었어요.</p></div>'
        : ""
    }
    <div class="progress" aria-hidden="true"><span style="width:${Math.round((done / qs.length) * 100)}%"></span></div>`;
}

/* ---------- 번호 패널 ---------- */
function renderPanel(data) {
  const buttons = set.questions
    .map((q, i) => {
      const status = statusOf(q, data);
      const marked = data.bookmarks.includes(store.qKey(setId, q.id));
      const label = `${i + 1}번 ${TYPE_LABEL[q.type]}, ${STATUS_LABEL[status]}${marked ? ", 북마크" : ""}`;
      return `<button type="button" class="qnum is-${status}${marked ? " is-marked" : ""}" data-go="${i}"
        aria-label="${escapeHtml(label)}" ${i === current ? 'aria-current="true"' : ""}>${i + 1}</button>`;
    })
    .join("");

  panelEl.innerHTML = `
    <p class="qpanel-title">문항</p>
    <div class="qnums">${buttons}</div>
    <p class="qpanel-legend">
      <span><span class="dot is-correct"></span>정답</span>
      <span><span class="dot is-wrong"></span>오답</span>
      <span><span class="dot is-draft"></span>작성 중</span>
      <span><span class="star">★</span>북마크</span>
    </p>
    <button type="button" class="btn small" data-action="reset">이 세트 풀이 지우기</button>`;
}

/* ---------- 문항 카드 ---------- */
function optionList(q, rec) {
  const answered = !!rec;
  const picked = q.type === "multi" ? (answered ? rec.picked : pendingMulti) : answered ? [rec.picked] : [];
  const correctSet = q.type === "multi" ? q.answer : [q.answer];

  return `<ol class="options">${q.options
    .map((opt, i) => {
      const cls = ["option"];
      if (answered && correctSet.includes(i)) cls.push("is-answer");
      if (picked.includes(i)) cls.push("is-picked");
      const pressed = q.type === "multi" || answered ? ` aria-pressed="${picked.includes(i)}"` : "";
      return `<li><button type="button" class="${cls.join(" ")}" data-pick="${i}"${pressed}
        ${answered ? 'aria-disabled="true"' : ""}><span class="opt-num">${i + 1}</span><span class="opt-text">${mdInline(opt)}</span></button></li>`;
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

// 복수 선택에서 아직 제출하지 않은 선택 (문항을 옮기면 초기화)
let pendingMulti = [];

function answerArea(q, rec) {
  if (q.type === "mc") {
    const fb = rec
      ? feedback(
          rec.correct,
          rec.correct ? "정답이에요!" : `아쉬워요. 정답은 ${q.answer + 1}번이에요.`,
          md(q.explain)
        )
      : "";
    return optionList(q, rec) + fb;
  }

  if (q.type === "multi") {
    const submit = rec
      ? ""
      : `<button type="button" class="btn primary" data-action="submit-multi" ${pendingMulti.length ? "" : "disabled"}>제출</button>`;
    const fb = rec
      ? feedback(
          rec.correct,
          rec.correct ? "정답이에요!" : `아쉬워요. 정답은 ${q.answer.map((a) => a + 1).join(", ")}번이에요.`,
          md(q.explain)
        )
      : "";
    return `<p class="hint">정답을 모두 고른 뒤 제출하세요.</p>${optionList(q, rec)}${submit}${fb}`;
  }

  if (q.type === "short") {
    if (!rec) {
      return `
        <form class="short-form" data-form="short">
          <label class="sr-only" for="short-input">답 입력</label>
          <input id="short-input" type="text" autocomplete="off" spellcheck="false" placeholder="답을 입력하세요" />
          <button type="submit" class="btn primary">확인</button>
        </form>
        <p class="hint">대소문자, 앞뒤 공백, 따옴표, 끝의 <code>()</code>는 무시하고 채점해요.</p>`;
    }
    const body = `
      <p>내 답: <code>${escapeHtml(rec.text)}</code> · 정답: ${q.answers.map((a) => `<code>${escapeHtml(a)}</code>`).join(" / ")}</p>
      ${md(q.explain)}`;
    return feedback(rec.correct, rec.correct ? "정답이에요!" : "아쉬워요.", body);
  }

  // 서술형
  const essay = rec || { text: "", checks: [] };
  let html = `
    <label class="essay-label" for="essay-input">내 답안 <span class="save-state" id="save-state"></span></label>
    <textarea id="essay-input" class="essay-input" rows="8" placeholder="답안을 써 보세요. 쓰는 동안 자동으로 저장돼요.">${escapeHtml(essay.text)}</textarea>`;

  if (!essay.revealed) {
    return html + `<button type="button" class="btn primary" data-action="reveal">모범 답안 보고 채점하기</button>`;
  }

  const checks = q.points
    .map(
      (p, i) => `
      <li><label class="check">
        <input type="checkbox" data-check="${i}" ${essay.checks[i] ? "checked" : ""} />
        <span>${mdInline(p)}</span>
      </label></li>`
    )
    .join("");
  const met = (essay.checks || []).filter(Boolean).length;

  html += `
    <div class="model">
      <p class="model-title">모범 답안</p>
      ${md(q.model)}
    </div>
    <div class="rubric">
      <p class="model-title">채점 기준 — 내 답안에 들어 있으면 체크하세요</p>
      <ul class="checklist">${checks}</ul>
    </div>`;

  if (!essay.graded) {
    return html + `<button type="button" class="btn primary" data-action="grade">채점 끝내기</button>`;
  }
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

function renderCard({ focus } = {}) {
  const q = set.questions[current];
  const data = store.load();
  const rec = recordOf(q, data);
  const marked = data.bookmarks.includes(store.qKey(setId, q.id));
  const last = current === set.questions.length - 1;

  cardEl.innerHTML = `
    <article class="card question">
      <header class="question-head">
        <h2 tabindex="-1"><span class="qbadge">Q${current + 1}</span> <span class="qtype">${TYPE_LABEL[q.type]}</span></h2>
        <button type="button" class="bookmark" data-action="bookmark" aria-pressed="${marked}"
          aria-label="북마크" title="북마크 (B)">${marked ? "★" : "☆"}</button>
      </header>
      <div class="question-text">${md(q.question)}</div>
      ${codeBlock(q.code)}
      <div class="answer-area">${answerArea(q, rec)}</div>
    </article>
    <nav class="qnav" aria-label="문항 이동">
      <button type="button" class="btn" data-action="prev" ${current === 0 ? "disabled" : ""}>← 이전</button>
      <span class="muted">${current + 1} / ${set.questions.length}</span>
      ${
        last
          ? `<a class="btn" href="${siteUrl("pages/exams.html")}">목록으로</a>`
          : '<button type="button" class="btn primary" data-action="next">다음 →</button>'
      }
    </nav>
    <p class="kbd-hint">키보드: <kbd>←</kbd> <kbd>→</kbd> 이동 · <kbd>1</kbd>~<kbd>9</kbd> 보기 선택 · <kbd>B</kbd> 북마크</p>`;

  if (focus === "feedback") cardEl.querySelector(".feedback")?.focus();
  else if (focus === "title") cardEl.querySelector("h2").focus({ preventScroll: true });
}

function renderAll(opts) {
  const data = store.load();
  renderHead(data);
  renderPanel(data);
  renderCard(opts);
}

/* ---------- 이동 ---------- */
function go(index) {
  if (index < 0 || index >= set.questions.length) return;
  flushEssay();
  current = index;
  pendingMulti = [];
  const q = set.questions[current];
  store.setLastVisit(setId, q.id);
  const p = new URLSearchParams(location.search);
  p.set("q", q.id);
  history.replaceState(null, "", `?${p}`);
  renderAll({ focus: "title" });
  // 문항 머리가 화면 위로 지나갔으면 다시 보이게
  const top = cardEl.getBoundingClientRect().top;
  if (top < 0) cardEl.scrollIntoView({ block: "start" });
}

/* ---------- 답하기 ---------- */
function pick(i) {
  const q = set.questions[current];
  if (recordOf(q)) return; // 이미 답함 → "다시 풀기"로만 바꿀 수 있음
  if (q.type === "mc") {
    store.saveAnswer(setId, q.id, { picked: i, correct: i === q.answer });
    renderAll({ focus: "feedback" });
  } else if (q.type === "multi") {
    pendingMulti = pendingMulti.includes(i) ? pendingMulti.filter((v) => v !== i) : [...pendingMulti, i];
    renderCard();
    cardEl.querySelector(`[data-pick="${i}"]`)?.focus();
  }
}

function flushEssay() {
  if (!essayTimer) return;
  clearTimeout(essayTimer);
  essayTimer = null;
  const input = document.getElementById("essay-input");
  if (input) store.saveEssay(setId, set.questions[current].id, { text: input.value });
}

function handleAction(action) {
  const q = set.questions[current];
  switch (action) {
    case "prev":
      return go(current - 1);
    case "next":
      return go(current + 1);
    case "bookmark": {
      store.toggleBookmark(store.qKey(setId, q.id));
      renderAll();
      return cardEl.querySelector(".bookmark").focus();
    }
    case "retry":
      store.clearAnswer(setId, q.id);
      pendingMulti = [];
      renderAll();
      return cardEl.querySelector(".option, #short-input, #essay-input")?.focus();
    case "submit-multi":
      store.saveAnswer(setId, q.id, { picked: [...pendingMulti].sort(), correct: gradeMulti(q, pendingMulti) });
      pendingMulti = [];
      return renderAll({ focus: "feedback" });
    case "reveal":
      flushEssay();
      store.saveEssay(setId, q.id, { revealed: true, checks: q.points.map(() => false) });
      renderAll();
      return cardEl.querySelector(".model")?.scrollIntoView({ block: "nearest" });
    case "grade":
      store.saveEssay(setId, q.id, { graded: true });
      return renderAll({ focus: "feedback" });
    case "regrade":
      store.saveEssay(setId, q.id, { revealed: false, graded: false, checks: [] });
      renderAll();
      return document.getElementById("essay-input")?.focus();
    case "reset":
      if (!confirm("이 세트의 풀이 기록을 지울까요? (오답 노트와 북마크는 남아요)")) return;
      store.resetSet(setId);
      return renderAll();
  }
}

/* ---------- 이벤트 ---------- */
function bindEvents() {
  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) return go(Number(goBtn.dataset.go));
    const pickBtn = e.target.closest("[data-pick]");
    if (pickBtn) return pick(Number(pickBtn.dataset.pick));
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn && !actionBtn.disabled) handleAction(actionBtn.dataset.action);
  });

  cardEl.addEventListener("submit", (e) => {
    if (e.target.dataset.form !== "short") return;
    e.preventDefault();
    const q = set.questions[current];
    const text = e.target.querySelector("input").value;
    if (!text.trim()) return;
    store.saveAnswer(setId, q.id, { text: text.trim(), correct: gradeShort(q, text) });
    renderAll({ focus: "feedback" });
  });

  cardEl.addEventListener("input", (e) => {
    if (e.target.id !== "essay-input") return;
    const state = document.getElementById("save-state");
    if (state) state.textContent = "저장 중…";
    clearTimeout(essayTimer);
    essayTimer = setTimeout(() => {
      essayTimer = null;
      store.saveEssay(setId, set.questions[current].id, { text: e.target.value });
      if (state) state.textContent = "저장됨";
      const data = store.load();
      renderHead(data);
      renderPanel(data);
    }, 500);
  });

  cardEl.addEventListener("change", (e) => {
    if (!e.target.matches("[data-check]")) return;
    const q = set.questions[current];
    const checks = [...cardEl.querySelectorAll("[data-check]")].map((c) => c.checked);
    store.saveEssay(setId, q.id, { checks });
    const data = store.load();
    renderHead(data);
    renderPanel(data);
    // 채점이 끝난 뒤 체크를 바꾸면 결과 문구도 갱신
    if (recordOf(q, data)?.graded) {
      const idx = Number(e.target.dataset.check);
      renderCard();
      cardEl.querySelector(`[data-check="${idx}"]`)?.focus();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // 글자를 입력하는 중에는 단축키를 쓰지 않는다
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const q = set.questions[current];
    if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "b" || e.key === "B") handleAction("bookmark");
    else if (/^[1-9]$/.test(e.key) && q.options && Number(e.key) <= q.options.length) pick(Number(e.key) - 1);
    else return;
    e.preventDefault();
  });

  // 페이지를 떠날 때 쓰던 서술형 답안 저장
  window.addEventListener("pagehide", flushEssay);
}

/* ---------- 시작 ---------- */
async function main() {
  if (!setId) {
    headEl.innerHTML = `<div class="page-head"><h1>문제 풀기</h1></div>
      <div class="note"><p>풀 문제 세트를 고르지 않았어요. <a href="${siteUrl("pages/exams.html")}">문제 목록</a>에서 골라 주세요.</p></div>`;
    return;
  }
  try {
    set = await loadExamSet(setId);
  } catch (error) {
    renderError(headEl, error);
    return;
  }
  document.title = `${set.meta.title} · SSAFY 과목평가 대비`;

  // 시작 문항: ?q= → 이 세트에서 마지막으로 본 문항 → 첫 문항
  const last = store.load().lastVisit;
  const startId = params.get("q") || (last && last.set === setId ? last.q : null);
  const found = set.questions.findIndex((q) => q.id === startId);
  current = found >= 0 ? found : 0;
  store.setLastVisit(setId, set.questions[current].id);

  enableCopyButtons();
  bindEvents();
  renderAll();
}

main();
