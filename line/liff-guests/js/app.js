/* ============================================================
   ゲスト進捗ボード（LIFF）
   ------------------------------------------------------------
   LINE内で開き、ゲストの進み具合を見て・変えるだけの画面。
   ↓ 2か所を実値に差し替えてください。

   ※ 誰が使えるかは、この画面では決まりません。
   　 Firestore の members に登録された役職（役員以上）で決まります。
   　 サーバー側で LINE の IDトークンを検証しているので、
   　 URL を知っているだけの人にはデータが返りません。
   ============================================================ */
const LIFF_ID = "2010379578-AHTrNoVb";                              // ← LINE Developers の LIFF ID
const API_ENDPOINT = "https://ao-i.vercel.app/api/guests";          // ← aoi アプリの API

/* aoi 側（src/lib/guests/repository.ts）の GUEST_STATUSES と必ず同じにすること */
const STATUSES = ["声かけ中", "参加予定", "参加した", "2回目以降", "入会", "見送り"];
/* 「要フォロー」タブに出すステータス（＝まだ結論が出ていない人） */
const FOLLOW = ["声かけ中", "参加予定", "参加した", "2回目以降"];

const el = {
  who: document.getElementById("who"),
  tabs: document.getElementById("tabs"),
  msg: document.getElementById("msg"),
  list: document.getElementById("list"),
  toast: document.getElementById("toast"),
};

let idToken = "";
let myUserId = "";
let me = "";
let guests = [];
let filter = "follow";
let openId = null;

/* ---- 通信 ---- */
async function call(payload) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ idToken: idToken }, payload)),
  });
  return res.json();
}

function toast(text) {
  el.toast.textContent = text;
  el.toast.hidden = false;
  setTimeout(function () { el.toast.hidden = true; }, 2200);
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ---- 描画 ---- */
function visible() {
  if (filter === "all") return guests;
  if (filter === "mine") {
    return guests.filter(function (g) {
      return (g.referrer && g.referrer.indexOf(me) >= 0) || (g.owner && g.owner.indexOf(me) >= 0);
    });
  }
  return guests.filter(function (g) { return FOLLOW.indexOf(g.status) >= 0 || !g.status; });
}

function cardHtml(g) {
  const open = g.id === openId;
  const sub = [g.company, g.referrer ? "紹介：" + g.referrer : "", g.firstVisit ? "初回 " + g.firstVisit : ""]
    .filter(Boolean).join("　/　");

  const picks = STATUSES.map(function (s) {
    return '<button type="button" class="pick' + (s === g.status ? " is-on" : "") +
      '" data-pick="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");

  return '' +
    '<article class="card' + (open ? " is-open" : "") + '" data-id="' + esc(g.id) + '">' +
      '<button type="button" class="card-head" data-toggle>' +
        '<span class="card-main">' +
          '<span class="nm">' + esc(g.name) + "</span>" +
          (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") +
        "</span>" +
        '<span class="badge" data-s="' + esc(g.status) + '">' + esc(g.status || "未設定") + "</span>" +
      "</button>" +
      '<div class="body"' + (open ? "" : " hidden") + ">" +
        '<div class="sec"><span class="lbl">いまの進み具合</span>' +
          '<div class="picks">' + picks + "</div></div>" +
        '<div class="sec"><span class="lbl">次にやること</span>' +
          '<input type="text" data-next value="' + esc(g.nextAction) + '" placeholder="例）8/20のMSにお誘いする"></div>' +
        '<div class="sec"><span class="lbl">担当</span>' +
          '<input type="text" data-owner value="' + esc(g.owner) + '" placeholder="例）神道 裕"></div>' +
        '<div class="sec"><span class="lbl">メモ</span>' +
          '<textarea data-memo placeholder="話したこと・様子など">' + esc(g.memo) + "</textarea></div>" +
        '<button type="button" class="save" data-save>保存する</button>' +
        '<p class="meta">' +
          (g.updatedAt ? "最終更新 " + esc(g.updatedAt) + (g.updatedBy ? "（" + esc(g.updatedBy) + "）" : "") : "未更新") +
        "</p>" +
      "</div>" +
    "</article>";
}

function render() {
  const rows = visible();
  el.msg.textContent = rows.length
    ? rows.length + "名"
    : (filter === "mine" ? "あなたが紹介・担当しているゲストはいません。" : "該当するゲストはいません。");
  el.list.innerHTML = rows.map(cardHtml).join("");
}

/* ---- 操作 ---- */
el.tabs.addEventListener("click", function (e) {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  Array.prototype.forEach.call(el.tabs.children, function (b) { b.classList.remove("is-on"); });
  btn.classList.add("is-on");
  filter = btn.dataset.filter;
  render();
});

el.list.addEventListener("click", async function (e) {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.closest("[data-toggle]")) {
    openId = openId === id ? null : id;
    render();
    return;
  }

  const pick = e.target.closest("[data-pick]");
  if (pick) {
    card.querySelectorAll("[data-pick]").forEach(function (b) { b.classList.remove("is-on"); });
    pick.classList.add("is-on");
    return;
  }

  const save = e.target.closest("[data-save]");
  if (save) {
    const on = card.querySelector("[data-pick].is-on");
    const payload = {
      action: "update",
      id: id,
      status: on ? on.dataset.pick : "",
      nextAction: card.querySelector("[data-next]").value.trim(),
      owner: card.querySelector("[data-owner]").value.trim(),
      memo: card.querySelector("[data-memo]").value.trim(),
    };
    save.disabled = true;
    save.textContent = "保存中…";
    try {
      const r = await call(payload);
      if (!r.ok) throw new Error(r.error || "保存できませんでした");
      const g = guests.find(function (x) { return x.id === id; });
      Object.assign(g, {
        status: payload.status, nextAction: payload.nextAction,
        owner: payload.owner, memo: payload.memo,
        updatedAt: "たった今", updatedBy: me,
      });
      openId = null;
      render();
      toast("保存しました");
    } catch (err) {
      save.disabled = false;
      save.textContent = "保存する";
      toast(String(err.message || err));
    }
  }
});

/* ---- 起動 ---- */

/* ログインの往復が成立せず無限ループになる事故を検知するための印。
   一度ログインへ飛ばしたのに、戻ってきてもまだ未ログインなら、
   だまってやり直さずに原因を画面へ出す（真っ白のまま回り続けるのを防ぐ）。 */
const LOOP_KEY = "aoi-guest-login-attempted";

function fail(message, detail) {
  el.who.textContent = "";
  el.tabs.hidden = true;
  el.msg.innerHTML =
    esc(message) +
    '<span class="err">' +
    "LIFF ID: " + esc(LIFF_ID) + "<br>" +
    "この画面のURL: " + esc(location.origin + location.pathname) +
    (detail ? "<br>詳細: " + esc(String(detail && detail.message ? detail.message : detail)) : "") +
    "</span>";
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error("時間内に応答がありませんでした")); }, ms);
    }),
  ]);
}

