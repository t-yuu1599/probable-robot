/**
 * 牛肉マーブリング判定システム PWA版
 * 判定機能スクリプト
 * 
 * 概要:
 * - 画像判定API通信
 * - 結果表示管理
 * - パフォーマンス監視
 * - エラーハンドリング
 */

// ===== グローバル変数 =====
let predictionInProgress = false;
let predictionHistory = [];

// ===== 設定 =====
const PREDICTION_CONFIG = {
    apiUrl: '/api/predict',
    timeout: 30000, // 30秒タイムアウト
    maxRetries: 3,
    retryDelay: 1000
};

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializePrediction();
});

// ===== 判定機能初期化 =====
function initializePrediction() {
    console.log('🔮 判定機能初期化開始');
    
    // イベントリスナーの設定
    setupPredictionEventListeners();
    
    console.log('✓ 判定機能初期化完了');
}

// ===== イベントリスナー設定 =====
function setupPredictionEventListeners() {
    // 判定ボタン
    const predictButton = document.getElementById('predictButton');
    if (predictButton) {
        predictButton.addEventListener('click', handlePredictionClick);
    }
}

// ===== 判定ボタンクリック処理 =====
async function handlePredictionClick() {
    if (predictionInProgress) {
        console.log('⚠️ 判定処理中のため、新しい判定を開始できません');
        return;
    }
    
    // 現在の画像ファイルをチェック
    if (!window.currentImageFile) {
        showNotification('画像エラー', '判定する画像が選択されていません', 'error');
        return;
    }
    
    console.log('🔮 判定処理開始');
    
    // 判定実行
    await executePrediction(window.currentImageFile);
}

// ===== 判定実行 =====
async function executePrediction(imageFile) {
    predictionInProgress = true;
    
    try {
        // UI状態更新
        updatePredictionUI('processing');
        
        // API呼び出し
        const result = await callPredictionAPI(imageFile);
        
        // 結果表示
        displayPredictionResult(result);
        
        // 履歴に追加
        addToHistory(result, imageFile);
        
        console.log('✓ 判定処理完了');
        
    } catch (error) {
        console.error('✗ 判定処理エラー:', error);
        displayPredictionError(error);
        
    } finally {
        predictionInProgress = false;
        updatePredictionUI('completed');
    }
}

// ===== 判定API呼び出し =====
async function callPredictionAPI(imageFile, retryCount = 0) {
    console.log(`🌐 API呼び出し (試行 ${retryCount + 1}/${PREDICTION_CONFIG.maxRetries + 1})`);
    
    try {
        // FormDataの作成
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // リクエスト設定
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PREDICTION_CONFIG.timeout);
        
        // API呼び出し
        const response = await fetch(PREDICTION_CONFIG.apiUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            // キャッシュ無効化
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        // レスポンスチェック
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new APIError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                errorData
            );
        }
        
        // 結果の解析
        const result = await response.json();
        
        console.log('✓ API呼び出し成功:', result);
        return result;
        
    } catch (error) {
        console.error(`✗ API呼び出し失敗 (試行 ${retryCount + 1}):`, error);
        
        // リトライ判定
        if (retryCount < PREDICTION_CONFIG.maxRetries && shouldRetry(error)) {
            console.log(`🔄 ${PREDICTION_CONFIG.retryDelay}ms後にリトライします...`);
            
            await new Promise(resolve => setTimeout(resolve, PREDICTION_CONFIG.retryDelay));
            return callPredictionAPI(imageFile, retryCount + 1);
        }
        
        throw error;
    }
}

// ===== リトライ判定 =====
function shouldRetry(error) {
    // ネットワークエラーまたは5xxエラーの場合はリトライ
    if (error.name === 'AbortError') return false; // タイムアウトはリトライしない
    if (error instanceof APIError) {
        return error.status >= 500; // 5xxエラーのみリトライ
    }
    return true; // その他のエラーはリトライ
}

