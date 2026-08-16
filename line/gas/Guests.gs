/* ============================================================
   ⚠ このファイルは使っていません（2026/8/15 時点）
   ------------------------------------------------------------
   Google が Apps Script の承認をアカウント側でブロックし、
   最小権限のスクリプトすら実行できなかったため、Apps Script をやめました。
   ゲスト進捗ボードの実体は **aoi アプリの API + Firestore** に移しています。

   　現在の実装: aoi/src/app/api/guests/route.ts
   　　　　　　  aoi/src/lib/guests/repository.ts
   　　　　　　  aoi/src/lib/line/verifyIdToken.ts

   将来 Apps Script が使えるようになっても、戻す必要はありません。
   CLAUDE.md の「データ基盤は Firestore ひとつ」に沿うのは今の形です。
   経緯の記録として残してあります。appsscript.json も同じ理由で未使用です。
   ============================================================ */

/* ============================================================
   ゲスト進捗ボード の受け口（Google Apps Script）
   ------------------------------------------------------------
   LIFF（line/liff-guests/）から呼ばれ、guests シートを読み書きする。

   ★ここが liff-register の Code.gs といちばん違うところ★
   　ゲスト表には氏名・会社名という個人情報が入ります。
   　ウェブアプリは「アクセスできるユーザー:全員」で公開せざるを得ないため、
   　**LINEのIDトークンをサーバー側で検証**し、allow シートに載っている人の
   　リクエストだけを通します。画面から送られてくるユーザーIDは信用しません。

   セットアップ
   　0. ★対象のスプレッドシートを開き、「拡張機能 > Apps Script」から貼ること。
   　　 　（スプレッドシートに紐づいていないと動きません。権限を最小にするためです）
   　1. Apps Script の「⚙ プロジェクトの設定 > スクリプト プロパティ」に1つ追加する
   　　 　LINE_CHANNEL_ID … LINEログインチャネルの「チャネルID」（LIFFが乗っているチャネル）
   　　 ★このファイルに直接書かないこと。GitHubに公開されうるため。
   　2. エディタで関数 setup を選んで実行 → guests / allow シートが作られる
   　3. 「デプロイ > 新しいデプロイ > 種類:ウェブアプリ」
   　　 　次のユーザーとして実行:自分／アクセスできるユーザー:全員
   　4. 発行された URL を liff-guests/js/app.js の GAS_ENDPOINT に設定

   ⚠ doGet にデータを返す処理を足さないこと。
   　 ウェブアプリは「全員」に公開されているため、doGet で一覧を返すと
   　 URLを知っているだけで全部読めてしまう。読み書きは必ず doPost（＋認証）を通す。
   ============================================================ */

function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) {
    throw new Error(
      "スクリプトプロパティ「" + key + "」が未設定です。" +
      "⚙プロジェクトの設定 > スクリプト プロパティ から追加してください。"
    );
  }
  return v;
}

const GUEST_SHEET = "guests";
const ALLOW_SHEET = "allow";

const GUEST_HEADERS = [
  "ゲストID", "ゲスト名", "ふりがな", "会社名", "市区町村", "業種",
  "紹介者", "初回来訪日", "ステータス", "次のアクション", "担当", "メモ",
  "更新日時", "更新者",
];

const ALLOW_HEADERS = ["LINEユーザーID", "氏名", "備考"];

/* 選べるステータス。画面側（app.js の STATUSES）と必ず同じにすること */
const STATUSES = ["声かけ中", "参加予定", "参加した", "2回目以降", "入会", "見送り"];


/* ============================================================
   初回セットアップ
   エディタで関数「setup」を選んで▶実行すると、必要なシートを作ります。
   すでにある場合は何もしません（中身は消えません）。
   ============================================================ */
function setup() {
  const gs = sheet_(GUEST_SHEET, GUEST_HEADERS);
  const as = sheet_(ALLOW_SHEET, ALLOW_HEADERS);

  // 見出し行を固定して見やすくする
  [gs, as].forEach(function (sh) {
    if (sh.getFrozenRows() === 0) sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight("bold");
  });

  // ステータス列（I列）はプルダウンにして表記ゆれを防ぐ
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  gs.getRange(2, 9, 500, 1).setDataValidation(rule);

  Logger.log("guests / allow シートを用意しました。次は allow シートに担当者を追加してください。");
}


/* ---------- シート ---------- */

function sheet_(name, headers) {
  // このスクリプトが紐づいているスプレッドシートだけを開く。
  // openById を使うと「すべてのスプレッドシートへのアクセス」を求めることになり、
  // Google に「このアプリはブロックされます」と止められる原因になる。
  const ss = SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error(
      "スプレッドシートに紐づいていません。" +
      "対象のスプレッドシートを開き、拡張機能 > Apps Script からこのコードを貼り直してください。"
    );
  }
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

