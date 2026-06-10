/**
 * NSS D-58 — Feedback Widget
 * Drop ONE <script> tag at the bottom of any page before </body>:
 *
 *   <script src="feedback-widget.js" type="module"></script>
 *
 * Writes to Firestore collection: "feedback"
 * Each document: { type, message, page, userAgent, timestamp, status:"new" }
 * Admin reads it in the new "Feedback" tab in admin.html
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ── Firebase (reuse existing app if already initialized) ────────── */
import { db } from "./firebase.js";

const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
const db  = getFirestore(app);

/* ── Categories shown in the drawer ─────────────────────────────── */
const TYPES = [
  { id: "idea",    icon: "💡", label: "Share an idea"    },
  { id: "bug",     icon: "🐛", label: "Report a problem" },
  { id: "praise",  icon: "⭐", label: "Something I love" },
  { id: "other",   icon: "💬", label: "Other"            },
];

/* ── Inject styles ───────────────────────────────────────────────── */
const CSS = `
  #nss-fb-root * { box-sizing: border-box; margin: 0; padding: 0; }

  /* FAB trigger */
  #nss-fb-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9998;
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: #145c3a;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 24px rgba(20,92,58,0.45), 0 2px 8px rgba(0,0,0,0.2);
    transition: transform .22s ease, box-shadow .22s ease;
    font-size: 22px;
    line-height: 1;
  }
  #nss-fb-fab:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 10px 32px rgba(20,92,58,0.55), 0 2px 8px rgba(0,0,0,0.2);
  }
  #nss-fb-fab:active { transform: scale(0.96); }

  /* Pulse ring on FAB */
  #nss-fb-fab::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 20px;
    border: 2px solid rgba(20,92,58,0.4);
    animation: nss-fab-ring 2.8s ease-out infinite;
  }
  @keyframes nss-fab-ring {
    0%   { transform: scale(1);   opacity: .7; }
    70%  { transform: scale(1.25); opacity: 0; }
    100% { transform: scale(1.25); opacity: 0; }
  }

  /* Tooltip */
  #nss-fb-tooltip {
    position: fixed;
    bottom: 34px;
    right: 90px;
    z-index: 9997;
    background: #0f172a;
    color: #fff;
    font-family: 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 8px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translateX(6px);
    transition: opacity .2s, transform .2s;
  }
  #nss-fb-tooltip.show {
    opacity: 1;
    transform: translateX(0);
  }
  #nss-fb-tooltip::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right: none;
    border-left-color: #0f172a;
  }

  /* Backdrop */
  #nss-fb-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s ease;
  }
  #nss-fb-backdrop.open {
    opacity: 1;
    pointer-events: all;
  }

  /* Drawer panel */
  #nss-fb-drawer {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 9999;
    width: 380px;
    max-width: 100vw;
    max-height: 90vh;
    background: #ffffff;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: translateY(100%);
    transition: transform .32s cubic-bezier(.32,.72,0,1);
    font-family: 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif;
  }
  @media (min-width: 480px) {
    #nss-fb-drawer {
      bottom: 28px;
      right: 28px;
      border-radius: 20px;
      max-height: 82vh;
    }
  }
  #nss-fb-drawer.open { transform: translateY(0); }

  /* Drawer header */
  .nss-fb-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 14px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
  }
  .nss-fb-hdr-left { display: flex; align-items: center; gap: 10px; }
  .nss-fb-hdr-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: #145c3a;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .nss-fb-hdr-title {
    font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.2;
  }
  .nss-fb-hdr-sub {
    font-size: 10px; color: #94a3b8; font-weight: 400;
  }
  .nss-fb-close {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: #f1f5f9;
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; color: #64748b;
    transition: background .15s;
    flex-shrink: 0;
  }
  .nss-fb-close:hover { background: #e2e8f0; }

  /* Body */
  .nss-fb-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Step label */
  .nss-fb-step-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: -8px;
  }

  /* Type grid */
  .nss-fb-type-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .nss-fb-type-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    font-family: inherit;
    transition: border-color .15s, background .15s, box-shadow .15s;
    text-align: left;
  }
  .nss-fb-type-btn:hover {
    border-color: #145c3a;
    background: #f0faf5;
  }
  .nss-fb-type-btn.selected {
    border-color: #145c3a;
    background: #f0faf5;
    box-shadow: 0 0 0 3px rgba(20,92,58,0.1);
    color: #145c3a;
    font-weight: 600;
  }
  .nss-fb-type-icon { font-size: 18px; flex-shrink: 0; }

  /* Textarea */
  .nss-fb-textarea {
    width: 100%;
    min-height: 110px;
    resize: vertical;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    font-size: 13px;
    font-family: inherit;
    color: #0f172a;
    line-height: 1.6;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .nss-fb-textarea:focus {
    border-color: #145c3a;
    box-shadow: 0 0 0 3px rgba(20,92,58,0.1);
    background: #fff;
  }
  .nss-fb-textarea::placeholder { color: #94a3b8; }

  /* Char counter */
  .nss-fb-char {
    font-size: 11px;
    color: #94a3b8;
    text-align: right;
    margin-top: -10px;
  }
  .nss-fb-char.warn { color: #f59e0b; }
  .nss-fb-char.over { color: #ef4444; }

  /* Name field */
  .nss-fb-name-wrap { display: flex; flex-direction: column; gap: 5px; }
  .nss-fb-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .nss-fb-input {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    font-size: 13px;
    font-family: inherit;
    color: #0f172a;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .nss-fb-input:focus {
    border-color: #145c3a;
    box-shadow: 0 0 0 3px rgba(20,92,58,0.1);
    background: #fff;
  }
  .nss-fb-input::placeholder { color: #94a3b8; }

  /* Error */
  .nss-fb-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    color: #dc2626;
    display: none;
  }
  .nss-fb-error.show { display: block; }

  /* Footer */
  .nss-fb-footer {
    padding: 14px 20px 20px;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
  }
  .nss-fb-submit {
    width: 100%;
    padding: 13px;
    border-radius: 10px;
    border: none;
    background: #145c3a;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity .2s, transform .15s;
  }
  .nss-fb-submit:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
  .nss-fb-submit:active { transform: scale(.98); }
  .nss-fb-submit:disabled { opacity: .55; cursor: not-allowed; transform: none; }

  /* Spinner inside button */
  .nss-fb-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: nss-spin .7s linear infinite;
    display: none;
  }
  @keyframes nss-spin { to { transform: rotate(360deg); } }
  .nss-fb-submit.loading .nss-fb-spinner { display: block; }
  .nss-fb-submit.loading .nss-fb-btn-label { display: none; }

  /* Success state */
  .nss-fb-success {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 36px 24px;
    gap: 12px;
  }
  .nss-fb-success.show { display: flex; }
  .nss-fb-success-icon {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: #d1fae5;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    animation: nss-pop .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes nss-pop {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .nss-fb-success h3 { font-size: 16px; font-weight: 700; color: #0f172a; }
  .nss-fb-success p  { font-size: 13px; color: #64748b; line-height: 1.6; max-width: 260px; }
  .nss-fb-done-btn {
    margin-top: 8px;
    padding: 10px 28px;
    border-radius: 50px;
    border: none;
    background: #145c3a;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: opacity .2s;
  }
  .nss-fb-done-btn:hover { opacity: .85; }

  /* Page tag at bottom */
  .nss-fb-page-tag {
    font-size: 10px;
    color: #cbd5e1;
    text-align: center;
    padding-top: 6px;
  }
`;

