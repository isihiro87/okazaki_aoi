# 組織図・名簿（公式LINEから見る）

令和9年度の**組織図**と**委員会名簿**を、**役職者だけ**が公式LINEから見られる画面です。
**上のタブで2つを切り替えます。** 一度開いた資料は覚えておくので、行き来しても待ちません。

---

## 見られる人

| | |
|---|---|
| 三役 | 会長・副会長・専任幹事・副専任幹事・事務長・副事務長 |
| | 監査・顧問 |
| | **幹事** |
| | **委員会のリーダー／サブリーダー** |

**★ 幹事でなくても、委員会リーダーは見られます。**
県辞令は「**入会6か月以上**」と決まっているため、入会が新しい委員会リーダーは
県提出名簿の幹事欄に載りません（R9では石川正俊・近藤一輝・長谷部明美の3名）。
役職名だけで判定すると、この3名が自分の委員会の名簿を見られなくなります。

判定は `aoi/src/lib/members/repository.ts` の `canViewRoster`。
テストは `repository.test.ts` の「canViewRoster」にあります。

> **ゲスト進捗ボードより広い判定です。** あちらは**動かす**画面なので三役＋委員会リーダーに絞り、
> こちらは**見るだけ**なので役職者まで開けています。片方を直すときは、もう片方を巻き込まないこと。

---

## ⚠ 個人情報の扱い

組織図・名簿には**会員の氏名と会社名**が入ります。会の方針は
「**会員の氏名をLINE配信に載せない**」です（トーク履歴は端末に残り、
機種変更やスクリーンショットで簡単に外へ出るため）。

この画面はその方針と矛盾しません。**LIFFはメッセージではなく、LINEの中で開くウェブページ**だからです。
トーク履歴には何も残りません。

そのうえで、次の3つで守っています。

1. **IDトークンをサーバー側で検証する。**
   画面から送られてくるユーザーIDは信用せず、`aoi` が LINE の `verify` API に問い合わせて本人確認します。
   URLを知っているだけの人には中身が返りません。
2. **役職者だけが通る。** Firestore の `members` の役職で判定します。
   許可リストを別に持たないので、片方だけ古くなる事故が起きません。
3. **配信するときはリンクだけ。** 「名簿を更新しました」＋この画面へのリンク、という送り方をします。
   **氏名はメッセージに書きません。**

> **資料の本体もリポジトリに置いていません。** Firestore の `shared_documents` にあります。
> `aoi` にはリモート（github.com/isihiro87/AoI）があるため、氏名入りのHTMLを置くと履歴に残るためです。
> `aoi/data/member/` を `.gitignore` しているのと同じ考え方です。

---

## しくみ

```
LINEアプリ
  └ リッチメニュー「組織図・名簿」（役員用メニューにだけ在る）
       └ LIFF（この画面）
            │  POST { idToken, action }
            ▼
       aoi アプリ  /api/documents
            │  ① LINE に IDトークンを検証させる
            │  ② members を引いて役職者か確かめる
            ▼
       Firestore  shared_documents（organization / roster）
```

| ファイル | 役割 |
|---|---|
| `aoi/src/app/api/documents/route.ts` | 受け口。認証とCORS |
| `aoi/src/lib/documents/repository.ts` | Firestore の読み出し |
| `aoi/src/lib/members/repository.ts` | `canViewRoster` ＝ 誰が見られるか |
| `aoi/src/lib/line/richmenu.ts` | 役職に応じたメニューの出し分け |
| `aoi/scripts/seed-documents.ts` | `docs/` のHTMLを Firestore へ投入 |
| `aoi/scripts/sync-richmenu.ts` | 全員ぶんのメニューを貼り直す |

---

## 資料の直し方

**原本は `docs/05_名簿・役職者/` のHTMLひとつ**です。A4のPDFも同じHTMLから出しています。

```bash
# 1. HTML を直す
#    docs/05_名簿・役職者/令和9年度_組織図_2026-08-31.html
#    docs/05_名簿・役職者/令和9年度_委員会名簿_2026-08-31.html

# 2. PDF を出し直す（Chrome で印刷。会場で配る紙のぶん）

# 3. LINE 側へ反映
cd aoi
npm run seed:documents            # 何が入るかの確認
npm run seed:documents -- --commit
```

スマホで読むための指定（`@media screen`）は投入時に足しています。
**印刷（A4）の見た目は変わりません。**

ファイル名を変えたときは `aoi/scripts/seed-documents.ts` の `SOURCES` も直してください。

---

## セットアップ

### 1. LIFF は作りません

**ゲスト進捗と同じ LIFF（`2010379578-AHTrNoVb`）にパスを足して使います。**
承認画面が `/approve` を使っているのと同じやり方です。

| | |
|---|---|
| 置き場 | `official_line/line/liff-guests/docs/` |
| 実際のURL | `https://okazaki-aoi.vercel.app/line/liff-guests/docs/` |
| LINEから開くURL | `https://liff.line.me/2010379578-AHTrNoVb/docs` |

`official_line` を push すれば公開されます。

### 3. 役員用リッチメニューを登録する

`../../richmenu/README.md` の手順で `richmenu-officer6.json`（6マス）を登録します。
**2026/8/31 登録済み**: `richmenu-4da00dc3061724f8ea4f3e355f564150`

### 4. aoi 側の環境変数

| 変数 | 中身 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API のアクセストークン |
| `LINE_RICHMENU_OFFICER_ID` | 役員用リッチメニューのID（`richmenu-xxxx`） |
| `LIFF_ALLOWED_ORIGINS` | この画面を置いたオリジン（既定以外に置いた場合） |

### 5. 資料を入れて、メニューを貼る

```bash
cd aoi
npm run seed:documents -- --commit
npm run richmenu:sync                 # 誰がどちらになるかの確認
npm run richmenu:sync -- --commit     # 実際に貼り替える
```

以後、会員登録・承認のたびに自動で貼り替わります。
**ずれたときは `richmenu:sync` をもう一度実行**すれば揃います。

---

## つまずきやすいところ

| 症状 | 見るところ |
|---|---|
| 「役職者の方がご覧になれます」と出る | `npm run members` で、その方の役職が入っているか。承認待ちではないか |
| メニューが切り替わらない | `LINE_RICHMENU_OFFICER_ID` が入っているか。`npm run richmenu:sync -- --commit` を実行 |
| 「ご本人の確認ができませんでした」 | LIFF の Scope に `openid` が入っているか |
| 資料が古い | `npm run seed:documents -- --commit` を実行したか |
