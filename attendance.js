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

    // ── LOCATION CHECK (if session has a location) ──
    if (session.latitude && session.longitude) {

      await new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
          reject("❌ Location not supported on this device");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {

            const R = 6371000;
            const dLat = (position.coords.latitude - session.latitude)
                        * Math.PI / 180;
            const dLon = (position.coords.longitude - session.longitude)
                        * Math.PI / 180;

            const a =
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(session.latitude * Math.PI/180) *
              Math.cos(position.coords.latitude * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

            const distance =
              R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

            const radius = session.radius || 300;

            if (distance > radius) {
              reject(
                `❌ You are ${Math.round(distance)}m away from the activity location. ` +
                `You must be within ${radius}m to mark attendance.`
              );
            } else {
              resolve(true);
            }
          },
          () => {
            reject("❌ Location access denied. Enable GPS to mark attendance.");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

      });
    }
    // ── END LOCATION CHECK ──────────────────────────

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