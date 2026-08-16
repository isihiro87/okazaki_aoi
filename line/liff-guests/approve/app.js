/* ============================================================
   登録の承認（LIFF）
   ------------------------------------------------------------
   自己申告で役員を名乗った方を、専任幹事がその場で承認する画面。

   ゲスト進捗と同じ LIFF ID を使い、パスだけ変えて開く。
     https://liff.line.me/2010379578-AHTrNoVb/approve
   こうすると LIFF をもう1つ作らなくて済む。

   ※ 承認できるのは役員以上。サーバー側（/api/members）で判定している。
   ============================================================ */
const LIFF_ID = "2010379578-AHTrNoVb";
const API_ENDPOINT = "https://ao-i.vercel.app/api/members";

const KIND_LABELS = {
  aoi: "岡崎市葵の会員",
  guest: "ゲスト",
  other_kai: "他単会",
};

const el = {
  who: document.getElementById("who"),
  msg: document.getElementById("msg"),
  list: document.getElementById("list"),
  toast: document.getElementById("toast"),
};

let idToken = "";
let pending = [];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function toast(text) {
  el.toast.textContent = text;
  el.toast.hidden = false;
  setTimeout(function () { el.toast.hidden = true; }, 2200);
}

async function call(payload) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ idToken: idToken }, payload)),
  });
  return res.json();
}

function render() {
  if (!pending.length) {
    el.msg.textContent = "承認待ちの方はいません。";
    el.list.innerHTML = "";
    return;
  }
  el.msg.textContent = pending.length + "名が承認待ちです";
  el.list.innerHTML = pending.map(function (p) {
    const lines = [
      KIND_LABELS[p.kind] || p.kind,
      p.company,
      p.position,
      (p.committees || []).join("／"),
      p.kaiName,
    ].filter(Boolean).join("　/　");

    return '' +
      '<article class="card is-open" data-id="' + esc(p.lineUserId) + '">' +
        '<div class="card-head" style="cursor:default">' +
          '<span class="card-main">' +
            '<span class="nm">' + esc(p.name || "（お名前なし）") + "</span>" +
            '<span class="sub">' + esc(lines) + "</span>" +
          "</span>" +
        "</div>" +
        '<div class="body">' +
          '<button type="button" class="save" data-yes>この内容で承認する</button>' +
          '<div class="danger">' +
            '<button type="button" class="del-open" data-no>保留にする（未承認のまま）</button>' +
          "</div>" +
        "</div>" +
      "</article>";
  }).join("");
}

el.list.addEventListener("click", async function (e) {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;

  const yes = e.target.closest("[data-yes]");
  const no = e.target.closest("[data-no]");
  if (!yes && !no) return;

  const btn = yes || no;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "処理中…";
  try {
    const r = await call({ action: "approve", targetId: id, approve: Boolean(yes) });
    if (!r.ok) throw new Error(r.error || "できませんでした");
    if (yes) {
      pending = pending.filter(function (p) { return p.lineUserId !== id; });
      render();
      toast("承認しました");
    } else {
      btn.disabled = false;
      btn.textContent = label;
      toast("未承認のままにしました");
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = label;
    toast(String(err.message || err));
  }
});

async function start() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
    idToken = liff.getIDToken();
  } catch (err) {
    el.msg.textContent = "LINEアプリの中から開いてください。";
    el.who.textContent = "";
    return;
  }
  if (!idToken) {
    el.msg.textContent = "本人確認の情報を取得できませんでした（LIFFのScopeに openid が必要です）。";
    el.who.textContent = "";
    return;
  }

  try {
    const r = await call({ action: "pending" });
    if (!r.ok) {
      el.msg.textContent = r.error === "unauthorized"
        ? "この画面は役員のみが開けます。"
        : "読み込めませんでした。時間をおいてお試しください。";
      el.who.textContent = "";
      return;
    }
    el.who.textContent = r.me ? r.me + " さん" : "";
    pending = r.pending || [];
    render();
  } catch (err) {
    el.msg.textContent = "サーバーに接続できませんでした。";
  }
}
start();
