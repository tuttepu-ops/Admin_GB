import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getMessaging} from 'firebase-admin/messaging';
export function firebaseMessagingAdmin(){
 const projectId=process.env.FIREBASE_PROJECT_ID;
 const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
 const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!projectId||!clientEmail||!privateKey) throw new Error('Firebase Admin environment variables are missing');
 const app=getApps()[0]||initializeApp({credential:cert({projectId,clientEmail,privateKey})});
 return getMessaging(app);
}