async function start() {
  if (typeof liff === "undefined") {
    fail("LINEのライブラリを読み込めませんでした。通信環境をご確認のうえ、開き直してください。");
    return;
  }

  try {
    await withTimeout(liff.init({ liffId: LIFF_ID }), 10000);
  } catch (err) {
    fail(
      "LIFFを開始できませんでした。LIFF IDと、LINE Developers に登録したエンドポイントURLが" +
      "この画面のURLと一致しているかご確認ください。",
      err
    );
    return;
  }

  if (!liff.isLoggedIn()) {
    if (sessionStorage.getItem(LOOP_KEY)) {
      // 一度ログインへ送ったのに戻ってきても未ログイン ＝ 往復が成立していない
      sessionStorage.removeItem(LOOP_KEY);
      fail(
        "LINEへのログインが完了しませんでした。次のどれかが原因です。" +
        "①エンドポイントURLの末尾の「/」の有無が登録内容と違う " +
        "②LIFFのScopeに openid が入っていない " +
        "③ブラウザでCookieがブロックされている（プライベートモードなど）"
      );
      return;
    }
    sessionStorage.setItem(LOOP_KEY, "1");
    liff.login({ redirectUri: location.href });
    return;
  }
  sessionStorage.removeItem(LOOP_KEY);

  idToken = liff.getIDToken();
  if (!idToken) {
    fail("本人確認の情報を取得できませんでした。LIFFのScopeに「openid」が入っているかご確認ください。");
    return;
  }
  try { myUserId = (await liff.getProfile()).userId; } catch (e) { myUserId = ""; }

  try {
    const r = await call({ action: "list" });
    if (!r.ok) {
      if (r.error === "unauthorized") {
        // 自分のIDを見せておくと、登録をその場で依頼できる。
        // 表示しているのは本人自身のIDなので、他人の情報は一切出ない。
        el.msg.innerHTML =
          "この画面はゲスト対応の担当者のみが見られます。<br>" +
          "ご覧になりたい方は、下のIDを専任幹事までお送りください。" +
          ((r.lineUserId || myUserId)
            ? '<span class="uid">' + esc(r.lineUserId || myUserId) + "</span>" : "");
        el.who.textContent = "";
      } else {
        fail("読み込めませんでした。時間をおいてお試しください。", r.error);
      }
      return;
    }
    me = r.me || "";
    guests = r.guests || [];
    el.who.textContent = me ? me + " さん" : "";
    el.tabs.hidden = false;
    render();
  } catch (err) {
    fail("サーバーに接続できませんでした。電波状況をご確認ください。", err);
  }
}
start();
