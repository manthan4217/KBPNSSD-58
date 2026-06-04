// 🔥 FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

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
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCYJtqBXt719s28KazYEdFkhVjqm5ytHlw",
  authDomain: "nss-d58.firebaseapp.com",
  projectId: "nss-d58",
  storageBucket: "nss-d58.appspot.com",
  messagingSenderId: "851449633649",
  appId: "1:851449633649:web:025a6a1f044fed8b6db4d0",
  measurementId: "G-5M01SRSGZ8"
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);




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

    console.log("Realtime volunteers:", vols);

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

      console.log("Realtime marks:", marks);

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

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */
const tabLabels={dashboard:"Dashboard",activities:"Activities",attendance:"Attendance",volunteers:"Volunteers",marks:"Marks",settings:"Settings"};
function switchTab(t){
  document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.querySelector(`[data-tab="${t}"]`).classList.add('active');
  document.getElementById('hdrTitle').textContent=tabLabels[t];
  if(t==='dashboard') renderDashboard();
  if(t==='activities') renderActivities();
  if(t==='attendance') renderAttendanceSelects();
  if(t==='volunteers') renderVolunteers();
  if(t==='marks'){populateVolSelect();renderMarksTable();}
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
      <td style="font-weight:500;">${a.name}</td>
      <td style="color:#64748b;">${a.date}</td>
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
          <span class="act-name">${a.name}</span>
          ${pill(a.status,a.status==='Completed'?'pill-green':'pill-amber')}
          ${pill('📅 '+a.date,'pill-blue')}
        </div>
        <div class="act-desc">${a.desc}</div>
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
      </div>
    </div>`).join('');
}
async function createActivity(){

  const name=document.getElementById('actName').value.trim();
  const date=document.getElementById('actDate').value;
  const desc=document.getElementById('actDesc').value.trim();

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
      date,
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

    console.log("Realtime activities:", acts);

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
  sel.innerHTML='<option value="">-- Choose an activity --</option>'+acts.map(a=>`<option value="${a.id}">${a.name} · ${a.date}</option>`).join('');
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

  const mins = Number(document.getElementById('qrRange').value);

  try{

    // CREATE FIREBASE SESSION
    const docRef = await addDoc(
      collection(db,"attendanceSessions"),
      {
        activityId: activity.id,
        activityName: activity.name,
        expiryMinutes: mins,
        active: true,
        createdAt: serverTimestamp()
      }
    );

    currentSessionId = docRef.id;

    console.log("Session Created:", currentSessionId);

    // UI
    sessionOn=true;
    sessionDone=false;
    presentList=[];

    document.getElementById('att-step3').style.display='block';
    document.getElementById('endSessBtn').style.display='inline-block';

    document.getElementById('qrExpLbl').textContent=mins;

    document.getElementById('sess-badge').innerHTML=
      '<div class="session-badge"><span class="session-dot"></span>SESSION ACTIVE</div>';

    // GENERATE REAL QR
generateQRCode(currentSessionId);

    setStepUI(3);

    listenAttendance(currentSessionId);

    showToast('Attendance session started!');

  }catch(err){

    console.error(err);

    showToast('Failed to create session','error');

  }

}

//LIVE ATTENDANCE LISTENER
function listenAttendance(sessionId){

  onSnapshot(
    collection(db,"attendanceRecords"),

    (snapshot)=>{

      presentList = [];

      snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(data.sessionId === sessionId){

          presentList.push(data);

        }

      });

      updatePresent();

    }
  );

}

function updatePresent(){

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

  closeModal('endModal');

  try{

    await updateDoc(
      doc(db,"attendanceSessions",currentSessionId),
      {
        active:false
      }
    );

    sessionOn = false;

    document.getElementById('endSessBtn').style.display='none';

    document.getElementById('sess-badge').innerHTML =
      '<div class="session-end-badge">SESSION ENDED</div>';

    document.getElementById('sess-summary').style.display='block';

    document.getElementById('sess-summary').textContent =
      `✅ ${presentList.length} students marked present`;

    showToast('Session ended successfully');

  }catch(err){

    console.error(err);

    showToast('Failed to end session','error');

  }

}

/* ═══════════════════════════════════════════════════════════════
   VOLUNTEERS
═══════════════════════════════════════════════════════════════ */
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

for(const v of filtered){

  const attData =
    await calculateAttendance(v.studentId);

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
      ${v.fullName || '-'}
    </td>

    <td style="color:#64748b;">
      ${v.studentId || '-'}
    </td>

    <td style="color:#64748b;">
      ${v.className || '-'}
    </td>

    <td style="color:#64748b;">
      ${v.contact || '-'}
    </td>

    <td style="color:#64748b;">
      ${v.email || '-'}
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
}

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

function removeVol(id){

  vols = vols.filter(v => v.uid !== id);

  renderVolunteers();

  showToast('Volunteer removed.','warning');
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
        ${v.fullName} (${v.studentId})
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
      ${m.studentName}
      </td>

      <td style="padding:12px 18px;">
      ${m.attendanceMarks}
      </td>

      <td style="padding:12px 18px;">
      ${m.activityMarks}
      </td>

      <td style="padding:12px 18px;font-weight:800;color:#2563eb;">
      ${m.totalMarks}
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
  vols=[];acts=[];marks=[];selVols=[];
  closeModal('clearModal');
  renderDashboard();
  showToast('All data cleared.','warning');
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async ()=>{

  await loadActivities();

  await loadVolunteers();

  await loadMarks();

  renderDashboard();

});

// GLOBAL FUNCTIONS FOR HTML onclick

window.openVolunteerProfile = openVolunteerProfile;

window.switchTab = switchTab;
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

// qr code generation
function generateQRCode(sessionId){

  const qrBox = document.getElementById('qrBox');

  qrBox.innerHTML = '';

  const attendanceURL =
  `${window.location.href.split("admin.html")[0]}attendance.html?session=${sessionId}`;

  console.log(attendanceURL);
  alert(attendanceURL);

  new QRCode(qrBox, {
    text: attendanceURL,
    width: 350,
    height: 350
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
  totalLectures = Math.floor(totalAttendance / 2);

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
          ${volunteer.fullName}
        </h2>

        <p style="color:#64748b;margin:8px 0;">
          ${volunteer.studentId}
        </p>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        ">

          <span class="pill pill-blue">
            ${volunteer.className || 'N/A'}
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
          ${markData?.totalMarks || 0}
        </div>
        <div class="card-lbl">
          Total Marks
        </div>
      </div>

    </div>

    <div class="settings-card" style="margin-top:20px;">

      <h3>Volunteer Details</h3>

      <p><b>Email:</b> ${volunteer.email || '-'}</p>

      <p><b>Contact:</b> ${volunteer.contact || '-'}</p>

      <p><b>Blood Group:</b> ${volunteer.bloodGroup || '-'}</p>

      <p><b>Address:</b> ${volunteer.address || '-'}</p>

      <p><b>Date of Birth:</b> ${volunteer.dob || '-'}</p>

      <p><b>Caste:</b> ${volunteer.caste || '-'}</p>

    </div>

  `;

  openModal('volProfileModal');

}