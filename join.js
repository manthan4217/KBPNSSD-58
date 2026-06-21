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
  document.getElementById("email").value.trim().toLowerCase();

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

  let userCredential;

  try {
    // STEP 1 — create auth account
    userCredential = await createUserWithEmailAndPassword(auth, email, password);

  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      alert("❌ This email is already registered!\n\nIf you forgot your password, please use the login page to reset it.");
    } else if (error.code === "auth/weak-password") {
      alert("❌ Password is too weak. Please use a stronger password.");
    } else if (error.code === "auth/invalid-email") {
      alert("❌ The email format is invalid. Please check and try again.");
    } else {
      alert("❌ Registration failed: " + error.message);
    }
    return; // stop here — nothing else to clean up
  }

  try {
    // STEP 2 — upload photo
    const formData = new FormData();
    formData.append("file", photoFile);
    formData.append("upload_preset", "nss_profiles");

    const cloudinaryResponse = await fetch(
      "https://api.cloudinary.com/v1_1/dstdl2ycg/image/upload",
      { method: "POST", body: formData }
    );

    if (!cloudinaryResponse.ok) {
      throw new Error("Photo upload failed. Please try again.");
    }

    const cloudinaryData = await cloudinaryResponse.json();
    const photoURL = cloudinaryData.secure_url;

    if (!photoURL) {
      throw new Error("Photo upload did not return a valid URL.");
    }

    // STEP 3 — write Firestore doc
    await setDoc(doc(db, "volunteers", userCredential.user.uid), {
      uid: userCredential.user.uid,
      fullName: cleanName,
      className,
      rollNo,
      studentId,
      division: document.getElementById("division").value,
      gender: document.getElementById("gender").value,
      address: cleanAddress,
      contact,
      email: email,
      bloodGroup,
      dob,
      age,
      caste,
      photoURL,
      joinedAt: new Date()
    });

    alert("Registration Successful ✅");
    window.location.href = "login.html";

  } catch (error) {
    // STEP 4 — registration partially failed AFTER auth account was created
    // Clean up the orphaned auth account so the email is free to retry
    console.error("Registration step failed:", error);

    try {
      await userCredential.user.delete();
      alert("❌ Registration failed: " + error.message + "\n\nPlease try again — you can use the same email.");
    } catch (cleanupErr) {
      console.error("Failed to clean up orphaned auth account:", cleanupErr);
      alert("❌ Registration failed: " + error.message + "\n\nIf re-registering with this email fails, please contact NSS staff.");
    }
  }

  const cloudinaryResponse = await fetch(
  "https://api.cloudinary.com/v1_1/dstdl2ycg/image/upload",
  { method: "POST", body: formData }
);

if (!cloudinaryResponse.ok) {
  const errBody = await cloudinaryResponse.json().catch(() => null);
  console.error("Cloudinary error response:", errBody);
  throw new Error(
    "Photo upload failed: " + (errBody?.error?.message || "Unknown error")
  );
}

});