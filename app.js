"use strict";

const LETTERS = "ABCD";
const config = window.TEST_CONFIG || {};
const answerArea = document.getElementById("answer-fields");

const PROBLEMS = [
  {
    type: "arrangement", answer: "BACD",
    rules: [R("left", "B", "A"), R("right", "D", "C"), R("left", "A", "C")],
    choices: ["BACD", "ABCD", "BADC", "BCAD"]
  },
  {
    type: "arrangement", answer: "CADB",
    rules: [R("adjacent", "C", "A"), R("notAdjacent", "B", "A"),
      R("left", "D", "B"), R("notLeft", "A", "C"), R("notLeft", "D", "C")]
  },
  {
    type: "arrangement", answer: "DBAC",
    rules: [R("immediateLeft", "B", "A"), R("right", "A", "D"),
      R("right", "C", "B")],
    choices: ["DBAC", "BDCA", "BACD", "CDBA"]
  },
  {
    type: "arrangement", answer: "ACDB",
    rules: [R("left", "A", "B"), R("notAdjacent", "A", "B"),
      R("adjacent", "C", "D"), R("notPosition", "C", 3)],
    choices: ["ACDB", "BADC", "ACBD", "ADCB"]
  },
  {
    type: "count", answer: 3,
    rules: [R("position", "A", 1), R("right", "B", "C")]
  },
  {
    type: "count", answer: 5,
    rules: [R("right", "D", "A"), R("notPosition", "B", 4), R("adjacent", "B", "C")]
  },
  {
    type: "count", answer: 2,
    rules: [R("between", "B", "A", "D"), R("right", "C", "A"), R("position", "D", 4)]
  },
  {
    type: "minimum", arrangement: "BACD", answer: 3,
    rules: [R("position", "B", 1), R("immediateRight", "A", "B"),
      R("right", "D", "C"), R("adjacent", "A", "C"), R("notAdjacent", "B", "C")]
  },
  {
    type: "minimum", arrangement: "CADB", answer: 3,
    rules: [R("between", "A", "C", "D"), R("immediateLeft", "C", "A"),
      R("right", "B", "D"), R("notPosition", "D", 1), R("adjacent", "A", "D")]
  },
  {
    type: "minimum", arrangement: "DBAC", answer: 3,
    rules: [R("right", "A", "B"), R("position", "D", 1),
      R("between", "B", "D", "C"), R("notAdjacent", "A", "D"), R("immediateLeft", "B", "A")]
  }
];

let session = null;
let questionIndex = 0;
let results = [];
let sending = false;

function R(type, a, b, c) { return { type, a, b, c }; }

function permutations(text) {
  if (text.length <= 1) return [text];
  const output = [];
  for (let i = 0; i < text.length; i++)
    for (const rest of permutations(text.slice(0, i) + text.slice(i + 1)))
      output.push(text[i] + rest);
  return output;
}

const ALL_ORDERS = permutations(LETTERS);

function isMet(order, rule) {
  const p = item => order.indexOf(item);
  if (rule.type === "left") return p(rule.a) < p(rule.b);
  if (rule.type === "right") return p(rule.a) > p(rule.b);
  if (rule.type === "notLeft") return p(rule.a) >= p(rule.b);
  if (rule.type === "immediateLeft") return p(rule.b) === p(rule.a) + 1;
  if (rule.type === "immediateRight") return p(rule.a) === p(rule.b) + 1;
  if (rule.type === "adjacent") return Math.abs(p(rule.a) - p(rule.b)) === 1;
  if (rule.type === "notAdjacent") return Math.abs(p(rule.a) - p(rule.b)) !== 1;
  if (rule.type === "between") {
    const middle = p(rule.a), edge1 = p(rule.b), edge2 = p(rule.c);
    return (edge1 < middle && middle < edge2) || (edge2 < middle && middle < edge1);
  }
  if (rule.type === "position") return p(rule.a) === rule.b - 1;
  if (rule.type === "notPosition") return p(rule.a) !== rule.b - 1;
  return false;
}

function ruleText(rule) {
  if (rule.type === "left") return `${rule.a}は${rule.b}より左にある。`;
  if (rule.type === "right") return `${rule.a}は${rule.b}より右にある。`;
  if (rule.type === "notLeft") return `${rule.a}は${rule.b}より左ではない。`;
  if (rule.type === "immediateLeft") return `${rule.a}は${rule.b}のすぐ左にある。`;
  if (rule.type === "immediateRight") return `${rule.a}は${rule.b}のすぐ右にある。`;
  if (rule.type === "adjacent") return `${rule.a}と${rule.b}は隣り合っている。`;
  if (rule.type === "notAdjacent") return `${rule.a}と${rule.b}は隣り合っていない。`;
  if (rule.type === "between") return `${rule.a}は${rule.b}と${rule.c}の間にある。`;
  if (rule.type === "position") return `${rule.a}は${rule.b}番目である。`;
  return `${rule.a}は${rule.b}番目ではない。`;
}

