/**
 * 牛肉マーブリング判定システム PWA版
 * Service Worker
 * 
 * 概要:
 * - オフライン対応
 * - アプリケーションキャッシュ管理
 * - 静的リソースの高速配信
 * - バックグラウンド同期
 */

// ===== 設定 =====
const CACHE_NAME = 'beef-marbling-pwa-v1.0.0';
const STATIC_CACHE_NAME = 'beef-marbling-static-v1';
const DYNAMIC_CACHE_NAME = 'beef-marbling-dynamic-v1';

// キャッシュするリソース
const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/css/mobile.css',
    '/static/js/app.js',
    '/static/js/camera.js',
    '/static/js/prediction.js',
    '/manifest.json',
    // Bootstrap CDN（オフライン対応）
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css'
];

// キャッシュしないURL（パターン）
const CACHE_BLACKLIST = [
    '/api/predict', // 判定APIは常に最新を取得
    '/api/health'   // ヘルスチェックも常に最新
];

// ===== Service Worker インストール =====
self.addEventListener('install', event => {
    console.log('🔧 Service Worker インストール開始');
    
    event.waitUntil(
        (async () => {
            try {
                // 静的リソースのキャッシュ
                const staticCache = await caches.open(STATIC_CACHE_NAME);
                
                console.log('📦 静的リソースをキャッシュ中...');
                await staticCache.addAll(STATIC_ASSETS);
                
                console.log('✓ Service Worker インストール完了');
                
                // 即座にアクティブ化
                self.skipWaiting();
                
            } catch (error) {
                console.error('✗ Service Worker インストール失敗:', error);
            }
        })()
    );
});

