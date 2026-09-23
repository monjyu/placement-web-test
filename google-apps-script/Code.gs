const SHEET_NAME = 'responses';
const HEADERS = [
  'received_at', 'session_id', 'participant_id', 'problem_set', 'test_version',
  'test_started_at', 'test_finished_at', 'question_number', 'question_id',
  'question_started_at', 'answered_at', 'response', 'correct_answer',
  'is_correct', 'response_time_ms', 'conditions'
];

function doGet() {
  return jsonResponse_({ status: 'ok', message: 'placement web test endpoint' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse(e.postData.contents);
    validate_(data);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    // 同じセッションが再送された場合、二重保存を避ける。
    if (hasSession_(sheet, data.sessionId))
      return jsonResponse_({ status: 'ok', message: 'already saved', duplicate: true });

    const receivedAt = new Date();
    const rows = data.responses.map(item => [
      receivedAt, safe_(data.sessionId), safe_(data.participantId), Number(data.problemSet),
      safe_(data.testVersion), safe_(data.testStartedAt), safe_(data.testFinishedAt),
      Number(item.questionNumber), safe_(item.questionId), safe_(item.startedAt),
      safe_(item.answeredAt), safe_(item.response), safe_(item.correctAnswer),
      Number(item.isCorrect), Number(item.responseTimeMs), safe_(item.conditions)
    ]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
    return jsonResponse_({ status: 'ok', savedRows: rows.length });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ status: 'error', message: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function validate_(data) {
  if (!data || typeof data !== 'object') throw new Error('データ形式が不正です');
  if (!data.sessionId || !data.participantId) throw new Error('IDが不足しています');
  if (data.consent !== true) throw new Error('同意が確認できません');
  if (!Array.isArray(data.responses) || data.responses.length !== 10)
    throw new Error('回答数が10問ではありません');
  data.responses.forEach((item, index) => {
    if (Number(item.questionNumber) !== index + 1) throw new Error('問題番号が不正です');
    if (!/^[A-F]{4,6}$/.test(String(item.response))) throw new Error('回答形式が不正です');
    if (!Number.isFinite(Number(item.responseTimeMs)) || Number(item.responseTimeMs) < 0)
      throw new Error('回答時間が不正です');
  });
}

function hasSession_(sheet, sessionId) {
  if (sheet.getLastRow() < 2) return false;
  const finder = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(sessionId)).matchEntireCell(true);
  return finder.findNext() !== null;
}

function safe_(value) {
  const text = String(value == null ? '' : value);
  // スプレッドシート数式として解釈される文字列を無効化する。
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
