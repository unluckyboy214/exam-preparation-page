#!/usr/bin/env node
/* =========================================================
   실습 노트북 모의고사 만들기 (PROJECT_SPEC.md "6-5")
   실행: node scripts/build-notebooks.js
   - data/notebooks/<세트 id>/exam.json 을 읽어 같은 폴더에 아래 파일을 만든다
       student.ipynb   학생용 (작성하세요 셀이 비어 있음)
       solution.ipynb  모범 답안 + 해설
       questions.md    문제지
       <세트 id>.zip   학생용 묶음 (questions.md, student.ipynb, practice_support.py, checker.py)
   - 같은 폴더에 practice_support.py, checker.py 를 직접 작성해 둔다 (만들지 않음)
   - 검사를 통과하면 data/notebooks/index.json 을 다시 쓴다
   - data/notebooks/config.json { repo, branch, siteUrl } 이 있으면
       · 노트북 앞쪽에 준비 파일을 사이트에서 받아 오는 셀을 넣는다 (Colab 에서 열 때)
       · 총점 셀이 "사이트에 기록하기" 링크를 만든다
       · index.json 에 "Colab에서 열기" 주소를 넣는다
   - 오류가 하나라도 있으면 아무 파일도 쓰지 않고 exit 1
   ========================================================= */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "data/notebooks");
const STUDENT_FILES = ["questions.md", "student.ipynb", "practice_support.py", "checker.py"];
const SUPPORT_FILES = ["practice_support.py", "checker.py"];

const errors = [];
const isStr = (v) => typeof v === "string" && v.trim() !== "";

// 배포 주소 설정 (파일이 없으면 Colab·기록 링크 없이 만든다)
function readConfig() {
  const file = path.join(DIR, "config.json");
  if (!fs.existsSync(file)) return null;
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!isStr(c.repo) || !isStr(c.branch) || !isStr(c.siteUrl)) {
    throw new Error("data/notebooks/config.json 에는 repo, branch, siteUrl 이 있어야 해요");
  }
  return { ...c, siteUrl: c.siteUrl.endsWith("/") ? c.siteUrl : c.siteUrl + "/" };
}

/* ---------- 노트북 셀 ---------- */
function lines(text) {
  const parts = String(text).replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  return parts.map((l, i) => (i < parts.length - 1 ? l + "\n" : l));
}

function mdCell(id, text) {
  return { cell_type: "markdown", id, metadata: {}, source: lines(text) };
}

function codeCell(id, text) {
  return { cell_type: "code", id, metadata: {}, execution_count: null, outputs: [], source: lines(text) };
}

