/* ============================================================
   描画処理(編集不要)
   ------------------------------------------------------------
   js/data.js の SCHEDULE / REPORTS を読み取り、
   該当セクションに HTML を組み立てて差し込みます。
   defer 属性で読み込むため、DOM 構築後に実行されます。
   ============================================================ */
(function () {
  "use strict";

  // 入力値に < > & 等が混ざっても安全に表示するためのエスケープ
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 講師スケジュール
  var schedList = document.getElementById("sched-list");
  if (schedList) {
    if (Array.isArray(SCHEDULE) && SCHEDULE.length > 0) {
      // 1講話分(演題・サブタイトル・所属・講師名)のHTML。ハーフ講話は talk を複数並べる
      var talkBlock = function (t) {
        return (
          '<div class="theme">' + esc(t.theme) + "</div>" +
          (t.subtitle ? '<div class="subtitle">' + esc(t.subtitle) + "</div>" : "") +
          (t.affiliation ? '<div class="affiliation">' + esc(t.affiliation) + "</div>" : "") +
          (t.speaker
            ? '<p class="speaker">' +
                (t.ruby ? '<span class="ruby">' + esc(t.ruby) + "</span>" : "") +
                '<span class="name">' + esc(t.speaker) + "</span>" +
              "</p>"
            : "") +
          (t.role ? '<div class="kai-role">' + esc(t.role) + "</div>" : "")
        );
      };
      var monthOf = function (date) { return String(date).split("/")[0]; };

      // 登場順に月の一覧を作成
      var months = [];
      SCHEDULE.forEach(function (s) {
        var m = monthOf(s.date);
        if (months.indexOf(m) < 0) months.push(m);
      });
      // 既定タブは「今月」、無ければ最初の月
      var nowMonth = String(new Date().getMonth() + 1);
      var active = months.indexOf(nowMonth) >= 0 ? nowMonth : months[0];

      var tabsHtml =
        '<div class="sched-tabs" role="tablist" aria-label="月の切り替え">' +
        months.map(function (m) {
          var on = m === active;
          return (
            '<button type="button" class="sched-tab-btn' + (on ? " is-active" : "") +
            '" data-month="' + esc(m) + '" role="tab" aria-selected="' + (on ? "true" : "false") +
            '">' + esc(m) + "月</button>"
          );
        }).join("") +
        "</div>";

      var itemsHtml = SCHEDULE.map(function (s) {
        var time = s.time ? s.time : "6:00〜7:00"; // 省略時は通常MSの時刻
        var m = monthOf(s.date);
        // talks(複数)があればハーフ講話として積む。無ければ単一講話
        var hasTalks = Array.isArray(s.talks) && s.talks.length > 0;
        var body = hasTalks
          ? s.talks.map(talkBlock).join('<hr class="talk-sep">')
          : talkBlock(s);
        var tag = s.tag ? s.tag : (hasTalks ? "ハーフ講話" : "");
        return (
          '<div class="sched-item" data-month="' + esc(m) + '"' + (m === active ? "" : " hidden") + ">" +
            '<div class="sched-date"><b>' + esc(s.date) + "</b>" +
              "<span>" + esc(s.day) + "曜 " + esc(time) + "</span></div>" +
            '<div class="sched-body">' + body +
              (s.venue ? '<div class="venue">会場:' + esc(s.venue) + "</div>" : "") +
            "</div>" +
            (tag ? '<span class="sched-tag">' + esc(tag) + "</span>" : "") +
          "</div>"
        );
      }).join("");

      schedList.innerHTML = tabsHtml + '<div class="sched">' + itemsHtml + "</div>";

      // タブ切り替え(イベント委譲)
      var tabBtns = schedList.querySelectorAll(".sched-tab-btn");
      var items = schedList.querySelectorAll(".sched-item");
      schedList.addEventListener("click", function (e) {
        var btn = e.target.closest(".sched-tab-btn");
        if (!btn) return;
        var m = btn.getAttribute("data-month");
        tabBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        items.forEach(function (it) {
          it.hidden = it.getAttribute("data-month") !== m;
        });
      });
    } else {
      schedList.innerHTML =
        '<p class="sched-empty">次回のスケジュールは準備中です。公式LINEでお知らせします。</p>';
    }
  }

  // 活動報告
  var repList = document.getElementById("report-list");
  if (repList) {
    repList.innerHTML = (Array.isArray(REPORTS) ? REPORTS : []).map(function (r) {
      var inner =
        '<div class="thumb"><span>活動報告</span></div>' +
        '<div class="body">' +
          '<div class="date">' + esc(r.date) + "</div>" +
          "<h3>" + esc(r.title) + "</h3>" +
          "<p>" + esc(r.summary) + "</p>" +
        "</div>";
      // url がある場合のみリンク、無ければリンクにしない(空リンクで先頭へ飛ぶのを防ぐ)
      return r.url
        ? '<a class="report" href="' + esc(r.url) + '">' + inner + "</a>"
        : '<div class="report">' + inner + "</div>";
    }).join("");
  }
})();
