/* ============================================================
   組織図・名簿（LIFF）
   ------------------------------------------------------------
   組織図と委員会名簿を、LINEの中でタブを切り替えて見るだけの画面。

   ゲスト進捗・承認と同じ LIFF ID を使い、パスだけ変えて開く。
     https://liff.line.me/2010379578-AHTrNoVb/docs
   こうすると LIFF をもう1つ作らなくて済む。

   ※ 誰が見られるかは、この画面では決まりません。
   　 Firestore の members に登録された役職（三役・監査・顧問・幹事・
   　 委員会リーダー/サブ）で決まります。サーバー側で LINE の
   　 IDトークンを検証しているので、URLを知っているだけでは中身が返りません。

   ※ ここはメッセージではなくウェブページなので、
   　 トーク履歴に氏名が残りません。会の方針
   　 「会員の氏名をLINE配信に載せない」と矛盾しない形です。
   ============================================================ */
const LIFF_ID = "2010379578-AHTrNoVb";   // ゲスト進捗と同じ LIFF。パスだけ変えて開く
const API_ENDPOINT = "https://ao-i.vercel.app/api/documents";          // ← aoi アプリの API

const el = {
  who: document.getElementById("who"),
  tabs: document.getElementById("tabs"),
  loading: document.getElementById("loading"),
  denied: document.getElementById("denied"),
  deniedMsg: document.getElementById("deniedMsg"),
  error: document.getElementById("error"),
  errorMsg: document.getElementById("errorMsg"),
  retryBtn: document.getElementById("retryBtn"),
  viewer: document.getElementById("viewer"),
  viewerBody: document.getElementById("viewerBody"),
  pdfName: document.getElementById("pdfName"),
};

let idToken = null;
/* 一度読んだ資料は覚えておく。タブを行き来するたびに取りに行かない */
const cache = {};

/* ---------- 画面の切り替え ---------- */
function show(which) {
  for (const key of ["loading", "denied", "error", "viewer"]) {
    el[key].hidden = key !== which;
  }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------- サーバーとのやり取り ---------- */
async function callApi(payload) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ idToken: idToken }, payload)),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* 本文が無いこともある */ }

  if (res.status === 403) {
    const err = new Error((data && data.message) || "この資料は役職者の方がご覧になれます。");
    err.denied = true;
    throw err;
  }
  if (res.status === 401) {
    const err = new Error("ご本人の確認ができませんでした。LINEから開き直してください。");
    err.denied = true;
    throw err;
  }
  if (!res.ok || !data || !data.ok) {
    throw new Error("うまく読み込めませんでした。電波の良いところでもう一度おためしください。");
  }
  return data;
}

/* ---------- タブ ---------- */
/** タブの見出しは短くする。「令和9年度 委員会名簿」→「委員会名簿」 */
function tabLabel(title) {
  return String(title).replace(/^令和\d+年度\s*/, "");
}

function buildTabs(documents) {
  el.tabs.innerHTML = documents.map((doc, i) =>
    '<button class="tab" role="tab" data-slug="' + esc(doc.slug) + '"' +
    ' aria-selected="' + (i === 0 ? "true" : "false") + '">' +
    esc(tabLabel(doc.title)) + "</button>"
  ).join("");

  for (const btn of el.tabs.querySelectorAll(".tab")) {
    btn.addEventListener("click", () => selectTab(btn.dataset.slug));
  }
  el.tabs.hidden = documents.length < 1;
}

function markActive(slug) {
  for (const btn of el.tabs.querySelectorAll(".tab")) {
    btn.setAttribute("aria-selected", btn.dataset.slug === slug ? "true" : "false");
  }
}

/* ---------- 資料の表示 ---------- */
function render(doc) {
  /* 資料のHTMLはまるごと1枚のページとして作られているので、
     こちらのページの見た目を壊さないよう iframe の中で開く。
     srcdoc なのでネットワークには出ず、サーバーから受け取った中身だけを描く。 */
  const frame = document.createElement("iframe");
  frame.className = "sheet";
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.srcdoc = doc.html;
  frame.addEventListener("load", () => {
    try {
      frame.style.height = frame.contentDocument.documentElement.scrollHeight + "px";
    } catch (_) { frame.style.height = "1400px"; }
  });

  el.viewerBody.innerHTML = "";
  el.viewerBody.appendChild(frame);
  el.pdfName.textContent = doc.pdfName || "";
  show("viewer");
}

async function selectTab(slug) {
  markActive(slug);
  if (cache[slug]) { render(cache[slug]); window.scrollTo(0, 0); return; }

  show("loading");
  try {
    const data = await callApi({ action: "get", slug: slug });
    cache[slug] = data.document;
    render(data.document);
    window.scrollTo(0, 0);
  } catch (error) {
    fail(error);
  }
}

/* ---------- 起動 ---------- */
async function loadList() {
  const data = await callApi({ action: "list" });
  el.who.textContent = data.name ? data.name + " さん" : "役職者の方";

  const documents = data.documents || [];
  if (documents.length === 0) {
    el.errorMsg.textContent = "まだ資料が入っていません。";
    show("error");
    return;
  }
  buildTabs(documents);
  await selectTab(documents[0].slug);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function fail(error) {
  el.tabs.hidden = true;
  el.who.textContent = "";
  if (error && error.denied) {
    el.deniedMsg.textContent = error.message;
    show("denied");
    return;
  }
  el.errorMsg.textContent = (error && error.message) || "うまく読み込めませんでした。";
  show("error");
}

async function start() {
  show("loading");
  try {
    await withTimeout(liff.init({ liffId: LIFF_ID }), 10000);
    if (!liff.isLoggedIn()) { liff.login(); return; }
    idToken = liff.getIDToken();
    if (!idToken) throw new Error("ご本人の確認ができませんでした。LINEから開き直してください。");
    await loadList();
  } catch (error) {
    fail(error);
  }
}

el.retryBtn.addEventListener("click", () => { start(); });

start();
