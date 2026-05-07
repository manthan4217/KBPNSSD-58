import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= AUTH GUARD =================
onAuthStateChanged(auth, (user) => {

  if (!user || user.email !== "admin@nssd58.com") {
    window.location.href = "login.html";
    return;
  }

  loadVolunteers();
  loadActivities();
  loadCounters();
});


// ================= TAB FUNCTION =================
window.showTab = function (tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
};


// ================= LOGOUT =================
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});


// ================= CREATE ACTIVITY =================
document.getElementById("createActivityBtn")?.addEventListener("click", async () => {

  const name = document.getElementById("actName").value;
  const date = document.getElementById("actDate").value;
  const desc = document.getElementById("actDesc").value;

  if (!name || !date) {
    alert("Fill activity details");
    return;
  }

  await addDoc(collection(db, "activities"), {
    name,
    date,
    desc,
    status: "inactive",
    startTime: null,
    endTime: null
  });

  alert("Activity Created ✅");

  loadActivities();
  loadCounters();
});

// ================= LOAD ACTIVITIES =================
async function loadActivities() {

  const snap = await getDocs(collection(db, "activities"));
  const select = document.getElementById("activitySelect");
  const list = document.getElementById("activityList");

  select.innerHTML = "";
  list.innerHTML = "";

  snap.forEach(d => {
    const data = d.data();

    // dropdown
    select.innerHTML += `
      <option value="${d.id}">
        ${data.name} (${data.date})
      </option>
    `;

    // list
    list.innerHTML += `
      <div class="card">
        <h3>${data.name}</h3>
        <p>${data.date}</p>
        <small>${data.status}</small>

        <button 
          onclick="deleteActivity('${d.id}')"
          style="margin-top:10px; background:red; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;"
        >
          Delete
        </button>

      </div>
    `;
  });
}


// ================= START SESSION =================
window.startSession = async function () {

  const activityId = document.getElementById("activitySelect").value;

  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60000); // 15 min

  await updateDoc(doc(db, "activities", activityId), {
    status: "active",
    startTime: now,
    endTime: end
  });

  alert("Attendance Started ⏱️ (15 min)");
};


// ================= END SESSION =================
window.endSession = async function () {

  const activityId = document.getElementById("activitySelect").value;

  await updateDoc(doc(db, "activities", activityId), {
    status: "ended"
  });

  alert("Attendance Ended");
};


// ================= LOAD VOLUNTEERS =================
async function loadVolunteers() {

  const snap = await getDocs(collection(db, "volunteers"));

  const list = document.getElementById("volunteerList");
  list.innerHTML = "";

  snap.forEach(d => {
    const data = d.data();

    list.innerHTML += `
      <div class="card">
        <h3>${data.fullName}</h3>
        <p>${data.studentId}</p>
        <p>${data.contact}</p>
      </div>
    `;
  });
}

// ================= COUNTERS =================
async function loadCounters() {

  const vol = await getDocs(collection(db, "volunteers"));
  const act = await getDocs(collection(db, "activities"));

  document.getElementById("totalVolunteers").innerText = vol.size;
  document.getElementById("totalActivities").innerText = act.size;
}


// ================= SAVE MARKS =================
document.getElementById("saveMarks")?.addEventListener("click", async () => {

  const id = document.getElementById("markStudentId").value;
  const a = Number(document.getElementById("attendanceMarks").value);
  const b = Number(document.getElementById("activityMarks").value);

  if (!id) return alert("Enter student ID");

  const volunteerSnap = await getDoc(
    doc(db, "volunteers", user.email.split("@")[0])
  );

  const volunteerData = volunteerSnap.data();

  await setDoc(attRef, {

    uid: user.uid,
    studentId: volunteerData.studentId,
    fullName: volunteerData.fullName,
    className: volunteerData.className,
    contact: volunteerData.contact,

    email: user.email,
    time: new Date()

  });

  alert("Marks Saved ✅");
});

// ================= See the =================
window.loadAttendanceList = async function () {

  const activityId = document.getElementById("activitySelect").value;
  const result = document.getElementById("attendanceResult");

  if (!activityId) {
    alert("Select activity first");
    return;
  }

  const snap = await getDocs(
    collection(db, "activities", activityId, "attendance")
  );

  result.innerHTML = "<h3>Present Students</h3>";

  if (snap.empty) {
    result.innerHTML += "<p>No attendance marked yet</p>";
    return;
  }

  snap.forEach(doc => {
    const data = doc.data();

    result.innerHTML += `
      <div class="attendance-card">

        <div class="att-top">
          <h3>${data.fullName}</h3>
          <span class="present-badge">Present</span>
        </div>

        <p><b>Student ID:</b> ${data.studentId}</p>
        <p><b>Department/Class:</b> ${data.className}</p>
        <p><b>Contact:</b> ${data.contact}</p>
        <p><b>Marked At:</b> 
          ${data.time?.toDate().toLocaleString()}
        </p>

      </div>
    `;
  });
};

//delete logic for attendace delete
window.deleteActivity = async function (activityId) {

  const confirmDelete = confirm("Are you sure you want to delete this activity?");

  if (!confirmDelete) return;

  try {

    await deleteDoc(doc(db, "activities", activityId));

    alert("Activity deleted successfully ✅");

    // refresh list
    loadActivities();

  } catch (error) {
    console.error(error);
    alert("Error deleting activity ❌");
  }
};