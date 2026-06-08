
import { auth, db } from "./firebase.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; 

// ======================================================
// AUTH CHECK
// ======================================================

let currentUserData = null;

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "login.html";
    return;

  }

  try {

    const docSnap =
    await getDoc(doc(db, "volunteers", user.uid));

    if(docSnap.exists()){
    }

    if(docSnap.exists()){

      const data = docSnap.data();

      currentUserData = data;

      // PROFILE DATA
      document.querySelectorAll(".profileImage")
      .forEach(img => {
        img.src =
        data.photoURL || "images/profile.jpg";
      });

      document.getElementById("topName").innerText =
      data.fullName;

      document.getElementById("d-name").innerText =
      data.fullName;

      document.getElementById("heroName").innerText =
      data.fullName;

      document.getElementById("studentId").innerText =
      data.studentId;

      document.getElementById("studentBlood").innerText =
      data.bloodGroup;

      document.getElementById("studentClass").innerText =
      data.className;

      document.getElementById("studentContact").innerText =
      data.contact;

      document.getElementById("studentEmail").innerText =
      data.email;

      // LOAD ACTIVE SESSION
      await Promise.all([loadActiveSession(), loadStats()]);

    }

  }catch(error){

  }

});

// ======================================================
// LOGOUT
// ======================================================

document.getElementById("logoutBtn")
.addEventListener("click", async () => {

  await signOut(auth);

  window.location.href =
  "login.html";

});

// menu toggle
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".dashboard-sidebar").classList.toggle("active");
});

// ======================================================
// LOAD ACTIVE ATTENDANCE SESSION
// ======================================================

let activeSessionId = null;

async function loadActiveSession(){

  const q = query(
    collection(db,"attendanceSessions"),
    where("active","==",true)
  );

  const snap = await getDocs(q);

  const box =
  document.getElementById("activeActivityBox");

  if(snap.empty){

    box.innerHTML = `
      <p>No active attendance session</p>
    `;

    return;

  }

  const sessionDoc = snap.docs[0];
  const data = sessionDoc.data();
  activeSessionId = sessionDoc.id;

  box.innerHTML = `
    <div style="background:#ecfdf5;border:1px solid #10b98133;padding:18px;border-radius:14px;">
      <h3 style="color:#065f46;margin-bottom:8px;">✅ Attendance Live</h3>
      <p style="color:#047857;font-weight:600;">${data.activityName}</p>
    </div>`;

  document.getElementById("markAttendanceBtn").disabled = false;

}

document.getElementById("markAttendanceBtn").addEventListener("click", async () => {
  await markAttendance();
});

// add inside loadActiveSession() after activeSessionId is set:
onSnapshot(
  query(
    collection(db, "attendanceRecords"),
    where("sessionId", "==", activeSessionId)
  ),
  (snap) => {
    document.getElementById("liveCount").innerText = snap.size;
  }
);

const btn = document.getElementById("markAttendanceBtn");
btn.disabled = true;

// ======================================================
// MARK ATTENDANCE
// ======================================================

