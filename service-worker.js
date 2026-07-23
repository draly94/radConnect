// service-worker.js - RadConnect PWA
const CACHE_NAME = 'radconnect-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/signup.html',
    '/dashboard.html',
    '/cases.html',
    '/case-detail.html',
    '/new-case.html',
    '/wallet.html',
    '/pricing.html',
    '/profile.html',
    '/admin/index.html',
    '/admin/review-case.html',
    '/admin/users.html',
    '/admin/settings.html',
    '/css/main.css',
    '/css/rtl.css',
    '/js/config.js',
    '/js/auth.js',
    '/js/utils.js',
    '/js/theme.js',
    '/js/api.js',
    '/js/notifications.js',
    '/manifest.json'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - cache first, then network
self.addEventListener('fetch', (event) => {
    // Skip Supabase API calls
    if (event.request.url.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Cache successful responses
                        if (response.ok && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    let data = { title: 'RadConnect', body: 'New notification', icon: '/assets/icons/icon-192.png' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge.png',
        tag: data.tag || 'default',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const data = event.notification.data;
    
    if (event.action === 'dismiss') {
        return;
    }
    
    // Default: open case detail if caseId exists
    let url = '/dashboard.html';
    if (data && data.caseId) {
        url = `/case-detail.html?id=${data.caseId}`;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(windowClients => {
                // If window exists, focus it and navigate
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        return client.navigate(url).then(() => client.focus());
                    }
                }
                // Otherwise open new window
                return clients.openWindow(url);
            })
    );
});

// Periodic sync for file cleanup check (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-file-retention') {
        event.waitUntil(checkFileRetention());
    }
});

async function checkFileRetention() {
    // This would call an API endpoint to check and clean expired files
    try {
        const response = await fetch('/api/cleanup-expired-files', { method: 'POST' });
        return response.ok;
    } catch (error) {
        console.error('File cleanup check failed:', error);
        return false;
    }
}