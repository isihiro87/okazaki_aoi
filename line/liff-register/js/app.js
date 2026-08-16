/* ============================================================
   登録フォーム（LIFF）
   ------------------------------------------------------------
   区分（葵の会員／ゲスト／他単会）を選び、それぞれに要る項目だけを出す。
   保存先は aoi アプリの /api/members（Firestore）。

   ※ LINEユーザーIDは画面から申告しない。IDトークンをサーバー側で検証して得る。
   　 なりすまして他人の登録を書き換えることはできない。
   ============================================================ */
const LIFF_ID = "2010379578-SHlRwAxA";                        // ← LINE Developers の LIFF ID
const API_ENDPOINT = "https://ao-i.vercel.app/api/members";   // ← aoi アプリの API

const OTHER = "その他";

/* 倫理法人会での役職。「副顧問」という役は無いので入れない */
const ROLES = [
  "顧問", "相談役",
  "会長", "副会長",
  "専任幹事", "副専任幹事",
  "事務長", "副事務長",
  "監査", "幹事", "運営委員", "会員",
  OTHER,
];

/* 令和9年度の6委員会 */
const COMMITTEES = [
  "MS委員会", "朝礼委員会", "広報委員会", "研修委員会", "女性委員会", "活性化委員会", OTHER,
];

const VISIT_COUNTS = ["初めて", "2回目", "3回目", "4回目以上"];

const TRIGGERS = [
  "会員に誘われて",
  "知人・友人の紹介",
  "経営者の集い・講演会で知って",
  "チラシ・ポスターを見て",
  "ホームページ・SNSを見て",
  "以前から興味があった",
  OTHER,
];

/* 愛知県の単会（葵を除く30単会）
   出典: docs/15_R9活動方針・計画資料/04_愛知県_単会定量データ令和8年度.md
   並びは「岡崎市（親単会）→ 三河地区 → 県資料の順」 */
const KAI_GROUPS = [
  { label: "岡崎市グループ", items: ["岡崎市"] },
  { label: "三河地区", items: ["豊橋市", "豊橋市南", "豊川市", "蒲郡市", "西尾市", "碧海"] },
  {
    label: "その他の地区",
    items: [
      "名古屋市中川区", "名古屋市南区", "名古屋市名駅", "稲沢市", "名古屋市瑞穂区",
      "名古屋市熱田・港", "名古屋市緑区", "知多北", "知多中央", "名古屋市中央",
      "名古屋市東部", "名古屋市名東区", "瀬戸・旭", "春日井市", "小牧市",
      "春日井市中央", "江南市", "一宮市", "犬山市",
      "豊田市北", "豊田市中央", "豊田市南", "豊田市東",
    ],
  },
];

const KIND_LABELS = {
  aoi: "岡崎市葵倫理法人会の会員",
  guest: "ゲスト（見学の方）",
  other_kai: "他単会の会員",
};

const $ = function (id) { return document.getElementById(id); };
const el = {
  loading: $("loading"), already: $("already"), alreadyBody: $("alreadyBody"),
  pendingNote: $("pendingNote"), editBtn: $("editBtn"),
  kindStep: $("kindStep"), form: $("regForm"), kindLabel: $("kindLabel"), backBtn: $("backBtn"),
  secAoi: $("secAoi"), secGuest: $("secGuest"), secOther: $("secOther"),
  role: $("role"), roleOther: $("roleOther"),
  committeeList: $("committeeList"), addCommittee: $("addCommittee"),
  visitCount: $("visitCount"), triggerList: $("triggerList"), triggerOther: $("triggerOther"),
  kaiFilter: $("kaiFilter"), kaiName: $("kaiName"), kaiAichi: $("kaiAichi"),
  kaiFree: $("kaiFree"), kaiOther: $("kaiOther"), otherPosition: $("otherPosition"),
  submitBtn: $("submitBtn"), note: $("note"), done: $("done"), doneMsg: $("doneMsg"),
};

