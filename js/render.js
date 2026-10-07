/* =========================================================
   렌더링 도구
   - 데이터에서 온 글자는 반드시 escapeHtml 을 거쳐서 innerHTML 에 넣는다 (XSS 방지)
   - 마크다운-lite: `코드`, **굵게**, 빈 줄 = 문단 (그 밖의 문법은 글자 그대로)
   - 코드 블록: 기존 exam 의 하이라이터(html / css / js) + 복사 버튼
   ========================================================= */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 불러오기 실패 등 오류를 화면에 보여 준다
export function renderError(container, error) {
  container.innerHTML = `<div class="error" role="alert"><p>${escapeHtml(error.message || error)}</p></div>`;
}

/* ---------- 마크다운-lite ---------- */
// 한 줄 안의 서식: `코드` 를 먼저 떼어 내고, 나머지에서만 **굵게** 처리
export function mdInline(text) {
  return String(text ?? "")
    .split(/(`[^`\n]+`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
        : escapeHtml(part).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    )
    .join("");
}

// 여러 문단: 빈 줄로 나누고, 문단 안의 줄바꿈은 <br>
export function md(text) {
  return String(text ?? "")
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${mdInline(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/* ---------- 코드 하이라이트 (기존 exam 의 common.js 에서 이전) ---------- */
function tok(cls, s) {
  return `<span class="t-${cls}">${escapeHtml(s)}</span>`;
}

function hlJS(src) {
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|in|new|true|false|null|undefined|this|typeof|while|break|continue|try|catch|async|await|class|import|export|from)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += escapeHtml(src.slice(last, m.index));
    if (m[1]) out += tok("com", m[1]);
    else if (m[2]) out += tok("str", m[2]);
    else if (m[3]) out += tok("key", m[3]);
    else if (m[4]) out += tok("num", m[4]);
    else out += tok("fn", m[5]);
    last = re.lastIndex;
  }
  return out + escapeHtml(src.slice(last));
}

function hlCSS(src) {
  const re = /(\/\*[\s\S]*?\*\/)|([^{}\/;]+)(?=\{)|([\w-]+)(\s*:\s*)([^;{}]+)(?=;)/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += escapeHtml(src.slice(last, m.index));
    if (m[1]) out += tok("com", m[1]);
    else if (m[2]) out += tok("sel", m[2]);
    else out += tok("prop", m[3]) + escapeHtml(m[4]) + tok("val", m[5]);
    last = re.lastIndex;
  }
  return out + escapeHtml(src.slice(last));
}

function hlMarkup(src) {
  const re =
    /(<!--[\s\S]*?-->)|(<!doctype[^>]*>)|(<\/?)([\w-]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)(\s*\/?>)/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += escapeHtml(src.slice(last, m.index));
    if (m[1]) out += tok("com", m[1]);
    else if (m[2]) out += tok("key", m[2]);
    else {
      // 속성 이름/값을 표시 문자로 감싼 뒤, 이스케이프하고 나서 span 으로 바꾼다
      const attrs = m[5].replace(
        /(\s+)([^\s=>\/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g,
        (_, sp, name, eq, val) => sp + "\u0001a" + name + "\u0002" + (eq ? eq + "\u0001s" + val + "\u0002" : "")
      );
      out +=
        escapeHtml(m[3]) +
        tok("tag", m[4]) +
        escapeHtml(attrs)
          .replace(/\u0001a([^\u0002]*)\u0002/g, '<span class="t-attr">$1</span>')
          .replace(/\u0001s([^\u0002]*)\u0002/g, '<span class="t-str">$1</span>') +
        escapeHtml(m[6]);
    }
    last = re.lastIndex;
  }
  return out + escapeHtml(src.slice(last));
}

function hlHTML(src) {
  const re = /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += hlMarkup(src.slice(last, m.index)) + hlMarkup(m[1]);
    out += m[2].toLowerCase() === "script" ? hlJS(m[3]) : hlCSS(m[3]);
    out += hlMarkup(m[4]);
    last = re.lastIndex;
  }
  return out + hlMarkup(src.slice(last));
}

export function highlight(src, lang) {
  if (lang === "html") return hlHTML(src);
  if (lang === "css") return hlCSS(src);
  if (lang === "js" || lang === "javascript") return hlJS(src);
  return escapeHtml(src);
}

// 여러 줄에 걸친 <span> 이 줄 단위로 잘려도 색이 유지되도록 닫고 다시 열기
function splitLines(html) {
  const open = [];
  return html.split("\n").map((line) => {
    const prefix = open.join("");
    const tagRe = /<span class="[^"]*">|<\/span>/g;
    let t;
    while ((t = tagRe.exec(line))) {
      if (t[0] === "</span>") open.pop();
      else open.push(t[0]);
    }
    return prefix + line + "</span>".repeat(open.length);
  });
}

// { lang, src } → 코드 블록 HTML. 복사 버튼은 enableCopyButtons 가 처리
export function codeBlock(code) {
  if (!code || !code.src) return "";
  const lang = String(code.lang || "text").toLowerCase();
  const src = String(code.src).replace(/\t/g, "  ").replace(/\s+$/, "");
  const rows = splitLines(highlight(src, lang)).map(
    (line, i) => `<span class="line"><span class="ln">${i + 1}</span>${line || " "}</span>`
  );
  return `
    <figure class="code-block">
      <figcaption>
        <span>${escapeHtml(lang.toUpperCase())}</span>
        <button type="button" class="copy" data-src="${escapeHtml(src)}">복사</button>
      </figcaption>
      <pre><code>${rows.join("")}</code></pre>
    </figure>`;
}

// 페이지 전체에서 코드 블록 복사 버튼이 동작하도록 (한 번만 호출)
let copyReady = false;
export function enableCopyButtons() {
  if (copyReady) return;
  copyReady = true;
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".code-block .copy");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.src);
      btn.textContent = "복사됨!";
    } catch (err) {
      btn.textContent = "복사 실패";
    }
    setTimeout(() => (btn.textContent = "복사"), 1200);
  });
}
