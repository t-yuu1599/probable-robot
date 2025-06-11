/**
 * 牛肉マーブリング判定システム PWA版
 * メインアプリケーションスクリプト
 * 
 * 概要:
 * - PWA機能の管理
 * - システム状態の監視
 * - UI制御とイベント管理
 * - 通知システム
 */

// ===== グローバル変数 =====
let deferredPrompt;
let isOnline = navigator.onLine;
let systemHealthInterval;

// ===== アプリケーション初期化 =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🥩 牛肉マーブリング判定PWA 初期化開始');
    
    // 基本機能の初期化
    initializeApp();
    
    // PWA機能の初期化
    initializePWA();
    
    // システム監視の開始
    startSystemMonitoring();
    
    console.log('✓ アプリケーション初期化完了');
});

// ===== メイン初期化関数 =====
function initializeApp() {
    // UI要素の初期化
    initializeUI();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 初期状態の設定
    setInitialState();
}

// ===== UI初期化 =====
function initializeUI() {
    // 結果表示の初期化
    hideAllResultStates();
    showResultState('waiting');
    
    // システム情報の初期化
    updateSystemStatus('確認中...', 'secondary');
    updateConnectionStatus('確認中...', 'info');
    
    // プレビューコントロールを非表示
    document.getElementById('predictionControls').classList.add('d-none');
}

// ===== イベントリスナー設定 =====
function setupEventListeners() {
    // ファイル選択ボタン
    document.getElementById('fileButton').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });
    
    // ファイル入力
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // 再撮影ボタン
    document.getElementById('retakeButton').addEventListener('click', handleRetake);
    
    // インストールボタン
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.addEventListener('click', handleInstallClick);
    }
    
    // オンライン/オフライン状態の監視
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

// ===== 初期状態設定 =====
function setInitialState() {
    // 接続状態の更新
    updateConnectionDisplay();
    
    // システムヘルスチェック
    checkSystemHealth();
}

// ===== PWA機能初期化 =====
function initializePWA() {
    // PWAインストールプロンプトの設定
    setupInstallPrompt();
    
    // Service Worker の状態監視
    monitorServiceWorker();
}

// ===== PWAインストールプロンプト =====
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✓ PWAインストールプロンプト利用可能');
        
        // ブラウザの自動プロンプトを防止
        e.preventDefault();
        
        // イベントを保存
        deferredPrompt = e;
        
        // インストールプロンプトを表示
        showInstallPrompt();
    });
    
    // PWAインストール完了時
    window.addEventListener('appinstalled', (e) => {
        console.log('✓ PWAインストール完了');
        hideInstallPrompt();
        showNotification('インストール完了', 'アプリがホーム画面に追加されました', 'success');
    });
}

// ===== インストールプロンプト表示 =====
function showInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
        prompt.classList.remove('d-none');
    }
}

// ===== インストールプロンプト非表示 =====
function hideInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
        prompt.classList.add('d-none');
    }
}

// ===== インストールボタンクリック処理 =====
async function handleInstallClick() {
    if (!deferredPrompt) {
        console.log('⚠️ インストールプロンプトが利用できません');
        return;
    }
    
    try {
        // インストールプロンプトを表示
        deferredPrompt.prompt();
        
        // ユーザーの選択を待機
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✓ ユーザーがPWAインストールを受け入れました');
        } else {
            console.log('- ユーザーがPWAインストールを拒否しました');
        }
        
        // プロンプトをクリア
        deferredPrompt = null;
        hideInstallPrompt();
        
    } catch (error) {
        console.error('✗ インストール処理エラー:', error);
    }
}

// ===== Service Worker監視 =====
function monitorServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            console.log('✓ Service Worker準備完了');
            
            // Service Worker更新の監視
            registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker更新を検出');
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            showNotification(
                                'アップデート利用可能',
                                'ページを再読み込みして最新版を使用してください',
                                'info'
                            );
                        }
                    }
                });
            });
        });
    }
}

// ===== システム監視開始 =====
function startSystemMonitoring() {
    // 初回チェック
    checkSystemHealth();
    
    // 定期チェック（30秒間隔）
    systemHealthInterval = setInterval(checkSystemHealth, 30000);
}

// ===== システムヘルスチェック =====
async function checkSystemHealth() {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // キャッシュを無効化
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const healthData = await response.json();
            updateSystemStatus('正常', 'success');
            updateModelInfo(healthData.model_info);
        } else {
            updateSystemStatus('エラー', 'danger');
            updateModelInfo(null);
        }
        
    } catch (error) {
        console.error('✗ システムヘルスチェック失敗:', error);
        updateSystemStatus('接続エラー', 'danger');
        updateModelInfo(null);
    }
}

// ===== システム状態更新 =====
function updateSystemStatus(status, badgeClass) {
    const statusElement = document.getElementById('systemStatus');
    if (statusElement) {
        statusElement.innerHTML = `<span class="badge bg-${badgeClass}">${status}</span>`;
    }
}

// ===== モデル情報更新 =====
function updateModelInfo(modelInfo) {
    const infoElement = document.getElementById('modelInfo');
    if (!infoElement) return;
    
    if (modelInfo) {
        const info = `
            モデル: ${modelInfo.model_name || 'Unknown'}<br>
            パラメータ数: ${modelInfo.total_params ? modelInfo.total_params.toLocaleString() : 'Unknown'}<br>
            判定回数: ${modelInfo.prediction_count || 0}
        `;
        infoElement.innerHTML = info;
    } else {
        infoElement.innerHTML = '<span class="text-muted">情報取得できませんでした</span>';
    }
}