function notebook(cells) {
  return {
    cells,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

/* ---------- 문서 조각 ---------- */
const totalPoints = (exam) => exam.questions.reduce((n, q) => n + q.points, 0);

function overviewTable(exam) {
  const rows = exam.questions.map((q, i) => `| ${i + 1} | ${q.title} | ${q.points}점 |`);
  return ["| 문항 | 내용 | 배점 |", "|---|---|---|", ...rows].join("\n");
}

function headline(exam) {
  return `**총 ${exam.questions.length}문항, ${totalPoints(exam)}점, 시험 ${exam.meta.timeLimitMin}분**`;
}

function taskText(q) {
  return q.tasks.map((t) => `**(${t.label}) [${t.points}점]** ${t.text}`).join("\n\n");
}

const RULES = [
  "- 공통 준비 셀을 먼저 실행하고, 각 문항 안의 셀은 위에서 아래로 실행하세요. 문항마다 필요한 자료를 따로 주므로 다른 문항의 답안은 필요하지 않습니다. 같은 문항의 (b), (c)는 앞 소문항의 결과를 써도 됩니다.",
  "- `실행만 하세요` 셀은 고치지 않습니다. `작성하세요` 셀의 `None`이나 빈 곳을 코드로 바꾸세요. 중간 변수를 더하거나 여러 줄로 써도 됩니다. 정해진 변수 이름과 함수의 입력·반환 형식은 지키세요.",
  "- 특정 정확도에 도달해야 하는 것은 아닙니다. 요구한 처리, 학습, 평가 과정을 수행하세요.",
  "- 각 문항의 `확인` 셀을 실행하면 소문항별로 통과 여부와 점수를 보여 줍니다. 마지막 셀에서 총점을 확인하세요.",
  "- 인터넷과 생성형 AI는 쓰지 않습니다. 필요한 데이터는 scikit-learn에 들어 있습니다.",
].join("\n");

// 준비 파일이 없으면(Colab 등) 사이트에서 받아 오는 셀
function fetchCell(exam, config) {
  const base = `${config.siteUrl}data/notebooks/${exam.meta.id}/`;
  const names = SUPPORT_FILES.map((f) => `'${f}'`).join(", ");
  return codeCell(
    "fetch-support",
    [
      "# 실행만 하세요 (준비 파일 받기)",
      "# zip을 푼 폴더에서 열었으면 파일이 이미 있어 건너뜁니다. Colab에서는 사이트에서 받아 옵니다.",
      "from pathlib import Path",
      "import urllib.request",
      "",
      `SUPPORT_BASE = '${base}'`,
      `for name in [${names}]:`,
      "    if not (Path.cwd() / name).is_file():",
      "        urllib.request.urlretrieve(SUPPORT_BASE + name, name)",
      "        print('받았어요:', name)",
      "print('준비 파일 확인 끝')",
    ].join("\n")
  );
}

// 총점 셀: 문항별 배점을 넘겨 확인하지 않은 문항도 0점으로 셀 수 있게 한다
function totalCell(exam, config) {
  const points = `[${exam.questions.map((q) => q.points).join(", ")}]`;
  if (!config) return codeCell("total", `# 실행만 하세요\ncheck.total(points=${points})`);
  const url = `${config.siteUrl}pages/my.html?nb=${exam.meta.id}&v=${exam.meta.version}`;
  return codeCell(
    "total",
    `# 실행만 하세요 (총점과 "사이트에 기록하기" 링크)\ncheck.total(points=${points},\n            record_url='${url}')`
  );
}

function buildNotebook(exam, withSolution, config) {
  const setupNote = config
    ? "## 공통 준비\n\n아래 두 셀은 고치지 말고 차례로 실행하세요. 첫 셀이 `practice_support.py`, `checker.py`를 준비합니다(Colab에서는 사이트에서 받아 옵니다)."
    : "## 공통 준비\n\n아래 셀은 고치지 말고 실행하세요. `practice_support.py`, `checker.py`가 이 노트북과 같은 폴더에 있어야 합니다.";
  const cells = [
    mdCell("intro", `# ${exam.meta.title}${withSolution ? " (모범 답안)" : ""}\n\n${exam.intro}\n\n${headline(exam)}\n\n${RULES}`),
    mdCell("data-description", `## 데이터 안내\n\n${exam.data}`),
    mdCell("overview", `## 문항 구성\n\n${overviewTable(exam)}`),
    mdCell("setup-note", setupNote),
    ...(config ? [fetchCell(exam, config)] : []),
    codeCell("setup", exam.setup),
  ];
  exam.questions.forEach((q, i) => {
    const n = i + 1;
    cells.push(mdCell(`q${n}-description`, `## ${n}. ${q.title} [${q.points}점]\n\n${q.description}`));
    if (q.prep) cells.push(codeCell(`q${n}-prep`, q.prep));
    cells.push(mdCell(`q${n}-tasks`, taskText(q)));
    cells.push(codeCell(`q${n}-answer`, withSolution ? q.solution : q.answer));
    if (withSolution && q.explain) cells.push(mdCell(`q${n}-explain`, `**해설**\n\n${q.explain}`));
    cells.push(codeCell(`q${n}-check`, `# 실행만 하세요 (확인)\ncheck.q${n}(globals())`));
  });
  cells.push(
    mdCell(
      "total-note",
      config
        ? '## 총점\n\n확인 셀을 실행한 문항의 점수를 모읍니다(확인하지 않은 문항은 0점). 나오는 **사이트에 기록하기** 링크를 누르면 사이트의 "내 기록"에 점수가 저장됩니다. 링크를 연 브라우저에 저장됩니다.'
        : "## 총점"
    )
  );
  cells.push(totalCell(exam, config));
  return notebook(cells);
}

function buildQuestionsMd(exam) {
  const out = [
    `# ${exam.meta.title}`,
    "",
    "> 답안과 실행 결과는 `student.ipynb`에 작성합니다. 이 문서는 문제지입니다.",
    "",
    exam.intro,
    "",
    headline(exam),
    "",
    RULES,
    "",
    "## 데이터 안내",
    "",
    exam.data,
    "",
    "## 문항 구성",
    "",
    overviewTable(exam),
    "",
  ];
  exam.questions.forEach((q, i) => {
    out.push(`## ${i + 1}. ${q.title} | ${q.points}점`, "", q.description, "", taskText(q), "");
    if (q.prep) out.push("준비 코드 - 실행만 하세요", "", "```python", q.prep.replace(/\n+$/, ""), "```", "");
    out.push("답안 작성", "", "```python", q.answer.replace(/\n+$/, ""), "```", "");
    out.push("작성한 뒤 Notebook의 확인 셀을 실행하세요.", "");
  });
  return out.join("\n");
}

/* ---------- zip (압축 라이브러리 없이 직접 작성) ---------- */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 파일 시각을 고정해 내용이 같으면 zip 도 같은 바이트가 되게 한다 (2026-01-01 00:00)
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // 필요한 버전
    local.writeUInt16LE(0x0800, 6); // 파일 이름 UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/* ---------- exam.json 검사 ---------- */
function checkExam(exam, where, dirName) {
  const err = (msg) => errors.push(`${where} → ${msg}`);
  const m = exam.meta || {};
  if (!isStr(m.id)) err("meta.id 가 없음");
  else if (m.id !== dirName) err(`meta.id("${m.id}")와 폴더 이름("${dirName}")이 달라요`);
  if (!isStr(m.subject)) err("meta.subject 가 없음");
  if (!isStr(m.title)) err("meta.title 이 없음");
  if (m.source !== "self-made") err(`공개 폴더의 meta.source 는 "self-made" 여야 함 (현재: ${JSON.stringify(m.source)})`);
  if (!(typeof m.timeLimitMin === "number" && m.timeLimitMin > 0)) err("meta.timeLimitMin 은 0보다 큰 숫자");
  if (!(Number.isInteger(m.version) && m.version >= 1)) err("meta.version 은 1 이상 정수");
  for (const key of ["intro", "data", "setup"]) if (!isStr(exam[key])) err(`${key} 가 없음`);
  if (!Array.isArray(exam.questions) || exam.questions.length === 0) return err("questions 가 비어 있음");
  exam.questions.forEach((q, i) => {
    const qe = (msg) => err(`${i + 1}번 → ${msg}`);
    for (const key of ["title", "description", "answer", "solution"]) if (!isStr(q[key])) qe(`${key} 가 없음`);
    if (!Array.isArray(q.tasks) || q.tasks.length === 0) return qe("tasks 가 비어 있음");
    const sum = q.tasks.reduce((n, t) => n + (t.points || 0), 0);
    if (q.points !== sum) qe(`points(${q.points})와 소문항 배점 합(${sum})이 달라요`);
    q.tasks.forEach((t) => {
      if (!isStr(t.label) || !isStr(t.text) || !(t.points > 0)) qe("tasks 의 각 항목에는 label, points, text 가 있어야 함");
    });
  });
}

/* ---------- 실행 ---------- */
if (!fs.existsSync(DIR)) {
  console.log("data/notebooks 폴더가 없어 건너뛰었어요.");
  process.exit(0);
}

const jobs = [];
for (const name of fs.readdirSync(DIR).sort()) {
  const folder = path.join(DIR, name);
  const file = path.join(folder, "exam.json");
  if (!fs.statSync(folder).isDirectory() || !fs.existsSync(file)) continue;
  const where = `data/notebooks/${name}/exam.json`;
  let exam;
  try {
    exam = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${where} → JSON 을 읽을 수 없음 (${e.message})`);
    continue;
  }
  const before = errors.length;
  checkExam(exam, where, name);
  for (const f of ["practice_support.py", "checker.py"]) {
    if (!fs.existsSync(path.join(folder, f))) errors.push(`data/notebooks/${name}/${f} 가 없음`);
  }
  if (errors.length === before) jobs.push({ name, folder, exam });
}

if (errors.length) {
  console.error(`✗ 오류 ${errors.length}건 — 아무 파일도 쓰지 않았어요`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

let config = null;
try {
  config = readConfig();
} catch (e) {
  console.error("✗ " + e.message);
  process.exit(1);
}
if (!config) console.warn("⚠ data/notebooks/config.json 이 없어 Colab·기록 링크 없이 만들어요");

const index = [];
for (const { name, folder, exam } of jobs) {
  const write = (f, text) => fs.writeFileSync(path.join(folder, f), text);
  write("student.ipynb", JSON.stringify(buildNotebook(exam, false, config), null, 1) + "\n");
  write("solution.ipynb", JSON.stringify(buildNotebook(exam, true, config), null, 1) + "\n");
  write("questions.md", buildQuestionsMd(exam));
  const zipName = `${name}.zip`;
  const entries = STUDENT_FILES.map((f) => ({ name: `${name}/${f}`, data: fs.readFileSync(path.join(folder, f)) }));
  write(zipName, makeZip(entries));

  index.push({
    id: exam.meta.id,
    subject: exam.meta.subject,
    title: exam.meta.title,
    description: exam.meta.description || "",
    source: exam.meta.source,
    timeLimitMin: exam.meta.timeLimitMin,
    version: exam.meta.version,
    questionCount: exam.questions.length,
    totalPoints: totalPoints(exam),
    points: exam.questions.map((q) => q.points),
    colab: config
      ? `https://colab.research.google.com/github/${config.repo}/blob/${config.branch}/data/notebooks/${name}/student.ipynb`
      : null,
    tags: [...new Set(exam.questions.flatMap((q) => q.tags || []))],
    files: {
      zip: `${name}/${zipName}`,
      questions: `${name}/questions.md`,
      student: `${name}/student.ipynb`,
      solution: `${name}/solution.ipynb`,
    },
  });
  console.log(`✓ ${name}: ${exam.questions.length}문항 ${totalPoints(exam)}점 → 노트북 2개, 문제지, ${zipName}`);
}

fs.writeFileSync(path.join(DIR, "index.json"), JSON.stringify({ notebooks: index }, null, 2) + "\n");
console.log(`✓ data/notebooks/index.json 갱신 (노트북 세트 ${index.length}개)`);
