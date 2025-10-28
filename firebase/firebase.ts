import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBgw8uazMmaKeG0Yx6-YQFxYz-y1ocpS1I",
  authDomain: "i-repair-laxus.firebaseapp.com",
  projectId: "i-repair-laxus",
  storageBucket: "i-repair-laxus.firebasestorage.app",
  messagingSenderId: "571739654699",
  appId: "1:571739654699:web:46890fee7944e33020b86e",
  measurementId: "G-HFVWNM21J0"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
