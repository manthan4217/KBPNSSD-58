import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= STEP SWITCHING =================

document.addEventListener("DOMContentLoaded", () => {

  const agreeBtn =
  document.getElementById("agreeBtn");

  if(agreeBtn){

    agreeBtn.addEventListener("click", () => {

      // hide step1
      document.getElementById("step1")
      .classList.remove("active");

      // show step2
      document.getElementById("step2")
      .classList.add("active");

      // indicator
      document.getElementById("step1-ind")
      .classList.remove("active");

      document.getElementById("step2-ind")
      .classList.add("active");

    });

  }

});

// ================= PASSWORD TOGGLE =================

function setupToggle(btnId, inputId){

  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);

  btn.addEventListener("click", () => {

    if(input.type === "password"){

      input.type = "text";
      btn.innerHTML = "🙈";

    }else{

      input.type = "password";
      btn.innerHTML = "👁️";

    }

  });

}

setupToggle("togglePass1", "password");
setupToggle("togglePass2", "confirmPassword");


// ================= AUTO LOGIN ID =================

const studentIdInput =
document.getElementById("email");

const loginIdInput =
document.getElementById("loginId");

studentIdInput.addEventListener("input", () => {

  loginIdInput.value =
  studentIdInput.value;

});


// ================= FORM SUBMIT =================

document.getElementById("nssForm")
.addEventListener("submit", async (e) => {

  e.preventDefault();

  const fullName =
  document.getElementById("fullName").value;

  const className =
  document.getElementById("class").value;

  const rollNo =
  document.getElementById("rollNo").value;

  const studentId =
  document.getElementById("studentId").value;

  const password =
  document.getElementById("password").value;

  const confirmPassword =
  document.getElementById("confirmPassword").value;

  const address =
  document.getElementById("address").value;

  const contact =
  document.getElementById("contact").value;

  const email =
  document.getElementById("email").value;

  const bloodGroup =
  document.getElementById("bloodGroup").value;

  const dob =
  document.getElementById("dob").value;

  const age =
  document.getElementById("age").value;

  const caste =
  document.getElementById("caste").value;

  const photoFile =
  document.getElementById("profilePhoto").files[0];

  // PASSWORD CHECK

  if(password !== confirmPassword){

    alert("Passwords do not match");
    return;

  }

  try{

    // AUTH EMAIL

    const loginEmail =
    document.getElementById("email").value.trim();

    // CREATE ACCOUNT

    const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      loginEmail,
      password
    );

    // ================= PHOTO UPLOAD =================

      const formData = new FormData();

      formData.append("file", photoFile);

      formData.append(
        "upload_preset",
        "nss_profiles"
      );

      const cloudinaryResponse =
      await fetch(
        "https://api.cloudinary.com/v1_1/dstdl2ycg/image/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const cloudinaryData =
      await cloudinaryResponse.json();

      const photoURL =
      cloudinaryData.secure_url;

    // SAVE FIRESTORE DATA

    await setDoc(
      doc(db, "volunteers", userCredential.user.uid),
      {

        uid:userCredential.user.uid,

        fullName,
        className,
        rollNo,
        studentId,

        address,
        contact,
        email: loginEmail,

        bloodGroup,
        dob,
        age,
        caste,

        photoURL,

        joinedAt:new Date()

      }
    );

    alert("Registration Successful ✅");

    window.location.href = "login.html";

  }catch(error){

    console.error(error);

    alert(error.message);

  }

});