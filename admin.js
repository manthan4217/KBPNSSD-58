// 🔥 FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXXXXXX",
  appId: "XXXXXXXX"
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);




/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
let vols = [];
async function loadVolunteers(){

  try{

    const querySnapshot = await getDocs(collection(db,"volunteers"));

    vols = [];

    querySnapshot.forEach((docSnap)=>{

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

    console.log("Loaded volunteers:", vols);

    renderVolunteers();
    renderDashboard();
    populateVolSelect();

  }catch(err){

    console.error("Firebase Volunteer Error:", err);

    showToast('Failed to load volunteers','error');

  }

}

let acts = [
  {id:1,name:"Green Army Drive",        date:"2026-05-10",desc:"Tree plantation & environmental awareness in Sector 7.",status:"Completed"},
  {id:2,name:"Blood Donation Camp",     date:"2026-05-15",desc:"Annual blood donation drive — 45 units collected.",status:"Completed"},
  {id:3,name:"Mangroves Cleanup",       date:"2026-05-22",desc:"Coastal cleanup at Vashi mangroves, removing plastic waste.",status:"Upcoming"},
  {id:4,name:"Shiv Jayanti Celebration",date:"2026-06-01",desc:"Largest Shiv Jayanti among Navi Mumbai colleges.",status:"Upcoming"},
  {id:5,name:"Anti-Plastic Rally",      date:"2026-04-28",desc:"Awareness rally promoting plastic-free lifestyle.",status:"Completed"},
];
let marks = [
  {sid:"NSS001",name:"Priya Sharma",att:42,act:36,date:"2026-05-10"},
  {sid:"NSS002",name:"Rahul Patil", att:46,act:42,date:"2026-05-10"},
  {sid:"NSS004",name:"Kiran Desai", att:48,act:46,date:"2026-05-12"},
];
let selVols=[], sortKey="name", sortDir="asc";
let attStep=1, sessionOn=false, sessionDone=false, presentList=[];

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
        <button class="btn-xs" style="background:#eff6ff;color:#2563eb;font-weight:600;" onclick="goAttendance(${a.id})">✅ Attendance</button>
        <button class="btn-xs" style="background:#fee2e2;color:#ef4444;" onclick="deleteAct(${a.id})">🗑️</button>
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

async function loadActivities(){

  const querySnapshot = await getDocs(collection(db,"activities"));

  acts = [];

  querySnapshot.forEach((docSnap)=>{
    acts.push({
      id:docSnap.id,
      ...docSnap.data()
    });
  });

  renderActivities();
  renderDashboard();
}

function deleteAct(id){
  acts=acts.filter(a=>a.id!==id);
  renderActivities();
  showToast('Activity deleted.','warning');
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
function startSession(){
  if(!document.getElementById('attActSel').value){showToast('Select an activity first.','error');return;}
  sessionOn=true; sessionDone=false; presentList=[];
  document.getElementById('att-step3').style.display='block';
  document.getElementById('endSessBtn').style.display='inline-block';
  document.getElementById('startSessBtn').disabled=true;
  document.getElementById('startSessBtn').style.background='#e2e8f0';
  document.getElementById('refreshLabel').style.display='block';
  document.getElementById('sess-summary').style.display='none';
  const mins=document.getElementById('qrRange').value;
  document.getElementById('qrExpLbl').textContent=mins;
  document.getElementById('sess-badge').innerHTML='<div class="session-badge"><span class="session-dot"></span>SESSION ACTIVE</div>';
  buildQR(); setStepUI(3); updatePresent();
  const mock=[
    {name:"Priya Sharma",roll:"NSS001",time:"10:32 AM"},
    {name:"Rahul Patil", roll:"NSS002",time:"10:35 AM"},
    {name:"Kiran Desai", roll:"NSS004",time:"10:38 AM"},
  ];
  setTimeout(()=>{presentList=[mock[0]];updatePresent();},2500);
  setTimeout(()=>{presentList=mock.slice(0,2);updatePresent();},5000);
  setTimeout(()=>{presentList=mock;updatePresent();},8000);
  showToast('QR Session started!');
}
function updatePresent(){
  document.getElementById('presentCount').textContent=presentList.length;
  const pl=document.getElementById('presentList');
  pl.innerHTML=presentList.length?presentList.map(s=>`
    <div class="live-row">
      <span style="font-weight:600;color:#0f172a;">${s.name}</span>
      <span style="color:#64748b;">${s.roll}</span>
      <span style="color:#10b981;font-weight:700;">${s.time}</span>
    </div>`).join(''):'<p style="color:#94a3b8;font-size:13px;font-style:italic;">Waiting for students to scan…</p>';
}
function endSession(){
  closeModal('endModal');
  sessionOn=false; sessionDone=true;
  document.getElementById('endSessBtn').style.display='none';
  document.getElementById('refreshLabel').style.display='none';
  document.getElementById('sess-badge').innerHTML='<div class="session-end-badge">SESSION ENDED</div>';
  document.getElementById('sess-summary').style.display='block';
  document.getElementById('sess-summary').textContent=`✅ Summary: ${presentList.length} students marked present out of ${vols.length} total volunteers.`;
  showToast('Session ended. Attendance saved.','warning');
}

/* ═══════════════════════════════════════════════════════════════
   VOLUNTEERS
═══════════════════════════════════════════════════════════════ */
function renderVolunteers(){

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
  body.innerHTML=filtered.map(v=>`

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

        <div style="display:flex;gap:6px;">

          <button
            class="btn-xs"
            style="background:#fef3c7;color:#f59e0b;font-weight:600;"
            onclick="showToast('Reset link sent to ${v.email}')"
          >
            🔑 Reset
          </button>

          <button
            class="btn-xs"
            style="background:#fee2e2;color:#ef4444;"
            onclick="removeVol('${v.uid}')"
          >
            🗑️
          </button>

        </div>

      </td>

    </tr>

  `).join('');

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
function saveMarks(){
  const volId=document.getElementById('mVolSel').value;
  const att=document.getElementById('mAtt').value;
  const act=document.getElementById('mAct').value;
  let ok=true;
  document.getElementById('mVolErr').textContent='';
  document.getElementById('mAttErr').textContent='';
  document.getElementById('mActErr').textContent='';
  if(!volId){document.getElementById('mVolErr').textContent='Select a volunteer';ok=false;}
  if(!att||Number(att)<0){document.getElementById('mAttErr').textContent='Enter valid marks';ok=false;}
  if(!act||Number(act)<0){document.getElementById('mActErr').textContent='Enter valid marks';ok=false;}
  if(!ok) return;
  const vol = vols.find(v => v.studentId === volId);

  const entry = {
    sid: volId,
    name: vol?.fullName || volId,att:Number(att),act:Number(act),date:new Date().toISOString().split('T')[0]};
  const idx=marks.findIndex(m=>m.sid===volId);
  if(idx>=0) marks[idx]=entry; else marks.push(entry);
  document.getElementById('mVolSel').value='';
  document.getElementById('mAtt').value='';
  document.getElementById('mAct').value='';
  document.getElementById('totalPreview').style.display='none';
  renderMarksTable(); showToast('Marks saved!');
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
        <td style="padding:12px 18px;font-weight:600;">${m.name}</td>
        <td style="padding:12px 18px;color:#334155;">${m.att}</td>
        <td style="padding:12px 18px;color:#334155;">${m.act}</td>
        <td style="padding:12px 18px;font-weight:800;color:#2563eb;font-size:14px;">${m.att+m.act}</td>
        <td style="padding:12px 18px;color:#94a3b8;">${m.date}</td>
      </tr>`).join('')}
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

  renderDashboard();

});