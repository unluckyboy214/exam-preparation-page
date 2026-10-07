/* =========================================================
   렌더링 도구
   - 데이터에서 온 글자는 반드시 escapeHtml 을 거쳐서 innerHTML 에 넣는다 (XSS 방지)
   - 코드 하이라이터, 마크다운-lite 는 M3 에서 추가
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
