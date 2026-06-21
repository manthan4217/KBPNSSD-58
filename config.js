// ================================================================
// SITE CONFIG — single source of truth for site-wide contact info
// Change the phone/email ONCE here and every page that includes
// this script + uses data-contact="..." markers stays in sync.
// ================================================================

export const SITE_CONFIG = {
  phone: "+91 79727 59261",
  phoneHref: "+917972759261",   // digits-only, used for tel: links
  email: "kbp.nssunit@gmail.com"
};

export function applyContactInfo(){

  document.querySelectorAll('[data-contact="phone"]').forEach(el => {
    el.textContent = SITE_CONFIG.phone;
    if(el.tagName === "A"){
      el.href = `tel:${SITE_CONFIG.phoneHref}`;
    }
  });

  document.querySelectorAll('[data-contact="email"]').forEach(el => {
    el.textContent = SITE_CONFIG.email;
    if(el.tagName === "A"){
      el.href = `mailto:${SITE_CONFIG.email}`;
    }
  });

}

document.addEventListener("DOMContentLoaded", applyContactInfo);