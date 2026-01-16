// Service Worker for Push Notifications
const CACHE_NAME = 'ze-graph-v1';
const NOTIFICATION_TAG = 'ze-graph-notification';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'ZE Graph',
    body: 'New notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: NOTIFICATION_TAG,
    requireInteraction: false,
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        data: payload.data || {},
        tag: payload.tag || NOTIFICATION_TAG,
      };

      // Add action buttons for map change notifications
      if (payload.data?.allowResubscribe) {
        notificationData.actions = [
          { action: 'resubscribe', title: 'Wait for Another' },
          { action: 'dismiss', title: 'Dismiss' },
        ];
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', (event) => {
  // Handle "Wait for Another" action
  if (event.action === 'resubscribe') {
    event.notification.close();
    const serverId = event.notification.data?.serverId;
    const subscriptionId = event.notification.data?.subscriptionId;

    if (serverId && subscriptionId) {
      event.waitUntil(
        fetch('/api/accounts/me/push/map-change/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            server_id: serverId,
            subscription_id: subscriptionId,
          }),
        })
          .catch(() => {})
      );
    }
    return;
  }

  // Handle "Dismiss" action
  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }

  // No action = clicking notification body, open URL
  event.notification.close();
  const urlToOpen = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if found
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
