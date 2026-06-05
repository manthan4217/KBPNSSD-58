import {
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params =
new URLSearchParams(
 window.location.search
);

const activeSessionId =
params.get("session");