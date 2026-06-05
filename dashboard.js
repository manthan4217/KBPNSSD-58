
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

console.log("Dashboard loaded");

console.log("Html5Qrcode =", window.Html5Qrcode);
alert("STEP 1");
// ======================================================
// AUTH CHECK
// ======================================================

let currentUserData = null;

alert("STEP 2");

onAuthStateChanged(auth, async (user) => {
  alert("AUTH TRIGGERED");

  console.log("User:", user);

  alert("STEP 3");

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
// QR CODE SCANNER
// ======================================================

let scannerRunning = false;
let html5QrCode;

document.getElementById("openScannerBtn")
.addEventListener("click", async ()=>{

  alert("SCAN BUTTON CLICKED");

  if(scannerRunning) return;

  alert("PASSED scannerRunning");

  if(!activeSessionId){

    alert("No active attendance session");
    return;

  }

  alert("ACTIVE SESSION FOUND");

  scannerRunning = true;

  alert("CREATING SCANNER");

  html5QrCode = new Html5Qrcode("reader");

  try{

    alert("GETTING CAMERAS");

    const cameras =
      await Html5Qrcode.getCameras();

    alert(
      "Found " +
      cameras.length +
      " cameras"
    );

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 30,
        qrbox: {
          width: 350,
          height: 350
        }
      },
      (decodedText) => {
        console.log("DETECTED:", decodedText);
        alert("QR DETECTED");
      },
      (errorMessage) => {
        console.log(errorMessage);
      }
    );

    }catch(err){

      alert(
        "ERROR:\n" +
        err.message
      );

      console.error(err);

    }

});


// ======================================================
// MARK ATTENDANCE
// ======================================================

async function markAttendance(){

  try{

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
        studentId: currentUserData.studentId,
        studentName: currentUserData.fullName,
        timestamp: serverTimestamp()
      }
    );

    // SUCCESS UI
    document.getElementById(
      "qrAttendanceBox"
    ).innerHTML = `

      <div style="
        background:#ecfdf5;
        color:#047857;
        padding:20px;
        border-radius:16px;
        margin-top:20px;
      ">

        <h3 style="margin-bottom:8px;">
          ✅ Attendance Marked
        </h3>

        <p>
          Your attendance has been submitted successfully.
        </p>

      </div>

    `;

  }catch(err){

    console.log(err);

  }

}