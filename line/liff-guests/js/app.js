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

/* 進み具合として選ぶのはこの4つ。
   「入会」と「見送り」は進み具合ではなく結論なので、下のボタンで移す。 */
const PROGRESS = ["声かけ中", "参加予定", "参加した", "2回目以降"];
const JOINED = "入会";
const LOST = "見送り";
/* リストへ戻したときの既定 */
const BACK_TO_GUEST = "声かけ中";

/* カードを開いたらすぐ直せる欄 */
const NAME_FIELD = ["name", "お名前", "例）名古 承悟"];

/* 折りたたみの中に置く欄。［data属性名, 見出し, 例示］ */
const FIELDS = [
  ["kana", "ふりがな", "例）なご しょうご"],
  ["company", "会社・事業", "例）ヤマナ運輸株式会社"],
  ["city", "市区町村", "例）岡崎市福岡町"],
  ["industry", "業種", "例）運送業"],
  ["referrer", "紹介者", "例）神道 裕"],
  ["firstVisit", "初回来訪日", "例）2026-07-30"],
];

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
let filter = "guest";
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
function inGuestList(g) {
  return g.status !== JOINED && g.status !== LOST;
}

/* 氏名の表記ゆれを吸収する。
   紹介者欄はチラシや記録から起こした自由入力なので、
   会員登録の氏名（例「石本 大貴」）と形が違う（例「石本大貴」）。 */
function normName(v) {
  return String(v == null ? "" : v).normalize("NFKC").replace(/\s/g, "");
}

/** その人が担当・紹介者にあたるか。IDがあればIDを優先する */
function isMine(g) {
  if (g.ownerId && g.ownerId === myUserId) return true;
  const n = normName(me);
  if (!n) return false;
  return normName(g.owner).indexOf(n) >= 0 || normName(g.referrer).indexOf(n) >= 0;
}

function visible() {
  if (filter === "joined") return guests.filter(function (g) { return g.status === JOINED; });
  if (filter === "lost") return guests.filter(function (g) { return g.status === LOST; });
  if (filter === "mine") return guests.filter(isMine);
  return guests.filter(inGuestList);
}

const EMPTY_MESSAGE = {
  guest: "ゲストリストは空です。",
  joined: "入会された方はまだいません。",
  lost: "見込み無しに入れた方はいません。",
  mine: "あなたが紹介・担当しているゲストはいません。",
};

