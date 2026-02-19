# バーチャル・ボードルーム (Virtual Boardroom)

このアプリは、特定の経営層の思考スタイルを持つAIと対話し、アイデアを研磨したり、AI同士の議論を客観視することで新しい気づきを得るためのプラットフォームです。

## セットアップ

### 1. バックエンドの準備

1. `frontend/api` ディレクトリに移動します。
2. `.env` ファイルを作成し、GeminiのAPIキーを設定してください（`frontend/api/main.py` が読み込みます）。
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. 仮想環境を有効化し、依存関係をインストールします。
   ```bash
   cd frontend/api
   # Windowsの場合
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. バックエンドサーバーを起動します。
   ```bash
   python main.py
   ```
   サーバーは `http://localhost:8000` で起動します。

### 2. フロントエンドの準備

1. `frontend` ディレクトリに移動します。
2. 依存関係をインストールします。
   ```bash
   cd frontend
   npm install
   ```
3. フロントエンド開発サーバーを起動します。
   ```bash
   npm run dev
   ```
   アプリは `http://localhost:3000` で閲覧可能です。

## デプロイ (Vercel)

このアプリは Vercel に一本化してデプロイ可能です。
1. `frontend` ディレクトリを Root として Vercel プロジェクトを作成します。
2. 環境変数 `GEMINI_API_KEY` を Vercel の管理画面で設定してください。

## 機能

- **壁打ちモード（1対1）**: 選択した性格の経営者AIと直接対話します。
- **ディスカッションモード（AI同士）**: 2人の経営者AIが特定のテーマについて議論する様子を閲覧できます。

## 使用技術

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Python (FastAPI), Google Gemini API (gemini-2.5-flash)

