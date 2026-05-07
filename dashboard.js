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

});

// logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ================= MARK ATTENDANCE =================
window.markAttendance = async function () {

  const user = auth.currentUser;

  if (!user) {
    alert("Not logged in");
    return;
  }

  const activityId = document.getElementById("activitySelect").value;

  if (!activityId) {
    alert("Select activity");
    return;
  }

  const activityRef = doc(db, "activities", activityId);
  const snap = await getDoc(activityRef);

  if (!snap.exists()) {
    alert("Invalid activity");
    return;
  }

  const data = snap.data();

  // check active session
  if (data.status !== "active") {
    alert("Attendance not active ❌");
    return;
  }

  const now = new Date();
  const start = data.startTime.toDate();
  const end = data.endTime.toDate();

  if (now < start || now > end) {
    alert("Attendance time expired ❌");
    return;
  }

  // prevent double entry
  const attRef = doc(db, "activities", activityId, "attendance", user.uid);
  const attSnap = await getDoc(attRef);

  if (attSnap.exists()) {
    alert("Already marked ✅");
    return;
  }

  await setDoc(attRef, {
    uid: user.uid,
    email: user.email,
    time: new Date()
  });

  document.getElementById("attendanceStatus").innerText =
    "Attendance marked successfully ✅";
};

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