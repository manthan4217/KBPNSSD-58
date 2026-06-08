import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── RATE LIMITING ────────────────────────────────
let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
let lockoutUntil = 0;

function isLockedOut() {
  return Date.now() < lockoutUntil;
}

function getRemainingTime() {
  return Math.ceil((lockoutUntil - Date.now()) / 1000);
}
// ────────────────────────────────────────────────

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

  loginBtn.addEventListener("click", async () => {

    // ── CHECK LOCKOUT FIRST ──────────────────────
    if (isLockedOut()) {
      document.getElementById("error").innerText =
        `Too many failed attempts. Try again in ${getRemainingTime()} seconds.`;
      return;
    }
    // ────────────────────────────────────────────

    const email    = document.getElementById("studentId").value.trim();
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      loginAttempts = 0; // ← reset on success

      // Device ID
      if (!localStorage.getItem("deviceId")) {
        localStorage.setItem("deviceId", crypto.randomUUID());
      }

      // Pending session
      const pendingSession = localStorage.getItem("attendanceSession");
      if (pendingSession) {
        localStorage.removeItem("attendanceSession");
        window.location.href = `attendance.html?session=${pendingSession}`;
        return;
      }

      // Redirect by role
      if (email === "admin@nssd58.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (err) {

      // ── COUNT FAILED ATTEMPTS ──────────────────
      loginAttempts++;

      if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = Date.now() + (15 * 60 * 1000); // 15 min
        loginAttempts = 0;
        document.getElementById("error").innerText =
          "Too many failed attempts. Locked for 15 minutes.";
      } else {
        document.getElementById("error").innerText =
          `Invalid login. ${MAX_ATTEMPTS - loginAttempts} attempts remaining.`;
      }
      // ──────────────────────────────────────────

    }

  });
}

const passwordInput =
document.getElementById("password");

const togglePassword =
document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {

  if(passwordInput.type === "password"){

    passwordInput.type = "text";

    togglePassword.innerHTML = "🙈";

  }else{

    passwordInput.type = "password";

    togglePassword.innerHTML = "👁️";

  }

});


/* ================= REMEMBER ME ================= */

const studentIdInput =
document.getElementById("studentId");

const rememberMe =
document.getElementById("rememberMe");

/* LOAD SAVED ID */

window.addEventListener("DOMContentLoaded", () => {

  const savedId =
  localStorage.getItem("rememberedStudentId");

  if(savedId){

    studentIdInput.value = savedId;

    rememberMe.checked = true;

  }

});

/* SAVE ON LOGIN */

document.getElementById("loginBtn")
.addEventListener("click", () => {

  if(rememberMe.checked){

    localStorage.setItem(
      "rememberedStudentId",
      studentIdInput.value
    );

  }else{

    localStorage.removeItem(
      "rememberedStudentId"
    );

  }

});


/* ================= FORGOT PASSWORD ================= */
// ================= FORGOT PASSWORD =================

const forgotBtn =
document.getElementById("forgotBtn");

forgotBtn.addEventListener("click", async (e) => {

  e.preventDefault();

  const studentId =
  document.getElementById("studentId")
  .value
  .trim();

  if(!studentId){

    alert("Enter Student ID first");
    return;
  }

  const email =
  studentId.includes("@")
  ? studentId
  : studentId + "@nssd58.com";

  try{

    await sendPasswordResetEmail(auth, email);

    alert(
      "Password reset email sent successfully ✅"
    );

  }catch(error){

    console.error(error);

    alert(
      "Account not found or email invalid ❌"
    );

  }

});