/* ============================================================
   会員情報 登録フォームの受け口(Google Apps Script)
   ------------------------------------------------------------
   LIFFフォームから POST された JSON を members シートに保存する。
   同じ LINEユーザーID があれば上書き(更新)、なければ追記。
   ・SHEET_ID をスプレッドシートのIDに差し替える。
   ・「デプロイ > 新しいデプロイ > 種類:ウェブアプリ」
     アクセスできるユーザー:全員 で公開し、URLを app.js の GAS_ENDPOINT に設定。
   設計書 §2.5 members 相当の列を持つ。
   ============================================================ */
const SHEET_ID = "スプレッドシートのIDをここに";
const SHEET_NAME = "members";

const HEADERS = [
  "登録日時", "LINEユーザーID", "LINE表示名",
  "氏名", "会社名", "役職", "所属委員会", "委員会役割",
];

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = getSheet_();
    const row = [
      new Date(),
      d.lineUserId || "",
      d.lineDisplayName || "",
      d.name || "",
      d.company || "",
      d.role || "",
      d.committee || "",
      d.committeeRole || "",
    ];

    // 既存(同じLINEユーザーID)があれば更新、なければ追記
    let updated = false;
    if (d.lineUserId) {
      const values = sh.getDataRange().getValues(); // 1行目はヘッダ
      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === d.lineUserId) {
          sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
          updated = true;
          break;
        }
      }
    }
    if (!updated) sh.appendRow(row);

    return json_({ ok: true, updated: updated });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 動作確認用(ブラウザでURLを開くと OK が返る)
function doGet() {
  return json_({ ok: true, service: "okazaki-aoi-rinri member registration" });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
