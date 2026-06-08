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

  // ── FULL FORM VALIDATION ─────────────────────────

  const errors = [];

  // Strip HTML tags from text fields
  const strip = s => s.replace(/<[^>]*>/g, '').trim();

  const cleanName    = strip(fullName);
  const cleanAddress = strip(address);

  // Name — letters, spaces, dots only
  if (!/^[a-zA-Z\s.'-]{2,80}$/.test(cleanName)) {
    errors.push("Full name must be 2–80 characters, letters only");
  }

  // Phone — 10 digits starting with 6–9
  if (!/^[6-9]\d{9}$/.test(contact)) {
    errors.push("Enter a valid 10-digit Indian mobile number");
  }

  // Email — basic format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address");
  }

  // Student ID — alphanumeric, 2–20 chars
  if (!/^[A-Z0-9]{2,20}$/i.test(studentId)) {
    errors.push("Student ID must be 2–20 letters/numbers only");
  }

  // Password — min 8 chars
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  // Password — at least one number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Confirm password
  if (password !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  // Photo required
  if (!photoFile) {
    errors.push("Please upload a profile photo");
  }

  // Photo type and size check
  if (photoFile) {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(photoFile.type)) {
      errors.push("Only JPG and PNG photos allowed");
    }
    if (photoFile.size > 2 * 1024 * 1024) {
      errors.push("Photo must be under 2MB");
    }
  }

  // Show all errors at once
  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  // ── END VALIDATION ───────────────────────────────

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

        uid: userCredential.user.uid,

        fullName:  cleanName,      // sanitized
        className,
        rollNo,
        studentId,

        division:
          document.getElementById("division").value,

        gender:
          document.getElementById("gender").value,

        address:   cleanAddress,   // sanitized
        contact,
        email: loginEmail,

        bloodGroup,
        dob,
        age,
        caste,

        photoURL,

        joinedAt: new Date()

      }
    );

    alert("Registration Successful ✅");

    window.location.href = "login.html";

  }catch(error){

    alert(error.message);

  }

});