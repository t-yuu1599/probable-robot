/**
 * 牛肉マーブリング判定システム PWA版
 * カメラ機能スクリプト
 * 
 * 概要:
 * - getUserMedia APIによるカメラアクセス
 * - 撮影機能とプレビュー管理
 * - モバイル端末対応
 * - エラーハンドリング
 */

// ===== グローバル変数 =====
let stream = null;
let videoElement = null;
let captureCanvas = null;
let isStreamActive = false;

// カメラ設定
const CAMERA_CONSTRAINTS = {
    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        facingMode: 'environment', // 背面カメラを優先
        frameRate: { ideal: 30, max: 60 }
    },
    audio: false
};

// フォールバック設定（低スペック端末用）
const FALLBACK_CONSTRAINTS = {
    video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        facingMode: 'environment'
    },
    audio: false
};

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeCamera();
});

// ===== カメラ初期化 =====
function initializeCamera() {
    console.log('📹 カメラ機能初期化開始');
    
    // DOM要素の取得
    videoElement = document.getElementById('cameraVideo');
    captureCanvas = document.getElementById('captureCanvas');
    
    if (!videoElement || !captureCanvas) {
        console.error('✗ カメラ用DOM要素が見つかりません');
        showCameraError('カメラ用要素が見つかりません');
        return;
    }
    
    // イベントリスナーの設定
    setupCameraEventListeners();
    
    // カメラ起動
    startCamera();
    
    console.log('✓ カメラ機能初期化完了');
}

// ===== イベントリスナー設定 =====
function setupCameraEventListeners() {
    // 撮影ボタン
    const captureButton = document.getElementById('captureButton');
    if (captureButton) {
        captureButton.addEventListener('click', handleCapture);
    }
    
    // ビデオ要素のイベント
    videoElement.addEventListener('loadedmetadata', handleVideoLoaded);
    videoElement.addEventListener('error', handleVideoError);
    
    // ページの可視性変更
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // オリエンテーション変更
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // ウィンドウサイズ変更
    window.addEventListener('resize', handleResize);
}

// ===== カメラ起動 =====
async function startCamera() {
    console.log('📹 カメラ起動中...');
    
    // カメラサポートチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('✗ getUserMedia API がサポートされていません');
        showCameraError('お使いのブラウザではカメラ機能がサポートされていません');
        return;
    }
    
    try {
        // メインカメラ設定で試行
        try {
            stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
            console.log('✓ 高品質カメラで起動成功');
        } catch (error) {
            console.warn('⚠️ 高品質設定失敗、フォールバックを試行:', error.message);
            // フォールバック設定で再試行
            stream = await navigator.mediaDevices.getUserMedia(FALLBACK_CONSTRAINTS);
            console.log('✓ フォールバック設定で起動成功');
        }
        
        // ストリームの設定
        videoElement.srcObject = stream;
        isStreamActive = true;
        
        // ストリーム情報の表示
        logStreamInfo(stream);
        
        // UI更新
        updateCameraUI(true);
        
    } catch (error) {
        console.error('✗ カメラアクセス失敗:', error);
        handleCameraError(error);
    }
}

// ===== カメラ停止 =====
function stopCamera() {
    console.log('📹 カメラ停止中...');
    
    if (stream) {
        // 全トラックを停止
        stream.getTracks().forEach(track => {
            track.stop();
            console.log(`✓ トラック停止: ${track.kind} - ${track.label}`);
        });
        
        stream = null;
        isStreamActive = false;
        
        // ビデオ要素のクリア
        if (videoElement) {
            videoElement.srcObject = null;
        }
        
        // UI更新
        updateCameraUI(false);
        
        console.log('✓ カメラ停止完了');
    }
}

