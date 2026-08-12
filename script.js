import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy
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

/* ================= UNIVERSAL GALLERY LIGHTBOX ================= */

const galleryImages = document.querySelectorAll(
  ".gallery-img, .gallery-item img"
);

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const closeBtn = document.querySelector(".close-btn");

/* OPEN IMAGE */

if(galleryImages.length && lightbox && lightboxImg){

  galleryImages.forEach(img => {

    img.addEventListener("click", () => {

      lightbox.classList.add("show");

      lightbox.style.display = "flex";

      lightboxImg.src = img.src;

      document.body.style.overflow = "hidden";

    });

  });

}

/* CLOSE FUNCTION */

function closeImage(){

  if(lightbox){

    lightbox.classList.remove("show");

    lightbox.style.display = "none";

  }

  document.body.style.overflow = "auto";

}

/* CLOSE BUTTON */

if(closeBtn){

  closeBtn.addEventListener("click", closeImage);

}

/* OUTSIDE CLICK */

if(lightbox){

  lightbox.addEventListener("click", function(e){

    if(e.target === lightbox){

      closeImage();

    }

  });

}

/* ESC KEY */

document.addEventListener("keydown", function(e){

  if(e.key === "Escape"){

    closeImage();

  }

});

document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.querySelector(".close-btn");
  const lightbox = document.getElementById("lightbox");

  if(closeBtn){

    closeBtn.addEventListener("click", () => {

      lightbox.style.display = "none";

    });

  }

  if(lightbox){

    lightbox.addEventListener("click", (e) => {

      if(e.target === lightbox){

        lightbox.style.display = "none";

      }

    });

  }

});

/* ================= LOAD MORE GALLERY ================= */

const toggleGalleryBtn = document.getElementById("toggleGalleryBtn");

const extraImages = document.querySelectorAll(".gallery-img.extra");

let galleryExpanded = false;

if(toggleGalleryBtn){

  toggleGalleryBtn.addEventListener("click", () => {

    galleryExpanded = !galleryExpanded;

    extraImages.forEach(img => {

      img.classList.toggle("hidden");

    });

    if(galleryExpanded){

      toggleGalleryBtn.innerHTML = "Show Less";

    }else{

      toggleGalleryBtn.innerHTML = "Load More";

    }

  });

}



const reveals = document.querySelectorAll('.reveal');

window.addEventListener('scroll',()=>{

  reveals.forEach(reveal=>{

    const top = reveal.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    if(top < windowHeight - 100){
      reveal.classList.add('active');
    }

  });

});


// form
/* ================= CONTACT FORM ================= */

const form = document.getElementById("contactForm");
const statusText = document.getElementById("form-status");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const submitBtnSpinner = document.getElementById("submitBtnSpinner");

if(form){

  const nameInput = document.getElementById("cf-name");
  const emailInput = document.getElementById("cf-email");
  const messageInput = document.getElementById("cf-message");

  const fields = [
    {
      input: nameInput,
      errorEl: document.getElementById("cf-name-error"),
      validate: (v) => v.trim().length >= 2,
      message: "Please enter your name (at least 2 characters)."
    },
    {
      input: emailInput,
      errorEl: document.getElementById("cf-email-error"),
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      message: "Please enter a valid email address."
    },
    {
      input: messageInput,
      errorEl: document.getElementById("cf-message-error"),
      validate: (v) => v.trim().length >= 10,
      message: "Message must be at least 10 characters."
    }
  ];

  function validateField(field){
    const isValid = field.validate(field.input.value);

    if(isValid){
      field.input.classList.remove("invalid");
      field.input.removeAttribute("aria-invalid");
      field.errorEl.textContent = "";
    }else{
      field.input.classList.add("invalid");
      field.input.setAttribute("aria-invalid", "true");
      field.errorEl.textContent = field.message;
    }

    return isValid;
  }

  // Validate as the user types/leaves a field
  fields.forEach(field => {
    field.input.addEventListener("blur", () => validateField(field));
    field.input.addEventListener("input", () => {
      if(field.input.classList.contains("invalid")) validateField(field);
    });
  });

  form.addEventListener("submit", async function(e){

    e.preventDefault();

    // Run all field validations and stop if anything is invalid
    const allValid = fields.map(validateField).every(Boolean);

    if(!allValid){
      statusText.innerHTML = "⚠️ Please fix the highlighted fields above.";
      statusText.style.color = "#b7950b";
      const firstInvalid = fields.find(f => f.input.classList.contains("invalid"));
      if(firstInvalid) firstInvalid.input.focus();
      return;
    }

    const formData = new FormData(form);

    // Loading state
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    submitBtnText.textContent = "Sending...";
    submitBtnSpinner.hidden = false;
    statusText.innerHTML = "";

    try{

      const response = await fetch(form.action,{
        method:"POST",
        body:formData,
        headers:{
          'Accept':'application/json'
        }
      });

      if(response.ok){

        statusText.innerHTML =
        "✅ Message sent successfully!";

        statusText.style.color = "#145c3a";

        form.reset();
        fields.forEach(field => {
          field.input.classList.remove("invalid");
          field.input.removeAttribute("aria-invalid");
          field.errorEl.textContent = "";
        });

      }else{

        statusText.innerHTML =
        "❌ Failed to send message. Please try again.";

        statusText.style.color = "red";
      }

    }catch(error){

      statusText.innerHTML =
      "❌ Network error. Please check your connection and try again.";

      statusText.style.color = "red";
    }

    // Reset loading state
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtnText.textContent = "Send Message";
    submitBtnSpinner.hidden = true;

  });

}


