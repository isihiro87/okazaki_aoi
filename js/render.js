/* ============================================================
   描画処理（編集不要）
   ------------------------------------------------------------
   js/data.js の SITE / SCHEDULE / EVENTS / REPORTS を読み取り、
   各セクションに HTML を組み立てて差し込みます。
   ・終わった回は自動で隠れます
   ・曜日は日付から自動で計算します
   ・予定が未入力でも「次回の木曜」を自動計算して表示します
   ============================================================ */
(function () {
  "use strict";

  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function $(id) { return document.getElementById(id); }
  function set(id, html) { var el = $(id); if (el) el.innerHTML = html; }

  /* "YYYY-MM-DD" → Date（時刻は 0:00。タイムゾーンのズレを避けるため個別に組み立てる） */
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function fmtMD(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }
  function fmtLong(d) {
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WD[d.getDay()] + "）";
  }
  /* 今日を含めて、次に来る指定曜日の日付 */
  function nextWeekday(wd) {
    var d = today0(), diff = (wd - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  var cfg = (typeof SITE === "object" && SITE) ? SITE : {};
  var msWeekday = typeof cfg.msWeekday === "number" ? cfg.msWeekday : 4;
  var msTime = cfg.msTime || "6:00〜7:00";

  /* ============================================================
     講話スケジュール
     ============================================================ */
  var all = (typeof SCHEDULE !== "undefined" && Array.isArray(SCHEDULE) ? SCHEDULE : [])
    .map(function (s) { var o = {}; for (var k in s) o[k] = s[k]; o._d = parseDate(s.date); return o; })
    .filter(function (s) { return s._d; })
    .sort(function (a, b) { return a._d - b._d; });

  var t0 = today0();
  var upcoming = all.filter(function (s) { return s._d >= t0; });
  /* 休会（closed）の回は「次回」に選ばない */
  var nextIdx = -1;
  for (var ni = 0; ni < upcoming.length; ni++) {
    if (!upcoming[ni].closed) { nextIdx = ni; break; }
  }
  var next = nextIdx >= 0 ? upcoming[nextIdx] : null;

  /* 1講話分（演題・サブタイトル・所属・氏名・役職） */
  function talkBlock(t, big) {
    var nameCls = big ? "name name-lg" : "name";
    return '<div class="theme">' + esc(t.theme) + "</div>" +
      (t.subtitle ? '<div class="subtitle">' + esc(t.subtitle) + "</div>" : "") +
      (t.affiliation ? '<div class="affiliation">' + esc(t.affiliation) + "</div>" : "") +
      (t.speaker
        ? '<p class="speaker">' +
            (t.ruby ? '<span class="ruby">' + esc(t.ruby) + "</span>" : "") +
            '<span class="' + nameCls + '">' + esc(t.speaker) + "</span></p>"
        : "") +
      (t.role ? '<div class="kai-role">' + esc(t.role) + "</div>" : "");
  }
  /* 講話1回ぶんの説明文（画像の代替テキスト・検索エンジン向け） */
  function plainOf(s) {
    var list = (Array.isArray(s.talks) && s.talks.length) ? s.talks : [s];
    return list.map(function (t) {
      return [t.theme, t.subtitle, t.affiliation, t.speaker, t.role]
        .filter(Boolean).join(" ／ ");
    }).join(" ／ ");
  }
  /* image があればチラシの該当箇所を表示し、文字情報は読み上げ・検索用に残す */
  function bodyOf(s, big) {
    var textHtml = (Array.isArray(s.talks) && s.talks.length)
      ? s.talks.map(function (t) { return talkBlock(t, big); }).join('<hr class="talk-sep">')
      : talkBlock(s, big);
    if (!s.image) return textHtml;
    return '<img class="talk-img" src="' + esc(s.image) + '" alt="' + esc(plainOf(s)) +
      '" loading="lazy" decoding="async">' +
      '<div class="visually-hidden">' + textHtml + "</div>";
  }
  /* チラシ画像がある回は、画像側にラベルが写っているのでチップを出さない */
  function tagOf(s) {
    if (s.image) return "";
    return s.tag ? s.tag : (Array.isArray(s.talks) && s.talks.length ? "ハーフ講話" : "");
  }

  /* --- ヒーローの「次回」カード ------------------------------ */
  (function heroNext() {
    var host = $("hero-next");
    if (!host) return;
    var d = next ? next._d : nextWeekday(msWeekday);
    var time = next && next.time ? next.time : msTime;
    var venue = next && next.venue ? next.venue : (cfg.venue || "");
    var theme = "";
    if (next) {
      theme = Array.isArray(next.talks) && next.talks.length
        ? next.talks.map(function (t) { return t.theme; }).join(" ／ ")
        : (next.theme || "");
    }
    host.innerHTML =
      '<p class="label">NEXT — 次回</p>' +
      '<p class="nx-date">' + esc(fmtMD(d)) + '<span>（' + WD[d.getDay()] + '）' + esc(time) + "</span></p>" +
      (theme ? '<p class="nx-theme">' + esc(theme) + "</p>"
             : '<p class="nx-theme nx-tbd">演題は決まりしだい公式LINEでお知らせします</p>') +
      '<p class="nx-venue">' + esc(venue) + "</p>" +
      '<a class="btn btn-primary" href="#visit">はじめての方はこちら</a>';
  })();

  /* --- スケジュール一覧 -------------------------------------- */
  (function schedule() {
    var host = $("sched-list");
    if (!host) return;

    /* 予定が1件も無い／残りが休会だけ、のときの案内 */
    var emptyHtml =
        '<div class="sched-empty">' +
        "<p><b>次回の講話予定は準備中です。</b></p>" +
        "<p>モーニングセミナーは毎週" + WD[msWeekday] + "曜 " + esc(msTime) +
        "、" + esc(cfg.venue || "") + "にて通常どおり開催しています。" +
        "決まりしだい公式LINEでお知らせします。</p>" +
        '<a class="btn btn-line-big" href="' + esc(cfg.lineUrl || "#visit") + '">公式LINEで知らせを受け取る</a>' +
        "</div>";

    if (!upcoming.length || !next) { host.innerHTML = emptyHtml; return; }

    /* 日付順のまま並べ、最初の開催回だけを「次回」として大きく見せる */
    var months = [];
    upcoming.forEach(function (s) {
      var m = s._d.getFullYear() + "-" + (s._d.getMonth() + 1);
      if (months.indexOf(m) < 0) months.push(m);
    });
    /* 既定タブは「次回」がある月 */
    var active = next._d.getFullYear() + "-" + (next._d.getMonth() + 1);

    var tabs = months.length > 1
      ? '<div class="sched-tabs" role="tablist" aria-label="月の切り替え">' +
        months.map(function (m) {
          var on = m === active;
          return '<button type="button" class="sched-tab-btn' + (on ? " is-active" : "") +
            '" data-month="' + esc(m) + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' +
            esc(m.split("-")[1]) + "月</button>";
        }).join("") + "</div>"
      : "";

    var items = upcoming.map(function (s, i) {
      var m = s._d.getFullYear() + "-" + (s._d.getMonth() + 1);
      var attrs = ' data-month="' + esc(m) + '"' + (m === active ? "" : " hidden");

      /* 休会の週 */
      if (s.closed) {
        return '<div class="sched-item is-closed"' + attrs + ">" +
          '<div class="sched-date"><b>' + esc(fmtMD(s._d)) + "</b>" +
            "<span>" + WD[s._d.getDay()] + "曜</span></div>" +
          '<div class="sched-body"><div class="closed-label">お休み</div>' +
            (s.note ? '<div class="closed-note">' + esc(s.note) + "</div>" : "") +
          "</div></div>";
      }

      /* 次回（最初の開催回）だけ大きく見せる。並び順は日付のまま */
      var isNext = (i === nextIdx);
      return '<div class="sched-item' + (isNext ? " is-next" : "") + '"' + attrs + ">" +
        '<div class="sched-date">' +
          (isNext ? '<span class="sn-badge">次回</span>' : "") +
          "<b>" + esc(fmtMD(s._d)) + "</b>" +
          "<span>" + WD[s._d.getDay()] + "曜 " + esc(s.time || msTime) + "</span></div>" +
        '<div class="sched-body">' + bodyOf(s, isNext) +
          (s.venue ? '<div class="venue">会場：' + esc(s.venue) + "</div>" : "") +
        "</div>" +
        (tagOf(s) ? '<span class="sched-tag">' + esc(tagOf(s)) + "</span>" : "") +
        "</div>";
    }).join("");

    host.innerHTML = tabs + '<div class="sched">' + items + "</div>";

    host.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".sched-tab-btn");
      if (!btn) return;
      var m = btn.getAttribute("data-month");
      host.querySelectorAll(".sched-tab-btn").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      host.querySelectorAll(".sched-item").forEach(function (it) {
        it.hidden = it.getAttribute("data-month") !== m;
      });
    });
  })();

  /* ============================================================
     特別行事
     ============================================================ */
  (function events() {
    var host = $("event-list");
    if (!host) return;
    var list = (typeof EVENTS !== "undefined" && Array.isArray(EVENTS) ? EVENTS : [])
      .map(function (e) { var o = {}; for (var k in e) o[k] = e[k]; o._d = parseDate(e.date); return o; })
      .filter(function (e) { return !e._d || e._d >= t0; })
      .sort(function (a, b) { return (a._d ? a._d : 1e15) - (b._d ? b._d : 1e15); });

    var sec = $("events");
    if (!list.length) { if (sec) sec.hidden = true; return; }

    host.innerHTML = list.map(function (e) {
      return '<div class="ev' + (e.featured ? " ev-feat" : "") + '">' +
        '<div class="ev-date">' + esc(e._d ? fmtLong(e._d) : (e.dateText || "日程調整中")) + "</div>" +
        "<h3>" + esc(e.title) + "</h3>" +
        (e.lead ? "<p>" + esc(e.lead) + "</p>" : "") +
        '<dl class="ev-meta">' +
          (e.place ? "<dt>会場</dt><dd>" + esc(e.place) + "</dd>" : "") +
          (e.note ? "<dt>備考</dt><dd>" + esc(e.note) + "</dd>" : "") +
        "</dl></div>";
    }).join("");
  })();

  /* ============================================================
     活動報告
     ============================================================ */
  (function reports() {
    var host = $("report-list");
    if (!host) return;
    var list = (typeof REPORTS !== "undefined" && Array.isArray(REPORTS) ? REPORTS : []);
    var sec = $("reports");
    if (!list.length) { if (sec) sec.hidden = true; return; }

    host.innerHTML = list.map(function (r) {
      var d = parseDate(r.date);
      var label = d ? d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() : esc(r.date);
      var thumb = r.image
        ? '<div class="thumb"><img src="' + esc(r.image) + '" alt="" loading="lazy"></div>'
        : '<div class="thumb thumb-ph"><span>岡崎市葵倫理法人会</span></div>';
      var inner = thumb + '<div class="body"><div class="date">' + esc(label) + "</div>" +
        "<h3>" + esc(r.title) + "</h3><p>" + esc(r.summary) + "</p></div>";
      return r.url ? '<a class="report" href="' + esc(r.url) + '">' + inner + "</a>"
                   : '<div class="report">' + inner + "</div>";
    }).join("");
  })();

  /* ============================================================
     会の基本情報の差し込み（会場・会費・電話・役員）
     ============================================================ */
  (function siteInfo() {
    set("v-venue", esc(cfg.venue || ""));
    set("v-address", esc(cfg.address || ""));
    set("v-mstime", esc(msTime));
    set("v-breakfast", esc(cfg.breakfast || ""));
    set("v-fee", esc(cfg.fee || ""));
    set("v-members", esc(cfg.memberCount || ""));
    set("v-msday", WD[msWeekday]);

    if (cfg.tel) {
      var telLink = '<a href="tel:' + esc(cfg.tel.replace(/-/g, "")) + '">' + esc(cfg.tel) + "</a>";
      set("v-tel", telLink +
        (cfg.telName ? '<span class="tel-note">（' + esc(cfg.telName) + "）</span>" : "") +
        (cfg.telNote ? '<span class="tel-note">（' + esc(cfg.telNote) + "）</span>" : ""));
      set("v-tel-2", (cfg.telName ? esc(cfg.telName) + " " : "") + telLink +
        (cfg.telNote ? "（" + esc(cfg.telNote) + "）" : "") + "<br>");
    }
    if (Array.isArray(cfg.officers) && cfg.officers.length) {
      set("v-officers", cfg.officers.map(function (o) {
        return "<span>" + esc(o.role) + "：" + esc(o.name) +
          (o.org ? '<small>' + esc(o.org) + "</small>" : "") + "</span>";
      }).join(""));
    }
    document.querySelectorAll('[data-line-url]').forEach(function (a) {
      if (cfg.lineUrl) a.setAttribute("href", cfg.lineUrl);
    });
    set("v-year", String(new Date().getFullYear()));

    var cm = (typeof CHAIRMAN_MESSAGE !== "undefined" && CHAIRMAN_MESSAGE) ? CHAIRMAN_MESSAGE : {};
    if (cm.text) {
      set("v-chairman-message", cm.text.split(/\n+/).map(function (p) {
        return "<p>" + esc(p) + "</p>";
      }).join(""));
    }
  })();

  /* ============================================================
     モバイルメニューの開閉
     ============================================================ */
  (function nav() {
    var btn = $("nav-toggle"), menu = $("nav-menu");
    if (!btn || !menu) return;
    function close() { menu.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();
})();
