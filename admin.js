import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  orderBy,   // ← add this
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { db, auth } from "./firebase.js";

// YOUR FIREBASE CONFIG

// INIT

onAuthStateChanged(auth, async (user) => {

   if (!user) {
      window.location.href = "login.html";
      return;
   }

   const adminEmail = "admin@nssd58.com";

   if (user.email !== adminEmail) {
      window.location.href = "dashboard.html";
      return;
   }

   // Load all admin data
   await loadActivities();
   await loadVolunteers();
   await loadMarks();

   const [attCache, actCache] = await Promise.all([
      getDocs(collection(db, "attendanceRecords")),
      getDocs(collection(db, "activities"))
   ]);
   cachedAttendanceRecords = attCache.docs.map(d => d.data());
   cachedTotalActivities = actCache.size;

   renderDashboard();
});

let currentAttendanceActivityId = null;
/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
let vols = [];
function loadVolunteers(){

  onSnapshot(collection(db,"volunteers"), (snapshot)=>{

    vols = [];

    snapshot.forEach((docSnap)=>{

      const data = docSnap.data();

      vols.push({
        firebaseId: docSnap.id,
        uid: data.uid || '',
        fullName: data.fullName || '',
        studentId: data.studentId || '',
        className: data.className || '',
        division: data.division || '',
        gender: data.gender || '',
        contact: data.contact || '',
        email: data.email || '',
        bloodGroup: data.bloodGroup || '',
        address: data.address || '',
        photoURL: data.photoURL || '',
        age: data.age || '',
        caste: data.caste || '',
        dob: data.dob || ''
      });

    });

    renderVolunteers();
    renderDashboard();
    populateVolSelect();

  }, (err)=>{

    console.error("Firebase Volunteer Error:", err);

    showToast('Failed to load volunteers','error');

  });

}

// calculate attendance percentage automatically
async function calculateAttendance(studentId){

  try{

    // TOTAL ACTIVITIES
    const actSnap = await getDocs(
      collection(db,"activities")
    );

    const totalActivities = actSnap.size;

    // TOTAL ATTENDANCE RECORDS
    const attSnap = await getDocs(
      collection(db,"attendanceRecords")
    );

    let attended = 0;

    attSnap.forEach(docSnap=>{

      const data = docSnap.data();

      if(data.studentId === studentId){
        attended++;
      }

    });

    // PERCENTAGE
    let percentage = 0;

    if(totalActivities > 0){

      percentage = Math.round(
        (attended / totalActivities) * 100
      );

    }

    return {
      attended,
      totalActivities,
      percentage
    };

  }
  catch(err){
    console.error("Attendance Error:", err);
    alert(err.message);
  }

}

let acts = [
   
];

let marks = [];

function loadMarks(){

  onSnapshot(

    collection(db,"marks"),

    (snapshot)=>{

      marks = [];

      snapshot.forEach((docSnap)=>{

        marks.push({
          id: docSnap.id,
          ...docSnap.data()
        });

      });

      renderMarksTable();

    },

    (err)=>{

      console.error(err);

      showToast('Failed to load marks','error');

    }

  );

}

