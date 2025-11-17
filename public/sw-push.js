// Push Notification Event Handler
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received:', event);
  
  let notificationData = {
    title: 'Letify Notification',
    body: 'You have a new notification',
    icon: '/icons/Logo/192.png',
    badge: '/icons/Logo/96.png',
    tag: 'letify-notification',
    data: {}
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
        actions: payload.actions || []
      };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback to text payload
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
      actions: notificationData.actions
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
    // You can add custom action handlers here
  }

  // Get the URL from notification data or use default dashboard
  const urlToOpen = event.notification.data?.url || '/dashboard';

  // Focus or open client window
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clientList) {
    // Check if there's already a window open
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url.includes(urlToOpen) && 'focus' in client) {
        return client.focus();
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
    // Send new subscription to server
    return fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSubscription)
    });
  });

  event.waitUntil(promiseChain);
});
