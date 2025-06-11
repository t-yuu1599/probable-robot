# 🤖 機械学習モデルディレクトリ

このディレクトリには、牛肉マーブリング判定用の機械学習モデルファイルを配置します。

## 📋 必要なモデルファイル

### `binary_high_low_model.h5`
- **形式**: Keras HDF5形式
- **サイズ**: 約50MB
- **精度**: 87.5%
- **分類**: バイナリ分類（上カルビ/並カルビ）

## 📁 ファイル配置

```bash
# モデルファイルを本ディレクトリに配置
cp /path/to/binary_high_low_model.h5 models/
```

配置後の構造：
```
models/
├── README.md                    # このファイル
└── binary_high_low_model.h5     # 判定用モデル（配置が必要）
```

## ⚠️ 重要な注意事項

### ファイルサイズについて
- モデルファイルは約50MBの大容量ファイルです
- GitHubの通常のファイルサイズ制限（100MB）以下ですが、リポジトリサイズを考慮して`.gitignore`で除外しています
- 本番環境では別途モデルファイルを配置してください

### Git LFS の使用（推奨）
大容量モデルファイルの管理には Git LFS (Large File Storage) の使用を推奨します：

```bash
# Git LFS の初期化
git lfs install

# モデルファイルをLFS管理に追加
git lfs track "*.h5"

# .gitattributesファイルをコミット
git add .gitattributes
git commit -m "Track *.h5 files using Git LFS"

# モデルファイルを追加
git add models/binary_high_low_model.h5
git commit -m "Add binary classification model"
```

## 🔄 モデル更新手順

1. **新しいモデルファイルの準備**
   ```bash
   # バックアップ作成
   cp models/binary_high_low_model.h5 models/backup_$(date +%Y%m%d).h5
   ```

2. **新モデルの配置**
   ```bash
   cp /path/to/new_model.h5 models/binary_high_low_model.h5
   ```

3. **アプリケーション再起動**
   ```bash
   python run.py
   ```

## 🧪 モデル検証

モデルファイルが正しく配置されているか確認：

```python
import tensorflow as tf

# モデル読み込みテスト
try:
    model = tf.keras.models.load_model('models/binary_high_low_model.h5')
    print(f"✓ モデル読み込み成功")
    print(f"📊 モデル構造: {model.summary()}")
except Exception as e:
    print(f"✗ モデル読み込み失敗: {e}")
```

## 📞 サポート

モデルファイルに関する問題がある場合は、以下をご確認ください：

1. **ファイル存在確認**: `models/binary_high_low_model.h5` が存在するか
2. **ファイル権限**: 読み取り権限があるか
3. **ファイル形式**: Keras HDF5形式（.h5）であるか
4. **TensorFlowバージョン**: requirements.txtの指定バージョンと一致するか

---

**🤖 牛肉マーブリング判定用 AI モデル** - 高精度な判定でビジネスをサポート 