// ===== Service Worker アクティベーション =====
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker アクティベーション開始');
    
    event.waitUntil(
        (async () => {
            try {
                // 古いキャッシュの削除
                const cacheNames = await caches.keys();
                const cachesToDelete = cacheNames.filter(cacheName => {
                    return cacheName.startsWith('beef-marbling-') && 
                           cacheName !== STATIC_CACHE_NAME && 
                           cacheName !== DYNAMIC_CACHE_NAME;
                });
                
                await Promise.all(
                    cachesToDelete.map(cacheName => {
                        console.log(`🗑️ 古いキャッシュを削除: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
                
                // 全クライアントの制御を開始
                await self.clients.claim();
                
                console.log('✓ Service Worker アクティベーション完了');
                
            } catch (error) {
                console.error('✗ Service Worker アクティベーション失敗:', error);
            }
        })()
    );
});

// ===== フェッチイベント処理 =====
self.addEventListener('fetch', event => {
    // GETリクエストのみ処理
    if (event.request.method !== 'GET') {
        return;
    }
    
    const url = new URL(event.request.url);
    
    // キャッシュ対象外のURLをチェック
    if (shouldBypassCache(url.pathname)) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // 静的リソースかAPIかで処理を分岐
    if (isStaticAsset(event.request)) {
        event.respondWith(handleStaticAsset(event.request));
    } else if (isAPIRequest(event.request)) {
        event.respondWith(handleAPIRequest(event.request));
    } else {
        event.respondWith(handleDynamicRequest(event.request));
    }
});

// ===== 静的リソース処理 =====
async function handleStaticAsset(request) {
    try {
        // Cache First 戦略
        const cached = await caches.match(request, { cacheName: STATIC_CACHE_NAME });
        
        if (cached) {
            console.log('📦 キャッシュから配信:', request.url);
            return cached;
        }
        
        // キャッシュにない場合はネットワークから取得してキャッシュ
        console.log('🌐 ネットワークから取得:', request.url);
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.error('✗ 静的リソース取得失敗:', error);
        
        // フォールバック：オフライン用の基本HTMLを返す
        if (request.destination === 'document') {
            const fallback = await caches.match('/');
            if (fallback) return fallback;
        }
        
        throw error;
    }
}

// ===== API リクエスト処理 =====
async function handleAPIRequest(request) {
    try {
        // Network First 戦略（常に最新データを優先）
        console.log('🌐 API呼び出し:', request.url);
        
        const response = await fetch(request, {
            // タイムアウト設定
            signal: AbortSignal.timeout(10000)
        });
        
        // 成功時はキャッシュに保存（GET APIのみ）
        if (response.ok && request.method === 'GET') {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.warn('⚠️ API呼び出し失敗、キャッシュを確認:', error);
        
        // オフライン時はキャッシュから返す
        const cached = await caches.match(request, { cacheName: DYNAMIC_CACHE_NAME });
        
        if (cached) {
            console.log('📦 APIキャッシュから配信:', request.url);
            
            // オフライン表示用のヘッダーを追加
            const headers = new Headers(cached.headers);
            headers.set('X-Served-From-Cache', 'true');
            
            return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: headers
            });
        }
        
        // キャッシュもない場合はオフラインレスポンス
        return createOfflineResponse(request);
    }
}

// ===== 動的リクエスト処理 =====
async function handleDynamicRequest(request) {
    try {
        // Stale While Revalidate 戦略
        const cached = await caches.match(request, { cacheName: DYNAMIC_CACHE_NAME });
        
        // バックグラウンドで更新
        const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
                const cache = caches.open(DYNAMIC_CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
            }
            return response;
        }).catch(error => {
            console.warn('⚠️ バックグラウンド更新失敗:', error);
            return null;
        });
        
        // キャッシュがあれば即座に返す
        if (cached) {
            console.log('📦 キャッシュから配信（バックグラウンド更新中）:', request.url);
            return cached;
        }
        
        // キャッシュがなければネットワークを待つ
        console.log('🌐 ネットワークから取得:', request.url);
        return await fetchPromise;
        
    } catch (error) {
        console.error('✗ 動的リクエスト処理失敗:', error);
        return createOfflineResponse(request);
    }
}

// ===== オフラインレスポンス作成 =====
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    if (request.destination === 'document') {
        // HTMLページの場合は基本ページを返す
        return caches.match('/').then(response => {
            return response || new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                    <title>オフライン - 牛肉マーブリング判定</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body>
                    <h1>オフライン状態</h1>
                    <p>インターネット接続を確認してください。</p>
                </body>
                </html>`,
                { 
                    status: 200, 
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
            );
        });
    }
    
    if (url.pathname.startsWith('/api/')) {
        // API の場合はオフライン用JSONを返す
        return new Response(
            JSON.stringify({
                status: 'error',
                message: 'オフライン状態のため、判定APIにアクセスできません',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    // その他のリソース
    return new Response('オフライン状態です', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

// ===== ユーティリティ関数 =====

// 静的リソース判定
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/static/') ||
           url.pathname === '/' ||
           url.pathname === '/manifest.json' ||
           url.hostname.includes('cdn.jsdelivr.net'); // CDNリソース
}

// APIリクエスト判定
function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/');
}

// キャッシュバイパス判定
function shouldBypassCache(pathname) {
    return CACHE_BLACKLIST.some(pattern => pathname.startsWith(pattern));
}

// ===== バックグラウンド同期 =====
self.addEventListener('sync', event => {
    console.log('🔄 バックグラウンド同期:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(performBackgroundSync());
    }
});

async function performBackgroundSync() {
    try {
        // ヘルスチェック実行
        const response = await fetch('/api/health');
        if (response.ok) {
            console.log('✓ バックグラウンド同期完了');
            
            // クライアントに通知
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'BACKGROUND_SYNC_SUCCESS',
                    timestamp: new Date().toISOString()
                });
            });
        }
    } catch (error) {
        console.error('✗ バックグラウンド同期失敗:', error);
    }
}

// ===== プッシュ通知 =====
self.addEventListener('push', event => {
    console.log('📱 プッシュ通知受信:', event);
    
    const options = {
        body: 'システムからの通知があります',
        icon: '/static/icons/icon-192.png',
        badge: '/static/icons/icon-192.png',
        data: { timestamp: new Date().toISOString() },
        actions: [
            {
                action: 'open',
                title: '開く',
                icon: '/static/icons/icon-192.png'
            },
            {
                action: 'close',
                title: '閉じる'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('牛肉マーブリング判定', options)
    );
});

// ===== 通知クリック処理 =====
self.addEventListener('notificationclick', event => {
    console.log('📱 通知クリック:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// ===== メッセージ処理 =====
self.addEventListener('message', event => {
    console.log('💬 メッセージ受信:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            staticCache: STATIC_CACHE_NAME,
            dynamicCache: DYNAMIC_CACHE_NAME
        });
    }
});

// ===== エラーハンドリング =====
self.addEventListener('error', event => {
    console.error('✗ Service Worker エラー:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('✗ Service Worker 未処理の拒否:', event.reason);
});

// ===== デバッグ用関数 =====
self.debug = {
    getCacheNames: async () => {
        return await caches.keys();
    },
    getCacheContents: async (cacheName) => {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        return requests.map(req => req.url);
    },
    clearAllCaches: async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🗑️ 全キャッシュをクリアしました');
    }
};

console.log('✓ Service Worker スクリプト読み込み完了'); 