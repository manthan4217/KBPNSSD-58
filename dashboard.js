
import { auth, db } from "./firebase.js";

import {
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
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ======================================================
// AUTH CHECK
// ======================================================

let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  alert("AUTH TRIGGERED");

  console.log("User:", user);

  if (!user) {

    window.location.href = "login.html";
    return;

  }

  try {

    const docSnap =
    await getDoc(doc(db, "volunteers", user.uid));

    console.log("Doc Exists:", docSnap.exists());

    if(docSnap.exists()){
      console.log("Volunteer Data:", docSnap.data());
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
      loadActiveSession();

    }

  }catch(error){

    console.log(error);

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

  snap.forEach(docSnap=>{

    const data = docSnap.data();

    activeSessionId = docSnap.id;

    box.innerHTML = `

      <div style="
        background:#ecfdf5;
        border:1px solid #10b98133;
        padding:18px;
        border-radius:14px;
      ">

        <h3 style="
          color:#065f46;
          margin-bottom:8px;
        ">
          ✅ Attendance Live
        </h3>

        <p style="
          color:#047857;
          font-weight:600;
        ">
          ${data.activityName}
        </p>

      </div>

    `;

  });

}

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

    console.log(err);

  }

}