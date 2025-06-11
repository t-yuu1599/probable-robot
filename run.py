#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
牛肉マーブリング判定システム PWA版
起動スクリプト

概要:
- 開発環境・本番環境対応
- 環境変数による設定
- ログ設定
- エラーハンドリング
"""

import os
import sys
import logging
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 環境変数の設定
os.environ.setdefault('FLASK_APP', 'app.py')
os.environ.setdefault('FLASK_ENV', 'development')

# アプリケーションのインポート
try:
    from app import app, main
except ImportError as e:
    print(f"✗ アプリケーションのインポートに失敗: {e}")
    print("📋 必要な依存関係をインストールしてください:")
    print("   pip install -r requirements.txt")
    sys.exit(1)


def setup_logging():
    """
    ログ設定の初期化
    """
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('pwa_app.log', encoding='utf-8')
        ]
    )

    # Werkzeugのログレベル調整
    logging.getLogger('werkzeug').setLevel(logging.WARNING)


def check_dependencies():
    """
    依存関係の確認

    Returns:
        bool: 依存関係が満たされているか
    """
    required_modules = [
        'flask', 'flask_cors', 'tensorflow', 'numpy',
        'PIL', 'cv2', 'pandas'
    ]

    missing_modules = []

    for module in required_modules:
        try:
            __import__(module)
        except ImportError:
            missing_modules.append(module)

    if missing_modules:
        print(f"✗ 不足している依存関係: {', '.join(missing_modules)}")
        print("📋 以下のコマンドで依存関係をインストールしてください:")
        print("   pip install -r requirements.txt")
        return False

    return True


def check_model_files():
    """
    モデルファイルの存在確認

    Returns:
        bool: モデルファイルが存在するか
    """
    model_path = project_root / 'models' / 'binary_high_low_model.h5'

    if not model_path.exists():
        print(f"✗ モデルファイルが見つかりません: {model_path}")
        print("📋 モデルファイルを配置してください")
        return False

    print(f"✓ モデルファイル確認完了: {model_path}")
    return True


def create_directories():
    """
    必要なディレクトリの作成
    """
    directories = [
        project_root / 'logs',
        project_root / 'temp',
        project_root / 'static' / 'icons'
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

    print("✓ ディレクトリ構造確認完了")


def print_startup_info():
    """
    起動情報の表示
    """
    print("=" * 60)
    print("🥩 牛肉マーブリング判定システム PWA版")
    print("=" * 60)
    print(f"📁 プロジェクトルート: {project_root}")
    print(f"🐍 Python バージョン: {sys.version}")
    print(f"🌐 Flask 環境: {os.getenv('FLASK_ENV', 'development')}")
    print(f"📝 ログレベル: {os.getenv('LOG_LEVEL', 'INFO')}")
    print("=" * 60)


def main_startup():
    """
    メイン起動処理
    """
    print_startup_info()

    # ログ設定
    setup_logging()
    logger = logging.getLogger(__name__)

    try:
        # 依存関係チェック
        if not check_dependencies():
            return False

        # ディレクトリ作成
        create_directories()

        # モデルファイルチェック
        if not check_model_files():
            return False

        logger.info("✓ 全ての事前チェックが完了しました")

        # アプリケーション起動
        logger.info("🚀 PWAアプリケーションを起動します...")
        main()

        return True

    except KeyboardInterrupt:
        logger.info("⚠️ ユーザーによって中断されました")
        return True

    except Exception as e:
        logger.error(f"✗ 起動エラー: {e}")
        return False


if __name__ == '__main__':
    try:
        success = main_startup()
        sys.exit(0 if success else 1)

    except Exception as e:
        print(f"✗ 致命的エラー: {e}")
        sys.exit(1)