const MAX_CHARS = 400;

/* ── Build DOM ───────────────────────────────────────────────────── */
function buildWidget() {
  const root = document.createElement("div");
  root.id = "nss-fb-root";

  const styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  root.appendChild(styleEl);

  /* Tooltip */
  const tooltip = document.createElement("div");
  tooltip.id = "nss-fb-tooltip";
  tooltip.textContent = "Feedback / Ideas";
  root.appendChild(tooltip);

  /* FAB */
  const fab = document.createElement("button");
  fab.id = "nss-fb-fab";
  fab.setAttribute("aria-label", "Open feedback");
  fab.setAttribute("aria-expanded", "false");
  fab.textContent = "💬";
  root.appendChild(fab);

  /* Backdrop */
  const backdrop = document.createElement("div");
  backdrop.id = "nss-fb-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  root.appendChild(backdrop);

  /* Drawer */
  const drawer = document.createElement("div");
  drawer.id = "nss-fb-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-label", "Send feedback");

  drawer.innerHTML = `
    <!-- Header -->
    <div class="nss-fb-hdr">
      <div class="nss-fb-hdr-left">
        <div class="nss-fb-hdr-icon">💬</div>
        <div>
          <div class="nss-fb-hdr-title">Feedback &amp; Ideas</div>
          <div class="nss-fb-hdr-sub">NSS D-58 · KBP College, Vashi</div>
        </div>
      </div>
      <button class="nss-fb-close" id="nss-fb-close-btn" aria-label="Close feedback">✕</button>
    </div>

    <!-- Scrollable body -->
    <div class="nss-fb-body" id="nss-fb-body">

      <!-- Step 1: type -->
      <div class="nss-fb-step-label">What kind of feedback is this?</div>
      <div class="nss-fb-type-grid" role="group" aria-label="Feedback type">
        ${TYPES.map(t => `
          <button class="nss-fb-type-btn" data-type="${t.id}" aria-pressed="false">
            <span class="nss-fb-type-icon" aria-hidden="true">${t.icon}</span>
            <span>${t.label}</span>
          </button>
        `).join("")}
      </div>

      <!-- Step 2: message -->
      <div class="nss-fb-step-label">Tell us more</div>
      <textarea
        class="nss-fb-textarea"
        id="nss-fb-msg"
        placeholder="Describe your idea or issue in detail… The more specific, the better!"
        maxlength="${MAX_CHARS}"
        aria-label="Feedback message"
      ></textarea>
      <div class="nss-fb-char" id="nss-fb-char">0 / ${MAX_CHARS}</div>

      <!-- Step 3: name (optional) -->
      <div class="nss-fb-name-wrap">
        <label class="nss-fb-label" for="nss-fb-name">Your name (optional)</label>
        <input
          class="nss-fb-input"
          id="nss-fb-name"
          type="text"
          placeholder="e.g. Manthan R."
          maxlength="60"
          autocomplete="name"
        />
      </div>

      <!-- Error message -->
      <div class="nss-fb-error" id="nss-fb-error" role="alert"></div>

      <!-- Page tag -->
      <div class="nss-fb-page-tag" id="nss-fb-page-tag"></div>
    </div>

    <!-- Success screen (hidden until sent) -->
    <div class="nss-fb-success" id="nss-fb-success" aria-live="polite">
      <div class="nss-fb-success-icon">✅</div>
      <h3>Thank you!</h3>
      <p>Your feedback has been sent to the developer. We'll review it and use it to make the portal better.</p>
      <button class="nss-fb-done-btn" id="nss-fb-done-btn">Close</button>
    </div>

    <!-- Footer with submit -->
    <div class="nss-fb-footer" id="nss-fb-footer">
      <button class="nss-fb-submit" id="nss-fb-submit" aria-label="Send feedback">
        <span class="nss-fb-spinner" aria-hidden="true"></span>
        <span class="nss-fb-btn-label">Send Feedback ✈️</span>
      </button>
    </div>
  `;

  root.appendChild(drawer);
  document.body.appendChild(root);
  return { fab, backdrop, drawer, tooltip };
}

