import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const firebaseConfig = {
    apiKey:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',

    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',

    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',

    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',

    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',

    appId:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  const js = `
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js'
);

firebase.initializeApp(
  ${JSON.stringify(firebaseConfig)}
);

const messaging = firebase.messaging();

/*
  Backend now sends DATA-ONLY Firebase messages.

  Because there is no Firebase "notification" payload,
  Firebase will NOT automatically create a notification.

  This service worker is therefore the ONLY place where
  a visible notification is created.
*/

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw] Background message:',
    payload
  );

  const data = payload.data || {};

  const title =
    data.title ||
    'Godavari Basket Admin';

  const body =
    data.body ||
    '';

  const url =
    data.url ||
    '/admin';

  const orderId =
    data.order_id ||
    '';

  const orderNumber =
    data.order_number ||
    '';

  const notificationType =
    data.notification_type ||
    '';

  const options = {
    body,

    icon: '/icon-192.png',

    badge: '/icon-192.png',

    data: {
      url,
      order_id: orderId,
      order_number: orderNumber,
      notification_type: notificationType
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const notificationData =
      event.notification.data || {};

    const url =
      notificationData.url ||
      '/admin';

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              if ('navigate' in client) {
                client.navigate(url);
              }

              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url);
          }

          return null;
        })
    );
  }
);
`;

  return new NextResponse(js, {
    status: 200,

    headers: {
      'Content-Type':
        'application/javascript; charset=utf-8',

      'Cache-Control':
        'no-store, no-cache, must-revalidate, proxy-revalidate',

      Pragma: 'no-cache',

      Expires: '0',

      'Surrogate-Control': 'no-store',
    },
  });
}
