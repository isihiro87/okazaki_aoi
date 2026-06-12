/* ============================================================
   会員情報 登録フォーム(LIFF)
   ------------------------------------------------------------
   LINE内で開き、氏名・役職・委員会を登録して GAS(スプレッドシート)へ保存する。
   ↓ 2か所を実値に差し替えてください。
   ============================================================ */
const LIFF_ID = "2010379578-SHlRwAxA";                                  // ← LINE Developers の LIFF ID
const GAS_ENDPOINT = "https://script.google.com/macros/s/XXXXXXXX/exec"; // ← GAS WebアプリのURL

/* 役職(倫理法人会内)。並び順そのまま表示。最後の「その他」選択で自由入力欄を表示 */
const ROLES = [
  "顧問", "副顧問",
  "会長", "副会長",
  "専任幹事", "副専任幹事",
  "事務長", "副事務長",
  "監査", "幹事", "運営委員", "会員",
  "その他",
];

/* 委員会。最後の「その他」選択で自由入力欄を表示 */
const COMMITTEES = [
  "MS委員会", "朝礼委員会", "広報委員会", "研修委員会", "女性委員会", "その他",
];

const OTHER = "その他";

/* ---- 画面組み立て ---- */
function buildOptions(select, items, placeholder) {
  select.innerHTML =
    '<option value="" disabled selected>' + placeholder + "</option>" +
    items.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");
}

const roleSelect = document.getElementById("role");
const committeeSelect = document.getElementById("committee");
const roleOther = document.getElementById("roleOther");
const committeeOther = document.getElementById("committeeOther");

buildOptions(roleSelect, ROLES, "選択してください");
buildOptions(committeeSelect, COMMITTEES, "選択してください");

// 「その他」選択時だけ自由入力欄を出す
function toggleOther(select, otherWrap) {
  const show = select.value === OTHER;
  otherWrap.hidden = !show;
  otherWrap.querySelector("input").required = show;
}
roleSelect.addEventListener("change", function () { toggleOther(roleSelect, roleOther); });
committeeSelect.addEventListener("change", function () { toggleOther(committeeSelect, committeeOther); });

/* ---- LIFF 初期化(LINEユーザーIDの取得) ---- */
async function initLiff() {
  const note = document.getElementById("note");
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    const profile = await liff.getProfile();
    document.getElementById("lineUserId").value = profile.userId;
    document.getElementById("lineDisplayName").value = profile.displayName;
    document.getElementById("greet").textContent = profile.displayName + " さん、ご登録をお願いします。";
  } catch (e) {
    // LINE外(PCブラウザ等)で開いた場合：テスト入力は可能。保存時にIDは空のまま。
    note.textContent = "※ LINEアプリ内で開くと、お名前の自動連携や送信後の自動クローズが有効になります。";
  }
}
initLiff();

/* ---- 送信 ---- */
const form = document.getElementById("regForm");
const doneBox = document.getElementById("done");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "送信中…";

  const role = roleSelect.value === OTHER ? roleOther.querySelector("input").value.trim() : roleSelect.value;
  const committee = committeeSelect.value === OTHER ? committeeOther.querySelector("input").value.trim() : committeeSelect.value;
  const committeeRoles = Array.prototype.map
    .call(document.querySelectorAll('input[name="committeeRole"]:checked'), function (c) { return c.value; })
    .join("・"); // 例: "リーダー" / "サブリーダー" / "リーダー・サブリーダー"

  const payload = {
    lineUserId: document.getElementById("lineUserId").value,
    lineDisplayName: document.getElementById("lineDisplayName").value,
    name: document.getElementById("name").value.trim(),
    company: document.getElementById("company").value.trim(),
    role: role,
    committee: committee,
    committeeRole: committeeRoles,
  };

  try {
    // GAS は text/plain で受けるとプリフライト不要。doPost 側で JSON.parse する。
    await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    form.hidden = true;
    doneBox.hidden = false;
    if (typeof liff !== "undefined" && liff.isInClient && liff.isInClient()) {
      setTimeout(function () { liff.closeWindow(); }, 1800);
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "登録する";
    alert("送信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。");
  }
});
