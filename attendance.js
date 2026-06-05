import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const sessionId =
new URLSearchParams(
  window.location.search
).get("session");

if(!sessionId){

  document.getElementById("status").innerHTML =
  "❌ Invalid Attendance Link";

  throw new Error("No Session ID");
}

localStorage.setItem(
  "attendanceSession",
  sessionId
);

onAuthStateChanged(auth, async(user)=>{

  if(!user){

    window.location.href =
    "login.html";

    return;
  }

  try{

    const volunteerSnap =
    await getDoc(
      doc(db,"volunteers",user.uid)
    );

    if(!volunteerSnap.exists()){

      document.getElementById("status").innerHTML =
      "❌ Volunteer data not found";

      return;
    }

    const volunteer =
    volunteerSnap.data();

    const sessionSnap =
    await getDoc(
      doc(db,"attendanceSessions",sessionId)
    );

    if(!sessionSnap.exists()){

      document.getElementById("status").innerHTML =
      "❌ Invalid Session";

      return;
    }

    const session =
    sessionSnap.data();

    if(!session.active){

      document.getElementById("status").innerHTML =
      "❌ Session Closed";

      return;
    }

    if(Date.now() > session.expiresAt){

      document.getElementById("status").innerHTML =
      "❌ QR Expired";

      return;
    }

    // DUPLICATE CHECK

    const q = query(
      collection(db,"attendanceRecords"),
      where("sessionId","==",sessionId),
      where(
        "studentId",
        "==",
        volunteer.studentId
      )
    );

    const existing =
    await getDocs(q);

    if(!existing.empty){

      document.getElementById("status").innerHTML =
      "⚠️ Attendance Already Marked";

      return;
    }

    await addDoc(
      collection(db,"attendanceRecords"),
      {
        sessionId,
        studentId:
        volunteer.studentId,

        studentName:
        volunteer.fullName,

        timestamp:
        serverTimestamp()
      }
    );

    document.getElementById("status").innerHTML = `
      <h2>✅ Attendance Marked</h2>
      <p>${volunteer.fullName}</p>
    `;

  }
  catch(err){

    console.error(err);

    document.getElementById("status").innerHTML =
    "❌ Error";

  }

});