let idToken = "";
let kind = null;
let existing = null;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ---- 部品を作る ---- */
function fillSelect(select, items, placeholder) {
  select.innerHTML =
    (placeholder ? '<option value="" disabled selected>' + esc(placeholder) + "</option>" : "") +
    items.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + "</option>"; }).join("");
}

fillSelect(el.role, ROLES, "選択してください");
fillSelect(el.visitCount, VISIT_COUNTS, "選択してください");

el.triggerList.innerHTML = TRIGGERS.map(function (t) {
  return '<label class="check"><input type="checkbox" name="trigger" value="' + esc(t) + '"><span>' +
    esc(t) + "</span></label>";
}).join("");

/** 単会の選択肢を、絞り込み文字で作り直す */
function renderKai(filter) {
  const q = (filter || "").trim();
  const html = KAI_GROUPS.map(function (g) {
    const items = g.items.filter(function (n) { return !q || n.indexOf(q) >= 0; });
    if (!items.length) return "";
    return '<optgroup label="' + esc(g.label) + '">' +
      items.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "倫理法人会</option>"; }).join("") +
      "</optgroup>";
  }).join("");
  el.kaiName.innerHTML = html || '<option disabled>該当する単会がありません</option>';
}
renderKai("");
el.kaiFilter.addEventListener("input", function () { renderKai(el.kaiFilter.value); });

/* ---- 委員会の行（複数登録できる） ---- */
function committeeRow(value, roleValue) {
  const wrap = document.createElement("div");
  wrap.className = "cmrow";
  wrap.innerHTML =
    '<select class="cm-name"></select>' +
    '<div class="field other cm-other" hidden>' +
      '<input type="text" placeholder="委員会名をご入力ください">' +
    "</div>" +
    '<div class="cm-roles">' +
      '<label class="check"><input type="checkbox" value="リーダー"><span>リーダー</span></label>' +
      '<label class="check"><input type="checkbox" value="サブリーダー"><span>サブリーダー</span></label>' +
      '<button type="button" class="linkbtn cm-del">削除</button>' +
    "</div>";

  const select = wrap.querySelector(".cm-name");
  fillSelect(select, COMMITTEES, "選択してください");
  if (value) select.value = value;

  const other = wrap.querySelector(".cm-other");
  select.addEventListener("change", function () { other.hidden = select.value !== OTHER; });

  if (roleValue) {
    wrap.querySelectorAll(".cm-roles input").forEach(function (c) {
      if (roleValue.indexOf(c.value) >= 0) c.checked = true;
    });
  }

  wrap.querySelector(".cm-del").addEventListener("click", function () {
    wrap.remove();
    syncDeleteButtons();
  });
  return wrap;
}

function syncDeleteButtons() {
  const rows = el.committeeList.querySelectorAll(".cmrow");
  rows.forEach(function (r) {
    r.querySelector(".cm-del").hidden = rows.length <= 1;
  });
}

function addCommitteeRow(value, roleValue) {
  el.committeeList.appendChild(committeeRow(value, roleValue));
  syncDeleteButtons();
}

el.addCommittee.addEventListener("click", function () { addCommitteeRow(); });

/* ---- 「その他」のときだけ自由入力を出す ---- */
el.role.addEventListener("change", function () {
  el.roleOther.hidden = el.role.value !== OTHER;
});
el.triggerList.addEventListener("change", function () {
  const other = el.triggerList.querySelector('input[value="' + OTHER + '"]');
  el.triggerOther.hidden = !(other && other.checked);
});
document.querySelectorAll('input[name="kaiArea"]').forEach(function (r) {
  r.addEventListener("change", function () {
    const aichi = document.querySelector('input[name="kaiArea"]:checked').value === "aichi";
    el.kaiAichi.hidden = !aichi;
    el.kaiFree.hidden = aichi;
  });
});

