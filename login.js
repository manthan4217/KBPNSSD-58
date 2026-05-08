import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

  loginBtn.addEventListener("click", async () => {

    const studentId = document.getElementById("studentId").value.trim();
    const password = document.getElementById("password").value;

    const email =
      document.getElementById("studentId")
      .value
      .trim();

    try {

      await signInWithEmailAndPassword(auth, email, password);

      // ================= STEP 3 (DEVICE ID - IMPORTANT) =================
      if (!localStorage.getItem("deviceId")) {
        localStorage.setItem("deviceId", crypto.randomUUID());
      }

      // ================= REDIRECT =================
      if (email === "admin@nssd58.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (err) {
      document.getElementById("error").innerText = "Invalid login";
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