function solutions(rules) {
  return ALL_ORDERS.filter(order => rules.every(rule => isMet(order, rule)));
}

function combinations(items, size, start = 0, chosen = [], output = []) {
  if (chosen.length === size) { output.push([...chosen]); return output; }
  for (let i = start; i <= items.length - (size - chosen.length); i++) {
    chosen.push(items[i]);
    combinations(items, size, i + 1, chosen, output);
    chosen.pop();
  }
  return output;
}

function minimumRulesFor(arrangement, rules) {
  for (let size = 1; size <= rules.length; size++)
    if (combinations(rules, size).some(subset => {
      const found = solutions(subset);
      return found.length === 1 && found[0] === arrangement;
    })) return size;
  return null;
}

function validateProblems() {
  PROBLEMS.forEach((problem, index) => {
    if (problem.type === "arrangement") {
      const found = solutions(problem.rules);
      if (found.length !== 1 || found[0] !== problem.answer)
        throw new Error(`問${index + 1}: 正解が一意ではありません`);
      if (problem.choices) {
        if (new Set(problem.choices).size !== 4 || !problem.choices.includes(problem.answer))
          throw new Error(`問${index + 1}: 選択肢の設定が不正です`);
        problem.rules.forEach((rule, ruleIndex) => {
          if (problem.choices.filter(choice => choice !== problem.answer).every(choice => isMet(choice, rule)))
            throw new Error(`問${index + 1}: 文章${ruleIndex + 1}が選択肢の絞り込みに使われていません`);
        });
      }
    } else if (problem.type === "count") {
      if (solutions(problem.rules).length !== problem.answer)
        throw new Error(`問${index + 1}: 成立数が一致しません`);
    } else {
      if (!problem.rules.every(rule => isMet(problem.arrangement, rule)))
        throw new Error(`問${index + 1}: 提示文に成立しないものがあります`);
      if (minimumRulesFor(problem.arrangement, problem.rules) !== problem.answer)
        throw new Error(`問${index + 1}: 最小文章数が一致しません`);
    }
  });
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

function arrangementChoices(problem, number) {
  if (problem.choices) return seededOrder(problem.choices, 910 + number * 23);
  const distractors = ALL_ORDERS.filter(order => order !== problem.answer)
    .map(order => ({ order, score: problem.rules.filter(rule => isMet(order, rule)).length }))
    .sort((x, y) => y.score - x.score || x.order.localeCompare(y.order))
    .slice(0, 3).map(item => item.order);
  return seededOrder([problem.answer, ...distractors], 910 + number * 23);
}

function numberChoices(problem, number) {
  const choices = problem.type === "minimum"
    ? [1, 2, 3, 4]
    : [Math.max(1, problem.answer - 2), Math.max(1, problem.answer - 1), problem.answer, problem.answer + 1];
  const uniqueChoices = [...new Set(choices)];
  for (let candidate = 1; uniqueChoices.length < 4; candidate++)
    if (!uniqueChoices.includes(candidate)) uniqueChoices.push(candidate);
  return seededOrder(uniqueChoices, 370 + number * 17);
}

function renderWorkbench(problem) {
  const area = document.getElementById("arrangement-workbench");
  if (problem.type !== "count") {
    area.hidden = true;
    area.replaceChildren();
    return;
  }
  area.hidden = false;
  const heading = document.createElement("p");
  heading.className = "workbench-heading";
  heading.textContent = "並べ替えメモ（回答には直接影響しません）";
  const help = document.createElement("p");
  help.className = "workbench-help";
  help.textContent = "パネルをドラッグするか、2枚を順に選んで位置を入れ替えられます。";
  const panel = document.createElement("div");
  panel.className = "letter-panel";
  panel.setAttribute("aria-label", "AからDの並べ替えパネル");
  let selected = null;
  let dragged = null;
  const swap = (first, second) => {
    const marker = document.createTextNode("");
    panel.replaceChild(marker, first);
    panel.replaceChild(first, second);
    panel.replaceChild(second, marker);
  };
  for (const letter of LETTERS) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "letter-tile";
    tile.textContent = letter;
    tile.draggable = true;
    tile.addEventListener("click", () => {
      if (!selected) {
        selected = tile;
        tile.classList.add("selected");
      } else if (selected === tile) {
        tile.classList.remove("selected");
        selected = null;
      } else {
        swap(selected, tile);
        selected.classList.remove("selected");
        selected = null;
      }
    });
    tile.addEventListener("dragstart", () => { dragged = tile; tile.classList.add("dragging"); });
    tile.addEventListener("dragend", () => { tile.classList.remove("dragging"); dragged = null; });
    tile.addEventListener("dragover", event => event.preventDefault());
    tile.addEventListener("drop", event => {
      event.preventDefault();
      if (dragged && dragged !== tile) swap(dragged, tile);
    });
    panel.append(tile);
  }
  area.replaceChildren(heading, help, panel);
}

