'use client';
import {getApp,getApps,initializeApp} from 'firebase/app';
import {getMessaging,getToken,isSupported} from 'firebase/messaging';
export async function getAdminPushToken(){
 if(!(await isSupported())) throw new Error('Push notifications are not supported in this browser');
 const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};
 if(!config.apiKey||!config.projectId||!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) throw new Error('Firebase web configuration is missing');
 const app=getApps().length?getApp():initializeApp(config);
 const registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js');
 const permission=await Notification.requestPermission();
 if(permission!=='granted') throw new Error('Notification permission was not granted');
 const token=await getToken(getMessaging(app),{vapidKey:process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,serviceWorkerRegistration:registration});
 if(!token) throw new Error('Unable to get FCM device token');
 return token;
}
