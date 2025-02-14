import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDSD6gTIEKd-N_uWTAQUw-gyB0zrCv-0vc",
  authDomain: "alkaramh-847d4.firebaseapp.com",
  projectId: "alkaramh-847d4",
  storageBucket: "alkaramh-847d4.appspot.com", // Fix storage bucket URL
  messagingSenderId: "18460469919",
  appId: "1:18460469919:web:ee8ef45b6e3597123c50aa",
  measurementId: "G-DPCZ5PYQ5E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