// ===== 判定結果表示 =====
function displayPredictionResult(result) {
    console.log('📊 判定結果表示:', result);
    
    // 結果データの設定
    const classification = result.classification;
    const confidence = result.confidence;
    const prediction = result.prediction;
    const processingTime = result.processing_time;
    const timestamp = result.timestamp;
    
    // 分類テキスト更新
    const classificationText = document.getElementById('classificationText');
    if (classificationText) {
        classificationText.textContent = classification;
    }
    
    // 予測バッジ更新
    const predictionBadge = document.getElementById('predictionBadge');
    if (predictionBadge) {
        predictionBadge.textContent = prediction;
        predictionBadge.className = `badge badge-result ${prediction.toLowerCase()}`;
    }
    
    // 結果カードのスタイル更新
    const resultCard = document.querySelector('.result-card');
    if (resultCard) {
        resultCard.className = `result-card p-3 rounded ${prediction.toLowerCase()}-grade`;
    }
    
    // 信頼度表示
    updateConfidenceDisplay(confidence);
    
    // 処理時間表示
    const processingTimeElement = document.getElementById('processingTime');
    if (processingTimeElement) {
        processingTimeElement.textContent = formatProcessingTime(processingTime);
    }
    
    // タイムスタンプ表示
    const timestampElement = document.getElementById('timestampText');
    if (timestampElement) {
        timestampElement.textContent = formatTimestamp(timestamp);
    }
    
    // 結果表示状態に切り替え
    showResultState('display');
    
    // アニメーション追加
    const resultDisplay = document.getElementById('resultDisplay');
    if (resultDisplay) {
        resultDisplay.classList.add('fade-in');
    }
    
    // 成功通知
    showNotification(
        '判定完了',
        `${classification} (信頼度: ${formatPercentage(confidence)})`,
        'success'
    );
}

// ===== 信頼度表示更新 =====
function updateConfidenceDisplay(confidence) {
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceText = document.getElementById('confidenceText');
    
    if (confidenceBar) {
        const percentage = confidence * 100;
        confidenceBar.style.width = `${percentage}%`;
        confidenceBar.setAttribute('aria-valuenow', percentage);
        
        // 信頼度に応じてスタイル変更
        confidenceBar.className = 'progress-bar';
        if (confidence >= 0.8) {
            confidenceBar.classList.add('high-confidence');
        } else if (confidence >= 0.6) {
            confidenceBar.classList.add('medium-confidence');
        } else {
            confidenceBar.classList.add('low-confidence');
        }
    }
    
    if (confidenceText) {
        confidenceText.textContent = formatPercentage(confidence);
    }
}

// ===== 判定エラー表示 =====
function displayPredictionError(error) {
    console.error('📊 判定エラー表示:', error);
    
    let errorMessage = '判定処理中にエラーが発生しました';
    
    if (error instanceof APIError) {
        switch (error.status) {
            case 400:
                errorMessage = '画像データに問題があります。別の画像をお試しください。';
                break;
            case 413:
                errorMessage = 'ファイルサイズが大きすぎます。10MB以下のファイルをお使いください。';
                break;
            case 500:
                errorMessage = 'サーバーで問題が発生しました。しばらく待ってから再試行してください。';
                break;
            case 503:
                errorMessage = 'サーバーが一時的に利用できません。しばらく待ってから再試行してください。';
                break;
            default:
                errorMessage = error.message || '判定処理中にエラーが発生しました';
        }
    } else if (error.name === 'AbortError') {
        errorMessage = '判定処理がタイムアウトしました。ネットワーク接続を確認してください。';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'ネットワーク接続エラーです。インターネット接続を確認してください。';
    }
    
    // エラーメッセージ表示
    const errorMessageElement = document.getElementById('errorMessage');
    if (errorMessageElement) {
        errorMessageElement.textContent = errorMessage;
    }
    
    // エラー状態表示
    showResultState('error');
    
    // エラー通知
    showNotification('判定エラー', errorMessage, 'error');
}

// ===== UI状態更新 =====
function updatePredictionUI(state) {
    const predictButton = document.getElementById('predictButton');
    
    switch (state) {
        case 'processing':
            if (predictButton) {
                predictButton.disabled = true;
                predictButton.innerHTML = '<i class="bi bi-hourglass-split"></i> 判定中...';
            }
            showResultState('processing');
            break;
            
        case 'completed':
            if (predictButton) {
                predictButton.disabled = false;
                predictButton.innerHTML = '<i class="bi bi-cpu"></i> 判定実行';
            }
            break;
            
        default:
            if (predictButton) {
                predictButton.disabled = false;
                predictButton.innerHTML = '<i class="bi bi-cpu"></i> 判定実行';
            }
    }
}