/* ---- 区分の切り替え ---- */
function chooseKind(next) {
  kind = next;
  el.kindStep.hidden = true;
  el.form.hidden = false;
  el.kindLabel.textContent = KIND_LABELS[kind];
  el.secAoi.hidden = kind !== "aoi";
  el.secGuest.hidden = kind !== "guest";
  el.secOther.hidden = kind !== "other_kai";
  if (kind === "aoi" && !el.committeeList.children.length) addCommitteeRow();
  window.scrollTo(0, 0);
}

el.kindStep.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-kind]");
  if (btn) chooseKind(btn.dataset.kind);
});
el.backBtn.addEventListener("click", function () {
  el.form.hidden = true;
  el.kindStep.hidden = false;
  window.scrollTo(0, 0);
});

/* ---- 送信 ---- */
function committeesFromForm() {
  const out = [];
  el.committeeList.querySelectorAll(".cmrow").forEach(function (row) {
    const select = row.querySelector(".cm-name");
    let name = select.value;
    if (name === OTHER) name = row.querySelector(".cm-other input").value.trim();
    if (!name) return;
    const roles = [];
    row.querySelectorAll(".cm-roles input:checked").forEach(function (c) { roles.push(c.value); });
    out.push(roles.length ? name + "（" + roles.join("・") + "）" : name);
  });
  return out;
}

function buildPayload() {
  const payload = {
    idToken: idToken,
    action: "save",
    kind: kind,
    name: $("name").value.trim(),
    company: $("company").value.trim(),
  };

  if (kind === "aoi") {
    payload.position = el.role.value === OTHER
      ? el.roleOther.querySelector("input").value.trim()
      : el.role.value;
    payload.committees = committeesFromForm();
  }

  if (kind === "guest") {
    payload.referrer = $("referrer").value.trim();
    payload.visitCount = el.visitCount.value;
    const triggers = [];
    el.triggerList.querySelectorAll("input:checked").forEach(function (c) {
      if (c.value === OTHER) {
        const free = el.triggerOther.querySelector("input").value.trim();
        if (free) triggers.push(free);
      } else {
        triggers.push(c.value);
      }
    });
    payload.triggers = triggers;
  }

  if (kind === "other_kai") {
    const aichi = document.querySelector('input[name="kaiArea"]:checked').value === "aichi";
    payload.kaiName = aichi
      ? (el.kaiName.value ? el.kaiName.value + "倫理法人会" : "")
      : el.kaiOther.value.trim();
    payload.position = el.otherPosition.value.trim();
  }
  return payload;
}

function validate(payload) {
  if (!payload.name) return "お名前をご入力ください。";
  if (kind === "aoi" && !payload.position) return "役職をお選びください。";
  if (kind === "guest" && !payload.visitCount) return "何回目かをお選びください。";
  if (kind === "other_kai" && !payload.kaiName) return "所属の単会をお選びください。";
  return null;
}

el.form.addEventListener("submit", async function (e) {
  e.preventDefault();
  const payload = buildPayload();
  const ng = validate(payload);
  if (ng) { el.note.textContent = ng; return; }
  if (!idToken) {
    el.note.textContent = "LINEアプリの中から開いてください。本人確認ができないため登録できません。";
    return;
  }

  el.note.textContent = "";
  el.submitBtn.disabled = true;
  el.submitBtn.textContent = "送信中…";
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || "登録できませんでした");

    el.form.hidden = true;
    el.done.hidden = false;
    el.doneMsg.textContent = result.approved
      ? "内容に変更があれば、メニューからいつでも更新できます。"
      : "役職に応じた機能は、専任幹事が確認してから使えるようになります。しばらくお待ちください。";
    if (typeof liff !== "undefined" && liff.isInClient && liff.isInClient()) {
      setTimeout(function () { liff.closeWindow(); }, 2600);
    }
  } catch (err) {
    el.submitBtn.disabled = false;
    el.submitBtn.textContent = "登録する";
    el.note.textContent = String(err.message || err);
  }
});

