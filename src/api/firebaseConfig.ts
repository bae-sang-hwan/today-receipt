import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCwbQ_7Q8Pu1Y3DiaRqjq1jasE1SabCFmI",
  authDomain: "today-receipt.firebaseapp.com",
  projectId: "today-receipt",
  storageBucket: "today-receipt.firebasestorage.app",
  messagingSenderId: "296991066097",
  appId: "1:296991066097:web:bbedde5cde69e930b26650",
  measurementId: "G-JVWXQZ7HYM"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});