/* ── Logic ───────────────────────────────────────────────────────── */
function init() {
  const { fab, backdrop, drawer, tooltip } = buildWidget();

  let isOpen     = false;
  let selectedType = null;

  /* helpers */
  const $  = (id) => document.getElementById(id);
  const open  = () => {
    isOpen = true;
    fab.setAttribute("aria-expanded", "true");
    backdrop.classList.add("open");
    drawer.classList.add("open");
    $("nss-fb-msg").focus();
  };
  const close = () => {
    isOpen = false;
    fab.setAttribute("aria-expanded", "false");
    backdrop.classList.remove("open");
    drawer.classList.remove("open");
  };

  /* FAB */
  fab.addEventListener("click", () => isOpen ? close() : open());

  /* Tooltip */
  fab.addEventListener("mouseenter", () => tooltip.classList.add("show"));
  fab.addEventListener("mouseleave", () => tooltip.classList.remove("show"));

  /* Close */
  $("nss-fb-close-btn").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) close(); });

  /* Page tag */
  $("nss-fb-page-tag").textContent = "📄 " + (document.title || window.location.pathname);

  /* Type selection */
  drawer.querySelectorAll(".nss-fb-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      drawer.querySelectorAll(".nss-fb-type-btn").forEach(b => {
        b.classList.remove("selected");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("selected");
      btn.setAttribute("aria-pressed", "true");
      selectedType = btn.dataset.type;
      hideError();
    });
  });

  /* Char counter */
  $("nss-fb-msg").addEventListener("input", () => {
    const len = $("nss-fb-msg").value.length;
    const el  = $("nss-fb-char");
    el.textContent = `${len} / ${MAX_CHARS}`;
    el.className = "nss-fb-char" +
      (len >= MAX_CHARS ? " over" : len > MAX_CHARS * 0.85 ? " warn" : "");
    hideError();
  });

  /* Error helpers */
  const showError = (msg) => {
    const el = $("nss-fb-error");
    el.textContent = msg;
    el.classList.add("show");
  };
  const hideError = () => $("nss-fb-error").classList.remove("show");

  /* Submit */
  $("nss-fb-submit").addEventListener("click", async () => {
    const msg  = $("nss-fb-msg").value.trim();
    const name = $("nss-fb-name").value.trim();
    const btn  = $("nss-fb-submit");

    /* Validate */
    if (!selectedType) { showError("Please select a feedback type first."); return; }
    if (msg.length < 10) { showError("Please write at least 10 characters so we understand the issue."); return; }

    /* Loading state */
    btn.disabled = true;
    btn.classList.add("loading");
    hideError();

    try {
      await addDoc(collection(db, "feedback"), {
        type:      selectedType,
        message:   msg,
        name:      name || "Anonymous",
        page:      window.location.href,
        pageTitle: document.title || "",
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        status:    "new",   /* admin can mark as "reviewed" */
      });

      /* Show success */
      $("nss-fb-body").style.display   = "none";
      $("nss-fb-footer").style.display = "none";
      $("nss-fb-success").classList.add("show");

    } catch (err) {
      console.error("[NSS Feedback] Firestore write failed:", err);
      showError("Could not send feedback right now. Please try again in a moment.");
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });

  /* Done button resets the form */
  $("nss-fb-done-btn").addEventListener("click", () => {
    /* reset */
    selectedType = null;
    $("nss-fb-msg").value = "";
    $("nss-fb-name").value = "";
    $("nss-fb-char").textContent = `0 / ${MAX_CHARS}`;
    $("nss-fb-char").className = "nss-fb-char";
    drawer.querySelectorAll(".nss-fb-type-btn").forEach(b => {
      b.classList.remove("selected");
      b.setAttribute("aria-pressed", "false");
    });
    $("nss-fb-body").style.display   = "";
    $("nss-fb-footer").style.display = "";
    $("nss-fb-success").classList.remove("show");
    hideError();
    close();
  });
}

/* Run after DOM ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}