function cardHtml(g) {
  const open = g.id === openId;
  const sub = [g.company, g.referrer ? "紹介：" + g.referrer : "", g.firstVisit ? "初回 " + g.firstVisit : ""]
    .filter(Boolean).join("　/　");

  const picks = PROGRESS.map(function (s) {
    return '<button type="button" class="pick' + (s === g.status ? " is-on" : "") +
      '" data-pick="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");

  const fieldHtml = function (f) {
    return '<label class="sec"><span class="lbl">' + esc(f[1]) + "</span>" +
      '<input type="text" data-f="' + f[0] + '" value="' + esc(g[f[0]]) +
      '" placeholder="' + esc(f[2]) + '"></label>';
  };
  const basics = FIELDS.map(fieldHtml).join("");

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
        fieldHtml(NAME_FIELD) +
        '<div class="sec"><span class="lbl">いまの進み具合</span>' +
          '<div class="picks">' + picks + "</div></div>" +
        '<label class="sec"><span class="lbl">次にやること</span>' +
          '<input type="text" data-f="nextAction" value="' + esc(g.nextAction) +
          '" placeholder="例）8/20のMSにお誘いする"></label>' +
        '<label class="sec"><span class="lbl">担当</span>' +
          '<input type="text" data-f="owner" value="' + esc(g.owner) + '" placeholder="例）神道 裕"></label>' +
        '<label class="sec"><span class="lbl">メモ</span>' +
          '<textarea data-f="memo" placeholder="話したこと・様子など">' + esc(g.memo) + "</textarea></label>" +
        '<details class="more"><summary>会社・紹介者・初回来訪日などを直す</summary>' + basics + "</details>" +
        '<button type="button" class="save" data-save>保存する</button>' +
        '<p class="meta">' +
          (g.updatedAt ? "最終更新 " + esc(fmtWhen(g.updatedAt)) + (g.updatedBy ? "（" + esc(g.updatedBy) + "）" : "") : "未更新") +
        "</p>" +
        claimButton(g) +
        moveButtons(g) +
        '<div class="danger">' +
          '<button type="button" class="del-open" data-del-open>このゲストを削除する</button>' +
          '<div class="del-confirm" hidden>' +
            "<p>削除すると元に戻せません。よろしいですか。</p>" +
            '<button type="button" class="del-yes" data-del-yes>削除する</button>' +
            '<button type="button" class="del-no" data-del-no>やめる</button>' +
          "</div>" +
        "</div>" +
      "</div>" +
    "</article>";
}

/** ISO日時を「2026/08/16」に丸める。「たった今」などはそのまま返す */
function fmtWhen(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + "/" + m[2] + "/" + m[3] : value;
}

/** リストを移すボタン。いまどのリストに居るかで出し分ける */
/** 担当の引き受け。氏名ではなくIDで結ぶので、あとで表記が変わっても外れない */
function claimButton(g) {
  const mine = g.ownerId && g.ownerId === myUserId;
  return '<div class="claim">' +
    (mine
      ? '<button type="button" class="move back" data-claim="0">担当を外れる</button>' +
        '<span class="claim-now">あなたが担当です</span>'
      : '<button type="button" class="move back" data-claim="1">自分が担当する</button>' +
        (g.owner ? '<span class="claim-now">いまの担当：' + esc(g.owner) + "</span>" : "")) +
    "</div>";
}

function moveButtons(g) {
  if (g.status === JOINED || g.status === LOST) {
    return '<div class="moves"><button type="button" class="move back" data-move="">' +
      "ゲストリストに戻す</button></div>";
  }
  return '<div class="moves">' +
    '<button type="button" class="move join" data-move="' + JOINED + '">入会された</button>' +
    '<button type="button" class="move lost" data-move="' + LOST + '">見込み無しに入れる</button>' +
    "</div>";
}

function render() {
  const rows = visible();
  el.msg.textContent = rows.length ? rows.length + "名" : (EMPTY_MESSAGE[filter] || "該当がありません。");
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

  // ---- 担当を引き受ける／外れる ----
  const claim = e.target.closest("[data-claim]");
  if (claim) {
    const want = claim.dataset.claim === "1";
    claim.disabled = true;
    const label = claim.textContent;
    claim.textContent = "処理中…";
    try {
      const r = await call({ action: "claim", id: id, claim: want });
      if (!r.ok) throw new Error(r.error || "できませんでした");
      const g = guests.find(function (x) { return x.id === id; });
      g.ownerId = want ? myUserId : "";
      g.owner = want ? me : "";
      g.updatedBy = me;
      g.updatedAt = "たった今";
      render();
      toast(want ? "担当になりました" : "担当を外れました");
    } catch (err) {
      claim.disabled = false;
      claim.textContent = label;
      toast(String(err.message || err));
    }
    return;
  }

  // ---- リストを移す ----
  const move = e.target.closest("[data-move]");
  if (move) {
    const next = move.dataset.move === "" ? BACK_TO_GUEST : move.dataset.move;
    move.disabled = true;
    const label = move.textContent;
    move.textContent = "移動中…";
    try {
      const r = await call({ action: "update", id: id, status: next });
      if (!r.ok) throw new Error(r.error || "移動できませんでした");
      const g = guests.find(function (x) { return x.id === id; });
      g.status = next;
      g.updatedBy = me;
      g.updatedAt = "たった今";
      openId = null;
      render();
      toast(
        next === JOINED ? "入会者リストへ移しました"
          : next === LOST ? "見込み無しリストへ移しました"
          : "ゲストリストへ戻しました"
      );
    } catch (err) {
      move.disabled = false;
      move.textContent = label;
      toast(String(err.message || err));
    }
    return;
  }

  // ---- 削除は二段構え ----
  if (e.target.closest("[data-del-open]")) {
    card.querySelector(".del-confirm").hidden = false;
    card.querySelector(".del-open").hidden = true;
    return;
  }
  if (e.target.closest("[data-del-no]")) {
    card.querySelector(".del-confirm").hidden = true;
    card.querySelector(".del-open").hidden = false;
    return;
  }
  const delYes = e.target.closest("[data-del-yes]");
  if (delYes) {
    delYes.disabled = true;
    delYes.textContent = "削除中…";
    try {
      const r = await call({ action: "delete", id: id });
      if (!r.ok) throw new Error(r.error || "削除できませんでした");
      guests = guests.filter(function (x) { return x.id !== id; });
      openId = null;
      render();
      toast("削除しました");
    } catch (err) {
      delYes.disabled = false;
      delYes.textContent = "削除する";
      toast(String(err.message || err));
    }
    return;
  }

  // ---- 保存 ----
  const save = e.target.closest("[data-save]");
  if (save) {
    const on = card.querySelector("[data-pick].is-on");
    const payload = { action: "update", id: id, status: on ? on.dataset.pick : "" };
    card.querySelectorAll("[data-f]").forEach(function (input) {
      payload[input.dataset.f] = input.value.trim();
    });

    if (!payload.name) {
      toast("お名前は空にできません");
      return;
    }

    save.disabled = true;
    save.textContent = "保存中…";
    try {
      const r = await call(payload);
      if (!r.ok) throw new Error(r.error || "保存できませんでした");
      const g = guests.find(function (x) { return x.id === id; });
      Object.keys(payload).forEach(function (k) {
        if (k !== "action" && k !== "id") g[k] = payload[k];
      });
      g.updatedBy = me;
      g.updatedAt = "たった今";
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
    if (r.myUserId) myUserId = r.myUserId;
    guests = r.guests || [];
    el.who.textContent = me ? me + " さん" : "";
    el.tabs.hidden = false;
    render();
  } catch (err) {
    fail("サーバーに接続できませんでした。電波状況をご確認ください。", err);
  }
}
start();
