import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// navbar
window.addEventListener("scroll", function () {
  const navbar = document.getElementById("navbar");

  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// NAVBAR MENU BUTTON
function toggleMenu(){
  const navLinks = document.getElementById("navLinks");
  navLinks.classList.toggle("show");
}

// auto close on link click
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("navLinks").classList.remove("show");
  });
});

// gallery 
// WAIT FOR PAGE LOAD
window.onload = function () {

  let expanded = false;

  const btn = document.getElementById("toggleGalleryBtn");

  // ❗ IMPORTANT SAFETY CHECK
  if (!btn) {
    console.warn("toggleGalleryBtn not found on this page");
    return;
  }

  btn.addEventListener("click", function () {

    const extraImages = document.querySelectorAll(".gallery-img.extra");

    if (!expanded) {
      extraImages.forEach(img => img.classList.remove("hidden"));
      btn.textContent = "Show Less";
      expanded = true;
    } else {
      extraImages.forEach(img => img.classList.add("hidden"));
      btn.textContent = "Load More";
      expanded = false;

      document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
    }

  });

};

// ===== LIGHTBOX FUNCTIONS =====
function openImage(src){
  document.getElementById("lightbox").style.display = "flex";
  document.getElementById("lightbox-img").src = src;
}

function closeImage(){
  document.getElementById("lightbox").style.display = "none";
}

// form
const form = document.querySelector("form");
const status = document.getElementById("form-status");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);

    status.innerHTML = "⏳ Sending...";

    fetch(form.action, {
      method: form.method,
      body: data,
      headers: {
        'Accept': 'application/json'
      }
    }).then(response => {
      if (response.ok) {
        status.innerHTML = "✅ Message sent successfully!";
        form.reset();
      } else {
        status.innerHTML = "❌ Oops! Something went wrong.";
      }
    }).catch(() => {
      status.innerHTML = "❌ Network error!";
    });
  });
}

// back to home button
document.addEventListener("DOMContentLoaded", function () {

  const hero = document.querySelector(".camp-banner");
  const backBtn = document.getElementById("backHomeBtn");

  if (!hero || !backBtn) return;

  function handleScroll() {
    const trigger = hero.offsetHeight * 0.5;

    if (window.scrollY > trigger) {
      backBtn.classList.add("show");
    } else {
      backBtn.classList.remove("show");
    }
  }

  window.addEventListener("scroll", handleScroll);
});

//join nss passport size photo
// WAIT FOR PAGE LOAD
document.addEventListener("DOMContentLoaded", function () {

  const agreeBtn = document.getElementById("agreeBtn");

  if (!agreeBtn) {
    console.warn("agreeBtn not found (this page is not join page)");
    return;
  }

  agreeBtn.addEventListener("click", function () {

    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step1Ind = document.getElementById("step1-ind");
    const step2Ind = document.getElementById("step2-ind");

    if (step1) step1.classList.remove("active");
    if (step2) step2.classList.add("active");

    if (step1Ind) step1Ind.classList.remove("active");
    if (step2Ind) step2Ind.classList.add("active");

  });

  // AUTO LOGIN ID
  const studentId = document.getElementById("studentId");
  const loginId = document.getElementById("loginId");

  if(studentId && loginId){
    studentId.addEventListener("input", function(){
      loginId.value = studentId.value
        ? studentId.value + "@nssd58.com"
        : "";
    });
  }

  // FORM
  const form = document.getElementById("nssForm");

  if(form){
    form.addEventListener("submit", async function(e){
      e.preventDefault();

      const pass = document.getElementById("password")?.value;
      const confirm = document.getElementById("confirmPassword")?.value;

      if(pass !== confirm){
        alert("Passwords do not match!");
        return;
      }

      const data = {
        fullName: document.getElementById("fullName").value,
        className: document.getElementById("class").value,
        rollNo: document.getElementById("rollNo").value,
        studentId: document.getElementById("studentId").value,
        loginId: document.getElementById("loginId").value,
        address: document.getElementById("address").value,
        contact: document.getElementById("contact").value,
        email: document.getElementById("email").value,
        bloodGroup: document.getElementById("bloodGroup").value,
        dob: document.getElementById("dob").value,
        age: document.getElementById("age").value,
        caste: document.getElementById("caste").value
      };

      try {

        const email = document.getElementById("studentId").value + "@nssd58.com";
        const password = document.getElementById("password").value;

        // CREATE AUTH USER
        await createUserWithEmailAndPassword(auth, email, password);

        // SAVE TO FIRESTORE
        await setDoc(doc(db, "volunteers", data.studentId), data);

        alert("Registration Successful ✅");

        // STEP CHANGE
        const step2 = document.getElementById("step2");
        const step3 = document.getElementById("step3");

        if(step2) step2.classList.remove("active");
        if(step3) step3.classList.add("active");

      } catch (error) {
        console.error(error);
        alert(error.message);
      }

    });
  }

});