let selVols=[], sortKey="name", sortDir="asc";
let attStep=1, sessionOn=false, sessionDone=false, presentList=[];
let currentSessionId = null;
let expiryTimer = null;
let attendanceUnsubscribe = null;

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */
const tabLabels={dashboard:"Dashboard",activities:"Activities",attendance:"Attendance",volunteers:"Volunteers",marks:"Marks",settings:"Settings"};
function switchTab(t){

  document.querySelectorAll('.tab')
    .forEach(el=>el.classList.remove('active'));

  document.querySelectorAll('.nav-btn')
    .forEach(el=>el.classList.remove('active'));

  const tab =
    document.getElementById('tab-' + t);

  const btn =
    document.querySelector(`[data-tab="${t}"]`);

  if(tab)
    tab.classList.add('active');

  if(btn)
    btn.classList.add('active');

  document.getElementById('hdrTitle').textContent =
    tabLabels[t] || 'Dashboard';

  if(t==='dashboard') renderDashboard();
  if(t==='activities') renderActivities();
  if(t==='attendance') renderAttendanceSelects();
  if(t==='volunteers') renderVolunteers();
  if(t==='marks'){
    populateVolSelect();
    renderMarksTable();
  }
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR COLLAPSE
═══════════════════════════════════════════════════════════════ */
document.getElementById('collapseBtn').addEventListener('click',()=>{
  const sb=document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  document.getElementById('collapseArrow').textContent=sb.classList.contains('collapsed')?'▶':'◀';
});

// ═══════════════════════════════════════════════
// SECURITY — sanitize all Firestore data before
// injecting into innerHTML to prevent XSS attacks
// ═══════════════════════════════════════════════
function esc(str) {
  if (!str) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
function showToast(msg,type='success'){
  const c=document.getElementById('toast-container');
  const d=document.createElement('div');
  const icon={success:'✅',error:'❌',warning:'⚠️'}[type]||'✅';
  d.className=`toast toast-${type}`;
  d.textContent=icon+' '+msg;
  c.appendChild(d);
  setTimeout(()=>d.remove(),3400);
}

/* ═══════════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════════ */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
window.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.remove('open');});

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function pill(text,cls){return`<span class="pill ${cls}">${text}</span>`;}
function avg(arr,key){return arr.length?Math.round(arr.reduce((s,v)=>s+v[key],0)/arr.length):0;}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */
function renderDashboard(){
  const avgAtt=avg(vols,'att');
  const cardData=[
    {icon:'👥',label:'Total Volunteers',val:vols.length,trend:'+2 this month',color:'#2563eb'},
    {icon:'📅',label:'Total Activities', val:acts.length, trend:'+1 new',        color:'#10b981'},
    {icon:'📈',label:'Avg Attendance',   val:avgAtt+'%',  trend:'↑ 3% vs last',  color:'#8b5cf6'},
    {icon:'📝',label:'Marks Assigned',   val:marks.length,trend:`of ${vols.length}`,color:'#f59e0b'},
  ];
  document.getElementById('dash-cards').innerHTML=cardData.map(c=>`
    <div class="card">
      <div class="card-top">
        <span class="card-icon">${c.icon}</span>
        <span class="pill" style="background:${c.color}22;color:${c.color}">${c.trend}</span>
      </div>
      <div class="card-val">${c.val}</div>
      <div class="card-lbl">${c.label}</div>
    </div>`).join('');

  const recent=[...acts].sort((a,b)=>b.id-a.id).slice(0,5);
  document.getElementById('dash-recent').innerHTML=recent.map(a=>`
    <tr>
      <td style="font-weight:500;">${esc(a.name)}</td>
      <td style="color:#64748b;">${esc(a.date)}</td>
      <td>${pill(a.status,a.status==='Completed'?'pill-green':'pill-amber')}</td>
    </tr>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITIES
═══════════════════════════════════════════════════════════════ */
let actFormOpen=false;
function toggleActForm(){
  actFormOpen=!actFormOpen;
  document.getElementById('actForm').style.display=actFormOpen?'block':'none';
  document.getElementById('newActBtn').textContent=actFormOpen?'✕ Cancel':'+ New Activity';
  document.getElementById('newActBtn').className='btn '+(actFormOpen?'btn-outline':'btn-blue');
}
function renderActivities(){
  const q=document.getElementById('actSearch').value.toLowerCase();
  const filtered=acts.filter(a=>a.name.toLowerCase().includes(q)||a.date.includes(q));
  const list=document.getElementById('act-list');
  if(!filtered.length){list.innerHTML='<div class="empty"><div class="empty-icon">📅</div><p>No activities match your search.</p></div>';return;}
  list.innerHTML=filtered.map(a=>`
    <div class="act-card">
      <div class="act-card-body">
        <div class="act-pills">
          <span class="act-name">${esc(a.name)}</span>
          ${pill(a.status,a.status==='Completed'?'pill-green':'pill-amber')}
          ${pill('📅 '+esc(a.date),'pill-blue')}
        </div>
        <div class="act-desc">${esc(a.desc)}</div>
      </div>
      <div class="act-actions">
        <button
          class="btn-xs"
          style="background:#eff6ff;color:#2563eb;font-weight:600;"
          onclick="goAttendance('${a.id}')"
        >
          ✅ Attendance
        </button>

        <button
          class="btn-xs"
          style="background:#fee2e2;color:#ef4444;"
          onclick="deleteAct('${a.id}')"
        >
          🗑️
        </button>

        <button
        class="btn-xs"
        style="
        background:#dcfce7;
        color:#15803d;
        "
        onclick="viewAttendance('${a.id}')"
        >
        📋 View Attendance
        </button>
      </div>
    </div>`).join('');
}
/* ═══════════════════════════════════════════════════════════════
   Attendance Modal
═══════════════════════════════════/==================== */

async function viewAttendance(activityId){

  currentAttendanceActivityId = activityId;

  openModal('attendanceModal');

  const content =
  document.getElementById(
    'attendanceModalContent'
  );

  content.innerHTML =
  "Loading attendance...";

  try{

    const activity =
      acts.find(
        a => a.id === activityId
      );

    if(!activity){

      content.innerHTML =
      "Activity not found";

      return;
    }

    const sessionQuery =
      query(
        collection(db,"attendanceSessions"),
        where(
          "activityId",
          "==",
          activityId
        )
      );

    const sessionSnap =
      await getDocs(sessionQuery);

    if(sessionSnap.empty){

      content.innerHTML =
      "No attendance found.";

      return;
    }

    let maleCount = 0;
    let femaleCount = 0;
    let totalCount = 0;
    let sr = 1;

    let html = `

    <div class="attendance-preview">

      <h2>
        Karmaveer Bhaurao Patil College, Vashi
      </h2>

      <h3>
        National Service Scheme Unit D-58
      </h3>

      <hr>

      <p>
        <b>Activity:</b>
        ${esc(activity.name)}
      </p>

      <p>
        <b>Date:</b>
        ${esc(activity.date)}
      </p>

      <p>
        <b>Venue:</b>
        ${esc(activity.venue) || '-'}
      </p>

      <p>
        <b>Time:</b>
        ${esc(activity.timeFrom) || '-'}
        to
        ${esc(activity.timeTo) || '-'}
      </p>

      <p>
        <b>Total Hours:</b>
        ${esc(activity.totalHours) || '-'}
      </p>

      <table class="attendance-table">

        <thead>

          <tr>

            <th>Sr</th>

            <th>Name of Volunteer</th>

            <th>Class</th>

            <th>Div</th>

            <th>Gender</th>

          </tr>

        </thead>

        <tbody>
    `;

    for(const sessionDoc of sessionSnap.docs){

      const attendanceQuery =
        query(
          collection(db,"attendanceRecords"),
          where(
            "sessionId",
            "==",
            sessionDoc.id
          )
        );

      const attendanceSnap =
        await getDocs(attendanceQuery);

      attendanceSnap.forEach(docSnap=>{

        const data =
          docSnap.data();

        const volunteer =
          vols.find(
            v =>
            v.studentId === data.studentId
          );

        const gender =
          (volunteer?.gender || '').toLowerCase();

        if(gender === "male")
          maleCount++;

        if(gender === "female")
          femaleCount++;

        totalCount++;

        html += `

        <tr>

          <td>${sr++}</td>

          <td>
            ${esc(volunteer?.fullName || data.studentName)}
          </td>

          <td>
            ${esc(volunteer?.className) || '-'}
          </td>

          <td>
            ${esc(volunteer?.division) || '-'}
          </td>

          <td>
            ${esc(volunteer?.gender) || '-'}
          </td>

        </tr>

        `;

      });

    }

    html += `

        </tbody>

      </table>

      <div style="
        margin-top:20px;
        display:flex;
        gap:20px;
        flex-wrap:wrap;
      ">

        <span class="pill pill-blue">
          Male: ${maleCount}
        </span>

        <span class="pill pill-green">
          Female: ${femaleCount}
        </span>

        <span class="pill">
          Total: ${totalCount}
        </span>

      </div>

      <div class="signatures">

        <div>
          ____________________
          <br>
          NSS Programme Officer
        </div>

        <div>
          ____________________
          <br>
          NSS Leader
        </div>

      </div>

    </div>

    `;

    content.innerHTML = html;

  }
  catch(err){

    console.error(err);

    content.innerHTML =
    "Failed to load attendance";

  }

}

/*--attendance export modal---*/
async function exportAttendanceSheet(){

  try{

    if(!currentAttendanceActivityId){

      showToast(
        "Open attendance first",
        "error"
      );

      return;
    }

    const activity =
      acts.find(
        a => a.id === currentAttendanceActivityId
      );

    if(!activity){

      showToast(
        "Activity not found",
        "error"
      );

      return;
    }

    // FIND SESSION

    const sessionQuery =
      query(
        collection(db,"attendanceSessions"),
        where(
          "activityId",
          "==",
          currentAttendanceActivityId
        )
      );

    const sessionSnap =
      await getDocs(sessionQuery);

    let volunteersData = [];

    for(const sessionDoc of sessionSnap.docs){

      const attendanceQuery =
        query(
          collection(db,"attendanceRecords"),
          where(
            "sessionId",
            "==",
            sessionDoc.id
          )
        );

      const attendanceSnap =
        await getDocs(attendanceQuery);

      attendanceSnap.forEach(docSnap=>{

        volunteersData.push(
          docSnap.data()
        );

      });

    }

    let maleCount = 0;
    let femaleCount = 0;

    const rows = [];

    let sr = 1;

    for(const record of volunteersData){

      const volunteer =
        vols.find(
          v => v.studentId === record.studentId
        );

      const gender =
        volunteer?.gender || '';

      if(gender === 'Male')
        maleCount++;

      if(gender === 'Female')
        femaleCount++;

      rows.push([
        sr++,
        volunteer?.fullName || record.studentName,
        volunteer?.className || '',
        volunteer?.division || '',
        volunteer?.gender || ''
      ]);

    }

    const totalCount =
      volunteersData.length;

    const sheetData = [

      ['College File No: D-58'],
      ['Karmaveer Bhaurao Patil College, Vashi'],
      ['NSS Unit'],
      ['Attendance of NSS Volunteers'],
      [],

      [
        'Name Of the Project Activity',
        activity.name
      ],

      [
        'Date',
        activity.date
      ],

      [
        'Venue',
        activity.venue || ''
      ],

      [
        'Time',
        `From ${activity.timeFrom || ''} To ${activity.timeTo || ''}`
      ],

      [
        'Total Hours',
        activity.totalHours || ''
      ],

      [],

      [
        'Male',
        maleCount
      ],

      [
        'Female',
        femaleCount
      ],

      [
        'Total',
        totalCount
      ],

      [],

      [
        'Sr.No',
        'Name of Volunteer',
        'Class',
        'Div',
        'Signature'
      ],

      ...rows,

      [],

      [],

      [
        '',
        '',
        'Sign of NSS Program Officer'
      ],

      [
        '',
        '',
        'Sign NSS Leader'
      ]

    ];

    const ws =
      XLSX.utils.aoa_to_sheet(
        sheetData
      );

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Attendance'
    );

    XLSX.writeFile(
      wb,
      `${activity.name}-Attendance.xlsx`
    );

    showToast(
      'Attendance Sheet Exported'
    );

  }
  catch(err){

    console.error(err);

    showToast(
      'Export failed',
      'error'
    );

  }

}


async function createActivity(){

  const name=document.getElementById('actName').value.trim();
  const date=document.getElementById('actDate').value;
  const desc=document.getElementById('actDesc').value.trim();
  const venue =document.getElementById('actVenue').value.trim();
  const timeFrom =document.getElementById('actFrom').value;
  const timeTo =document.getElementById('actTo').value;
  const totalHours =document.getElementById('actHours').value;
  const activityType =document.getElementById('actType').value;

  let ok=true;

  ['actName','actDate','actDesc'].forEach(id=>{
    document.getElementById(id+'Err').textContent='';
  });

  if(!name){
    document.getElementById('actNameErr').textContent='Required';
    ok=false;
  }

  if(!date){
    document.getElementById('actDateErr').textContent='Required';
    ok=false;
  }

  if(!desc){
    document.getElementById('actDescErr').textContent='Required';
    ok=false;
  }

  if(!ok) return;

  try{

    await addDoc(collection(db,"activities"),{

      name,
      activityType,

      date,

      venue,

      timeFrom,

      timeTo,

      totalHours,

      desc,

      status:"Upcoming"

    });

    showToast('Activity saved to Firebase!');

    document.getElementById('actName').value='';
    document.getElementById('actDate').value='';
    document.getElementById('actDesc').value='';

    toggleActForm();

    loadActivities();

  }catch(err){
    console.error(err);
    showToast('Firebase error','error');
  }
}

function loadActivities(){

  onSnapshot(collection(db,"activities"), (snapshot)=>{

    acts = [];

    snapshot.forEach((docSnap)=>{

      acts.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    renderActivities();
    renderDashboard();
    renderAttendanceSelects();

  }, (err)=>{

    console.error(err);

    showToast('Failed to load activities','error');

  });

}

async function deleteAct(id){

  try{

    await deleteDoc(doc(db,"activities",id));

    showToast('Activity deleted.','warning');

  }catch(err){

    console.error(err);

    showToast('Delete failed','error');

  }

}

function goAttendance(id){
  switchTab('attendance');
  document.getElementById('attActSel').value=id;
  onAttActChange();
}

/* ═══════════════════════════════════════════════════════════════
   ATTENDANCE
═══════════════════════════════════════════════════════════════ */
function renderAttendanceSelects(){
  const sel=document.getElementById('attActSel');
  sel.innerHTML='<option value="">-- Choose an activity --</option>'+acts.map(a=>`<option value="${a.id}">${esc(a.name)} · ${esc(a.date)}</option>`).join('');
}
function onAttActChange(){
  const v=document.getElementById('attActSel').value;
  document.getElementById('att-step2').style.display=v?'block':'none';
  if(v) setStepUI(2);
}
function setStepUI(n){
  for(let i=1;i<=3;i++){
    const c=document.getElementById('sc'+i), l=document.getElementById('sl'+i);
    c.classList.toggle('active',i<=n); c.classList.toggle('done',i<n);
    l.classList.toggle('active',i<=n);
    if(i<n) c.textContent='✓'; else c.textContent=i;
    if(i<3) document.getElementById('line'+i).classList.toggle('done',i<n);
  }
}
function buildQR(){
  const box=document.getElementById('qrBox');
  box.innerHTML=`
    <div class="qr-corner" style="top:4px;left:4px;"></div>
    <div class="qr-corner" style="top:4px;right:4px;"></div>
    <div class="qr-corner" style="bottom:4px;left:4px;"></div>
    <div class="qr-dots">${Array.from({length:100},(_,i)=>`<div class="qr-dot" style="background:${Math.sin(i*7+3)>0?'#fff':'transparent'}"></div>`).join('')}</div>`;
}
async function startSession(){

  const actId = document.getElementById('attActSel').value;
  if(!actId){
    showToast('Select an activity first.','error');
    return;
  }

  const activity = acts.find(a => a.id === actId);
  const seconds = Number(document.getElementById('qrRange').value);

  // ── GET ADMIN'S CURRENT LOCATION ──────────────
  showToast('Getting your location...', 'warning');

  let latitude, longitude;

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve, reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
    latitude  = pos.coords.latitude;
    longitude = pos.coords.longitude;
    showToast(`Location captured ✅`);
  } catch(err) {
    showToast('Location access denied — session started without location check', 'warning');
    latitude  = null;
    longitude = null;
  }
  // ──────────────────────────────────────────────

  try {
    const expiresAt = Date.now() + (seconds * 1000);

    const docRef = await addDoc(
      collection(db, "attendanceSessions"),
      {
        activityId:   actId,
        activityName: activity.name,
        active:       true,
        createdAt:    Date.now(),
        expiresAt:    expiresAt,
        type:         activity.activityType?.toLowerCase() || "activity",
        // ── Store location in session ──
        latitude:     latitude,
        longitude:    longitude,
        radius:       300       // metres — adjust per activity
      }
    );

    currentSessionId = docRef.id;

    // rest of your existing startSession code continues...

    // UI
    sessionOn=true;
    sessionDone=false;
    presentList=[];

    document.getElementById('att-step3').style.display='block';
    document.getElementById('endSessBtn').style.display='inline-block';

    document.getElementById(
    'qrExpLbl'
    ).textContent = seconds + " sec";

    document.getElementById('sess-badge').innerHTML=
      '<div class="session-badge"><span class="session-dot"></span>SESSION ACTIVE</div>';

    // GENERATE REAL QR
    generateQRCode(currentSessionId);

    expiryTimer = setTimeout(async () => {
      await updateDoc(doc(db, "attendanceSessions", currentSessionId), { active: false });
      document.getElementById("sess-badge").innerHTML = '<div class="session-badge">QR EXPIRED</div>';
      showToast("QR expired", "warning");
    }, seconds * 1000);

    setStepUI(3);

    if (attendanceUnsubscribe) attendanceUnsubscribe();
    attendanceUnsubscribe = onSnapshot(
      query(collection(db, "attendanceRecords"), where("sessionId", "==", currentSessionId)),
      (snapshot) => {
        document.getElementById("presentCount").textContent = snapshot.size;
        let html = "";
        snapshot.forEach(doc => {
          const d = doc.data();
          html += `<div class="live-row">
            <span style="font-weight:600;color:#0f172a;">${d.studentName}</span>
            <span style="color:#64748b;">${d.studentId}</span>
          </div>`;
        });
        document.getElementById("presentList").innerHTML =
          html || `<p style="color:#94a3b8;font-size:13px;font-style:italic;">Waiting for students to scan…</p>`;
      }
    );

    showToast('Attendance session started!');

  }catch(err){

    console.error(err);

    showToast('Failed to create session','error');

  }

}

function listenAttendance(sessionId){

  document.getElementById('presentCount').textContent =
    presentList.length;

  const pl = document.getElementById('presentList');

  if(!presentList.length){

    pl.innerHTML = `
      <p style="color:#94a3b8;font-size:13px;font-style:italic;">
        Waiting for students to scan…
      </p>
    `;

    return;
  }

  pl.innerHTML = presentList.map(s=>`

    <div class="live-row">

      <span style="font-weight:600;color:#0f172a;">
        ${s.studentName}
      </span>

      <span style="color:#64748b;">
        ${s.studentId}
      </span>

    </div>

  `).join('');

}
async function endSession(){

  if (expiryTimer) { clearTimeout(expiryTimer); expiryTimer = null; }
  if (attendanceUnsubscribe) { attendanceUnsubscribe(); attendanceUnsubscribe = null; }

  closeModal('endModal');

  try{

    await updateDoc(
      doc(
        db,
        "attendanceSessions",
        currentSessionId
      ),
      {
        active:false
      }
    );

    sessionOn = false;

    document.getElementById('endSessBtn').style.display='none';

    document.getElementById('sess-badge').innerHTML =
      '<div class="session-end-badge">SESSION ENDED</div>';

    document.getElementById('sess-summary').style.display='block';

    const count = document.getElementById("presentCount").textContent || "0";
    document.getElementById("sess-summary").textContent = `✅ ${count} students marked present`;

    showToast('Session ended successfully');

  }catch(err){

    console.error(err);

    showToast('Failed to end session','error');

  }

}

/* ═══════════════════════════════════════════════════════════════
   VOLUNTEERS
═══════════════════════════════════════════════════════════════ */
let cachedAttendanceRecords = [];
let cachedTotalActivities = 0;

async function renderVolunteers(){

  document.getElementById('vol-count').textContent='('+vols.length+')';

  const q=document.getElementById('volSearch').value.toLowerCase();

  let filtered=vols.filter(v=>
    (v.fullName || '').toLowerCase().includes(q) ||
    (v.studentId || '').toLowerCase().includes(q)
  );

  const body=document.getElementById('vol-body');

  // TABLE HEAD
  document.getElementById('vol-head').innerHTML=`
    <th>PHOTO</th>
    <th>NAME</th>
    <th>STUDENT ID</th>
    <th>CLASS</th>
    <th>CONTACT</th>
    <th>EMAIL</th>
    <th>ATTENDANCE</th>
    <th>ACTION</th>
  `;

  // EMPTY
  if(!filtered.length){

    body.innerHTML=`
      <tr>
        <td colspan="7">
          <div class="empty">
            <div class="empty-icon">👥</div>
            <p>No volunteers found.</p>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  // ROWS
  let rows = '';

filtered.forEach(v => {

  const attData = (() => {
    const attended = cachedAttendanceRecords.filter(r => r.studentId === v.studentId).length;
    const pct = cachedTotalActivities > 0 ? Math.round((attended / cachedTotalActivities) * 100) : 0;
    return { attended, totalActivities: cachedTotalActivities, percentage: pct };
  })();

  rows += `

  <tr>

    <td style="padding:12px;">
      <img 
        src="${v.photoURL || 'https://via.placeholder.com/40'}"
        style="
          width:42px;
          height:42px;
          border-radius:50%;
          object-fit:cover;
          border:2px solid #e2e8f0;
        "
      >
    </td>

    <td style="font-weight:600;">
      ${esc(v.fullName)}
    </td>

    <td style="color:#64748b;">
      ${esc(v.studentId)}
    </td>

    <td style="color:#64748b;">
      ${esc(v.className)}
    </td>

    <td style="color:#64748b;">
      ${esc(v.contact.slice(0,4))}••••••
    </td>

    <td style="color:#64748b;">
      ${esc(v.email.split('@')[0].slice(0,3))}•••@${esc(v.email.split('@')[1])}
    </td>

    <td>

      <div style="
        min-width:90px;
      ">

        <div style="
          font-weight:700;
          color:#2563eb;
        ">
          ${attData.percentage}%
        </div>

        <div style="
          font-size:12px;
          color:#64748b;
        ">
          ${attData.attended}/${attData.totalActivities}
        </div>

      </div>

    </td>

    <td>

      <div style="display:flex;gap:6px;">

        <button
          class="btn-xs"
          style="
            background:#eff6ff;
            color:#2563eb;
            font-weight:600;
          "
          onclick="openVolunteerProfile('${v.studentId}')"
        >
          👁 View
        </button>

        <button
          class="btn-xs"
          style="
            background:#fee2e2;
            color:#ef4444;
          "
          onclick="removeVol('${v.uid}')"
        >
          🗑️
        </button>

      </div>

    </td>

  </tr>
  `;
});

body.innerHTML = rows;

}
function doSort(k){
  if(sortKey===k) sortDir=sortDir==='asc'?'desc':'asc'; else{sortKey=k;sortDir='asc';}
  renderVolunteers();
}
function toggleSelAll(cb){

  const q=document.getElementById('volSearch').value.toLowerCase();

  const filtered=vols.filter(v=>
    (v.fullName || '').toLowerCase().includes(q) ||
    (v.studentId || '').toLowerCase().includes(q)
  );

  selVols=cb.checked
    ? filtered.map(v=>v.uid)
    : [];

  renderVolunteers();
}

async function removeVol(id){

  const volunteer =
  vols.find(v=>v.uid===id);

  if(!volunteer) return;

  await deleteDoc(
    doc(db,"volunteers", volunteer.firebaseId)
  );

}
// volunteer data export
function exportCsv(){

  const rows = [
    "Full Name,Student ID,Class,Contact,Email,Blood Group,Address",

    ...vols.map(v => `
${v.fullName || ''},
${v.studentId || ''},
${v.className || ''},
${v.contact || ''},
${v.email || ''},
${v.bloodGroup || ''},
${v.address || ''}
`.replace(/\n/g,''))
  ].join('\n');

  const a=document.createElement('a');

  a.href=URL.createObjectURL(
    new Blob([rows],{type:'text/csv'})
  );

  a.download='volunteers.csv';

  a.click();

  showToast('CSV exported!');
}
//marks export
function exportMarksCsv(){

  if(!marks.length){

    showToast('No marks data found','error');

    return;

  }

  const rows = [

    "Student Name,Student ID,Attendance Marks,Activity Marks,Total Marks",

    ...marks.map(m => `
${m.studentName || ''},
${m.studentId || ''},
${m.attendanceMarks || 0},
${m.activityMarks || 0},
${m.totalMarks || 0}
`.replace(/\n/g,''))

  ].join('\n');

  const blob = new Blob(
    [rows],
    { type:'text/csv' }
  );

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);

  a.download = 'marks-report.csv';

  a.click();

  showToast('Marks CSV exported!');

}

