/* =========================================================
   공통 스크립트: 상단 메뉴, 테마(라이트/다크), 경로
   - index.html 은 루트, 나머지 페이지는 pages/ 폴더에 있다
   - 페이지 위치와 상관없이 링크가 맞도록, 이 파일(js/app.js)의 주소를
     기준으로 사이트 루트를 계산한다
     (GitHub Pages 주소가 /<repo>/ 아래라서 "/" 로 시작하는 경로는 깨짐)
   - <body data-page="home"> 처럼 현재 페이지를 알려 주면 메뉴에 표시
   ========================================================= */
import { getSetting, setSetting } from "./store.js";

export const SITE_NAME = "시험 대비 연습장";

// 사이트 루트 기준 경로 → 실제 주소. 예: siteUrl("pages/solve.html?set=a")
const ROOT = new URL("../", import.meta.url);
export function siteUrl(path = "") {
  return new URL(path, ROOT).href;
}

const MENU = [
  { page: "home", href: siteUrl("index.html"), label: "홈" },
  { page: "theory", href: siteUrl("pages/theory.html"), label: "이론" },
  { page: "exams", href: siteUrl("pages/exams.html"), label: "문제" },
  { page: "my", href: siteUrl("pages/my.html"), label: "내 기록" },
];

/* ---------- 테마 ---------- */
// 저장된 값이 없으면 data-theme 을 비워 두고 OS 설정(prefers-color-scheme)을 따른다
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function isDark() {
  const theme = document.documentElement.dataset.theme;
  if (theme) return theme === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  applyTheme(next);
  setSetting("theme", next);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.querySelector(".theme-btn");
  if (!btn) return;
  const label = isDark() ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기";
  btn.setAttribute("aria-label", label);
  btn.title = label;
}

/* ---------- 상단 메뉴 ---------- */
function buildTopbar() {
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const current = document.body.dataset.page;
  // solve(문제 풀기)는 "문제" 메뉴 아래로 본다
  const activePage = current === "solve" ? "exams" : current;

  const links = MENU.map((item) => {
    const active = item.page === activePage ? ' class="active" aria-current="page"' : "";
    return `<a href="${item.href}"${active}>${item.label}</a>`;
  }).join("");

  bar.innerHTML = `
    <a class="brand" href="${siteUrl("index.html")}">${SITE_NAME}</a>
    <nav class="topnav" aria-label="주 메뉴">${links}</nav>
    <button type="button" class="theme-btn">◐</button>`;
  bar.querySelector(".theme-btn").addEventListener("click", toggleTheme);
  updateThemeButton();
}

applyTheme(getSetting("theme"));
buildTopbar();
// OS 테마가 바뀌면 버튼 안내 문구도 갱신
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeButton);