document.addEventListener("DOMContentLoaded", () => {

  const backBtn = document.getElementById("backHomeBtn");
  const heroSection = document.querySelector(".camp-banner");

  if(backBtn && heroSection){

    window.addEventListener("scroll", () => {

      const triggerPoint = heroSection.offsetHeight / 2;

      if(window.scrollY >= triggerPoint){

        backBtn.classList.add("show");

      } else {

        backBtn.classList.remove("show");

      }

    });

  }

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

// ================= LIGHTBOX =================

window.openImage = function(src){

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  if(lightbox && lightboxImg){

    lightbox.style.display = "flex";
    lightboxImg.src = src;

  }

};

document.addEventListener("DOMContentLoaded", () => {

  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.querySelector(".close-btn");

  if(closeBtn){

    closeBtn.addEventListener("click", () => {

      lightbox.style.display = "none";

    });

  }

  if(lightbox){

    lightbox.addEventListener("click", function(e){

      if(e.target === lightbox){

        lightbox.style.display = "none";

      }

    });

  }

});

// Load public Leadership and Site Config
async function loadPublicLeadership(){
  try{
    const leadershipGrid = document.getElementById('leadershipGrid');
    if(!leadershipGrid) return;
    leadershipGrid.innerHTML = '';
    const q = query(collection(db,'leadership'), where('isActive','==',true), orderBy('displayOrder','asc'));
    const snap = await getDocs(q);
    snap.forEach(s => {
      const d = s.data();
      const card = document.createElement('div');
      card.className = 'volunteer-card reveal';
      const photo = d.photoUrl ? `<img loading="lazy" src="${d.photoUrl}" alt="${(d.name||'Leader')}">` : '';
      card.innerHTML = `${photo}<h4>${d.name||''}</h4><span class="badge">${d.designation||''}</span><p>${d.bio||''}</p>`;
      leadershipGrid.appendChild(card);
    });
  }catch(err){ console.error('Failed to load leadership', err); }
}

async function loadPublicSiteConfig(){
  try{
    const statActivitiesEl = document.getElementById('statActivities');
    const statVolsEl = document.getElementById('statVols');
    const statYearsEl = document.getElementById('statYears');
    const statLivesEl = document.getElementById('statLives');
    if(statActivitiesEl){
      const actsSnap = await getDocs(collection(db,'activities'));
      statActivitiesEl.textContent = actsSnap.size + '+';
    }
    if(statVolsEl){
      const volsSnap = await getDocs(collection(db,'volunteers'));
      statVolsEl.textContent = volsSnap.size + '+';
    }
    // Load optionally stored statistics (years established, lives reached)
    const statsDoc = await getDoc(doc(db,'site_config','statistics'));
    if(statsDoc.exists()){
      const s = statsDoc.data();
      if(s.years && statYearsEl) statYearsEl.textContent = s.years;
      if(s.lives && statLivesEl) statLivesEl.textContent = s.lives;
    }
  }catch(err){ console.error('Failed to load site config', err); }
}

// Run public loaders
window.addEventListener('DOMContentLoaded', ()=>{
  loadPublicLeadership();
  loadPublicSiteConfig();
});