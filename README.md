# Google Ads CLI

Google Ads API を使ったキャンペーン管理・インサイト取得・予算アラートのコマンドラインツール（Node.js / TypeScript 製）。

## 機能

- **campaigns** — キャンペーン一覧表示・有効化
- **adgroups** — 広告グループ管理
- **ads** — 広告管理
- **insights** — インプレッション・クリック・費用のレポート取得
- **create** — キャンペーン・広告グループ・広告の一括作成
- **budget-check** — 予算上限未設定または閾値超過のキャンペーンを検出（CI/CD 組み込み可）
- **auth** — 認証テスト

## 必要条件

- Node.js 22+
- Google Ads API アクセス（Developer Token + OAuth2 認証情報）

## セットアップ

```bash
git clone https://github.com/tackeyy/google-ads-cli.git
cd google-ads-cli
npm install
npm run build
npm link  # または npx tsx src/cli/index.ts で直接実行
```

## 環境変数

`.env` ファイルまたはシェル環境に以下を設定してください:

```bash
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id          # 数字のみ（ハイフンなし）
GOOGLE_ADS_LOGIN_CUSTOMER_ID=your_mcc_account_id # MCC（管理者）アカウントID
```

> ⚠️ `.env` ファイルをリポジトリにコミットしないでください（`.gitignore` で除外済み）

## 使い方

### キャンペーン一覧

```bash
google-ads-cli campaigns
google-ads-cli campaigns --json  # JSON 出力
```

### 予算チェック（budget-check）

```bash
# デフォルト閾値 ¥10,000/日 でチェック
google-ads-cli budget-check

# カスタム閾値（¥5,000/日）
google-ads-cli budget-check --threshold 5000

# JSON 出力（CI/CD 向け）
google-ads-cli budget-check --json
```

**出力例（問題なし）:**
```
✅ 全キャンペーンに予算上限が設定されています
```

**出力例（アラートあり）:**
```
⚠️  予算上限未設定または上限超過のキャンペーン（閾値: ¥10,000/日）:
  • 無制限キャンペーン (ID: 123456) — 予算上限未設定（unlimited）
  • 高予算キャンペーン (ID: 789012) — ¥50,000/日（閾値超過）

✅ 正常なキャンペーン: 3件
```

**exit code:**
- `0` — 問題なし
- `1` — アラートあり（CI/CD でゲートとして使用可能）

### CI/CD での使い方

```yaml
# GitHub Actions の例
- name: Google Ads 予算チェック
  run: google-ads-cli budget-check --threshold 10000
  env:
    GOOGLE_ADS_DEVELOPER_TOKEN: ${{ secrets.GOOGLE_ADS_DEVELOPER_TOKEN }}
    GOOGLE_ADS_CLIENT_ID: ${{ secrets.GOOGLE_ADS_CLIENT_ID }}
    GOOGLE_ADS_CLIENT_SECRET: ${{ secrets.GOOGLE_ADS_CLIENT_SECRET }}
    GOOGLE_ADS_REFRESH_TOKEN: ${{ secrets.GOOGLE_ADS_REFRESH_TOKEN }}
    GOOGLE_ADS_CUSTOMER_ID: ${{ secrets.GOOGLE_ADS_CUSTOMER_ID }}
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: ${{ secrets.GOOGLE_ADS_LOGIN_CUSTOMER_ID }}
```

### インサイト取得

```bash
google-ads-cli insights --from 2026-03-01 --to 2026-03-29
google-ads-cli insights --from 2026-03-01 --to 2026-03-29 --json
```

### キャンペーン有効化

```bash
google-ads-cli campaigns enable --id 123456789
```

### キャンペーン作成（一括）

```bash
google-ads-cli create --name "新キャンペーン" --budget 10000 --url "https://example.com"
```

### 認証テスト

```bash
google-ads-cli auth
```

## テスト

```bash
npm test        # vitest でユニットテスト実行
npm run test:watch  # ウォッチモード
```

## ライセンス

MIT © [tackeyy](https://github.com/tackeyy)