/* ═══════════════════════════════════════════════════════════════
   MARKS
═══════════════════════════════════════════════════════════════ */
function populateVolSelect(){

  const s=document.getElementById('mVolSel');

  s.innerHTML=
    '<option value="">-- Choose volunteer --</option>' +

    vols.map(v=>`
      <option value="${v.studentId}">
        ${esc(v.fullName)} (${esc(v.studentId)})
      </option>
    `).join('');

}

function updateTotal(){
  const a=Number(document.getElementById('mAtt').value)||0;
  const b=Number(document.getElementById('mAct').value)||0;
  const t=a+b;
  const show=a||b;
  document.getElementById('totalPreview').style.display=show?'flex':'none';
  document.getElementById('totalNum').textContent=t;
  document.getElementById('totalBar').style.width=t+'%';
}

async function saveMarks(){

  const volId = document.getElementById('mVolSel').value;

  const att = Number(document.getElementById('mAtt').value);

  const act = Number(document.getElementById('mAct').value);

  if(!volId){

    showToast('Select volunteer','error');

    return;

  }

  const volunteer =
    vols.find(v => v.studentId === volId);

  try{

    await setDoc(
      doc(db,"marks",volId),
      {
        studentId: volId,
        studentName: volunteer?.fullName || '',
        attendanceMarks: att,
        activityMarks: act,
        totalMarks: att + act,
        updatedAt: serverTimestamp()
      }
    );

    showToast('Marks saved successfully');

    document.getElementById('mVolSel').value='';

    document.getElementById('mAtt').value='';

    document.getElementById('mAct').value='';

    document.getElementById('totalPreview').style.display='none';

  }catch(err){

    console.error(err);

    showToast('Failed to save marks','error');

  }

}

