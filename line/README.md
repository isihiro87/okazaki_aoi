# 公式LINE 実装一式（Phase 1 着手分）

岡崎市葵倫理法人会の公式LINE。設計書（`../設計書.md`）§3・§4に沿った最初の実装です。
**まずは「登録案内 → 会員情報の登録 → 最低限のリッチメニュー」まで**を対象とします。

## フォルダ構成

```
line/
├── README.md                ← 本書（全体像とセットアップ順）
├── あいさつメッセージ.md      ← ① 友だち追加時の案内文・各種定型文
├── liff-register/           ← ② 会員情報の登録フォーム（LIFFアプリ）
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── richmenu/                ← ③ リッチメニュー（最低限）
│   ├── richmenu.json        ←   メニュー定義（Messaging API）
│   ├── richmenu-image.svg   ←   メニュー画像のテンプレート（PNGに書き出して使用）
│   └── README.md            ←   登録手順（curl）
└── gas/                     ← 登録フォームの保存先（Google Apps Script）
    ├── Code.gs
    └── README.md
```

## 登場する仕組み（設計書 §2.6 軽量案）

- **LINE公式アカウント＋Messaging API**：あいさつ・リッチメニュー・通知
- **LIFF**：LINE内で開く登録フォーム（`liff-register/`）
- **GAS＋Googleスプレッドシート**：登録内容の保存先（`members` シート＝設計書 §2.5）

## セットアップ順（おすすめ）

> 公式アカウント開設からの**詳しい手順は [`セットアップ手順.md`](./セットアップ手順.md)** を参照。以下は概要です。

1. **スプレッドシート＋GAS**（`gas/README.md`）
   - 会員データの保存先を用意し、GASをWebアプリとして公開 → **Webアプリ URL** を控える。
2. **LIFFアプリ**（`liff-register/`）
   - 登録フォームを任意の静的ホスティングに配置。
   - LINE Developers で **LIFF** を作成（Endpoint URL = フォームのURL）→ **LIFF ID** を控える。
   - `js/app.js` 冒頭の `LIFF_ID` と `GAS_ENDPOINT` を差し替える。
3. **あいさつメッセージ**（`あいさつメッセージ.md`）
   - LINE Official Account Manager の「あいさつメッセージ」に貼り付け。
4. **リッチメニュー**（`richmenu/README.md`）
   - 画像を用意し、`richmenu.json` の URL を実値（LIFF URL・サイトURL）に差し替えて登録、デフォルト設定。

> 差し替えが必要なプレースホルダ：`LIFF_ID` / `GAS_ENDPOINT`（Webアプリ URL）/ サイトURL（`https://example.com/`）/ スプレッドシートID。

## 対象範囲と次の段階

- **今回（Phase 1）**：友だち追加の案内、会員の氏名・役職・委員会の登録、最低限のリッチメニュー。
- **次段階（設計書 §3.4以降）**：週次配信、出欠回答、ステップ配信、トリガー配信、リッチメニュー出し分け。
