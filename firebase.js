import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYJtqBXt719s28KazYEdFkhVjqm5ytHlw",
  authDomain: "nss-d58.firebaseapp.com",
  projectId: "nss-d58",
  storageBucket: "nss-d58.appspot.com",
  messagingSenderId: "851449633649",
  appId: "1:851449633649:web:025a6a1f044fed8b6db4d0",
  measurementId: "G-5M01SRSGZ8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);