async function markAttendance(){

  try{

    // CHECK SESSION

    const sessionRef =
      doc(
        db,
        "attendanceSessions",
        activeSessionId
      );

    const sessionSnap =
      await getDoc(sessionRef);

    if(!sessionSnap.exists()){

      document.getElementById(
        "qrAttendanceBox"
      ).innerHTML = `
        <div>
          ❌ Invalid QR Code
        </div>
      `;

      return;
    }

    const session =
      sessionSnap.data();

    if(Date.now() > session.expiresAt){

      document.getElementById(
        "qrAttendanceBox"
      ).innerHTML = `

        <div>
          <h2>❌ QR Expired</h2>
          <p>Ask NSS staff for a new QR.</p>
        </div>

      `;

      return;
    }

    // DUPLICATE CHECK
    const q = query(
      collection(db,"attendanceRecords"),
      where("sessionId","==",activeSessionId),
      where(
        "studentId",
        "==",
        currentUserData.studentId
      )
    );

    const snap = await getDocs(q);

    if(!snap.empty){

      document.getElementById(
        "qrAttendanceBox"
      ).innerHTML = `

        <div style="
          background:#fef2f2;
          color:#dc2626;
          padding:18px;
          border-radius:14px;
          margin-top:20px;
          font-weight:600;
        ">
          ⚠️ Attendance already marked
        </div>

      `;

      return;

    }

    // SAVE ATTENDANCE
    await addDoc(
    collection(db,"attendanceRecords"),
    {

      sessionId: activeSessionId,

      studentId:
      currentUserData.studentId,

      studentName:
      currentUserData.fullName,

      className:
      currentUserData.className,

      division:
      currentUserData.division,

      gender:
      currentUserData.gender,

      timestamp:
      serverTimestamp()

    });

    // SUCCESS UI
    document.getElementById(
  "qrAttendanceBox"
  ).innerHTML = `

  <div style="
  background:#ecfdf5;
  padding:25px;
  border-radius:15px;
  text-align:center;
  ">

  <h2>
  ✅ Attendance Marked
  </h2>

  <p>
  Your attendance has been recorded.
  </p>

  <p>
  ${currentUserData.fullName}
  </p>

  <p>
  ${new Date().toLocaleTimeString()}
  </p>

  </div>

  `;

  }catch(err){

    btn.disabled = false;
    console.error("markAttendance error:", err);

  }

}

async function loadStats() {
  try {
    const studentId = currentUserData.studentId;

    const recordsSnap = await getDocs(query(
      collection(db, "attendanceRecords"),
      where("studentId", "==", studentId)
    ));

    const attendedSessionIds = recordsSnap.docs.map(d => d.data().sessionId);

    if (attendedSessionIds.length === 0) {
      updateStatUI(0, 0, 0, 0, 0, currentUserData.volunteerHours ?? 0);
      return;
    }

    let activitiesAttended = 0;
    let lecturesAttended = 0;

    // chunk into 30 for Firestore "in" limit
    for (let i = 0; i < attendedSessionIds.length; i += 30) {
      const chunk = attendedSessionIds.slice(i, i + 30);
      const sessionSnap = await getDocs(query(
        collection(db, "attendanceSessions"),
        where("__name__", "in", chunk)
      ));
      sessionSnap.forEach(s => {
        const t = s.data().type?.toLowerCase();
        if (t === "lecture") lecturesAttended++;
        else activitiesAttended++;
      });
    }

    // Count total activities from Firestore
    const allActivitiesSnap = await getDocs(collection(db, "activities"));

    let totalActivities = 0;
    let totalLectures = 0;

    allActivitiesSnap.forEach(d => {
      const type = d.data().activityType?.toLowerCase();
      if (type === "lecture") totalLectures++;
      else totalActivities++;
    });

    const pct = Math.round(
      ((activitiesAttended + lecturesAttended) / (totalActivities + totalLectures)) * 100
    );

    updateStatUI(
      activitiesAttended, totalActivities,
      lecturesAttended, totalLectures,
      pct, currentUserData.volunteerHours ?? 0
    );

  } catch (err) {
    console.error("loadStats error:", err);
  }
}

function updateStatUI(actAtt, actTotal, lecAtt, lecTotal, pct, hours) {
  document.getElementById("statActivitiesCount").innerText = actAtt;
  document.getElementById("statActivitiesTotal").innerText = `Out of ${actTotal} Activities`;
  document.getElementById("statLecturesCount").innerText = lecAtt;
  document.getElementById("statLecturesTotal").innerText = `Out of ${lecTotal} Lectures`;
  document.getElementById("statAttendancePct").innerText = `${pct}%`;
  document.getElementById("statAttendanceLabel").innerText =
    pct >= 90 ? "Excellent 🌟" : pct >= 75 ? "Good" : pct >= 60 ? "Average" : "Needs Improvement";
  document.getElementById("statHours").innerText = hours;
}