// ===== 履歴管理 =====
function addToHistory(result, imageFile) {
    const historyItem = {
        timestamp: new Date().toISOString(),
        result: result,
        imageInfo: {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type
        }
    };
    
    predictionHistory.unshift(historyItem);
    
    // 履歴は最大50件まで
    if (predictionHistory.length > 50) {
        predictionHistory = predictionHistory.slice(0, 50);
    }
    
    // ローカルストレージに保存（オプション）
    try {
        const historyToSave = predictionHistory.slice(0, 10); // 最新10件のみ保存
        localStorage.setItem('predictionHistory', JSON.stringify(historyToSave));
    } catch (error) {
        console.warn('⚠️ 履歴の保存に失敗:', error);
    }
    
    console.log('📝 履歴に追加:', historyItem);
}

// ===== 履歴読み込み =====
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('predictionHistory');
        if (savedHistory) {
            predictionHistory = JSON.parse(savedHistory);
            console.log('📝 履歴読み込み完了:', predictionHistory.length);
        }
    } catch (error) {
        console.warn('⚠️ 履歴の読み込みに失敗:', error);
        predictionHistory = [];
    }
}

// ===== 統計情報取得 =====
function getPredictionStats() {
    const highCount = predictionHistory.filter(item => item.result.prediction === 'HIGH').length;
    const lowCount = predictionHistory.filter(item => item.result.prediction === 'LOW').length;
    const totalCount = predictionHistory.length;
    
    const averageConfidence = totalCount > 0 ? 
        predictionHistory.reduce((sum, item) => sum + item.result.confidence, 0) / totalCount : 0;
    
    const averageProcessingTime = totalCount > 0 ?
        predictionHistory.reduce((sum, item) => sum + item.result.processing_time, 0) / totalCount : 0;
    
    return {
        total: totalCount,
        high: highCount,
        low: lowCount,
        averageConfidence,
        averageProcessingTime,
        highPercentage: totalCount > 0 ? (highCount / totalCount) * 100 : 0,
        lowPercentage: totalCount > 0 ? (lowCount / totalCount) * 100 : 0
    };
}

// ===== パフォーマンス監視 =====
function logPerformanceMetrics(result) {
    const stats = getPredictionStats();
    
    console.log('📊 判定パフォーマンス統計:', {
        '総判定回数': stats.total,
        '上カルビ回数': stats.high,
        '並カルビ回数': stats.low,
        '平均信頼度': `${(stats.averageConfidence * 100).toFixed(1)}%`,
        '平均処理時間': `${stats.averageProcessingTime.toFixed(2)}秒`,
        '上カルビ割合': `${stats.highPercentage.toFixed(1)}%`,
        '並カルビ割合': `${stats.lowPercentage.toFixed(1)}%`
    });
}

// ===== 判定結果のエクスポート =====
function exportPredictionResult(format = 'json') {
    if (predictionHistory.length === 0) {
        showNotification('エクスポートエラー', '判定履歴がありません', 'warning');
        return;
    }
    
    const latestResult = predictionHistory[0];
    
    let exportData;
    let fileName;
    let mimeType;
    
    switch (format) {
        case 'json':
            exportData = JSON.stringify(latestResult, null, 2);
            fileName = `beef_prediction_${new Date().toISOString().slice(0, 19)}.json`;
            mimeType = 'application/json';
            break;
            
        case 'csv':
            const csvHeader = 'Timestamp,Classification,Prediction,Confidence,ProcessingTime\n';
            const csvData = `${latestResult.timestamp},${latestResult.result.classification},${latestResult.result.prediction},${latestResult.result.confidence},${latestResult.result.processing_time}`;
            exportData = csvHeader + csvData;
            fileName = `beef_prediction_${new Date().toISOString().slice(0, 19)}.csv`;
            mimeType = 'text/csv';
            break;
            
        default:
            console.error('✗ サポートされていないエクスポート形式:', format);
            return;
    }
    
    // ダウンロード実行
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('エクスポート完了', `${fileName} をダウンロードしました`, 'success');
}

// ===== カスタムエラークラス =====
class APIError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// ===== 初期化時に履歴読み込み =====
loadHistory();

// ===== デバッグ用関数 =====
window.predictionDebug = {
    getHistory: () => predictionHistory,
    getStats: getPredictionStats,
    exportResult: exportPredictionResult,
    clearHistory: () => {
        predictionHistory = [];
        localStorage.removeItem('predictionHistory');
        console.log('✓ 判定履歴をクリアしました');
    },
    simulate: async (mockResult) => {
        console.log('🧪 模擬判定実行');
        displayPredictionResult(mockResult || {
            status: 'success',
            prediction: 'HIGH',
            confidence: 0.875,
            classification: '上カルビ',
            processing_time: 2.3,
            timestamp: new Date().toISOString()
        });
    }
};

console.log('✓ 判定スクリプト読み込み完了'); 