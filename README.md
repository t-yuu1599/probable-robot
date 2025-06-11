# 🥩 牛肉マーブリング判定システム PWA版

食肉処理施設での現場判定を支援する Progressive Web Application (PWA) システムです。  
機械学習モデルを使用して牛肉のマーブリング度合いを判定し、上カルビ・並カルビの分類を行います。

## 📋 システム概要

| 項目 | 内容 |
|------|------|
| **システム名** | 牛肉マーブリング判定システム（PWA版） |
| **用途** | 食肉処理施設での現場判定支援 |
| **判定対象** | 牛肉のマーブリング（上カルビ/並カルビ分類） |
| **対象デバイス** | スマートフォン・タブレット（Android/iOS） |
| **精度** | 87.5%（バイナリ分類モデル） |

## 🛠️ 技術スタック

### バックエンド
- **Python 3.8+**
- **Flask 2.3+** - Webフレームワーク
- **TensorFlow 2.13** - 機械学習
- **OpenCV 4.8** - 画像処理
- **Pillow 10.0** - 画像操作

### フロントエンド
- **HTML5 + CSS3 + JavaScript (ES6+)**
- **Bootstrap 5.3** - UIフレームワーク
- **PWA技術** - Service Worker、Web App Manifest
- **Camera API** - カメラアクセス

## 📁 プロジェクト構造

```
pwa_app/
├── app.py                    # Flaskメインアプリケーション
├── run.py                    # 起動スクリプト
├── requirements.txt          # Python依存関係
├── README.md                # プロジェクト説明
├── models/                   # 機械学習モデル
│   └── binary_high_low_model.h5
├── utils/                    # ユーティリティモジュール
│   ├── __init__.py
│   ├── image_processor.py    # 画像前処理
│   └── model_handler.py      # モデル推論
├── templates/               # HTMLテンプレート
│   └── index.html           # メインページ
└── static/                  # 静的リソース
    ├── css/
    │   ├── style.css        # メインスタイル
    │   └── mobile.css       # モバイル特化スタイル
    ├── js/
    │   ├── app.js           # メインアプリケーション
    │   ├── camera.js        # カメラ機能
    │   ├── prediction.js    # 判定処理
    │   └── sw.js            # Service Worker
    └── icons/               # PWAアイコン
        └── README.txt       # アイコン配置説明
```

## 🚀 インストール・セットアップ

### 1. 前提条件

- Python 3.8以上
- pip（Python パッケージマネージャー）
- Webカメラ対応デバイス（推奨）

### 2. リポジトリのクローン

```bash
git clone <repository-url>
cd pwa_app
```

### 3. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 4. モデルファイルの配置

学習済みモデルファイル `binary_high_low_model.h5` を `models/` ディレクトリに配置してください。

```bash
# モデルファイルの配置例
cp /path/to/binary_high_low_model.h5 models/
```

### 5. PWAアイコンの配置（オプション）

PWAアイコン（192x192px、512x512px）を `static/icons/` ディレクトリに配置してください。

```bash
# アイコンファイルの配置例
cp icon-192.png static/icons/
cp icon-512.png static/icons/
```

## 🎯 使用方法

### 開発環境での起動

```bash
python run.py
```

または

```bash
python app.py
```

### 本番環境での起動

```bash
# Gunicornを使用（Linux/macOS）
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Waitressを使用（Windows対応）
waitress-serve --port=5000 app:app
```

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `FLASK_ENV` | `development` | Flask実行環境 |
| `FLASK_DEBUG` | `True` | デバッグモード |
| `LOG_LEVEL` | `INFO` | ログレベル |
| `MODEL_PATH` | `models/binary_high_low_model.h5` | モデルファイルパス |

## 📱 PWA機能

### インストール
1. Webブラウザでアプリケーションにアクセス
2. 「ホーム画面に追加」プロンプトをタップ
3. アプリがホーム画面にインストールされます

### オフライン対応
- 静的リソースはキャッシュされ、オフラインでも基本機能が利用可能
- 判定機能はオンライン時のみ利用可能

### Service Worker機能
- 自動キャッシュ管理
- バックグラウンド同期
- プッシュ通知対応（将来実装予定）

## 🎮 操作方法

### 画像判定の流れ

1. **画像取得**
   - 📷 カメラで撮影、または
   - 📁 ファイルから選択

2. **判定実行**
   - 🔮 「判定実行」ボタンをタップ
   - ⏳ 処理中表示

3. **結果確認**
   - 📊 判定結果表示（上カルビ/並カルビ）
   - 📈 信頼度スコア
   - ⏱️ 処理時間

### システム監視

- 🟢 システムステータス（正常/異常）
- 📡 ネットワーク接続状態
- 🔄 自動ヘルスチェック（30秒間隔）

## 🐛 トラブルシューティング

### よくある問題

#### カメラにアクセスできない
```
解決方法:
1. ブラウザのカメラ権限を確認
2. HTTPSで接続（Chrome等で必要）
3. デバイスのカメラ設定を確認
```

#### モデル読み込みエラー
```
エラー: ModelNotFoundError
解決方法:
1. models/binary_high_low_model.h5 の存在確認
2. ファイル権限の確認
3. TensorFlowバージョンの確認
```

#### 依存関係エラー
```
解決方法:
1. pip install -r requirements.txt
2. Python バージョン確認（3.8以上）
3. 仮想環境の使用を推奨
```

## 📊 API仕様

### 判定API

#### `POST /api/predict`

**リクエスト:**
```
Content-Type: multipart/form-data
image: <画像ファイル>
```

**レスポンス:**
```json
{
  "status": "success",
  "prediction": "HIGH",
  "confidence": 0.875,
  "classification": "上カルビ",
  "processing_time": 2.3,
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### ヘルスチェックAPI

#### `GET /api/health`

**レスポンス:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2023-12-01T10:30:00Z",
  "version": "1.0.0"
}
```

## 🔒 セキュリティ

- ファイルサイズ制限: 10MB
- 対応ファイル形式: JPEG, PNG
- CORS設定済み
- 入力値検証実装

## 📈 パフォーマンス

- 判定処理時間: 平均2-3秒
- モデルサイズ: 約50MB
- メモリ使用量: 約200-300MB

## 🤝 開発・貢献

### 開発環境セットアップ

```bash
# 仮想環境作成
python -m venv venv

# 仮想環境有効化
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt
```

### コードスタイル

- PEP 8準拠
- 日本語コメント
- 型ヒント推奨

### テスト

```bash
# 単体テスト実行（実装予定）
python -m pytest tests/

# カバレッジ確認（実装予定）
pytest --cov=app tests/
```

## 📝 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 📞 サポート

問題や質問がある場合は、以下の方法でお問い合わせください：

- 📧 Email: [support@example.com](mailto:support@example.com)
- 🐛 Issues: GitHub Issues
- 📚 Wiki: プロジェクトWiki

## 🔄 更新履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2023-12-01 | 初回リリース |

---

**🥩 牛肉マーブリング判定システム PWA版** - 高精度な判定で食肉処理現場をサポート 