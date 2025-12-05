// Custom Service Worker with Push Notifications Support
// This file extends the next-pwa generated service worker

// Import workbox for caching
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('Workbox loaded successfully');

  // Precaching
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Skip waiting and claim clients
  self.skipWaiting();
  workbox.core.clientsClaim();

  // ========== PUSH NOTIFICATION HANDLERS ==========
  
  // Push Event Handler
  self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:', event);
    
    let notificationData = {
      title: 'Letify Notification',
      body: 'You have a new notification',
      icon: '/icons/Logo/192.png',
      badge: '/icons/Logo/96.png',
      tag: 'letify-notification',
      data: {},
      requireInteraction: false,
      vibrate: [200, 100, 200], // Vibration pattern for mobile
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
        console.log('[Service Worker] Parsed notification:', notificationData);
      } catch (e) {
        console.error('[Service Worker] Error parsing push data:', e);
        notificationData.body = event.data.text();
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
        // Mobile specific options
        renotify: true, // Re-alert user if notification with same tag exists
        timestamp: Date.now(),
      }
    );

    event.waitUntil(promiseChain);
  });

  // Notification Click Handler
  self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification clicked:', event);
    
    event.notification.close();

    // Handle action button clicks
    if (event.action) {
      console.log('[Service Worker] Action clicked:', event.action);
    }

    // Get the URL from notification data or use default dashboard
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    console.log('[Service Worker] Opening URL:', urlToOpen);

    // Focus or open client window
    const promiseChain = clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      console.log('[Service Worker] Found clients:', clientList.length);
      
      // Check if there's already a window open with the app
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Focus existing window and navigate
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
    console.log('[Service Worker] Push subscription changed:', event);
    
    // Re-subscribe to push notifications
    const promiseChain = self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then(function(newSubscription) {
      console.log('[Service Worker] New subscription created:', newSubscription);
      
      // Send new subscription to server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubscription)
      });
    }).catch(function(error) {
      console.error('[Service Worker] Resubscription failed:', error);
    });

    event.waitUntil(promiseChain);
  });

  // ========== CACHING STRATEGIES ==========

  // Cache fonts
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    })
  );

  // Cache images
  workbox.routing.registerRoute(
    /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Cache JS/CSS
  workbox.routing.registerRoute(
    /\.(?:js|css)$/i,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  // Network first for API calls
  workbox.routing.registerRoute(
    /\/api\/.*/i,
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

  // Network first for HTML pages
  workbox.routing.registerRoute(
    ({request}) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );

} else {
  console.error('Workbox failed to load');
}

// Offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline') || caches.match('/');
      })
    );
  }
});

console.log('[Service Worker] Letify SW loaded with Push Notification support');
