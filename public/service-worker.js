// Custom Service Worker with Push Notifications Support
// OPTIMIZED: Minimal size for fast initialization

console.log('[Service Worker] Letify SW starting...');

// Precache manifest - will be injected by next-pwa during build
self.__WB_MANIFEST;

// Skip waiting - activate immediately
self.skipWaiting();

// ========== PUSH NOTIFICATION HANDLERS ========== 
// These are CRITICAL and must respond quickly to prevent timeout

// Push Event Handler - MUST be synchronous and fast
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  let notificationData = {
    title: 'Letify Notification',
    body: 'You have a new notification',
    icon: '/icons/Logo/192.png',
    badge: '/icons/Logo/96.png',
    tag: 'letify-notification',
    data: {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  // Parse push notification payload
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || {},
        requireInteraction: payload.requireInteraction || false,
        vibrate: payload.vibrate || notificationData.vibrate,
        actions: payload.actions || []
      };
    } catch (e) {
      console.error('[SW] Error parsing push:', e);
      if (event.data && event.data.text) {
        notificationData.body = event.data.text();
      }
    }
  }

  // Show notification
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      renotify: true,
      timestamp: Date.now(),
    }
  );

  event.waitUntil(promiseChain);
});

// Notification Click Handler
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clientList) {
    // Focus existing window
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if ('focus' in client) {
        return client.focus().then(() => {
          if ('navigate' in client) {
            return client.navigate(urlToOpen);
          }
        });
      }
    }
    
    // Open new window if none found
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Push Subscription Change Handler
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW] Push subscription changed');
  // Client-side handles resubscription
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

console.log('[Service Worker] ✅ Letify SW initialized - Push Notifications ready');
