# -*- coding: utf-8 -*-
"""
牛肉マーブリング判定システム PWA版
画像前処理モジュール

概要:
- アップロードされた画像をモデル入力形式に変換
- リサイズ、正規化、バッチ次元追加等の前処理
- RGB/RGBA対応、品質チェック機能

主な機能:
- 画像フォーマット標準化
- モデル入力サイズへのリサイズ
- 正規化処理
- エラーハンドリング
"""

import cv2
import numpy as np
from PIL import Image, ImageOps
import tensorflow as tf
from typing import Tuple, Optional, Union


class ImageProcessor:
    """
    画像前処理クラス

    牛肉マーブリング画像をモデル推論用に変換する
    """

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """
        画像処理器の初期化

        Args:
            target_size (Tuple[int, int]): モデル入力サイズ (width, height)
        """
        self.target_size = target_size
        # (height, width, channels)
        self.input_shape = (target_size[1], target_size[0], 3)

        print(f"✓ 画像処理器初期化完了 - 対象サイズ: {target_size}")

    def preprocess(self, image: Union[Image.Image, np.ndarray]) -> np.ndarray:
        """
        画像の前処理を実行

        Args:
            image (Union[Image.Image, np.ndarray]): 入力画像

        Returns:
            np.ndarray: 前処理済み画像 (1, height, width, 3)

        Raises:
            ValueError: 無効な画像データの場合
            RuntimeError: 処理中にエラーが発生した場合
        """
        try:
            # PIL画像の場合の処理
            if isinstance(image, Image.Image):
                # RGBAからRGBへの変換（透明度除去）
                if image.mode in ('RGBA', 'LA', 'P'):
                    # 白色背景で透明度を処理
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    background.paste(image, mask=image.split()
                                     [-1] if image.mode == 'RGBA' else None)
                    image = background
                elif image.mode != 'RGB':
                    image = image.convert('RGB')

                # numpy配列に変換
                image_array = np.array(image)

            # numpy配列の場合の処理
            elif isinstance(image, np.ndarray):
                image_array = image.copy()

                # チャンネル数の確認と調整
                if len(image_array.shape) == 2:  # グレースケール
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
                elif image_array.shape[2] == 4:  # RGBA
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
                elif image_array.shape[2] != 3:
                    raise ValueError(
                        f"サポートされていないチャンネル数: {image_array.shape[2]}")

            else:
                raise ValueError(f"サポートされていない画像タイプ: {type(image)}")

            # 画像サイズの検証
            if image_array.shape[0] < 32 or image_array.shape[1] < 32:
                raise ValueError(f"画像サイズが小さすぎます: {image_array.shape[:2]}")

            # リサイズ処理
            # (height, width)
            if image_array.shape[:2] != self.target_size[::-1]:
                image_array = cv2.resize(
                    image_array,
                    self.target_size,
                    interpolation=cv2.INTER_LANCZOS4
                )

            # 正規化処理 (0-255 -> 0-1)
            image_array = image_array.astype(np.float32) / 255.0

            # バッチ次元の追加 (1, height, width, 3)
            image_array = np.expand_dims(image_array, axis=0)

            # データ型と形状の最終検証
            assert image_array.shape == (1,) + self.input_shape, \
                f"出力形状が不正: {image_array.shape}, 期待値: {(1,) + self.input_shape}"
            assert image_array.dtype == np.float32, \
                f"データ型が不正: {image_array.dtype}, 期待値: float32"
            assert 0.0 <= image_array.min() and image_array.max() <= 1.0, \
                f"値の範囲が不正: [{image_array.min():.3f}, {image_array.max():.3f}]"

            return image_array

        except Exception as e:
            raise RuntimeError(f"画像前処理中にエラーが発生: {str(e)}")

    def validate_image(self, image: Union[Image.Image, np.ndarray]) -> bool:
        """
        画像の妥当性を検証

        Args:
            image (Union[Image.Image, np.ndarray]): 検証対象画像

        Returns:
            bool: 妥当性判定結果
        """
        try:
            if isinstance(image, Image.Image):
                # PIL画像の検証
                if image.size[0] < 32 or image.size[1] < 32:
                    return False
                if image.mode not in ['RGB', 'RGBA', 'L', 'LA', 'P']:
                    return False
                return True

            elif isinstance(image, np.ndarray):
                # numpy配列の検証
                if len(image.shape) not in [2, 3]:
                    return False
                if image.shape[0] < 32 or image.shape[1] < 32:
                    return False
                if len(image.shape) == 3 and image.shape[2] not in [1, 3, 4]:
                    return False
                return True

            return False

        except Exception:
            return False

    def get_image_info(self, image: Union[Image.Image, np.ndarray]) -> dict:
        """
        画像の基本情報を取得

        Args:
            image (Union[Image.Image, np.ndarray]): 対象画像

        Returns:
            dict: 画像情報
                {
                    'size': Tuple[int, int],
                    'mode': str,
                    'format': str,
                    'channels': int
                }
        """
        try:
            if isinstance(image, Image.Image):
                return {
                    'size': image.size,
                    'mode': image.mode,
                    'format': image.format or 'Unknown',
                    'channels': len(image.getbands()) if hasattr(image, 'getbands') else 'Unknown'
                }

            elif isinstance(image, np.ndarray):
                channels = image.shape[2] if len(image.shape) == 3 else 1
                return {
                    # (width, height)
                    'size': (image.shape[1], image.shape[0]),
                    'mode': f'Array_{channels}ch',
                    'format': 'NumPy Array',
                    'channels': channels
                }

            return {'error': 'Unsupported image type'}

        except Exception as e:
            return {'error': str(e)}

    def create_thumbnail(self, image: Union[Image.Image, np.ndarray],
                         size: Tuple[int, int] = (128, 128)) -> Optional[Image.Image]:
        """
        サムネイル画像を作成

        Args:
            image (Union[Image.Image, np.ndarray]): 元画像
            size (Tuple[int, int]): サムネイルサイズ

        Returns:
            Optional[Image.Image]: サムネイル画像（失敗時はNone）
        """
        try:
            if isinstance(image, np.ndarray):
                if len(image.shape) == 3 and image.shape[2] == 3:
                    # RGB numpy配列をPIL画像に変換
                    if image.max() <= 1.0:
                        image = (image * 255).astype(np.uint8)
                    image = Image.fromarray(image)
                else:
                    return None

            if isinstance(image, Image.Image):
                thumbnail = image.copy()
                thumbnail.thumbnail(size, Image.Resampling.LANCZOS)
                return thumbnail

            return None

        except Exception:
            return None
