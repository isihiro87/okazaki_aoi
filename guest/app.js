/* ============================================================
   ゲスト様の入力フォーム（受付でQRコードから開いていただく）
   ------------------------------------------------------------
   LINEのログインは求めません。まだ友だち追加もされていない方が、
   その場で書けることを優先しています。

   合言葉は URL の ?k=… から受け取ります。
   会場に貼るQRコードにこれを含めておくので、
   お越しになった方は何も入力する必要がありません。
   ============================================================ */
const API_ENDPOINT = "https://ao-i.vercel.app/api/guest-form";

const VISIT_COUNTS = ["初めて", "2回目", "3回目", "4回目以上"];
const TRIGGERS = [
  "会員に誘われて",
  "知人・友人の紹介",
  "経営者の集い・講演会で知って",
  "チラシ・ポスターを見て",
  "ホームページ・SNSを見て",
  "以前から興味があった",
];

const $ = function (id) { return document.getElementById(id); };
const key = new URLSearchParams(location.search).get("k") || "";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

$("visitCount").innerHTML =
  '<option value="">選択してください</option>' +
  VISIT_COUNTS.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + "</option>"; }).join("");

$("triggers").innerHTML = TRIGGERS.map(function (t) {
  return '<label class="check"><input type="checkbox" value="' + esc(t) + '"><span>' + esc(t) + "</span></label>";
}).join("");

// 合言葉が無いときは入力させない（会場のQR以外から開かれた場合）
if (!key) {
  $("form").hidden = true;
  $("locked").hidden = false;
}

$("form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = $("name").value.trim();
  if (!name) { $("note").textContent = "お名前をご入力ください。"; return; }

  const triggers = [];
  $("triggers").querySelectorAll("input:checked").forEach(function (c) { triggers.push(c.value); });

  const payload = {
    key: key,
    name: name,
    kana: $("kana").value.trim(),
    company: $("company").value.trim(),
    city: $("city").value.trim(),
    industry: $("industry").value.trim(),
    referrer: $("referrer").value.trim(),
    visitCount: $("visitCount").value,
    triggers: triggers,
    memo: $("memo").value.trim(),
  };

  const btn = $("submit");
  btn.disabled = true;
  btn.textContent = "送信中…";
  $("note").textContent = "";
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error === "unauthorized"
      ? "会場でお配りしているQRコードからお進みください。"
      : (r.error || "送信できませんでした"));
    $("form").hidden = true;
    $("done").hidden = false;
    window.scrollTo(0, 0);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "送信する";
    $("note").textContent = String(err.message || err);
  }
});
