/* ============================================================
   学びのページ 描画 ― 広報委員はこのファイルを触りません
   （更新は js/learn-data.js だけ）
   ============================================================ */
(function () {
  "use strict";

  var STORE = "aoi-learn-watched";
  var LVKEY = "aoi-learn-level";

  /* 見た印は、その人のブラウザにだけ残ります。会には送られません。 */
  function watched() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]"); }
    catch (e) { return []; }
  }
  function setWatched(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) { /* 非公開モード等 */ }
  }
  function isWatched(id) { return watched().indexOf(id) >= 0; }
  function mark(id, on) {
    var l = watched(), i = l.indexOf(id);
    if (on && i < 0) { l.push(id); }
    if (!on && i >= 0) { l.splice(i, 1); }
    setWatched(l);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function playable(v) { return !v.members && (v.youtube || v.file); }
  function ready(key) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].key === key) { return LEVELS[i].ready !== false; }
    }
    return false;
  }

  /* ============================================================
     再生窓（画面の中央に大きく出す）
     縦型の動画をカードの中で再生すると、カードが縦に伸びて
     一覧が崩れるため、別の窓で開く。
     ============================================================ */
  var modal, modalBox, modalTitle, lastFocus;

  function buildModal() {
    modal = el("div", "lv-modal");
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var inner = el("div", "lv-modal-in");
    var bar = el("div", "lv-modal-bar");
    modalTitle = el("h2", "lv-modal-title", "");
    var close = el("button", "lv-modal-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "閉じる");
    close.addEventListener("click", closeModal);
    bar.appendChild(modalTitle);
    bar.appendChild(close);

    modalBox = el("div", "lv-modal-video");
    inner.appendChild(bar);
    inner.appendChild(modalBox);
    modal.appendChild(inner);

    modal.addEventListener("click", function (e) { if (e.target === modal) { closeModal(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) { closeModal(); }
    });
    document.body.appendChild(modal);
  }

  function openModal(v, card) {
    lastFocus = document.activeElement;
    modalTitle.textContent = v.title;
    modalBox.innerHTML = "";
    var pl = makePlayer(v);
    modalBox.appendChild(pl);
    modal.hidden = false;
    document.body.classList.add("lv-locked");
    modal.querySelector(".lv-modal-close").focus();

    // 「見た」は、**半分以上再生したとき**に付く。開いただけでは付かない
    if (pl.tagName === "VIDEO") {
      pl.addEventListener("timeupdate", function onTick() {
        if (!pl.duration || isNaN(pl.duration)) { return; }
        if (pl.currentTime / pl.duration < 0.5) { return; }
        pl.removeEventListener("timeupdate", onTick);
        mark(v.id, true);
        if (card) { card.classList.add("is-watched"); }
        syncChecks();
        paintProgress();
      });
    }
    // ⚠ YouTube に切り替えたときは、埋め込みの再生位置がこちらから取れない。
    //    そのときは IFrame API を読み込むか、チェックは手で付けてもらう形にする。
  }

  function closeModal() {
    var m = modalBox.querySelector("video");
    if (m) { m.pause(); }
    modalBox.innerHTML = "";
    modal.hidden = true;
    document.body.classList.remove("lv-locked");
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  function makePlayer(v) {
    if (v.youtube) {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + v.youtube + "?rel=0&autoplay=1";
      f.title = v.title;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      return f;
    }
    var m = document.createElement("video");
    m.src = v.file;
    m.controls = true;
    m.autoplay = true;
    m.playsInline = true;
    m.setAttribute("playsinline", "");
    return m;
  }

  /* ============================================================
     カード
     ============================================================ */
  function card(v, index) {
    var art = el("article", "lv-card");
    art.id = "v-" + v.id;
    var on = playable(v);
    if (!on) { art.classList.add("is-soon"); }
    if (isWatched(v.id)) { art.classList.add("is-watched"); }

    /* ---- サムネイル ---- */
    var thumb = el("div", "lv-thumb");
    if (on && v.file) {
      var img = document.createElement("img");
      // ポスターは動画ファイル名から引く（カードのIDと mp4 の名前は違うことがある）
      img.src = v.file.replace(/([^/]+)\.mp4$/, "poster-$1.jpg");
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () { thumb.classList.add("no-img"); img.remove(); };
      thumb.appendChild(img);
    } else {
      thumb.classList.add("no-img");
    }
    thumb.appendChild(el("span", "lv-thumb-no", String(index + 1).padStart(2, "0")));
    if (on) {
      thumb.appendChild(el("span", "lv-thumb-play", "▶"));
      thumb.appendChild(el("span", "lv-thumb-min", "約" + v.min + "分"));
    } else {
      // 絵の中にも「準備中」を出す。下の帯だけだと気づかれない
      thumb.appendChild(el("span", "lv-thumb-soon", "準備中"));
    }
    art.appendChild(thumb);

    /* ---- 本文 ---- */
    var body = el("div", "lv-body");
    body.appendChild(el("h3", null, v.title));
    body.appendChild(el("p", "lv-gist", v.gist));

    if (v.members) {
      var mm = el("p", "lv-note");
      mm.innerHTML = 'この回は会員限定です。<a href="' +
        (window.SITE && SITE.lineUrl ? SITE.lineUrl : "#") +
        '" target="_blank" rel="noopener">公式LINE</a>でお届けしています。';
      body.appendChild(mm);
    } else if (!on) {
      body.appendChild(el("p", "lv-note",
        v.note || "準備中です。できあがり次第、公式LINEでお知らせします。"));
    } else if (v.note) {
      body.appendChild(el("p", "lv-note", v.note));
    }
    art.appendChild(body);

    /* ---- 足もと ---- */
    var foot = el("div", "lv-foot");
    if (v.members) {
      foot.appendChild(el("span", "lv-badge lv-badge-mem", "会員限定"));
    } else if (!on) {
      foot.appendChild(el("span", "lv-badge", "準備中"));
    } else {
      var btn = el("button", "lv-play", "▶ 見る");
      btn.type = "button";
      btn.addEventListener("click", function () { openModal(v, art); });
      foot.appendChild(btn);

      var chk = el("label", "lv-check");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = isWatched(v.id);
      input.dataset.for = v.id;
      input.addEventListener("change", function () {
        mark(v.id, input.checked);
        art.classList.toggle("is-watched", input.checked);
        paintProgress();
      });
      chk.appendChild(input);
      chk.appendChild(el("span", null, "見た"));
      foot.appendChild(chk);
    }
    art.appendChild(foot);

    if (on) {
      thumb.setAttribute("role", "button");
      thumb.setAttribute("tabindex", "0");
      thumb.setAttribute("aria-label", v.title + " を見る");
      thumb.addEventListener("click", function () { openModal(v, art); });
      thumb.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(v, art); }
      });
    }
    return art;
  }

  function syncChecks() {
    document.querySelectorAll(".lv-check input").forEach(function (i) {
      i.checked = isWatched(i.dataset.for);
    });
  }

  /* ============================================================
     進み具合と「続きから」
     ============================================================ */
  function listOf(key) {
    return LEARN.filter(function (v) { return v.level === key && playable(v); });
  }

  function paintProgress() {
    LEVELS.forEach(function (lv) {
      if (lv.ready === false) { return; }
      var list = listOf(lv.key);
      var done = list.filter(function (v) { return isWatched(v.id); }).length;
      var bar = document.querySelector('[data-progress="' + lv.key + '"]');
      if (!bar) { return; }
      bar.querySelector(".lv-prog-fill").style.width =
        (list.length ? Math.round(done / list.length * 100) : 0) + "%";
      bar.querySelector(".lv-prog-txt").textContent =
        done + " / " + list.length + " 本";
    });
  }

  /* ============================================================
     段階の切り替え
     ============================================================ */
  function show(key) {
    if (!ready(key)) { key = "basic"; }
    document.querySelectorAll(".lv-panel").forEach(function (p) {
      p.hidden = (p.dataset.level !== key);
    });
    document.querySelectorAll(".lv-tab").forEach(function (t) {
      var on = t.dataset.level === key;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    try { localStorage.setItem(LVKEY, key); } catch (e) { /* noop */ }
    if (location.hash.slice(1) !== key) { history.replaceState(null, "", "#" + key); }
  }

  /* ============================================================
     組み立て
     ============================================================ */
  function build() {
    var tabs = document.getElementById("lv-tabs");
    var body = document.getElementById("lv-body");
    if (!tabs || !body || typeof LEVELS === "undefined") { return; }
    buildModal();

    LEVELS.forEach(function (lv) {
      var open = lv.ready !== false;
      var t = el("button", "lv-tab" + (open ? "" : " is-soon"));
      t.type = "button";
      t.dataset.level = lv.key;
      t.setAttribute("role", "tab");
      t.innerHTML = "<b>" + lv.name + (open ? "" : "<i>準備中</i>") +
        "</b><small>" + lv.tagline + "</small>";
      if (open) {
        t.addEventListener("click", function () { show(lv.key); });
      } else {
        t.disabled = true;
        t.setAttribute("aria-disabled", "true");
        t.title = "準備中です";
      }
      tabs.appendChild(t);

      if (!open) { return; }

      var panel = el("section", "lv-panel");
      panel.dataset.level = lv.key;
      panel.hidden = true;

      var intro = el("div", "lv-intro");
      intro.appendChild(el("p", "lv-guide", lv.guide));
      intro.appendChild(el("p", "lv-desc", lv.desc));

      var prog = el("div", "lv-prog");
      prog.dataset.progress = lv.key;
      var track = el("div", "lv-prog-track");
      track.appendChild(el("div", "lv-prog-fill"));
      prog.appendChild(track);
      prog.appendChild(el("span", "lv-prog-txt", ""));
      intro.appendChild(prog);

      panel.appendChild(intro);

      var grid = el("div", "lv-grid");
      LEARN.filter(function (v) { return v.level === lv.key; })
        .forEach(function (v, i) { grid.appendChild(card(v, i)); });
      if (!grid.children.length) { grid.appendChild(el("p", "lv-note", "準備中です。")); }
      panel.appendChild(grid);
      body.appendChild(panel);
    });

    var start = location.hash.slice(1);
    if (!ready(start)) {
      try { start = localStorage.getItem(LVKEY) || "basic"; } catch (e) { start = "basic"; }
    }
    if (!ready(start)) { start = "basic"; }
    show(start);
    paintProgress();

    var y = document.getElementById("v-year");
    if (y) { y.textContent = new Date().getFullYear(); }
    document.querySelectorAll("[data-line-url]").forEach(function (a) {
      if (window.SITE && SITE.lineUrl) { a.href = SITE.lineUrl; }
    });
    nav();
  }

  /* ---------- モバイルメニューの開閉（index.html の render.js と同じ動き） ---------- */
  function nav() {
    var btn = document.getElementById("nav-toggle");
    var menu = document.getElementById("nav-menu");
    if (!btn || !menu) { return; }
    function close() {
      menu.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) { close(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); } });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
