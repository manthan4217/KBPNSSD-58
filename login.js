import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

  loginBtn.addEventListener("click", async () => {

    const studentId = document.getElementById("studentId").value.trim();
    const password = document.getElementById("password").value;

    let email = studentId.includes("@")
      ? studentId
      : studentId + "@nssd58.com";

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