// ===== 接続状態ハンドラー =====
function handleOnline() {
    console.log('✓ オンライン復帰');
    isOnline = true;
    updateConnectionDisplay();
    checkSystemHealth();
    showNotification('接続復帰', 'インターネット接続が復帰しました', 'success');
}

function handleOffline() {
    console.log('⚠️ オフライン検出');
    isOnline = false;
    updateConnectionDisplay();
    showNotification('オフライン', 'インターネット接続が切断されました', 'warning');
}

// ===== 接続状態表示更新 =====
function updateConnectionDisplay() {
    updateConnectionStatus(
        isOnline ? 'オンライン' : 'オフライン',
        isOnline ? 'success' : 'warning'
    );
}

// ===== 接続状態更新 =====
function updateConnectionStatus(status, badgeClass) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.innerHTML = `<span class="badge bg-${badgeClass}">${status}</span>`;
    }
}

// ===== ファイル選択処理 =====
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showNotification(
            'ファイル形式エラー',
            'JPEG、JPG、PNGファイルのみ対応しています',
            'error'
        );
        return;
    }
    
    // ファイルサイズチェック (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification(
            'ファイルサイズエラー',
            'ファイルサイズは10MB以下にしてください',
            'error'
        );
        return;
    }
    
    // 画像プレビュー表示
    displayImagePreview(file);
}

// ===== 画像プレビュー表示 =====
function displayImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewImg = document.getElementById('previewImage');
        const videoElement = document.getElementById('cameraVideo');
        const previewContainer = document.getElementById('imagePreview');
        const predictionControls = document.getElementById('predictionControls');
        
        // プレビュー画像を設定
        previewImg.src = e.target.result;
        
        // カメラビューを非表示、プレビューを表示
        videoElement.style.display = 'none';
        previewContainer.classList.remove('d-none');
        
        // 判定ボタンを表示
        predictionControls.classList.remove('d-none');
        
        // グローバル変数に画像データを保存
        window.currentImageFile = file;
        
        console.log('✓ 画像プレビュー表示完了');
    };
    
    reader.readAsDataURL(file);
}

// ===== 再撮影処理 =====
function handleRetake() {
    // プレビューを非表示
    document.getElementById('imagePreview').classList.add('d-none');
    
    // カメラビューを表示
    document.getElementById('cameraVideo').style.display = 'block';
    
    // 判定ボタンを非表示
    document.getElementById('predictionControls').classList.add('d-none');
    
    // 結果表示をリセット
    hideAllResultStates();
    showResultState('waiting');
    
    // 画像データをクリア
    window.currentImageFile = null;
    
    // ファイル入力をリセット
    document.getElementById('fileInput').value = '';
    
    console.log('✓ 再撮影準備完了');
}

// ===== 結果表示状態管理 =====
function hideAllResultStates() {
    document.getElementById('resultWaiting').classList.add('d-none');
    document.getElementById('resultProcessing').classList.add('d-none');
    document.getElementById('resultDisplay').classList.add('d-none');
    document.getElementById('resultError').classList.add('d-none');
}

function showResultState(state) {
    hideAllResultStates();
    
    switch (state) {
        case 'waiting':
            document.getElementById('resultWaiting').classList.remove('d-none');
            break;
        case 'processing':
            document.getElementById('resultProcessing').classList.remove('d-none');
            break;
        case 'display':
            document.getElementById('resultDisplay').classList.remove('d-none');
            break;
        case 'error':
            document.getElementById('resultError').classList.remove('d-none');
            break;
    }
}

// ===== 通知システム =====
function showNotification(title, message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    // アイコンの設定
    const iconClasses = {
        success: 'bi-check-circle text-success',
        error: 'bi-x-circle text-danger',
        warning: 'bi-exclamation-triangle text-warning',
        info: 'bi-info-circle text-info'
    };
    
    toastIcon.className = `${iconClasses[type] || iconClasses.info} me-2`;
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Toast表示
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    console.log(`📢 通知: ${title} - ${message}`);
}

// ===== ユーティリティ関数 =====

// 時刻フォーマット
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// パーセンテージフォーマット
function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}

// 処理時間フォーマット
function formatProcessingTime(seconds) {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    } else {
        return `${seconds.toFixed(2)}秒`;
    }
}

// ===== ページアンロード時のクリーンアップ =====
window.addEventListener('beforeunload', function() {
    // 定期チェックを停止
    if (systemHealthInterval) {
        clearInterval(systemHealthInterval);
    }
    
    console.log('🔄 アプリケーションクリーンアップ完了');
});

// ===== エラーハンドリング =====
window.addEventListener('error', function(e) {
    console.error('✗ グローバルエラー:', e.error);
    showNotification(
        'アプリケーションエラー',
        '予期せぬエラーが発生しました。ページを再読み込みしてください。',
        'error'
    );
});

// Service Worker エラー
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', function(e) {
        console.error('✗ Service Worker エラー:', e);
    });
}

console.log('✓ メインアプリケーションスクリプト読み込み完了'); 