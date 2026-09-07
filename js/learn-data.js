/* ============================================================
   学びのページ ― 更新するのはこのファイルだけです
   ------------------------------------------------------------
   ・いま動画があるものは file: でこのサイトの mp4 を再生しています。
     YouTube に上げたら youtube: にIDを入れてください（そちらが優先されます）。
   ・動画が出来上がったら youtube: に11文字のIDを入れてください。
     例）https://www.youtube.com/watch?v=AbCdEfGh123 → youtube:"AbCdEfGh123"
     ※ YouTube は「限定公開」で上げてください（検索に出ません）。
   ・youtube を空 "" のままにすると、そのカードは「準備中」と出ます。
   ・members:true を付けたものは「会員限定」の印が付き、
     動画は埋め込まず、公式LINEへの案内だけを出します。
   ・{ } のかたまりを足す／減らすだけで、ページに反映されます。
   ・体裁(css/learn.css)・描画(js/learn.js)・構造(learn.html)は触らなくて大丈夫です。
   ============================================================ */

/* ------------------------------------------------------------
   1. 3つの段階
   ready:true  … タブを押せる（動画を並べる）
   ready:false … タブは押せない。「準備中」と出る
   ------------------------------------------------------------ */
const LEVELS = [
  {
    key: "basic",
    name: "基本",
    tagline: "明日の朝、困らないために",
    desc: "入会したら、まずここから。朝の動き方と作法が、ひととおり分かります。1本 約1分。",
    guide: "入ったばかりの方は、ここから順番にどうぞ。",
    ready: true,                       // ← false にすると、そのタブは押せなくなります
  },
  {
    key: "next",
    name: "慣れたら",
    tagline: "会を、もっと使うために",
    desc: "お役が回ってきた頃、他の単会に行ってみたい頃に。1本 約1分。",
    guide: "数か月たった方、お役をもらった方はこちら。",
    ready: false,
  },
  {
    key: "deep",
    name: "詳しく",
    tagline: "なぜ、そうするのか",
    desc: "万人幸福の栞、会の成り立ち、役員の実務。じっくり見る回です。1本 3〜10分。",
    guide: "深めたい方、役員の方はこちら。年次は問いません。",
    ready: false,
  },
];

/* ------------------------------------------------------------
   2. 動画
   level    : "basic" / "next" / "deep"
   id       : 動画の管理番号（orientation-movie の台本と同じ）
   title    : タイトル
   gist     : この1本で持って帰ってほしいこと（1行）
   min      : おおよその長さ（分）
   youtube  : YouTube の動画ID。空 "" なら「準備中」
   file     : このサイトに置いた mp4（例 "video/ORI-02.mp4"）。
              YouTube がまだのあいだの置き方です。youtube を入れたらそちらが優先されます
   note     : カードの下に出す一行（差し替え予定のお知らせなど）
   members  : true にすると会員限定（動画を埋め込まない）
   ------------------------------------------------------------ */