// ===== 撮影処理 =====
function handleCapture() {
    if (!isStreamActive || !stream) {
        console.error('✗ カメラが起動していません');
        showNotification('撮影エラー', 'カメラが起動していません', 'error');
        return;
    }
    
    try {
        console.log('📸 撮影開始');
        
        // キャンバスの設定
        const context = captureCanvas.getContext('2d');
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
            throw new Error('ビデオサイズが取得できません');
        }
        
        // キャンバスサイズ設定
        captureCanvas.width = videoWidth;
        captureCanvas.height = videoHeight;
        
        // ビデオフレームをキャンバスに描画
        context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
        
        // Blobとして画像データを取得
        captureCanvas.toBlob(function(blob) {
            if (blob) {
                // ファイルオブジェクトとして作成
                const file = new File([blob], 'captured-image.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                
                // プレビュー表示
                displayCapturedImage(file);
                
                // 撮影成功通知
                showNotification('撮影完了', '画像が撮影されました', 'success');
                
                console.log('✓ 撮影完了:', {
                    size: file.size,
                    type: file.type,
                    dimensions: `${videoWidth}x${videoHeight}`
                });
                
            } else {
                throw new Error('画像データの生成に失敗しました');
            }
        }, 'image/jpeg', 0.9); // JPEG品質90%
        
    } catch (error) {
        console.error('✗ 撮影エラー:', error);
        showNotification('撮影エラー', error.message, 'error');
    }
}

// ===== 撮影画像表示 =====
function displayCapturedImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewImg = document.getElementById('previewImage');
        const previewContainer = document.getElementById('imagePreview');
        const predictionControls = document.getElementById('predictionControls');
        
        // プレビュー画像設定
        previewImg.src = e.target.result;
        
        // カメラビュー非表示、プレビュー表示
        videoElement.style.display = 'none';
        previewContainer.classList.remove('d-none');
        
        // 判定ボタン表示
        predictionControls.classList.remove('d-none');
        
        // グローバル変数に保存
        window.currentImageFile = file;
        
        console.log('✓ 撮影画像プレビュー表示完了');
    };
    
    reader.readAsDataURL(file);
}

