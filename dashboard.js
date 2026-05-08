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

    const docSnap =
    await getDoc(doc(db, "volunteers", studentId));

    if (docSnap.exists()) {

      const data = docSnap.data();

      document.getElementById("d-name").innerText =
      data.fullName;

      document.getElementById("d-class").innerText =
      data.className;

      document.getElementById("d-contact").innerText =
      data.contact;
    }

    loadActiveActivity();

    // ✅ IMPORTANT
    await checkQRAndMarkAttendance(user);

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

  async function checkQRAndMarkAttendance(user) {

    try {

      console.log("QR function started");

      const params =
      new URLSearchParams(window.location.search);

      const activityId =
      params.get("activity");

      const token =
      params.get("token");

      console.log(activityId);
      console.log(token);

      // no qr
      if (!activityId || !token) {
        return;
      }

      const studentId =
      user.email.split("@")[0];

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

      console.log(activityData);

      // token check
      if (activityData.attendanceToken !== token) {

        alert("Fake QR ❌");

        return;
      }

      // status
      if (activityData.status !== "active") {

        alert("Attendance closed ❌");

        return;
      }

      // expiry
      const now = new Date();

      const end =
      activityData.endTime.toDate();

      if (now > end) {

        alert("QR expired ❌");

        return;
      }

      // attendance ref
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

        alert("Already marked ✅");

        return;
      }

      // volunteer data
      const volunteerSnap =
      await getDoc(
        doc(db, "volunteers", studentId)
      );

      const volunteerData =
      volunteerSnap.data();

      // save
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

      // success popup

      const popup =
      document.getElementById("successPopup");

      popup.style.display = "block";

        setTimeout(() => {

          popup.style.display = "none";

        }, 3000);

      // success box

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

      // clean url
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

    } catch(error) {

      console.error(error);

      alert(error.message);

    }

  }

window.history.replaceState(
  {},
  document.title,
  window.location.pathname
);

// ================= QR SCANNER =================

const scannerBtn =
document.getElementById("openScannerBtn");

if(scannerBtn){

  scannerBtn.addEventListener("click", async () => {

    const reader =
    document.getElementById("reader");

    reader.innerHTML = "";

    const html5QrCode =
    new Html5Qrcode("reader");

    try {

      await html5QrCode.start(

        {
          facingMode: "environment"
        },

        {
          fps: 10,
          qrbox: 250
        },

        async (decodedText) => {

          console.log(decodedText);

          // stop camera
          await html5QrCode.stop();

          // open qr link
          window.location.href = decodedText;

        }

      );

    } catch(err){

      console.log(err);

      alert("Camera access denied ❌");

    }

  });

}