# 📦 モデルファイルのダウンロード方法

## 🎯 概要
機械学習モデルファイルは容量制限のため、GitHub Releasesから別途ダウンロードする必要があります。

## 📥 自動ダウンロードスクリプト

### setup_model.py
```python
#!/usr/bin/env python3
"""
モデルファイル自動ダウンロードスクリプト
"""

import os
import requests
from pathlib import Path

def download_model():
    """GitHub ReleasesからモデルファイルをダウンロードX"""
    
    # ダウンロード設定
    MODEL_URL = "https://github.com/USERNAME/beef-marbling-pwa/releases/download/v1.0.0/binary_high_low_model.h5"
    MODEL_PATH = Path("models/binary_high_low_model.h5")
    
    # ディレクトリ作成
    MODEL_PATH.parent.mkdir(exist_ok=True)
    
    # ファイル存在チェック
    if MODEL_PATH.exists():
        print(f"✓ モデルファイルは既に存在します: {MODEL_PATH}")
        return True
    
    print(f"📥 モデルファイルをダウンロード中...")
    print(f"🌐 URL: {MODEL_URL}")
    
    try:
        # ダウンロード実行
        response = requests.get(MODEL_URL, stream=True)
        response.raise_for_status()
        
        # ファイル保存
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✓ ダウンロード完了: {MODEL_PATH}")
        print(f"📊 ファイルサイズ: {MODEL_PATH.stat().st_size / 1024 / 1024:.1f} MB")
        
        return True
        
    except Exception as e:
        print(f"✗ ダウンロード失敗: {e}")
        return False

if __name__ == "__main__":
    download_model()
```

## 🚀 使用方法

### 1. 手動ダウンロード
1. GitHubリポジトリページへ移動
2. 「Releases」セクションをクリック
3. 最新リリースから `binary_high_low_model.h5` をダウンロード
4. `models/` ディレクトリに配置

### 2. 自動ダウンロード
```bash
# スクリプト実行
python setup_model.py

# または起動時に自動実行
python run.py
```

## 📋 手順詳細

### GitHub Releases アップロード手順
1. GitHubリポジトリで「Releases」→「Create a new release」
2. Tag: `v1.0.0`、Title: `Initial Release`
3. 「Attach binaries」でモデルファイルをアップロード
4. 「Publish release」をクリック

### ダウンロード URL
```
https://github.com/USERNAME/REPOSITORY/releases/download/TAG/binary_high_low_model.h5
```

## ⚡ 自動化オプション

### run.py への統合
```python
def check_and_download_model():
    """起動時にモデルファイルの存在確認とダウンロード"""
    model_path = Path("models/binary_high_low_model.h5")
    
    if not model_path.exists():
        print("⚠️ モデルファイルが見つかりません")
        print("📥 自動ダウンロードを開始します...")
        
        if download_model():
            print("✓ モデルファイル準備完了")
        else:
            print("✗ 手動でダウンロードしてください")
            return False
    
    return True
```

## 🔧 トラブルシューティング

### エラー: "Failed to download model"
1. インターネット接続を確認
2. GitHub Releasesページでファイル存在確認
3. URLの正確性を確認

### エラー: "Permission denied"
1. `models/` ディレクトリの書き込み権限確認
2. 管理者権限でスクリプト実行 