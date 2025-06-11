# -*- coding: utf-8 -*-
"""
牛肉マーブリング判定システム PWA版
モデル推論ハンドラー

概要:
- TensorFlowモデルの読み込み・管理
- バイナリ分類（HIGH/LOW）の推論実行
- モデル情報の取得・管理
- エラーハンドリングと推論結果の標準化

主な機能:
- モデルファイルの読み込み
- 推論実行と信頼度計算
- モデル情報の提供
- パフォーマンス監視
"""

import os
import time
import numpy as np
import tensorflow as tf
from typing import Dict, List, Optional, Union, Any
from pathlib import Path


class ModelHandler:
    """
    機械学習モデル推論ハンドラークラス

    牛肉マーブリングの2クラス分類（HIGH/LOW）を実行する
    """

    def __init__(self, model_path: Union[str, Path]):
        """
        モデルハンドラーの初期化

        Args:
            model_path (Union[str, Path]): モデルファイルのパス

        Raises:
            FileNotFoundError: モデルファイルが見つからない場合
            RuntimeError: モデル読み込みに失敗した場合
        """
        self.model_path = Path(model_path)
        self.model = None
        self.model_info = {}
        self.prediction_count = 0
        self.total_inference_time = 0.0

        # モデルの読み込み
        self._load_model()

        print(f"✓ モデルハンドラー初期化完了 - {self.model_path.name}")

    def _load_model(self) -> None:
        """
        TensorFlowモデルの読み込み

        Raises:
            FileNotFoundError: モデルファイルが見つからない場合
            RuntimeError: モデル読み込みに失敗した場合
        """
        try:
            # ファイル存在確認
            if not self.model_path.exists():
                raise FileNotFoundError(f"モデルファイルが見つかりません: {self.model_path}")

            # モデル読み込み
            print(f"📥 モデル読み込み中: {self.model_path.name}")
            self.model = tf.keras.models.load_model(str(self.model_path))

            # モデル情報の取得
            self._extract_model_info()

            print(f"✓ モデル読み込み完了")
            print(f"  - 入力形状: {self.model_info.get('input_shape')}")
            print(f"  - 出力形状: {self.model_info.get('output_shape')}")
            print(f"  - パラメータ数: {self.model_info.get('total_params'):,}")

        except Exception as e:
            raise RuntimeError(f"モデル読み込みエラー: {str(e)}")

    def _extract_model_info(self) -> None:
        """
        モデルの基本情報を抽出
        """
        try:
            # 基本情報
            self.model_info = {
                'model_path': str(self.model_path),
                'model_name': self.model_path.stem,
                'file_size_mb': round(self.model_path.stat().st_size / (1024 * 1024), 2),
                'input_shape': self.model.input_shape,
                'output_shape': self.model.output_shape,
                'total_params': self.model.count_params(),
                'trainable_params': np.sum([tf.keras.backend.count_params(w) for w in self.model.trainable_weights]),
                'layers_count': len(self.model.layers),
                'optimizer': str(self.model.optimizer.__class__.__name__) if hasattr(self.model, 'optimizer') else 'Unknown',
                'loss_function': str(self.model.loss) if hasattr(self.model, 'loss') else 'Unknown'
            }

            # レイヤー情報の追加
            layer_types = {}
            for layer in self.model.layers:
                layer_type = layer.__class__.__name__
                layer_types[layer_type] = layer_types.get(layer_type, 0) + 1

            self.model_info['layer_types'] = layer_types

        except Exception as e:
            print(f"⚠️ モデル情報抽出中にエラー: {str(e)}")
            # 最小限の情報のみ設定
            self.model_info = {
                'model_path': str(self.model_path),
                'model_name': self.model_path.stem,
                'status': 'loaded_with_errors'
            }

    def predict(self, image_array: np.ndarray) -> Dict[str, Union[int, float, str]]:
        """
        画像の判定を実行

        Args:
            image_array (np.ndarray): 前処理済み画像 (1, height, width, 3)

        Returns:
            Dict[str, Union[int, float, str]]: 推論結果
                {
                    'prediction': int,          # 0 (LOW) or 1 (HIGH)
                    'confidence': float,        # 信頼度 (0.0-1.0)
                    'probabilities': List[float], # クラス別確率
                    'inference_time': float     # 推論時間（秒）
                }

        Raises:
            ValueError: 入力データが不正な場合
            RuntimeError: 推論実行中にエラーが発生した場合
        """
        start_time = time.time()

        try:
            # 入力データの検証
            self._validate_input(image_array)

            # 推論実行
            predictions = self.model.predict(image_array, verbose=0)

            # 結果の処理
            if predictions.shape[1] == 1:
                # バイナリ分類（シグモイド出力）
                prob_high = float(predictions[0][0])
                prob_low = 1.0 - prob_high
                prediction = 1 if prob_high > 0.5 else 0
                confidence = max(prob_high, prob_low)
                probabilities = [prob_low, prob_high]

            else:
                # マルチクラス分類（ソフトマックス出力）
                probabilities = predictions[0].tolist()
                prediction = int(np.argmax(predictions[0]))
                confidence = float(probabilities[prediction])

            # 推論時間計算
            inference_time = time.time() - start_time

            # 統計情報更新
            self.prediction_count += 1
            self.total_inference_time += inference_time

            result = {
                'prediction': prediction,
                'confidence': confidence,
                'probabilities': probabilities,
                'inference_time': round(inference_time, 4)
            }

            return result

        except Exception as e:
            raise RuntimeError(f"推論実行中にエラーが発生: {str(e)}")

    def _validate_input(self, image_array: np.ndarray) -> None:
        """
        入力データの妥当性を検証

        Args:
            image_array (np.ndarray): 検証対象の画像配列

        Raises:
            ValueError: 入力データが不正な場合
        """
        if not isinstance(image_array, np.ndarray):
            raise ValueError(
                f"入力は numpy.ndarray である必要があります。実際: {type(image_array)}")

        expected_shape = self.model.input_shape
        if image_array.shape != expected_shape:
            raise ValueError(
                f"入力形状が不正です。期待値: {expected_shape}, 実際: {image_array.shape}")

        if not np.isfinite(image_array).all():
            raise ValueError("入力に無限大またはNaN値が含まれています")

        if not (0.0 <= image_array.min() and image_array.max() <= 1.0):
            raise ValueError(
                f"入力値の範囲が不正です: [{image_array.min():.3f}, {image_array.max():.3f}]")

    def get_model_info(self) -> Dict[str, Any]:
        """
        モデル情報を取得

        Returns:
            Dict[str, Any]: モデル詳細情報
        """
        info = self.model_info.copy()

        # 実行時統計の追加
        info.update({
            'prediction_count': self.prediction_count,
            'total_inference_time': round(self.total_inference_time, 4),
            'average_inference_time': round(
                self.total_inference_time / max(self.prediction_count, 1), 4
            ),
            'status': 'ready'
        })

        return info

    def get_performance_stats(self) -> Dict[str, Union[int, float]]:
        """
        パフォーマンス統計を取得

        Returns:
            Dict[str, Union[int, float]]: パフォーマンス統計
        """
        return {
            'prediction_count': self.prediction_count,
            'total_inference_time': self.total_inference_time,
            'average_inference_time': self.total_inference_time / max(self.prediction_count, 1),
            'predictions_per_second': self.prediction_count / max(self.total_inference_time, 0.001)
        }

    def reset_stats(self) -> None:
        """
        統計情報をリセット
        """
        self.prediction_count = 0
        self.total_inference_time = 0.0
        print("✓ パフォーマンス統計をリセットしました")

    def warmup(self, num_runs: int = 3) -> Dict[str, float]:
        """
        モデルのウォームアップ実行

        Args:
            num_runs (int): ウォームアップ実行回数

        Returns:
            Dict[str, float]: ウォームアップ結果
        """
        print(f"🔥 モデルウォームアップ開始 ({num_runs}回)")

        # ダミー画像作成
        dummy_input = np.random.random(
            self.model.input_shape).astype(np.float32)

        warmup_times = []

        for i in range(num_runs):
            start_time = time.time()
            _ = self.model.predict(dummy_input, verbose=0)
            warmup_times.append(time.time() - start_time)

        results = {
            'runs': num_runs,
            'total_time': sum(warmup_times),
            'average_time': np.mean(warmup_times),
            'min_time': min(warmup_times),
            'max_time': max(warmup_times)
        }

        print(f"✓ ウォームアップ完了 - 平均時間: {results['average_time']:.3f}s")

        return results

    def is_ready(self) -> bool:
        """
        モデルが推論可能状態かを確認

        Returns:
            bool: 推論可能性
        """
        return self.model is not None

    def get_class_names(self) -> List[str]:
        """
        クラス名一覧を取得

        Returns:
            List[str]: クラス名のリスト
        """
        # バイナリ分類の場合
        return ['LOW', 'HIGH']
