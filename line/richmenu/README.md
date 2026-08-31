# リッチメニュー（最低限）セットアップ

会員向けの最小構成（2×2）。

| 左上 | 右上 |
|---|---|
| **会員登録**（LIFFフォームを開く） | **講話スケジュール**（サイト #schedule） |
| **会場アクセス**（サイト #access） | **お問い合わせ**（「お問い合わせ」と送信） |

> 設計書 §3.3 の会員向けメニューのうち、今すぐ動く4機能に絞っています。出欠連絡・行事/研修などは機能実装後に追加します。

## 事前に差し替えるもの（`richmenu.json`）

- `会員登録` の `uri` → 実際の **LIFF URL**（`https://liff.line.me/＜LIFF ID＞`）
- `講話スケジュール` / `会場アクセス` の `uri` → `https://okazaki-aoi.vercel.app/`（設定済み）

## 画像

- **`richmenu-image.jpg`（2500×1686・約0.6MB）が配置済み**。これをそのままアップロードに使う。
  - LINEの制限：幅800〜2500px／縦横比1.45以上／**1MB以下**。
- 作り直す場合は `画像生成プロンプト.md` で生成 → 2500×1686・1MB以下に調整、または `richmenu-image.svg`（テンプレート）をPNG/JPGに書き出す。

## 登録（Messaging API）

`＜TOKEN＞` はチャネルアクセストークン（長期）。`curl` の例：

```bash
# 1) メニュー定義を登録 → 返ってくる richMenuId を控える
curl -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer ＜TOKEN＞" \
  -H "Content-Type: application/json" \
  -d @richmenu.json

# 2) 画像をアップロード（JPEG）
curl -X POST https://api-data.line.me/v2/bot/richmenu/＜richMenuId＞/content \
  -H "Authorization: Bearer ＜TOKEN＞" \
  -H "Content-Type: image/jpeg" \
  --data-binary @richmenu-image.jpg

# 3) 全ユーザーの既定メニューに設定
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/＜richMenuId＞ \
  -H "Authorization: Bearer ＜TOKEN＞"
```

> GUIで作る場合：LINE Official Account Manager「リッチメニュー」からでも作成可。その場合は各ボタンに上記URL／メッセージを割り当てる。

## 確認

- LINEでアカウントを開き、メニューの4ボタンがそれぞれ正しく開く／送信されることを確認。
- 「お問い合わせ」送信時は、自動応答 or 1to1で受けられるよう Official Account Manager 側を設定（設計書 §3.1）。

---

## 役員用メニュー（役職に応じた出し分け・6マス）

`richmenu-officer6.json` は**役職者だけ**に見せる6マスのメニューです。
画像は `richmenu-image-officer6.jpg`（既定メニューと同じ和モダンのテイスト）。

| | 左 | 中 | 右 |
|---|---|---|---|
| **上** | **組織図・名簿**（資料棚のLIFF） | **ゲスト進捗** | 会員登録 |
| **下** | 講話スケジュール | 会場アクセス | お問い合わせ |

既定メニュー（4マス）に、役員だけの2つ（組織図・名簿／ゲスト進捗）を足した形です。
一般会員ができることは、役員も全部できます。

### なぜ個別に紐づけるのか

**LINE標準の絞り込み配信（オーディエンス）は使えません。** 対象人数の下限（50人程度）があり、
葵の役員27名では下限割れします。ユーザー個別のリッチメニュー紐づけには下限がありません。

### 画像を作り直すとき

`画像生成プロンプト.md` と同じ要領で画像生成AIに作らせます。
**4マス版のテンプレート `richmenu-image.svg` は下書きで、実物とは別物**なので参考にしないこと。
本物のテイストは `richmenu-image.jpg` を見てください。

できた画像は **2500×1686・1MB以下のJPEG**にします（生成直後のPNGは数MBあります）。

### 手順

```bash
# 1. 役員用メニューを登録して ID を控える
curl -X POST https://api.line.me/v2/bot/richmenu   -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"   -H "Content-Type: application/json"   -d @richmenu-officer6.json
#   → {"richMenuId":"richmenu-xxxxxxxx"}

# 2. 画像を上げる
curl -X POST https://api-data.line.me/v2/bot/richmenu/richmenu-xxxxxxxx/content   -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"   -H "Content-Type: image/jpeg"   --data-binary @richmenu-image-officer6.jpg

# 3. aoi の .env.local と Vercel の環境変数に控えた ID を入れる
#    LINE_RICHMENU_OFFICER_ID=richmenu-xxxxxxxx

# 4. 全員ぶんを貼り直す
cd ../../../aoi
npm run richmenu:sync                 # 誰がどちらになるかの確認
npm run richmenu:sync -- --commit
```

> **既定メニューは「デフォルト」に設定したままにしてください。** 役員用は個別紐づけで上書きされます。
> 役職から外れた方は紐づけが解かれ、自動で既定へ戻ります。
> `LINE_RICHMENU_OFFICER_ID` が未設定のあいだは、出し分けそのものが動きません（全員が既定）。

以後は**会員登録・承認のたびに自動で貼り替わります**。
ずれたときは `npm run richmenu:sync -- --commit` で揃います。

### 現在の登録（2026/8/31）

| | ID |
|---|---|
| 既定（会員メニュー・4マス） | `richmenu-02481a26334f09572c0a10deb8a29b4a` |
| 役員メニュー（6マス） | `richmenu-4da00dc3061724f8ea4f3e355f564150` |
