import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  getDocs   // 👈 ADD THIS
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const studentId = user.email.split("@")[0];

  document.getElementById("d-id").innerText = studentId;

  const docSnap = await getDoc(doc(db, "volunteers", studentId));

  if (docSnap.exists()) {
    const data = docSnap.data();

    document.getElementById("d-name").innerText = data.fullName;
    document.getElementById("d-class").innerText = data.className;
    document.getElementById("d-contact").innerText = data.contact;
  }

  // ✅ ADD THIS LINE
  loadActiveActivity();
  checkQRAndMarkAttendance();

});

// logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

//to show activity attendance
window.loadActiveActivity = async function () {

  const snap = await getDocs(collection(db, "activities"));

  const box = document.getElementById("activeActivityBox");
  const select = document.getElementById("activitySelect");

  if (!box || !select) return;

  box.innerHTML = "";
  select.innerHTML = "";

  let activeFound = false;

  snap.forEach(docSnap => {

    const data = docSnap.data();

    if (data.status === "active") {

      activeFound = true;

      box.innerHTML = `
        <div class="active-box">
          <h4>🔥 ${data.name}</h4>
          <p>Ends at: ${data.endTime?.toDate().toLocaleTimeString()}</p>
        </div>
      `;

      select.innerHTML += `
        <option value="${docSnap.id}">
          ${data.name}
        </option>
      `;
    }
  });

  if (!activeFound) {
    box.innerHTML = `<p style="color:red;">No active attendance session</p>`;
  }
};

// ================= QR ATTENDANCE =================

async function checkQRAndMarkAttendance() {

  const params =
  new URLSearchParams(window.location.search);

  const activityId =
  params.get("activity");

  const token =
  params.get("token");

  // no QR
  if (!activityId || !token) {
    return;
  }

  const user = auth.currentUser;

  if (!user) return;

  const studentId =
  user.email.split("@")[0];

  // activity ref
  const activityRef =
  doc(db, "activities", activityId);

  const activitySnap =
  await getDoc(activityRef);

  if (!activitySnap.exists()) {
    alert("Invalid QR ❌");
    return;
  }

  const activityData =
  activitySnap.data();

  // token check
  if (activityData.attendanceToken !== token) {

    alert("Fake QR Code ❌");

    return;
  }

  // status check
  if (activityData.status !== "active") {

    alert("Attendance closed ❌");

    return;
  }

  // expiry check
  const now = new Date();

  const end =
  activityData.endTime.toDate();

  if (now > end) {

    alert("QR Expired ❌");

    return;
  }

  // prevent double attendance
  const attRef = doc(
    db,
    "activities",
    activityId,
    "attendance",
    studentId
  );

  const attSnap =
  await getDoc(attRef);

  if (attSnap.exists()) {

    alert("Attendance already marked ✅");

    return;
  }

  // volunteer data
  const volunteerSnap =
  await getDoc(
    doc(db, "volunteers", studentId)
  );

  const volunteerData =
  volunteerSnap.data();

  // save attendance
  await setDoc(attRef, {

    uid: user.uid,

    studentId:
    volunteerData.studentId,

    fullName:
    volunteerData.fullName,

    className:
    volunteerData.className,

    contact:
    volunteerData.contact,

    email: user.email,

    time: new Date()

  });

  // success UI
  document.getElementById(
    "qrAttendanceBox"
  ).innerHTML = `

    <div class="success-box">

      <h3>
        Attendance Marked ✅
      </h3>

      <p>
        ${activityData.name}
      </p>

    </div>

  `;

}

window.history.replaceState(
  {},
  document.title,
  window.location.pathname
);