const LEARN = [

  /* ---- 基本 ---- */
  { level:"basic", id:"ORI-01", title:"倫理法人会 ７つのきほん",
    gist:"この先の目次になる1本。まずはここから。", min:2,
    file:"video/ORI-01.mp4" },
  { level:"basic", id:"BASIC-01", title:"「あやしい」と思って大丈夫",
    gist:"倫理は宗教や政治ではない。変えるのは、まず自分から。", min:1,
    file:"video/BASIC-01.mp4" },
  { level:"basic", id:"BASIC-02", title:"木曜の朝、何時に行けばいい",
    gist:"まずは朝礼から。6時の2分前に入口が閉まります。", min:1,
    file:"video/BASIC-02.mp4" },
  { level:"basic", id:"BASIC-03", title:"6時から8時、何が起きるのか",
    gist:"歌・十七ヵ条・輪読・講話。読み間違えても謝りません。", min:1,
    file:"video/BASIC-03.mp4" },
  { level:"basic", id:"BASIC-04", title:"服装と作法",
    gist:"男性はスーツ、女性はジャケット。入口の一礼から拍手まで。", min:1,
    file:"video/BASIC-04.mp4" },
  { level:"basic", id:"BASIC-05", title:"お役とスピーチ",
    gist:"お役は当番ではない。できない日は言っていい。", min:1,
    file:"video/BASIC-05.mp4" },
  { level:"basic", id:"BASIC-06", title:"毎週行けないときは",
    gist:"皆勤が目的ではない。他の単会は専任幹事に相談を。", min:1,
    file:"video/BASIC-06.mp4" },
  { level:"basic", id:"BASIC-07", title:"会社に持ち帰る",
    gist:"『職場の教養』は1口で毎月30冊まで。自社の朝礼に。", min:1,
    file:"video/BASIC-07.mp4" },
  { level:"basic", id:"BASIC-08", title:"公式アプリの使い方",
    gist:"会員証がスマホに。受付はコードを見せるだけ。", min:1, youtube:"",
    note:"実際のアプリ画面を撮ってから作ります。もう少しお待ちください。" },
  /* ⚠ BASIC-09 は会員限定。mp4 をこのサイトに置かないこと（URLを直接開けてしまうため）。
     公式LINEで配信し、ここは案内だけにする。 */
  { level:"basic", id:"BASIC-09", title:"ここだけのルール",
    gist:"講話で聞いた話を、外に出さない。", min:1, youtube:"", members:true },
  { level:"basic", id:"BASIC-10", title:"困ったときは誰に聞く",
    gist:"会費は事務長、お役はMS委員会、行事は専任幹事へ。", min:1,
    file:"video/BASIC-10.mp4" },

  /* ---- 慣れたら ---- */
  { level:"next", id:"NEXT-01", title:"6つの委員会は、何をするところか",
    gist:"MS・朝礼・研修・広報・女性・活性化。自分の委員会が何をする場所か。", min:1, youtube:"" },
  { level:"next", id:"ORI-12", title:"ゲストを連れて行きたい",
    gist:"初回は無料。案内役がつきます。ノルマではありません。", min:1, youtube:"" },
  { level:"next", id:"ORI-13", title:"5:30の活力朝礼ってなに？",
    gist:"見るだけでも構いません。自社の朝礼の参考になります。", min:1, youtube:"" },
  { level:"next", id:"ORI-17", title:"バッジの意味",
    gist:"太陽は希望、三つの山は明朗・愛和・喜働。", min:1, youtube:"" },
  { level:"next", id:"ORI-18", title:"倫理指導ってなに？",
    gist:"一対一の個別指導。会社に来て朝礼を見てもらうこともできます。", min:1, youtube:"" },
  { level:"next", id:"ORI-20", title:"学びの場、どれに出ればいい？",
    gist:"毎週のMS・基礎講座・倫理経営講演会・富士研の4つだけ覚える。", min:1, youtube:"" },
  { level:"next", id:"ORI-21", title:"富士研ってどんなところ？",
    gist:"御殿場の研修所。泊まりがけ。入会後なるべく早く。", min:1, youtube:"" },
  { level:"next", id:"ORI-26", title:"葵の1年の流れ",
    gist:"年度は9月はじまり。大きい行事はどれか。", min:1, youtube:"" },
  { level:"next", id:"ORI-27", title:"倫理経営講演会 2027",
    gist:"2027年5月29日・岡崎市総合学習センター。葵が主催します。", min:1, youtube:"" },

  /* ---- 詳しく ---- */
  { level:"deep", id:"DEEP-01", title:"役職の名前と、その中身",
    gist:"会長・専任幹事・幹事・運営委員。偉い人の順番ではなく、役割の名前です。", min:2, youtube:"" },
  { level:"deep", id:"ORI-15", title:"何のための会なのか",
    gist:"自己革新 → 会社と家庭 → 地域社会。順番が大事。", min:3, youtube:"" },
  { level:"deep", id:"ORI-16", title:"「純粋倫理」って言われても",
    gist:"やってみて確かめる生活の法則。分からなくていい、実行が先。", min:3, youtube:"" },
  { level:"deep", id:"ORI-22", title:"倫理法人会ってどんな組織？",
    gist:"倫理研究所 → 県 → 地区 → 単会の4段。", min:3, youtube:"" },
  { level:"deep", id:"ORI-23", title:"愛知県倫理法人会と三河地区",
    gist:"県に31単会・6地区。三河地区は8単会で県内最大。", min:3, youtube:"" },
  { level:"deep", id:"ORI-24", title:"岡崎市倫理法人会と、分封のこと",
    gist:"通いやすくなる／役が回ってくる。この2つが意義。", min:3, youtube:"" },
];
