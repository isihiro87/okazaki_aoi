# リッチメニュー（最低限）セットアップ

会員向けの最小構成（2×2）。

| 左上 | 右上 |
|---|---|
| **会員登録**（LIFFフォームを開く） | **講話スケジュール**（サイト #schedule） |
| **会場アクセス**（サイト #access） | **お問い合わせ**（「お問い合わせ」と送信） |

> 設計書 §3.3 の会員向けメニューのうち、今すぐ動く4機能に絞っています。出欠連絡・行事/研修などは機能実装後に追加します。

## 事前に差し替えるもの（`richmenu.json`）

- `会員登録` の `uri` → 実際の **LIFF URL**（`https://liff.line.me/＜LIFF ID＞`）
- `講話スケジュール` / `会場アクセス` の `uri` → 公開サイトのURL（`https://example.com/` を実ドメインに）

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