/* ---- 登録済みの表示 ---- */
function showAlready(data, approved) {
  const rows = [["区分", KIND_LABELS[data.kind] || data.kind], ["お名前", data.name]];
  if (data.company) rows.push(["会社・事業", data.company]);
  if (data.position) rows.push(["役職", data.position]);
  if (data.committees && data.committees.length) rows.push(["委員会", data.committees.join("／")]);
  if (data.kaiName) rows.push(["所属単会", data.kaiName]);

  el.alreadyBody.innerHTML = rows.map(function (r) {
    return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
  }).join("");
  el.pendingNote.hidden = approved;
  el.already.hidden = false;
}

/** 「内容を修正する」を押したとき、登録済みの内容を入れた状態でフォームを出す */
el.editBtn.addEventListener("click", function () {
  el.already.hidden = true;
  const d = existing || {};
  $("name").value = d.name || "";
  $("company").value = d.company || "";

  if (d.kind === "aoi") {
    if (d.position && ROLES.indexOf(d.position) >= 0) {
      el.role.value = d.position;
    } else if (d.position) {
      el.role.value = OTHER;
      el.roleOther.hidden = false;
      el.roleOther.querySelector("input").value = d.position;
    }
    el.committeeList.innerHTML = "";
    (d.committees && d.committees.length ? d.committees : [""]).forEach(function (c) {
      const m = String(c).match(/^(.*?)（(.*)）$/);
      const nameOnly = m ? m[1] : c;
      const roles = m ? m[2] : "";
      addCommitteeRow(COMMITTEES.indexOf(nameOnly) >= 0 ? nameOnly : "", roles);
      if (COMMITTEES.indexOf(nameOnly) < 0 && nameOnly) {
        const row = el.committeeList.lastElementChild;
        row.querySelector(".cm-name").value = OTHER;
        row.querySelector(".cm-other").hidden = false;
        row.querySelector(".cm-other input").value = nameOnly;
      }
    });
  }

  if (d.kind === "guest") {
    $("referrer").value = d.referrer || "";
    if (d.visitCount) el.visitCount.value = d.visitCount;
    const known = TRIGGERS.slice(0, -1);
    (d.triggers || []).forEach(function (t) {
      if (known.indexOf(t) >= 0) {
        const box = el.triggerList.querySelector('input[value="' + t.replace(/"/g, '') + '"]');
        if (box) box.checked = true;
      } else {
        const other = el.triggerList.querySelector('input[value="' + OTHER + '"]');
        if (other) other.checked = true;
        el.triggerOther.hidden = false;
        el.triggerOther.querySelector("input").value = t;
      }
    });
  }

  if (d.kind === "other_kai" && d.kaiName) {
    const bare = String(d.kaiName).replace(/倫理法人会$/, "");
    const known = KAI_GROUPS.some(function (g) { return g.items.indexOf(bare) >= 0; });
    if (known) {
      el.kaiName.value = bare;
    } else {
      document.querySelector('input[name="kaiArea"][value="other"]').checked = true;
      el.kaiAichi.hidden = true;
      el.kaiFree.hidden = false;
      el.kaiOther.value = d.kaiName;
    }
    el.otherPosition.value = d.position || "";
  }

  chooseKind(d.kind || "aoi");
});

/* ---- 起動 ---- */
async function start() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
    idToken = liff.getIDToken();
    const profile = await liff.getProfile();
    $("greet").textContent = profile.displayName + " さん、ご登録をお願いします。";
  } catch (err) {
    el.loading.textContent = "LINEアプリの中から開いてください。";
    return;
  }

  if (!idToken) {
    el.loading.textContent =
      "本人確認の情報を取得できませんでした。LIFFのScopeに「openid」が入っているかご確認ください。";
    return;
  }

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: idToken, action: "get" }),
    });
    const result = await res.json();
    el.loading.hidden = true;

    if (result.ok && result.registered) {
      existing = result.registration;
      showAlready(result.registration, result.approved);
      return;
    }
    el.kindStep.hidden = false;
  } catch (err) {
    el.loading.hidden = true;
    el.kindStep.hidden = false;
  }
}
start();
