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
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  nav.classList.toggle("active");
}

// gallery 
// WAIT FOR PAGE LOAD
window.onload = function(){

  // ===== TOGGLE BUTTON =====
  let expanded = false;
  const btn = document.getElementById("toggleGalleryBtn");

  btn.addEventListener("click", function(){

    const extraImages = document.querySelectorAll(".gallery-img.extra");

    if(!expanded){
      extraImages.forEach(img => img.classList.remove("hidden"));
      btn.textContent = "Show Less";
      expanded = true;
    } else {
      extraImages.forEach(img => img.classList.add("hidden"));
      btn.textContent = "Load More";
      expanded = false;

      document.getElementById("gallery").scrollIntoView({behavior:"smooth"});
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