/* ---------- 認証：IDトークンを LINE に問い合わせて検証 ---------- */

function verifyIdToken_(idToken) {
  if (!idToken) return null;
  const res = UrlFetchApp.fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "post",
    payload: { id_token: idToken, client_id: prop_("LINE_CHANNEL_ID") },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  const p = JSON.parse(res.getContentText());
  if (!p.sub) return null;
  return { userId: p.sub, displayName: p.name || "" };
}

/* allow シートに載っている人か */
function findAllowed_(userId) {
  const rows = sheet_(ALLOW_SHEET, ALLOW_HEADERS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === userId) {
      return { userId: userId, name: String(rows[i][1] || "").trim() };
    }
  }
  return null;
}

/* 認証を通した人だけを返す。通らなければ null */
function authenticate_(d) {
  const verified = verifyIdToken_(d.idToken);
  if (!verified) return null;
  const allowed = findAllowed_(verified.userId);
  if (!allowed) return null;
  return { userId: verified.userId, name: allowed.name || verified.displayName };
}

/* ---------- 一覧 ---------- */

function listGuests_(me) {
  const sh = sheet_(GUEST_SHEET, GUEST_HEADERS);
  const values = sh.getDataRange().getValues();
  const out = [];
  const idFills = []; // ID が空の行にあとで採番して書き戻す

  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!String(r[1] || "").trim()) continue; // ゲスト名が空の行は飛ばす
    let id = String(r[0] || "").trim();
    if (!id) {
      id = "g" + ("000" + i).slice(-3);
      idFills.push({ row: i + 1, id: id });
    }
    out.push({
      id: id,
      name: String(r[1] || ""),
      kana: String(r[2] || ""),
      company: String(r[3] || ""),
      city: String(r[4] || ""),
      industry: String(r[5] || ""),
      referrer: String(r[6] || ""),
      firstVisit: fmtDate_(r[7]),
      status: String(r[8] || ""),
      nextAction: String(r[9] || ""),
      owner: String(r[10] || ""),
      memo: String(r[11] || ""),
      updatedAt: fmtDate_(r[12]),
      updatedBy: String(r[13] || ""),
    });
  }
  idFills.forEach(function (f) {
    sh.getRange(f.row, 1).setValue(f.id);
  });
  return { ok: true, me: me.name, statuses: STATUSES, guests: out };
}

/* ---------- 更新 ---------- */

function updateGuest_(d, me) {
  if (d.status && STATUSES.indexOf(d.status) === -1) {
    return { ok: false, error: "不明なステータスです" };
  }
  const sh = sheet_(GUEST_SHEET, GUEST_HEADERS);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() !== String(d.id).trim()) continue;
    const row = i + 1;
    if (d.status !== undefined) sh.getRange(row, 9).setValue(d.status);
    if (d.nextAction !== undefined) sh.getRange(row, 10).setValue(d.nextAction);
    if (d.owner !== undefined) sh.getRange(row, 11).setValue(d.owner);
    if (d.memo !== undefined) sh.getRange(row, 12).setValue(d.memo);
    sh.getRange(row, 13).setValue(new Date());
    sh.getRange(row, 14).setValue(me.name);
    return { ok: true, id: d.id, updatedBy: me.name };
  }
  return { ok: false, error: "該当のゲストが見つかりません" };
}

/* ---------- 追加 ---------- */

function addGuest_(d, me) {
  const sh = sheet_(GUEST_SHEET, GUEST_HEADERS);
  const id = "g" + ("000" + (sh.getLastRow() + 1)).slice(-3);
  sh.appendRow([
    id, d.name || "", d.kana || "", d.company || "", d.city || "", d.industry || "",
    d.referrer || "", d.firstVisit || "", d.status || STATUSES[0],
    d.nextAction || "", d.owner || "", d.memo || "", new Date(), me.name,
  ]);
  return { ok: true, id: id };
}

/* ---------- 入口 ---------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    const me = authenticate_(d);
    if (!me) return json_({ ok: false, error: "unauthorized" });

    if (d.action === "list") return json_(listGuests_(me));
    if (d.action === "update") return json_(updateGuest_(d, me));
    if (d.action === "add") return json_(addGuest_(d, me));
    return json_({ ok: false, error: "不明な操作です" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* 疎通確認用。★データは一切返さない（理由は冒頭の注意書き）★ */
function doGet() {
  return json_({ ok: true, service: "okazaki-aoi-rinri guest board" });
}

/* ---------- 小物 ---------- */

function fmtDate_(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) !== "[object Date]") return String(v);
  return Utilities.formatDate(v, "Asia/Tokyo", "yyyy/MM/dd");
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
