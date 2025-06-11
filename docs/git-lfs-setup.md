# 🗃️ Git LFS でモデルファイルをアップロードする方法

## 📋 概要
機械学習モデルファイル（50MB）をGitHubにアップロードするため、Git LFS (Large File Storage) を使用します。

## 🛠️ セットアップ手順

### 1. Git LFS のインストール
```bash
# Windows (Git for Windows に含まれている)
git lfs version

# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt-get install git-lfs
```

### 2. リポジトリでの LFS 初期化
```bash
# リポジトリルートで実行
git lfs install
```

### 3. .gitattributes ファイルの追加
```bash
# すでに作成済み（.gitattributes）
git add .gitattributes
git commit -m "Add Git LFS configuration"
```

### 4. モデルファイルの追加
```bash
# モデルファイルをmodels/ディレクトリに配置
cp /path/to/binary_high_low_model.h5 models/

# LFS管理でファイル追加
git add models/binary_high_low_model.h5
git commit -m "Add machine learning model via Git LFS"

# GitHubにプッシュ
git push origin main
```

## ✅ 確認方法
```bash
# LFS管理ファイルの確認
git lfs ls-files

# LFS状態の確認
git lfs status
```

## 📊 Git LFS の制限
- **無料枠**: 1GB ストレージ + 1GB 帯域幅/月
- **有料プラン**: 追加容量購入可能
- **ファイルサイズ**: 最大2GB/ファイル

## 🔧 トラブルシューティング

### エラー: "This repository is over its data quota"
```bash
# 使用量確認
git lfs ls-files --size

# 不要なLFSファイル削除
git lfs untrack "*.old"
git add .gitattributes
git commit -m "Remove old files from LFS"
``` 