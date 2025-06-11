#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
牛肉マーブリング判定システム PWA版
Flask メインアプリケーション

概要:
- 食肉処理施設での現場判定支援（上カルビ/並カルビ分類）
- PWA対応によるオフライン・クロスプラットフォーム動作
- 87.5%精度のバイナリ分類モデルを使用

主な機能:
- 画像アップロード・判定API
- PWA配信（HTML/CSS/JS/Manifest）
- ヘルスチェック・モデル情報API
- レスポンシブ対応
"""

import os
import io
import json
import time
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np
import tensorflow as tf

# ユーティリティのインポート
from utils.image_processor import ImageProcessor
from utils.model_handler import ModelHandler

# Flaskアプリケーションの初期化
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB制限
app.config['SECRET_KEY'] = 'beef_marbling_pwa_2025'

# CORS設定（PWAアクセス用）
CORS(app, origins=['http://localhost:5000', 'https://localhost:5000'])

# グローバル変数
image_processor = None
model_handler = None


def initialize_components():
    """
    画像処理とモデルハンドラーの初期化

    Returns:
        bool: 初期化成功可否
    """
    global image_processor, model_handler

    try:
        # 画像処理器の初期化
        image_processor = ImageProcessor()

        # モデルハンドラーの初期化
        model_path = os.path.join('models', 'binary_high_low_model.h5')
        model_handler = ModelHandler(model_path)

        print("✓ 画像処理器とモデルハンドラーの初期化完了")
        return True

    except Exception as e:
        print(f"✗ 初期化エラー: {str(e)}")
        return False


@app.route('/')
def index():
    """
    PWAメインページの配信

    Returns:
        str: レンダリングされたHTML
    """
    return render_template('index.html')


@app.route('/manifest.json')
def manifest():
    """
    PWA Manifestファイルの配信

    Returns:
        dict: PWA Manifest設定
    """
    manifest_data = {
        "name": "牛肉マーブリング判定システム",
        "short_name": "牛肉判定",
        "description": "上カルビ/並カルビの即座判定",
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#2c3e50",
        "background_color": "#ecf0f1",
        "orientation": "portrait",
        "icons": [
            {
                "src": "/static/icons/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    }
    return jsonify(manifest_data)


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    画像判定API

    Request:
        multipart/form-data:
            image: ファイル (JPEG/PNG, 最大10MB)

    Returns:
        dict: 判定結果
            {
                "status": "success" | "error",
                "prediction": "HIGH" | "LOW",
                "confidence": float,
                "classification": "上カルビ" | "並カルビ",
                "processing_time": float,
                "timestamp": str
            }
    """
    start_time = time.time()

    try:
        # ファイル存在チェック
        if 'image' not in request.files:
            return jsonify({
                'status': 'error',
                'message': '画像ファイルが送信されていません'
            }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'ファイルが選択されていません'
            }), 400

        # ファイル形式チェック
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        if '.' not in file.filename or \
           file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({
                'status': 'error',
                'message': 'サポートされていないファイル形式です（PNG, JPG, JPEG のみ）'
            }), 400

        # 画像の読み込みと前処理
        image = Image.open(io.BytesIO(file.read()))
        processed_image = image_processor.preprocess(image)

        # モデル推論実行
        prediction_result = model_handler.predict(processed_image)

        # 処理時間計算
        processing_time = round(time.time() - start_time, 2)

        # 結果の整形
        prediction_class = "HIGH" if prediction_result['prediction'] == 1 else "LOW"
        classification = "上カルビ" if prediction_class == "HIGH" else "並カルビ"

        result = {
            'status': 'success',
            'prediction': prediction_class,
            'confidence': round(prediction_result['confidence'], 3),
            'classification': classification,
            'processing_time': processing_time,
            'timestamp': datetime.now().isoformat()
        }

        print(
            f"✓ 判定完了: {classification} (信頼度: {result['confidence']:.1%}, 処理時間: {processing_time}s)")
        return jsonify(result)

    except Exception as e:
        error_message = f"判定処理中にエラーが発生しました: {str(e)}"
        print(f"✗ 判定エラー: {error_message}")

        return jsonify({
            'status': 'error',
            'message': error_message,
            'processing_time': round(time.time() - start_time, 2),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/health')
def health_check():
    """
    ヘルスチェックAPI

    Returns:
        dict: システム状態
    """
    global model_handler, image_processor

    status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {
            'model_handler': model_handler is not None,
            'image_processor': image_processor is not None
        }
    }

    if model_handler:
        status['model_info'] = model_handler.get_model_info()

    return jsonify(status)


@app.route('/api/model/info')
def model_info():
    """
    モデル情報取得API

    Returns:
        dict: モデル詳細情報
    """
    if model_handler is None:
        return jsonify({
            'status': 'error',
            'message': 'モデルが初期化されていません'
        }), 500

    return jsonify({
        'status': 'success',
        'model_info': model_handler.get_model_info()
    })


@app.errorhandler(413)
def too_large(e):
    """
    ファイルサイズ超過エラーハンドラー

    Args:
        e: エラーオブジェクト

    Returns:
        dict: エラーレスポンス
    """
    return jsonify({
        'status': 'error',
        'message': 'ファイルサイズが大きすぎます（最大10MB）'
    }), 413


@app.errorhandler(404)
def not_found(e):
    """
    404エラーハンドラー

    Args:
        e: エラーオブジェクト

    Returns:
        dict: エラーレスポンス
    """
    return jsonify({
        'status': 'error',
        'message': 'リクエストされたリソースが見つかりません'
    }), 404


def main():
    """
    メイン実行関数
    """
    print("🥩 牛肉マーブリング判定システム PWA版 起動中...")

    # コンポーネント初期化
    if not initialize_components():
        print("✗ 初期化に失敗しました。アプリケーションを終了します。")
        return

    print("✓ 初期化完了")
    print("📱 PWAアクセス: http://localhost:5000")
    print("🔗 API Endpoint: http://localhost:5000/api/predict")
    print("💚 Health Check: http://localhost:5000/api/health")

    # Flaskサーバー起動
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,  # 本番環境ではFalse
        threaded=True
    )


if __name__ == '__main__':
    main()
