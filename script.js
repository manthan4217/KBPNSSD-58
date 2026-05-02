// navbar
window.addEventListener("scroll", function () {
  const navbar = document.getElementById("navbar");

  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

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