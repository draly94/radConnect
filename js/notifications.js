// notifications.js - Push notification management

async function initPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // Don't auto-subscribe, wait for user action
            return;
        }
        
        console.log('Push notifications enabled');
    } catch (error) {
        console.error('Push notification setup failed:', error);
    }
}

async function subscribeToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Get server's public key (replace with your VAPID public key)
        const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
        
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        
        // Save subscription to your backend
        console.log('Push subscription:', JSON.stringify(subscription));
        
        // Store in Supabase (optional - for server-side push)
        // await savePushSubscription(subscription);
        
        return subscription;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        throw error;
    }
}

async function unsubscribeFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            // Remove from backend
            // await removePushSubscription(subscription);
        }
    } catch (error) {
        console.error('Failed to unsubscribe:', error);
    }
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}

// Initialize on load
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => initPushNotifications())
            .catch(err => console.error('SW registration failed:', err));
    });
}