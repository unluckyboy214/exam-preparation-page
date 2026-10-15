/* =========================================================
   문제 세트 목록 (pages/exams.html)
   - 시험(단체) → 과목 → 회차 순서로 제목을 달아 묶어 보여 준다
   - ?group=ssafy : 시험(단체) 필터
   - ?subject=frontend : 과목 필터
   - ?kind=mock | past : 종류 필터 (예상 문제 / 기출(로컬 전용))
   ========================================================= */
import { siteUrl } from "../app.js";
import { loadCatalog, loadExamList, loadNotebookList } from "../data.js";
import { load } from "../store.js";
import { escapeHtml, renderError } from "../render.js";

const TYPE_LABEL = { mc: "객관식", multi: "복수 선택", short: "주관식", essay: "서술형" };
const KIND_LABEL = { all: "전체", mock: "예상 문제", past: "기출 (로컬 전용)" };

const filtersEl = document.getElementById("filters");
const listEl = document.getElementById("list");

const params = new URLSearchParams(location.search);
const state = {
  group: params.get("group") || "all",
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
        ${subjectTitle ? `<span>${escapeHtml(subjectTitle)}</span>` : ""}
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

// 실습 노트북 모의고사 카드: 사이트에서 풀지 않고 파일을 받아 Jupyter 에서 푼다
// - Colab 에서 풀기: 각자 구글 계정의 실행 환경에서 열린다. 총점 셀의 링크로 내 기록에 점수를 남긴다
function notebookCard(nb, record) {
  const u = nb.urls;
  const results = (record.notebooks || {})[nb.id] || [];
  const best = results.reduce((b, r) => (!b || r.score > b.score ? r : b), null);
  return `
    <article class="card set-card notebook-card">
      <p class="set-meta"><span class="tag tag-notebook">실습 노트북</span></p>
      <h3>${escapeHtml(nb.title)}</h3>
      <p class="muted">${escapeHtml(nb.questionCount)}문항 · ${escapeHtml(nb.totalPoints)}점 · 제한 시간 ${escapeHtml(nb.timeLimitMin)}분</p>
      ${nb.description ? `<p>${escapeHtml(nb.description)}</p>` : ""}
      <p class="set-status">
        <span>${results.length ? `기록 ${results.length}회` : "아직 기록 없음"}</span>
        <span>${best ? `최고 ${best.score} / ${best.total}점` : "최고 점수 없음"}</span>
      </p>
      <ul class="nb-files">
        <li><a href="${escapeHtml(u.zip)}" download>내 PC에서 풀기 (zip)</a></li>
        <li><a href="${escapeHtml(u.questions)}" download>문제지 (.md)</a></li>
        <li><a href="${escapeHtml(u.solution)}" download>모범 답안 (.ipynb)</a></li>
      </ul>
      <div class="actions">
        ${
          nb.colab
            ? `<a class="btn primary" href="${escapeHtml(nb.colab)}" target="_blank" rel="noopener">Colab에서 풀기</a>`
            : `<a class="btn primary" href="${escapeHtml(u.zip)}" download>노트북 받기 (zip)</a>`
        }
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
  if (state.group !== "all") p.set("group", state.group);
  if (state.subject !== "all") p.set("subject", state.subject);
  if (state.kind !== "all") p.set("kind", state.kind);
  const query = p.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function render(catalog, sets, notebooks) {
  const { groups, subjects } = catalog;
  const hasPast = sets.some((s) => kindOf(s) === "past");
  if (!hasPast) state.kind = "all"; // 기출이 없으면(배포 사이트) 종류 필터를 숨긴다
  // 과목만 주어지면(?subject=) 그 과목의 시험(단체)을 고른 것으로 본다
  const picked = subjects.find((s) => s.id === state.subject);
  if (picked) state.group = picked.group;
  if (!groups.some((g) => g.id === state.group)) state.group = "all";
  const groupSubjects = state.group === "all" ? subjects : subjects.filter((s) => s.group === state.group);
  if (!groupSubjects.some((s) => s.id === state.subject)) state.subject = "all";

  filtersEl.innerHTML = `
    ${
      groups.length > 1
        ? `<div class="chips" role="group" aria-label="시험">${chips("group", [["all", "전체 시험"], ...groups.map((g) => [g.id, g.title])], state.group)}</div>`
        : ""
    }
    <div class="chips" role="group" aria-label="과목">
      ${chips("subject", [["all", "전체 과목"], ...groupSubjects.map((s) => [s.id, s.title])], state.subject)}
    </div>
    ${
      hasPast
        ? `<div class="chips" role="group" aria-label="종류">${chips("kind", Object.entries(KIND_LABEL), state.kind)}</div>`
        : ""
    }`;

  const shown = sets.filter((s) => (state.kind === "all" || kindOf(s) === state.kind));
  const record = load();
  // 시험(단체) → 과목 → 회차 (sets 는 data.js 에서 이미 이 순서로 정렬돼 있다)
  const html = groups
    .filter((g) => state.group === "all" || g.id === state.group)
    .map((g) => {
      const blocks = g.subjects
        .filter((sub) => state.subject === "all" || sub.id === state.subject)
        .map((sub) => {
          const mine = shown.filter((s) => s.subject === sub.id);
          // 노트북은 예상 문제(self-made)라 "기출" 필터에서는 숨긴다
          const nbs = state.kind === "past" ? [] : notebooks.filter((nb) => nb.subject === sub.id);
          if (!mine.length && !nbs.length) return "";
          const count = [mine.length ? `${mine.length}회차` : "", nbs.length ? `노트북 ${nbs.length}개` : ""].filter(Boolean).join(" · ");
          return `<div class="subject-block">
            <h3 class="subject-title">${escapeHtml(sub.title)} <span class="muted small">${count}</span></h3>
            ${mine.length ? `<div class="grid">${mine.map((s) => setCard(s, "", record)).join("")}</div>` : ""}
            ${
              nbs.length
                ? `<p class="notebook-heading">실습 노트북 모의고사 — Colab(구글 계정)이나 내 PC의 Jupyter에서 풀어요</p>
                   <div class="grid">${nbs.map((nb) => notebookCard(nb, record)).join("")}</div>`
                : ""
            }
          </div>`;
        })
        .join("");
      return blocks ? `<section class="group-block"><h2 class="group-title">${escapeHtml(g.title)}</h2>${blocks}</section>` : "";
    })
    .join("");
  // 과목 목록에 없는 과목의 세트 (subjects.json 에 빠진 경우)
  const known = new Set(subjects.map((s) => s.id));
  const orphans = state.group === "all" && state.subject === "all" ? shown.filter((s) => !known.has(s.subject)) : [];
  const orphanHtml = orphans.length
    ? `<section class="group-block"><h2 class="group-title">분류 없음</h2><div class="grid">${orphans.map((s) => setCard(s, s.subject, record)).join("")}</div></section>`
    : "";

  listEl.innerHTML = html + orphanHtml || '<p class="empty">조건에 맞는 문제 세트가 없어요.</p>';
}

async function main() {
  try {
    const [catalog, sets, notebooks] = await Promise.all([
      loadCatalog(),
      loadExamList(),
      loadNotebookList().catch(() => []),
    ]);
    render(catalog, sets, notebooks);

    filtersEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      if (btn.dataset.group) {
        state.group = btn.dataset.group;
        state.subject = "all"; // 시험을 바꾸면 과목 선택은 풀어 준다
      }
      if (btn.dataset.subject) state.subject = btn.dataset.subject;
      if (btn.dataset.kind) state.kind = btn.dataset.kind;
      render(catalog, sets, notebooks);
      syncUrl();
    });
  } catch (error) {
    renderError(listEl, error);
  }
}

main();
