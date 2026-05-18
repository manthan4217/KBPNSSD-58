import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= AUTH CHECK =================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "login.html";
    return;

  }

  try {

    // get student email
    const email = user.email;

    // find volunteer using email
    const studentRef =
    doc(db, "volunteers", email);

    // ❌ IMPORTANT
    // your firestore document id is NOT email
    // so we must search differently later

  } catch(error){

    console.log(error);

  }

});


// ================= LOAD PROFILE =================

onAuthStateChanged(auth, async (user) => {

  if(!user) return;

  try{

    const email =
    user.email;

    // student id stored in email login
    // we must find matching volunteer

    const studentId =
    prompt("Temporary: Enter Student ID");

    const docSnap =
    await getDoc(
      doc(db, "volunteers", studentId)
    );

    if(docSnap.exists()){

      const data =
      docSnap.data();

      // TOPBAR

      document.getElementById("topName").innerText =
      data.fullName;

      document.getElementById("d-name").innerText =
      data.fullName;

      document.getElementById("heroName").innerText =
      data.fullName;

      // PROFILE

      document.getElementById("studentId").innerText =
      data.studentId;

      document.getElementById("studentClass").innerText =
      data.className;

      document.getElementById("studentBlood").innerText =
      data.bloodGroup;

      document.getElementById("studentContact").innerText =
      data.contact;

      document.getElementById("studentEmail").innerText =
      data.email;

    }

  }catch(error){

    console.log(error);

  }

});


// ================= LOGOUT =================

document.getElementById("logoutBtn")
.addEventListener("click", async () => {

  await signOut(auth);

  window.location.href =
  "login.html";

});