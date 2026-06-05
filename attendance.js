import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCYJtqBXt719s28KazYEdFkhVjqm5ytHlw",
  authDomain: "nss-d58.firebaseapp.com",
  projectId: "nss-d58",
  storageBucket: "nss-d58.appspot.com",
  messagingSenderId: "851449633649",
  appId: "1:851449633649:web:025a6a1f044fed8b6db4d0",
  measurementId: "G-5M01SRSGZ8"
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params =
new URLSearchParams(
 window.location.search
);

const sessionId =
params.get("session");

console.log(sessionId);

const sessionRef =
doc(
 db,
 "attendanceSessions",
 sessionId
);

async function loadSession(){

  const sessionSnap =
  await getDoc(sessionRef);

  if(!sessionSnap.exists()){

    alert("Invalid QR");
    return;
  }

}

loadSession();