function makeDiagram(arrangement) {
  const diagram = document.createElement("span");
  diagram.className = "diagram";
  for (const letter of arrangement) {
    const box = document.createElement("span");
    box.textContent = letter;
    diagram.append(box);
  }
  return diagram;
}

function renderChoices(problem) {
  answerArea.replaceChildren();
  const choices = problem.type === "arrangement"
    ? arrangementChoices(problem, questionIndex + 1)
    : numberChoices(problem, questionIndex + 1);
  choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = `arrangement ${problem.type === "arrangement" ? "" : "number-choice"}`;
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "answer";
    radio.value = String(choice);
    radio.setAttribute("aria-label", problem.type === "arrangement"
      ? `選択肢${index + 1}、左から${choice.split("").join("、")}`
      : `選択肢${index + 1}、${choice}`);
    label.append(radio, problem.type === "arrangement" ? makeDiagram(choice) : document.createTextNode(`${choice}`));
    answerArea.append(label);
  });
}

function showQuestion() {
  const problem = PROBLEMS[questionIndex];
  const kind = document.getElementById("question-kind");
  const title = document.getElementById("question-title");
  const instruction = document.getElementById("question-instruction");
  const given = document.getElementById("given-arrangement");
  document.getElementById("question-header").textContent = `配置問題　問題1　　${questionIndex + 1} / 10`;
  if (problem.type === "arrangement") {
    kind.textContent = "種類1：正しい配置を選ぶ";
    title.textContent = "A・B・C・Dを、左から順に1つずつ配置してください。";
    instruction.textContent = "左を1番目として、条件をすべて満たす配置を1つ選んでください。";
    given.hidden = true;
  } else if (problem.type === "count") {
    kind.textContent = "種類2：成立する配置の数を答える";
    title.textContent = "次の条件をすべて満たす並び方は、合計で何通りありますか。";
    instruction.textContent = "A・B・C・Dを1回ずつ使う場合の、成立する並び方の合計を選んでください。";
    given.hidden = true;
  } else {
    kind.textContent = "種類3：必要な文章の最小数を答える";
    title.textContent = "提示された配置を一意に決めるには、文章が最低いくつ必要ですか。";
    instruction.textContent = "下の文章は、すべて提示された配置に当てはまります。その中から必要な文章を自由に選ぶとき、配置を1通りに決められる最小の文章数を選んでください。";
    given.replaceChildren(makeDiagram(problem.arrangement));
    given.hidden = false;
  }
  const list = document.getElementById("conditions");
  list.replaceChildren(...problem.rules.map(rule => {
    const item = document.createElement("li");
    item.textContent = ruleText(rule);
    return item;
  }));
  renderWorkbench(problem);
  renderChoices(problem);
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
  const selected = answerArea.querySelector('input[name="answer"]:checked');
  if (!selected) {
    document.getElementById("answer-error").textContent = "回答を1つ選んでください。";
    return;
  }
  const problem = PROBLEMS[questionIndex];
  const correctAnswer = String(problem.answer);
  results.push({
    questionNumber: questionIndex + 1,
    questionId: `S1-Q${String(questionIndex + 1).padStart(2, "0")}`,
    questionType: problem.type,
    startedAt: session.questionStartedAt,
    answeredAt: new Date().toISOString(),
    response: selected.value,
    correctAnswer,
    isCorrect: selected.value === correctAnswer ? 1 : 0,
    responseTimeMs: Math.round(performance.now() - session.questionStartClock),
    conditions: problem.rules.map(ruleText).join(" / "),
    givenArrangement: problem.arrangement || ""
  });
  questionIndex++;
  if (questionIndex < PROBLEMS.length) showQuestion();
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
    "question_id", "question_type", "started_at", "answered_at", "response", "correct_answer",
    "is_correct", "response_time_ms", "conditions", "given_arrangement"];
  const rows = results.map(item => [session.sessionId, session.participantId, 1, session.testVersion,
    item.questionNumber, item.questionId, item.questionType, item.startedAt, item.answeredAt,
    item.response, item.correctAnswer, item.isCorrect, item.responseTimeMs, item.conditions,
    item.givenArrangement]);
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

validateProblems();
updateClock();
setInterval(updateClock, 1000);
