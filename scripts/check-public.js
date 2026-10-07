#!/usr/bin/env node
/* =========================================================
   공개 금지 규칙 점검 (PROJECT_SPEC.md "2. 공개 금지 규칙")
   실행: node scripts/check-public.js
   - 커밋될 수 있는 파일(추적 중 + 새로 만든 파일 중 .gitignore 제외)을 검사
   - 문제가 하나라도 있으면 exit 1
   ========================================================= */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// 저장소에 들어가면 안 되는 경로 패턴
const FORBIDDEN = [
  { re: /^private\//, why: "private/ 폴더는 로컬 전용" },
  { re: /\.(pdf|pptx?|hwpx?)$/i, why: "강의 원본 형식 파일" },
  { re: /^\.vscode\//, why: "로컬 편집기 설정" },
  { re: /(^|\/)node_modules\//, why: "설치 폴더" },
];

// 내용 검사를 건너뛸 확장자 (이미지 등 바이너리)
const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|mp4|webm|zip)$/i;

// 이메일 형식 문자열 (GitHub noreply, 예시용 도메인은 허용)
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EMAIL_OK = /@(users\.noreply\.github\.com|example\.(com|org|net))$/i;

const problems = [];
const warnings = [];

function git(cmd) {
  return execSync("git " + cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

// 1) 커밋 대상 파일 목록
let files;
try {
  files = git("ls-files --cached --others --exclude-standard").split("\n").filter(Boolean);
} catch (e) {
  console.error("git 저장소가 아니거나 git을 실행할 수 없어요. 먼저 git init 을 해 주세요.");
  process.exit(1);
}

for (const file of files) {
  for (const rule of FORBIDDEN) {
    if (rule.re.test(file)) problems.push(`${file} → ${rule.why}`);
  }
}

// 2) 공개 문제 JSON 의 meta.source 는 "self-made" 여야 함
for (const file of files) {
  if (!/^data\/exams\/[^/]+\.json$/.test(file) || file === "data/exams/index.json") continue;
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  try {
    const json = JSON.parse(fs.readFileSync(full, "utf8"));
    const source = json && json.meta && json.meta.source;
    if (source !== "self-made") {
      problems.push(`${file} → meta.source 가 "self-made" 가 아님 (현재: ${JSON.stringify(source)})`);
    }
  } catch (e) {
    problems.push(`${file} → JSON 을 읽을 수 없음 (${e.message})`);
  }
}

// 3) 파일 내용에 이메일 형식 문자열이 있는지
for (const file of files) {
  if (BINARY.test(file)) continue;
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue; // 지운 뒤 아직 커밋 안 한 파일
  const text = fs.readFileSync(full, "utf8");
  const found = (text.match(EMAIL) || []).filter((m) => !EMAIL_OK.test(m));
  for (const m of new Set(found)) problems.push(`${file} → 이메일 형식 문자열: ${m}`);
}

// 4) 커밋 이메일 확인 (경고만)
try {
  const email = git("config user.email");
  if (!/@users\.noreply\.github\.com$/i.test(email)) {
    warnings.push(`커밋 이메일이 GitHub noreply 주소가 아니에요: ${email}`);
  }
} catch (e) {
  warnings.push("커밋 이메일(user.email)이 설정되지 않았어요.");
}

// 결과 출력
for (const w of warnings) console.warn("⚠ " + w);
if (problems.length) {
  console.error(`✗ 공개 금지 규칙 위반 ${problems.length}건`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✓ 공개 점검 통과 (파일 ${files.length}개 검사)`);