function renderMarksTable(){
  const w=document.getElementById('marks-body-wrap');
  if(!marks.length){w.innerHTML='<div class="empty"><div class="empty-icon">📝</div><p>No marks assigned yet.</p></div>';return;}
  w.innerHTML=`<table>
    <thead><tr style="background:#f8fafc;">
      ${['Student','Attendance','Activity','Total','Last Updated'].map(h=>`<th style="padding:10px 18px;">${h.toUpperCase()}</th>`).join('')}
    </tr></thead>
    <tbody>${marks.map(m=>`
      <tr>

      <td style="padding:12px 18px;font-weight:600;">
      ${esc(m.studentName)}
      </td>

      <td style="padding:12px 18px;">
      ${esc(m.attendanceMarks)}
      </td>

      <td style="padding:12px 18px;">
      ${esc(m.activityMarks)}
      </td>

      <td style="padding:12px 18px;font-weight:800;color:#2563eb;">
      ${esc(m.totalMarks)}
      </td>

      </tr>

      `).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════ */
function sendReset(){
  const e=document.getElementById('rstEmail').value.trim();
  if(!e){showToast('Enter an email first.','error');return;}
  showToast('Reset link sent to '+e);
  document.getElementById('rstEmail').value='';
}
function clearAll(){
  closeModal('clearModal');
  showToast('Use Firebase Console to clear data.', 'error');
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async ()=>{

  await loadActivities();

  await loadVolunteers();

  await loadMarks();

  const [attCache, actCache] = await Promise.all([
    getDocs(collection(db, "attendanceRecords")),
    getDocs(collection(db, "activities"))
  ]);
  cachedAttendanceRecords = attCache.docs.map(d => d.data());
  cachedTotalActivities = actCache.size;

  renderDashboard();

});

function updateQrLabel(){

  const seconds =
    document.getElementById("qrRange").value;

  document.getElementById("qrVal")
  .textContent = seconds + " sec";

}

// qr code generation
function generateQRCode(sessionId){

  const qrBox = document.getElementById('qrBox');

  qrBox.innerHTML = '';

  const attendanceURL =
  `${window.location.href.split("admin.html")[0]}attendance.html?session=${sessionId}`;

  new QRCode(qrBox, {
    text: attendanceURL,
    width: 500,
    height: 500,
    correctLevel: QRCode.CorrectLevel.H
  });

}

// volunteer profile modal
async function openVolunteerProfile(studentId){

  const volunteer =
    vols.find(v => v.studentId === studentId);

  if(!volunteer){

    showToast('Volunteer not found','error');

    return;

  }

  // TOTAL ATTENDANCE
  let totalAttendance = 0;

  // TOTAL LECTURES
  let totalLectures = 0;

  // TOTAL ACTIVITIES
  let totalActivities = 0;

  // GET ATTENDANCE RECORDS
  const attendanceSnap =
    await getDocs(collection(db,"attendanceRecords"));

  attendanceSnap.forEach(docSnap=>{

    const data = docSnap.data();

    if(data.studentId === studentId){

      totalAttendance++;

    }

  });

  // GET ACTIVITIES
  const activitiesSnap =
    await getDocs(collection(db,"activities"));

  totalActivities = activitiesSnap.size;

  // MOCK LECTURES
  totalLectures = 0; // real data not yet available — remove card from modal below

  // MARKS
  const markData =
    marks.find(m => m.studentId === studentId);

  document.getElementById('volProfileContent').innerHTML = `

    <div style="
      display:flex;
      gap:20px;
      flex-wrap:wrap;
      align-items:center;
      margin-bottom:24px;
    ">

      <img
        src="${volunteer.photoURL || 'https://via.placeholder.com/120'}"
        style="
          width:120px;
          height:120px;
          border-radius:24px;
          object-fit:cover;
          border:4px solid #e2e8f0;
        "
      >

      <div>

        <h2 style="
          margin:0;
          color:#0f172a;
        ">
          ${esc(volunteer.fullName)}
        </h2>

        <p style="color:#64748b;margin:8px 0;">
          ${esc(volunteer.studentId)}
        </p>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        ">

          <span class="pill pill-blue">
            ${esc(volunteer.className) || 'N/A'}
          </span>

          <span class="pill pill-green">
            NSS Volunteer
          </span>

        </div>

      </div>

    </div>

    <div class="cards">

      <div class="card">
        <div class="card-val">
          ${totalAttendance}
        </div>
        <div class="card-lbl">
          Attendance
        </div>
      </div>

      <div class="card">
        <div class="card-val">
          ${totalActivities}
        </div>
        <div class="card-lbl">
          Activities
        </div>
      </div>

      <div class="card">
        <div class="card-val">
          ${totalLectures}
        </div>
        <div class="card-lbl">
          Lectures
        </div>
      </div>

      <div class="card">
        <div class="card-val">
          ${esc(markData?.totalMarks) || 0}
        </div>
        <div class="card-lbl">
          Total Marks
        </div>
      </div>

    </div>

    <div class="settings-card" style="margin-top:20px;">

      <h3>Volunteer Details</h3>

      <p><b>Email:</b> ${esc(volunteer.email)}</p>

      <p><b>Contact:</b> ${esc(volunteer.contact) || '-'}</p>

      <p><b>Blood Group:</b> ${esc(volunteer.bloodGroup) || '-'}</p>

      <p><b>Address:</b> ${esc(volunteer.address) || '-'}</p>

      <p><b>Date of Birth:</b> ${esc(volunteer.dob) || '-'}</p>

      <p><b>Caste:</b> ${esc(volunteer.caste) || '-'}</p>

    </div>

  `;

  openModal('volProfileModal');

}

// ── FEEDBACK TAB ────────────────────────────────────────────

const TYPE_META = {
  idea:   { icon:"💡", label:"Idea",   bg:"#fef9c3", color:"#854d0e" },
  bug:    { icon:"🐛", label:"Bug",    bg:"#fee2e2", color:"#991b1b" },
  praise: { icon:"⭐", label:"Praise", bg:"#d1fae5", color:"#065f46" },
  other:  { icon:"💬", label:"Other",  bg:"#f1f5f9", color:"#334155" },
};

let cachedFeedback = [];
let activeFilter   = "all";

function initFeedbackTab() {
  const q = query(collection(db, "feedback"), orderBy("timestamp", "desc"));

  onSnapshot(q, (snap) => {
    cachedFeedback = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFeedback();
  }, (err) => {
    console.error("[Feedback] load failed:", err);
  });

  document.querySelectorAll(".fb-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fb-filter-btn").forEach(b => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");
      activeFilter = btn.dataset.filter;
      renderFeedback();
    });
  });
}

function renderFeedback() {
  const list  = document.getElementById("fb-list");
  const empty = document.getElementById("fb-empty");
  const count = document.getElementById("fb-count");
  if (!list) return;

  const filtered = activeFilter === "all"
    ? cachedFeedback
    : cachedFeedback.filter(f => f.type === activeFilter);

  count.textContent = `(${cachedFeedback.length} total)`;

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  list.innerHTML = filtered.map(fb => {
    const meta = TYPE_META[fb.type] || TYPE_META.other;
    const ts   = fb.timestamp?.toDate
      ? fb.timestamp.toDate().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
      : "—";
    const isNew = fb.status === "new";
    const page  = (fb.pageTitle || fb.page || "").replace(/^https?:\/\/[^/]+/, "");

    return `
      <div class="act-card" style="border-left:3px solid ${meta.bg};" id="fbc-${fb.id}">
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="width:40px;height:40px;border-radius:12px;background:${meta.bg};display:flex;align-items:center;justify-content:center;font-size:20px;">
            ${meta.icon}
          </div>
          ${isNew ? `<span style="width:8px;height:8px;border-radius:50%;background:#2563eb;display:block;" title="New"></span>` : ""}
        </div>
        <div class="act-card-body">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span class="pill" style="background:${meta.bg};color:${meta.color};">${meta.label}</span>
            <span style="font-size:12px;font-weight:600;color:#0f172a;">${esc(fb.name || "Anonymous")}</span>
            ${isNew ? `<span class="pill" style="background:#dbeafe;color:#2563eb;font-size:10px;">NEW</span>` : ""}
          </div>
          <div style="font-size:13px;color:#334155;line-height:1.65;margin-bottom:8px;">${esc(fb.message)}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <span style="font-size:11px;color:#94a3b8;">🕐 ${ts}</span>
            <span style="font-size:11px;color:#94a3b8;" title="${esc(fb.page || "")}">📄 ${esc(page)}</span>
          </div>
        </div>
        <div class="act-actions" style="flex-direction:column;gap:6px;">
          ${isNew
            ? `<button class="btn-xs btn-green" onclick="markFbReviewed('${fb.id}')">✓ Mark reviewed</button>`
            : `<span style="font-size:11px;color:#94a3b8;font-weight:600;">✓ Reviewed</span>`
          }
          <button class="btn-xs btn-red" onclick="deleteFeedback('${fb.id}')">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

async function markFbReviewed(id) {
  try {
    await updateDoc(doc(db, "feedback", id), { status: "reviewed" });
  } catch (err) {
    console.error("[Feedback] markReviewed failed:", err);
  }
}

async function deleteFeedback(id) {
  if (!confirm("Delete this feedback? Cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "feedback", id));
  } catch (err) {
    console.error("[Feedback] delete failed:", err);
  }
}

window.markFbReviewed = markFbReviewed;
window.deleteFeedback  = deleteFeedback;

// Boot the tab when clicked (subscribes only once)
document.querySelector('[data-tab="feedback"]')
  ?.addEventListener("click", () => {
    if (!window._fbInit) { window._fbInit = true; initFeedbackTab(); }
  });


/*mobile menu*/
const mobileMenuBtn =
document.getElementById(
  "mobileMenuBtn"
);

const sidebar =
document.getElementById(
  "sidebar"
);

const overlay =
document.getElementById(
  "sidebarOverlay"
);

mobileMenuBtn.addEventListener(
  "click",
  ()=>{

    sidebar.classList.remove(
      "collapsed"
    );

    sidebar.classList.add(
      "open"
    );

    overlay.classList.add(
      "show"
    );

  }
);

overlay.addEventListener(
  "click",
  ()=>{

    sidebar.classList.remove(
      "open"
    );

    overlay.classList.remove(
      "show"
    );

  }
);

if(window.innerWidth <= 768){

  sidebar.classList.remove(
    "open"
  );

  overlay.classList.remove(
    "show"
  );

}
// logout
async function handleLogout() {
  closeModal('logoutModal');
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch(err) {
    console.error(err);
    showToast('Logout failed', 'error');
  }
}
window.handleLogout = handleLogout;

// GLOBAL FUNCTIONS FOR HTML onclick


window.switchTab = switchTab;
window.openVolunteerProfile = openVolunteerProfile;
window.toggleActForm = toggleActForm;
window.createActivity = createActivity;
window.deleteAct = deleteAct;
window.goAttendance = goAttendance;
window.startSession = startSession;
window.endSession = endSession;
window.openModal = openModal;
window.closeModal = closeModal;
window.exportCsv = exportCsv;
window.exportMarksCsv = exportMarksCsv;
window.saveMarks = saveMarks;
window.updateTotal = updateTotal;
window.sendReset = sendReset;
window.clearAll = clearAll;
window.onAttActChange = onAttActChange;
window.viewAttendance = viewAttendance;
window.exportAttendanceSheet = exportAttendanceSheet;