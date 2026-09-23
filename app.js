"use strict";

const TARGETS = ["BACD", "CADB", "DBAC", "ACDB", "CEADB", "BDEAC", "EACBD", "DABEC", "FBDACE", "CAEFDB"];
const REQUIRED_TYPES = [
  ["left"], ["immediateLeft"], ["adjacent", "left"], ["adjacent", "immediateLeft"],
  ["between", "left"], ["between", "adjacent"], ["notAdjacent", "between", "left"],
  ["notPos", "adjacent", "between"], ["notAdjacent", "between", "adjacent"],
  ["notPos", "notAdjacent", "between"]
];
const config = window.TEST_CONFIG || {};
const answerArea = document.getElementById("answer-fields");
const problems = TARGETS.map((answer, i) => buildProblem(answer, i + 1));
let session = null;
let questionIndex = 0;
let results = [];
let sending = false;

function permutations(text) {
  if (text.length <= 1) return [text];
  const output = [];
  for (let i = 0; i < text.length; i++)
    for (const rest of permutations(text.slice(0, i) + text.slice(i + 1)))
      output.push(text[i] + rest);
  return output;
}

function seededOrder(items, seed) {
  const result = [...items];
  let state = seed >>> 0;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isMet(order, rule) {
  const p = item => order.indexOf(item);
  if (rule.type === "pos") return p(rule.a) === rule.index;
  if (rule.type === "notPos") return p(rule.a) !== rule.index;
  if (rule.type === "left") return p(rule.a) < p(rule.b);
  if (rule.type === "immediateLeft") return p(rule.b) === p(rule.a) + 1;
  if (rule.type === "adjacent") return Math.abs(p(rule.a) - p(rule.b)) === 1;
  if (rule.type === "notAdjacent") return Math.abs(p(rule.a) - p(rule.b)) !== 1;
  if (rule.type === "between")
    return (p(rule.left) < p(rule.middle) && p(rule.middle) < p(rule.right)) ||
           (p(rule.right) < p(rule.middle) && p(rule.middle) < p(rule.left));
  return false;
}

function ruleText(rule) {
  const ordinal = n => `左から${n + 1}番目`;
  if (rule.type === "pos") return `${rule.a}は${ordinal(rule.index)}にある。`;
  if (rule.type === "notPos") return `${rule.a}は${ordinal(rule.index)}にはない。`;
  if (rule.type === "left") return `${rule.a}は${rule.b}より左にある。`;
  if (rule.type === "immediateLeft") return `${rule.a}は${rule.b}のすぐ左にある。`;
  if (rule.type === "adjacent") return `${rule.a}と${rule.b}は隣り合っている。`;
  if (rule.type === "notAdjacent") return `${rule.a}と${rule.b}は隣り合っていない。`;
  return `${rule.middle}は${rule.left}と${rule.right}の間にある。`;
}

function candidatesFor(answer) {
  const list = [];
  const add = rule => { if (isMet(answer, rule)) list.push(rule); };
  for (let i = 0; i < answer.length; i++) {
    add({ type: "pos", a: answer[i], index: i });
    for (let wrong = 0; wrong < answer.length; wrong++)
      if (wrong !== i) add({ type: "notPos", a: answer[i], index: wrong });
    for (let j = i + 1; j < answer.length; j++) {
      add({ type: "left", a: answer[i], b: answer[j] });
      if (j === i + 1) {
        add({ type: "immediateLeft", a: answer[i], b: answer[j] });
        add({ type: "adjacent", a: answer[i], b: answer[j] });
      } else add({ type: "notAdjacent", a: answer[i], b: answer[j] });
    }
  }
  for (let i = 0; i < answer.length - 2; i++)
    for (let j = i + 1; j < answer.length - 1; j++)
      for (let k = j + 1; k < answer.length; k++)
        add({ type: "between", middle: answer[j], left: answer[i], right: answer[k] });
  return list;
}

function buildProblem(answer, number) {
  let remaining = permutations(answer);
  const selected = [];
  const ordered = seededOrder(candidatesFor(answer), 1000 + number * 37);
  const addBest = pool => {
    let best = null;
    let bestCount = remaining.length;
    for (const rule of pool) {
      if (selected.includes(rule)) continue;
      const count = remaining.filter(order => isMet(order, rule)).length;
      if (count < bestCount) { best = rule; bestCount = count; }
    }
    if (!best) return false;
    selected.push(best);
    remaining = remaining.filter(order => isMet(order, best));
    return true;
  };
  for (const type of REQUIRED_TYPES[number - 1]) addBest(ordered.filter(rule => rule.type === type));
  const preferred = number <= 4
    ? ["pos", "immediateLeft", "left", "adjacent"]
    : ["between", "adjacent", "notAdjacent", "notPos", "left", "immediateLeft", "pos"];
  while (remaining.length > 1) {
    if (!addBest(ordered.filter(rule => preferred.includes(rule.type))))
      throw new Error(`問題1-${number}を一意にできません。`);
  }
  const incorrect = permutations(answer).filter(order => order !== answer)
    .map(order => ({ order, score: selected.filter(rule => isMet(order, rule)).length }))
    .sort((a, b) => b.score - a.score || a.order.localeCompare(b.order))
    .slice(0, 3).map(item => item.order);
  return {
    answer,
    conditions: selected.map(ruleText),
    choices: seededOrder([answer, ...incorrect], 700 + number * 19)
  };
}

function renderChoices(choices) {
  answerArea.replaceChildren();
  choices.forEach((arrangement, i) => {
    const label = document.createElement("label");
    label.className = "arrangement";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "arrangement";
    radio.value = arrangement;
    radio.setAttribute("aria-label", `選択肢${i + 1}、左から${arrangement.split("").join("、")}`);
    const diagram = document.createElement("span");
    diagram.className = "diagram";
    diagram.setAttribute("aria-hidden", "true");
    for (const letter of arrangement) {
      const box = document.createElement("span");
      box.textContent = letter;
      diagram.append(box);
    }
    label.append(radio, diagram);
    answerArea.append(label);
  });
}

function showQuestion() {
  const problem = problems[questionIndex];
  document.getElementById("question-header").textContent = `配置問題　問題1　　${questionIndex + 1} / 10`;
  document.getElementById("question-title").textContent =
    `${problem.answer.split("").sort().join("・")}を、左から順に1つずつ配置してください。`;
  const list = document.getElementById("conditions");
  list.replaceChildren(...problem.conditions.map(text => {
    const item = document.createElement("li"); item.textContent = text; return item;
  }));
  renderChoices(problem.choices);
  document.getElementById("answer-error").textContent = "";
  session.questionStartedAt = new Date().toISOString();
  session.questionStartClock = performance.now();
  answerArea.querySelector("input").focus();
}

function createSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

document.getElementById("start-button").addEventListener("click", () => {
  const participantId = document.getElementById("participant-id").value.trim();
  const consent = document.getElementById("consent").checked;
  if (!participantId || !consent) {
    document.getElementById("start-error").textContent = "参加者IDを入力し、同意欄を確認してください。";
    return;
  }
  session = {
    sessionId: createSessionId(), participantId,
    testVersion: config.testVersion || "unknown",
    testStartedAt: new Date().toISOString()
  };
  document.getElementById("start-screen").hidden = true;
  document.getElementById("question-screen").hidden = false;
  showQuestion();
});

document.getElementById("submit-button").addEventListener("click", () => {
  const selected = answerArea.querySelector('input[name="arrangement"]:checked');
  if (!selected) {
    document.getElementById("answer-error").textContent = "正しいと思う配置を1つ選んでください。";
    return;
  }
  const problem = problems[questionIndex];
  results.push({
    questionNumber: questionIndex + 1,
    questionId: `S1-Q${String(questionIndex + 1).padStart(2, "0")}`,
    startedAt: session.questionStartedAt,
    answeredAt: new Date().toISOString(),
    response: selected.value,
    correctAnswer: problem.answer,
    isCorrect: selected.value === problem.answer ? 1 : 0,
    responseTimeMs: Math.round(performance.now() - session.questionStartClock),
    conditions: problem.conditions.join(" / ")
  });
  questionIndex++;
  if (questionIndex < problems.length) showQuestion();
  else finishTest();
});

function payload() {
  return {
    sessionId: session.sessionId,
    participantId: session.participantId,
    problemSet: 1,
    testVersion: session.testVersion,
    consent: true,
    testStartedAt: session.testStartedAt,
    testFinishedAt: session.testFinishedAt,
    responses: results
  };
}

async function finishTest() {
  session.testFinishedAt = new Date().toISOString();
  document.getElementById("question-screen").hidden = true;
  document.getElementById("end-screen").hidden = false;
  await sendResults();
}

async function sendResults() {
  if (sending) return;
  const retryButton = document.getElementById("retry-button");
  const error = document.getElementById("send-error");
  const message = document.getElementById("send-message");
  retryButton.hidden = true;
  error.textContent = "";
  message.textContent = "回答データを送信しています。この画面を閉じずにお待ちください。";
  if (!config.endpointUrl || config.endpointUrl.includes("PASTE_")) {
    error.textContent = "送信先が未設定です。実験担当者に知らせ、CSVを保存してください。";
    retryButton.hidden = false;
    return;
  }
  sending = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload()),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok || data.status !== "ok") throw new Error(data.message || "保存に失敗しました");
    message.textContent = "回答データを送信しました。この画面を閉じてください。";
  } catch (sendError) {
    console.error(sendError);
    error.textContent = "送信を確認できませんでした。再試行するか、CSVを保存して実験担当者に渡してください。";
    retryButton.hidden = false;
  } finally {
    clearTimeout(timeout);
    sending = false;
  }
}

document.getElementById("retry-button").addEventListener("click", sendResults);

const csvCell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
document.getElementById("backup-button").addEventListener("click", () => {
  if (!session || !results.length) return;
  const header = ["session_id", "participant_id", "problem_set", "test_version", "question_number",
    "question_id", "started_at", "answered_at", "response", "correct_answer", "is_correct",
    "response_time_ms", "conditions"];
  const rows = results.map(item => [session.sessionId, session.participantId, 1, session.testVersion,
    item.questionNumber, item.questionId, item.startedAt, item.answeredAt, item.response,
    item.correctAnswer, item.isCorrect, item.responseTimeMs, item.conditions]);
  const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `placement-backup-${session.sessionId}.csv`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

const clock = document.getElementById("clock");
const updateClock = () => {
  clock.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).format(new Date());
};
updateClock();
setInterval(updateClock, 1000);