// ===== ビデオ読み込み完了 =====
function handleVideoLoaded() {
    console.log('✓ ビデオメタデータ読み込み完了');
    console.log(`📐 ビデオサイズ: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
    
    // アスペクト比調整
    adjustVideoAspectRatio();
}

// ===== ビデオエラー =====
function handleVideoError(event) {
    console.error('✗ ビデオエラー:', event);
    showCameraError('ビデオ表示中にエラーが発生しました');
}

// ===== ページ可視性変更 =====
function handleVisibilityChange() {
    if (document.hidden) {
        console.log('📱 ページが非アクティブになりました');
        // バッテリー節約のため、必要に応じてストリーム停止
    } else {
        console.log('📱 ページがアクティブになりました');
        // ストリームが停止している場合は再開
        if (!isStreamActive && !window.currentImageFile) {
            startCamera();
        }
    }
}

// ===== オリエンテーション変更 =====
function handleOrientationChange() {
    console.log('🔄 画面向き変更検出');
    
    // 短時間の遅延後にアスペクト比調整
    setTimeout(() => {
        adjustVideoAspectRatio();
    }, 100);
}

// ===== ウィンドウサイズ変更 =====
function handleResize() {
    // デバウンス処理
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        adjustVideoAspectRatio();
    }, 250);
}

// ===== アスペクト比調整 =====
function adjustVideoAspectRatio() {
    if (!videoElement || videoElement.videoWidth === 0) return;
    
    const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
    const containerWidth = videoElement.parentElement.clientWidth;
    
    // 最適なサイズ計算
    let newWidth = containerWidth;
    let newHeight = containerWidth / videoAspect;
    
    // 最大高さ制限
    const maxHeight = window.innerHeight * 0.6;
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = maxHeight * videoAspect;
    }
    
    // スタイル適用
    videoElement.style.width = `${newWidth}px`;
    videoElement.style.height = `${newHeight}px`;
    
    console.log(`📐 ビデオサイズ調整: ${newWidth}x${newHeight}`);
}

// ===== カメラエラーハンドリング =====
function handleCameraError(error) {
    let message = 'カメラアクセスに失敗しました';
    
    switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            message = 'カメラの使用許可が必要です。ブラウザの設定でカメラアクセスを許可してください。';
            break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            message = 'カメラデバイスが見つかりません。';
            break;
        case 'NotReadableError':
        case 'TrackStartError':
            message = 'カメラが他のアプリケーションで使用中の可能性があります。';
            break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            message = 'カメラの設定に問題があります。';
            break;
        case 'NotSupportedError':
            message = 'お使いのブラウザではカメラ機能がサポートされていません。';
            break;
        case 'TypeError':
            message = 'カメラアクセス設定にエラーがあります。';
            break;
        default:
            message = `カメラエラー: ${error.message}`;
    }
    
    console.error('✗ カメラエラー詳細:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
    });
    
    showCameraError(message);
}

// ===== カメラエラー表示 =====
function showCameraError(message) {
    const noCameraMessage = document.getElementById('noCameraMessage');
    const videoElement = document.getElementById('cameraVideo');
    const captureButton = document.getElementById('captureButton');
    
    // エラーメッセージ表示
    if (noCameraMessage) {
        noCameraMessage.textContent = message;
        noCameraMessage.classList.remove('d-none');
    }
    
    // カメラビデオ非表示
    if (videoElement) {
        videoElement.style.display = 'none';
    }
    
    // 撮影ボタン無効化
    if (captureButton) {
        captureButton.disabled = true;
        captureButton.classList.add('disabled');
    }
    
    // 通知表示
    showNotification('カメラエラー', message, 'error');
}

// ===== UI更新 =====
function updateCameraUI(cameraActive) {
    const captureButton = document.getElementById('captureButton');
    const noCameraMessage = document.getElementById('noCameraMessage');
    
    if (captureButton) {
        captureButton.disabled = !cameraActive;
        if (cameraActive) {
            captureButton.classList.remove('disabled');
        } else {
            captureButton.classList.add('disabled');
        }
    }
    
    if (noCameraMessage && cameraActive) {
        noCameraMessage.classList.add('d-none');
    }
}

// ===== ストリーム情報ログ =====
function logStreamInfo(stream) {
    const tracks = stream.getVideoTracks();
    if (tracks.length > 0) {
        const track = tracks[0];
        const settings = track.getSettings();
        
        console.log('📹 カメラストリーム情報:', {
            label: track.label,
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode,
            deviceId: settings.deviceId
        });
        
        // 制約情報も表示
        const constraints = track.getConstraints();
        console.log('📋 カメラ制約情報:', constraints);
    }
}

// ===== カメラ切り替え =====
async function switchCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('⚠️ デバイス列挙がサポートされていません');
        return;
    }
    
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length > 1) {
            console.log('📹 利用可能なカメラデバイス:', videoDevices.length);
            
            // 現在とは異なるカメラに切り替え
            const currentFacingMode = CAMERA_CONSTRAINTS.video.facingMode;
            const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
            
            // カメラ停止
            stopCamera();
            
            // 新しい設定でカメラ起動
            CAMERA_CONSTRAINTS.video.facingMode = newFacingMode;
            await startCamera();
            
            console.log(`✓ カメラ切り替え完了: ${newFacingMode}`);
        } else {
            console.log('📹 利用可能なカメラは1台のみです');
        }
        
    } catch (error) {
        console.error('✗ カメラ切り替えエラー:', error);
    }
}

// ===== カメラ権限確認 =====
async function checkCameraPermission() {
    if (!navigator.permissions) {
        console.warn('⚠️ Permissions API がサポートされていません');
        return 'unsupported';
    }
    
    try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        console.log(`📹 カメラ権限状態: ${permission.state}`);
        return permission.state;
    } catch (error) {
        console.error('✗ 権限確認エラー:', error);
        return 'error';
    }
}

// ===== クリーンアップ =====
function cleanupCamera() {
    console.log('🧹 カメラリソースクリーンアップ');
    
    // ストリーム停止
    stopCamera();
    
    // タイマークリア
    if (window.resizeTimer) {
        clearTimeout(window.resizeTimer);
    }
}

// ===== ページアンロード時のクリーンアップ =====
window.addEventListener('beforeunload', cleanupCamera);
window.addEventListener('pagehide', cleanupCamera);

// ===== デバッグ用関数 =====
window.cameraDebug = {
    getStreamInfo: () => logStreamInfo(stream),
    switchCamera,
    checkPermission: checkCameraPermission,
    restart: async () => {
        stopCamera();
        await startCamera();
    }
};

console.log('✓ カメラスクリプト読み込み完了'); 