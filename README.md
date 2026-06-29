# Takoshin Tools

面積、通貨、画像形式、割引金額を変換・計算する Next.js 製ツール集です。

## 主なページ

- `/` - ㎡・坪・畳の面積変換
- `/currency` - 日本円など主要通貨の換算
- `/image` - JPEG / PNG / WebP の画像形式変換
- `/discount` - 税込・税抜と割引率を指定する割引計算

## 技術構成

- Next.js App Router
- TypeScript
- React
- pnpm

画像変換はブラウザ内の Canvas API で処理します。通貨換算はアプリ内 API から ExchangeRate-API の公開レートを取得し、取得できない場合は参考レートを表示します。

## 開発環境

### 必要なもの

- Node.js 22 系推奨
- Corepack
- pnpm 9.15.4

このリポジトリでは `packageManager` に `pnpm@9.15.4` を指定しています。

### セットアップ

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
corepack pnpm install
```

### 開発サーバー

```bash
corepack pnpm dev
```

起動後、ブラウザで `http://localhost:3000` を開きます。

### よく使うコマンド

```bash
corepack pnpm typecheck
```

TypeScript の型チェックを実行します。

```bash
corepack pnpm build
```

本番ビルドが通るか確認します。

```bash
corepack pnpm start
```

`corepack pnpm build` 後に、ビルド済みアプリをローカルで起動します。

## 開発時の注意

- 新しいツールページを追加する場合は、`app/<page>/page.tsx` と `components/` 配下のコンポーネントを追加します。
- ナビゲーションに表示する場合は `components/AppShell.tsx` の `navItems` に追加します。
- 数値の正規化や円表示など、共通処理は `lib/conversions.ts` にまとめます。
- UI の全体スタイルは `app/globals.css` にあります。
- 本番反映前に `corepack pnpm typecheck` と `corepack pnpm build` を通してください。

## Vercel 本番運用

### 初回デプロイ

1. GitHub にリポジトリを push します。
2. Vercel で `Add New...` → `Project` を選び、このリポジトリを import します。
3. Framework Preset は `Next.js` を選択します。
4. Build Command は通常 `pnpm build` のままで問題ありません。
5. Install Command は通常 `pnpm install` のままで問題ありません。
6. Production Branch は `main` を指定します。
7. Deploy を実行します。

### 環境変数

現時点では必須の環境変数はありません。

将来、為替レート API のキーやサーバー側 API を使う場合は、Vercel の Project Settings → Environment Variables に追加します。ブラウザに公開してよい値だけ `NEXT_PUBLIC_` を付け、秘密情報には付けないでください。

### 日常運用

- `main` ブランチへ merge すると Production Deploy が走ります。
- Pull Request を作成すると Preview Deploy が作られます。
- Vercel の Deployments 画面で各デプロイのログ、ビルド結果、Preview URL を確認できます。
- 本番で問題が出た場合は、Vercel の該当 Deployment から以前の正常なデプロイへ Promote / Rollback します。

### 本番前チェック

ローカルで以下を確認してから push します。

```bash
corepack pnpm typecheck
corepack pnpm build
```

Preview Deploy では、最低限以下を確認します。

- `/` 面積変換の入力更新
- `/currency` 通貨換算の表示
- `/image` 画像選択と変換ダウンロード
- `/discount` 税込・税抜・割引率の切り替え
- スマートフォン幅で表示崩れがないこと

### ドメイン運用

独自ドメインを使う場合は、Vercel の Project Settings → Domains からドメインを追加します。DNS 側では Vercel が表示する `A` レコードまたは `CNAME` を設定します。

DNS 変更後は反映に時間がかかる場合があります。Vercel 上で `Valid Configuration` になっていることを確認してください。

## ディレクトリ構成

```text
app/
  currency/page.tsx
  discount/page.tsx
  image/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  AppShell.tsx
  AreaConverter.tsx
  CurrencyConverter.tsx
  DiscountCalculator.tsx
  ImageConverter.tsx
lib/
  conversions.ts
```
