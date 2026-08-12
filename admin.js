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
   populateAcademicYearSelect();
   await loadActivities();
   await loadVolunteers();
   await loadMarks();
   // Load Control Center data
   await loadControlCenter();
   await loadControlDataIntoForm();

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
let reports = [];
let reportFormOpen = false;

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
const tabLabels={dashboard:"Dashboard",activities:"Activities",attendance:"Attendance",reports:"Reports",control:"Control Center",volunteers:"Volunteers",marks:"Marks",settings:"Settings"};
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
  if(t==='reports') renderReports();
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

function formatAcademicYear(value){
  if(!value) return getCurrentAcademicYear();
  const match = /^\d{4}-(\d{2})$/.exec(String(value).trim());
  if(!match) return value;
  const startYear = Number(String(value).slice(0,4));
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}

function getCurrentAcademicYear(){
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() >= 5 ? currentYear : currentYear - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getAcademicYearForDate(dateValue){
  if(!dateValue) return getCurrentAcademicYear();
  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if(Number.isNaN(parsedDate.getTime())) return getCurrentAcademicYear();
  const year = parsedDate.getFullYear();
  const month = parsedDate.getMonth() + 1;
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getAcademicYearOptions(){
  const currentYear = new Date().getFullYear();
  const years = [];
  for(let i = currentYear - 2; i <= currentYear + 1; i++){
    years.push(`${i}-${String(i + 1).slice(-2)}`);
  }
  return years;
}

function normalizeReportStatus(status){
  return String(status || 'draft').toLowerCase() === 'published' ? 'published' : 'draft';
}

async function syncActivityAcademicYears(){
  const missing = acts.filter(activity => !activity.academicYear);
  if(!missing.length) return;

  for(const activity of missing){
    const academicYear = getAcademicYearForDate(activity.date);
    try{
      await updateDoc(doc(db, 'activities', activity.id), { academicYear });
    }catch(err){
      console.error('Failed to update academicYear for activity:', activity.id, err);
    }
  }
}

function openActivityForReport(activityId){
  switchTab('activities');
  setTimeout(() => {
    const card = document.getElementById(`activity-card-${activityId}`);
    if(card){
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.18)';
      setTimeout(() => card.style.boxShadow = '', 1600);
    }
  }, 140);
}

async function buildYearlySummary(selectedYearActivities){
  const validActivities = selectedYearActivities || [];
  const validIds = new Set(validActivities.map(activity => activity.id));

  if(!validActivities.length){
    return {
      totalActivities: 0,
      totalParticipants: 0,
      totalAttendance: 0,
      averageAttendance: 0,
      categories: {}
    };
  }

  const categoryMap = {};
  validActivities.forEach(activity => {
    const category = (activity.activityType || activity.category || 'Other').trim() || 'Other';
    categoryMap[category] = (categoryMap[category] || 0) + 1;
  });

  const sessionsSnap = await getDocs(collection(db, 'attendanceSessions'));
  const activityBySession = {};
  sessionsSnap.forEach(docSnap => {
    const session = docSnap.data();
    if (session && session.activityId && validIds.has(session.activityId)) {
      activityBySession[docSnap.id] = session.activityId;
    }
  });

  const attendanceSnap = await getDocs(collection(db, 'attendanceRecords'));
  const participantSet = new Set();
  let totalAttendance = 0;
  const attendanceByActivity = {};

  attendanceSnap.forEach(docSnap => {
    const record = docSnap.data();
    const activityId = activityBySession[record.sessionId];
    if (!activityId || !validIds.has(activityId)) return;

    totalAttendance += 1;
    if(record.studentId){ participantSet.add(String(record.studentId)); }
    attendanceByActivity[activityId] = (attendanceByActivity[activityId] || 0) + 1;
  });

  const totalParticipants = participantSet.size;
  const averageAttendance = Math.round(totalAttendance / validActivities.length);

  return {
    totalActivities: validActivities.length,
    totalParticipants,
    totalAttendance,
    averageAttendance,
    categories: categoryMap,
    attendanceByActivity
  };
}

async /* -----------------
   Control Center helpers
   ----------------- */
function switchControlSection(sec){
  document.getElementById('control-leadership').style.display = sec==='leadership' ? 'block' : 'none';
  document.getElementById('control-stats').style.display = sec==='stats' ? 'block' : 'none';
  document.getElementById('control-organization').style.display = sec==='organization' ? 'block' : 'none';
  document.getElementById('control-content').style.display = sec==='content' ? 'block' : 'none';
}

async function loadControlCenter(){
  // load leadership
  const snaps = await getDocs(collection(db, 'leadership'));
  const listEl = document.getElementById('leadership-list');
  if(!listEl) return;
  listEl.innerHTML = '';
  snaps.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    listEl.innerHTML += `
      <div class="report-card-item" id="leader-${id}">
        <div class="report-card-header">
          <div>
            <div class="mini-title">${esc(data.name || 'Unnamed')}</div>
            <div class="report-meta-row">
              <span>${esc(data.designation || '')}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <span class="pill ${data.isActive? 'pill-green':'pill-amber'}">${data.isActive? 'Active':'Inactive'}</span>
            <button class="btn-xs" onclick="editLeader('${id}')">Edit</button>
          </div>
        </div>
        <div class="report-card-body">
          <div style="display:flex;gap:12px;align-items:center;">
            <img src="${esc(data.photoUrl || 'images/profile.jpg')}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;"/>
            <div style="flex:1;">
              <p>${esc(data.bio || '')}</p>
              <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
                <button class="btn-xs" onclick="moveLeader('${id}','up')">↑</button>
                <button class="btn-xs" onclick="moveLeader('${id}','down')">↓</button>
                <button class="btn-xs" onclick="deleteLeader('${id}')">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

async function addLeader(){
  const name = document.getElementById('newLeaderName').value.trim();
  const designation = document.getElementById('newLeaderDesignation').value.trim();
  const file = document.getElementById('newLeaderPhoto').files[0];
  if(!name){ showToast('Please enter a name','error'); return; }
  try{
    showToast('Saving leader...');
    let photoUrl = '';
    if(file){ photoUrl = await uploadReportImage(file); }
    const payload = {
      name, designation, bio:'', photoUrl, isActive:true, displayOrder:0, createdAt: Date.now(), updatedAt: Date.now()
    };
    const ref = await addDoc(collection(db,'leadership'), payload);
    await updateDoc(doc(db,'leadership',ref.id), { displayOrder: Number(ref.id.slice(-6)) || Date.now() });
    document.getElementById('newLeaderName').value='';
    document.getElementById('newLeaderDesignation').value='';
    document.getElementById('newLeaderPhoto').value='';
    showToast('Leader added');
    loadControlCenter();
  }catch(err){ console.error(err); showToast('Failed to add leader','error'); }
}

async function editLeader(id){
  const snap = await getDoc(doc(db,'leadership',id));
  if(!snap.exists()) return showToast('Leader not found','error');
  const d = snap.data();
  // Build a small modal-like edit flow using prompts but support photo replacement via file input
  const name = prompt('Name', d.name || '');
  if(name === null) return;
  const designation = prompt('Designation', d.designation || '') || '';
  const bio = prompt('Bio', d.bio || '') || '';
  const isActive = confirm('Should this leader be active? OK = Yes, Cancel = No');
  try{
    // Photo replacement
    if(confirm('Replace photo?')){
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if(file){
          try{
            showToast('Uploading photo...');
            const url = await uploadReportImage(file);
            await updateDoc(doc(db,'leadership',id), { name, designation, bio, isActive, photoUrl: url, updatedAt: Date.now() });
            showToast('Leader updated with new photo');
            loadControlCenter();
          }catch(err){ console.error(err); showToast('Photo upload failed','error'); }
        }
      };
      input.click();
      return;
    }
    await updateDoc(doc(db,'leadership',id), { name, designation, bio, isActive, updatedAt: Date.now() });
    showToast('Leader updated');
    loadControlCenter();
  }catch(err){ console.error(err); showToast('Update failed','error'); }
}


async function deleteLeader(id){
  if(!confirm('Delete this leader?')) return;
  try{ await deleteDoc(doc(db,'leadership',id)); showToast('Leader deleted'); loadControlCenter(); }catch(err){ console.error(err); showToast('Delete failed','error'); }
}

async function moveLeader(id, dir){
  const snap = await getDoc(doc(db,'leadership',id));
  if(!snap.exists()) return;
  const cur = snap.data();
  const curOrder = Number(cur.displayOrder || Date.now());
  const delta = dir==='up' ? -1 : 1;
  await updateDoc(doc(db,'leadership',id), { displayOrder: curOrder + delta, updatedAt: Date.now() });
  loadControlCenter();
}

async function saveStats(){
  try{
    const lives = document.getElementById('statLivesImpacted').value.trim();
    const years = document.getElementById('statYears').value.trim();
    await setDoc(doc(db,'site_config','statistics'), { livesImpacted: lives, yearsServing: years, updatedAt: Date.now() }, { merge:true });
    showToast('Statistics saved');
  }catch(err){ console.error(err); showToast('Save failed','error'); }
}

async function saveOrganization(){
  try{
    const college = document.getElementById('orgCollegeName').value.trim();
    const unit = document.getElementById('orgUnitName').value.trim();
    const email = document.getElementById('orgEmail').value.trim();
    await setDoc(doc(db,'site_config','organization'), { collegeName: college, unitName: unit, contactEmail: email, updatedAt: Date.now() }, { merge:true });
    showToast('Organization info saved');
  }catch(err){ console.error(err); showToast('Save failed','error'); }
}

async function saveWebsiteContent(){
  try{
    const about = document.getElementById('contentAbout').value.trim();
    await setDoc(doc(db,'site_config','content'), { about, updatedAt: Date.now() }, { merge:true });
    showToast('Website content saved');
  }catch(err){ console.error(err); showToast('Save failed','error'); }
}

async function loadControlDataIntoForm(){
  // stats
  const statsSnap = await getDoc(doc(db,'site_config','statistics'));
  if(statsSnap.exists()){
    const s = statsSnap.data();
    document.getElementById('statLivesImpacted').value = s.livesImpacted || '';
    document.getElementById('statYears').value = s.yearsServing || '';
  }
  // org
  const orgSnap = await getDoc(doc(db,'site_config','organization'));
  if(orgSnap.exists()){
    const o = orgSnap.data();
    document.getElementById('orgCollegeName').value = o.collegeName || '';
    document.getElementById('orgUnitName').value = o.unitName || '';
    document.getElementById('orgEmail').value = o.contactEmail || '';
  }
  // content
  const contentSnap = await getDoc(doc(db,'site_config','content'));
  if(contentSnap.exists()){
    document.getElementById('contentAbout').value = contentSnap.data().about || '';
  }
}

async function renderReports(){
  const reportList = document.getElementById('report-list');
  const yearlyReportPanel = document.getElementById('yearlyReportPanel');
  const yearSelect = document.getElementById('yearlyReportYear');

  if(!reportList || !yearlyReportPanel) return;

  const selectedYear = yearSelect ? yearSelect.value : getCurrentAcademicYear();
  const validYear = selectedYear || getCurrentAcademicYear();

  if(yearSelect){
    const options = getAcademicYearOptions();
    if(!options.includes(validYear)){
      options.push(validYear);
    }
    yearSelect.innerHTML = options.map(year => `<option value="${year}">${formatAcademicYear(year)}</option>`).join('');
    yearSelect.value = validYear;
    yearSelect.onchange = () => renderReports();
  }

  const selectedYearActivities = [...acts]
    .filter(activity => (activity.academicYear || getAcademicYearForDate(activity.date)) === validYear)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const reportsByActivity = new Map();
  const reportSyncs = selectedYearActivities.map(async (activity) => {
    const reportSnap = await getDoc(doc(db, 'activityReports', activity.id));
    if(reportSnap.exists()){
      reportsByActivity.set(activity.id, reportSnap.data());
    }
  });
  await Promise.all(reportSyncs);

  const publishedActivities = [];
  const pendingActivities = [];
  selectedYearActivities.forEach(activity => {
    const report = reportsByActivity.get(activity.id);
    if(report && normalizeReportStatus(report.status) === 'published'){
      publishedActivities.push({ activity, report });
    } else {
      pendingActivities.push({ activity, report });
    }
  });

  const summary = await buildYearlySummary(selectedYearActivities);
  const categoryEntries = Object.entries(summary.categories || {}).map(([name, count]) => `
    <div class="yearly-category-item">
      <span>${esc(name)}</span>
      <strong>${count}</strong>
    </div>
  `).join('');

  const activityCards = selectedYearActivities.length ? selectedYearActivities.map(activity => {
    const report = reportsByActivity.get(activity.id);
    const reportLabel = report && normalizeReportStatus(report.status) === 'published' ? 'Published' : 'Draft';
    const reportStatusClass = report && normalizeReportStatus(report.status) === 'published' ? 'pill-green' : 'pill-amber';
    const details = report ? (report.details || report.summary || 'No detailed content recorded yet.') : 'No report yet.';
    return `
      <div class="report-card-item" id="report-card-${activity.id}">
        <div class="report-card-header">
          <div>
            <div class="mini-title">${esc(activity.name)}</div>
            <div class="report-meta-row">
              <span>${esc(activity.date || 'No date')}</span>
              <span>${esc(activity.venue || 'Venue not specified')}</span>
            </div>
          </div>
          <span class="pill ${reportStatusClass}">${reportLabel}</span>
        </div>
        <div class="report-card-body">
          <p><strong>Summary:</strong> ${esc(report?.summary || 'No summary available.')}</p>
          <p><strong>Details:</strong> ${esc(details).replace(/\n/g, '<br>')}</p>
          ${(report && Array.isArray(report.images) && report.images.length) ? `
            <div class="report-card-images">
              ${report.images.map(image => `<img src="${image}" alt="${esc(activity.name)}"/>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state">No activities found for this academic year.</div>';

  const pendingMarkup = pendingActivities.length ? `
    <div class="pending-report-box">
      <h4>Reports Pending</h4>
      <p>${pendingActivities.length} activities do not have published reports.</p>
      <ul>
        ${pendingActivities.slice(0, 10).map(({ activity }) => `
          <li>
            <span>${esc(activity.name)}</span>
            <button class="btn-xs btn-blue" onclick="openActivityForReport('${activity.id}')">Open Activity</button>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  const yearlyMarkup = `
    <div class="yearly-report-panel">
      <div class="yearly-header">
        <div>
          <div class="section-kicker">NSS UNIT D-58</div>
          <h3>YEARLY ACTIVITY REPORT</h3>
          <div class="year-tag">Academic Year: ${formatAcademicYear(validYear)}</div>
        </div>
        <button class="btn btn-blue" onclick="window.print()">🖨 Print / PDF</button>
      </div>

      <div class="yearly-summary-grid">
        <div class="summary-card"><span>Total Activities</span><strong>${summary.totalActivities}</strong></div>
        <div class="summary-card"><span>Total Participants</span><strong>${summary.totalParticipants}</strong></div>
        <div class="summary-card"><span>Total Attendance</span><strong>${summary.totalAttendance}</strong></div>
        <div class="summary-card"><span>Average Attendance</span><strong>${summary.averageAttendance}</strong></div>
      </div>

      <div class="yearly-category-box">
        <h4>Activity Categories</h4>
        <div class="yearly-category-grid">
          ${categoryEntries || '<div class="empty-state">No category data available yet.</div>'}
        </div>
      </div>

      <div class="yearly-activities-box">
        <h4>${formatAcademicYear(validYear)} ACTIVITIES</h4>
        ${publishedActivities.length ? publishedActivities.map(({ activity, report }) => `
          <article class="yearly-activity-item">
            <div class="yearly-activity-header">
              <div>
                <h5>${esc(activity.name)}</h5>
                <div class="yearly-activity-meta">
                  <span>Date: ${esc(activity.date || '—')}</span>
                  <span>Venue: ${esc(activity.venue || '—')}</span>
                  <span>Participants: ${summary.attendanceByActivity?.[activity.id] || 0}</span>
                </div>
              </div>
              <span class="pill pill-blue">Report: Published</span>
            </div>
            <div class="yearly-activity-body">
              <div class="yearly-report-content">${esc(report?.details || report?.summary || 'No report content available.').replace(/\n/g, '<br>')}</div>
              ${(report && Array.isArray(report.images) && report.images.length) ? `
                <div class="report-card-images">
                  ${report.images.map(image => `<img src="${image}" alt="${esc(activity.name)}"/>`).join('')}
                </div>
              ` : ''}
            </div>
          </article>
        `).join('') : '<div class="empty-state">No published reports available for this academic year.</div>'}
      </div>

      ${pendingMarkup}
    </div>
  `;

  reportList.innerHTML = `
    <div class="report-overview-block">
      <div class="report-section-title">Activity Reports</div>
      <div class="report-summary-row">
        <div class="mini-stat"><span>Total Activities</span><strong>${selectedYearActivities.length}</strong></div>
        <div class="mini-stat"><span>Published Reports</span><strong>${publishedActivities.length}</strong></div>
        <div class="mini-stat"><span>Draft Reports</span><strong>${pendingActivities.length}</strong></div>
      </div>
      ${activityCards}
    </div>
  `;

  yearlyReportPanel.innerHTML = yearlyMarkup;
}

async function uploadReportImage(file){
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'nss_profiles');

  const response = await fetch('https://api.cloudinary.com/v1_1/dstdl2ycg/image/upload', {
    method: 'POST',
    body: formData
  });

  if(!response.ok){
    throw new Error('Failed to upload image.');
  }

  const data = await response.json();
  return data.secure_url || data.url;
}

async function createReport(){
  const activityId = document.getElementById('reportActSel').value;
  const title = document.getElementById('reportTitle').value.trim();
  const summary = document.getElementById('reportSummary').value.trim();
  const details = document.getElementById('reportDetails').value.trim();
  const status = normalizeReportStatus(document.getElementById('reportStatus').value);
  const files = [...document.getElementById('reportImages').files];

  if(!activityId){
    showToast('Please select an activity before saving the report.', 'error');
    return;
  }

  if(!title && !summary && !details){
    showToast('Add a title, summary, or detailed report content before saving.', 'error');
    return;
  }

  const activity = acts.find(item => item.id === activityId);
  try{
    const imageUrls = [];
    for(const file of files){
      const uploadedUrl = await uploadReportImage(file);
      imageUrls.push(uploadedUrl);
    }

    const reportPayload = {
      activityId,
      activityName: activity?.name || '',
      title,
      summary,
      details,
      status,
      images: imageUrls,
      academicYear: activity?.academicYear || getAcademicYearForDate(activity?.date),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'activityReports', activityId), reportPayload, { merge: true });

    showToast('Activity report saved successfully.');
    document.getElementById('reportForm').style.display = 'none';
    document.getElementById('reportActSel').value = '';
    document.getElementById('reportStatus').value = 'draft';
    document.getElementById('reportTitle').value = '';
    document.getElementById('reportSummary').value = '';
    document.getElementById('reportDetails').value = '';
    document.getElementById('reportImages').value = '';
    reportFormOpen = false;
    renderReports();
  }catch(err){
    console.error(err);
    showToast('Failed to save the report. Please try again.', 'error');
  }
}

function toggleReportForm(){
  reportFormOpen = !reportFormOpen;
  const form = document.getElementById('reportForm');
  const button = document.getElementById('newReportBtn');
  if(form){
    form.style.display = reportFormOpen ? 'block' : 'none';
  }
  if(button){
    button.textContent = reportFormOpen ? '✕ Cancel' : '+ New Report';
    button.className = 'btn ' + (reportFormOpen ? 'btn-outline' : 'btn-blue');
  }
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
function populateAcademicYearSelect(){
  const sel=document.getElementById('actAcademicYear');
  if(!sel) return;
  const options = getAcademicYearOptions();
  sel.innerHTML = options.map(year => `<option value="${year}">${formatAcademicYear(year)}</option>`).join('');
  sel.value = getCurrentAcademicYear();
}

function renderActivities(){
  const q=document.getElementById('actSearch').value.toLowerCase();
  const filtered=acts.filter(a=>a.name.toLowerCase().includes(q)||a.date.includes(q));
  const list=document.getElementById('act-list');
  if(!filtered.length){list.innerHTML='<div class="empty"><div class="empty-icon">📅</div><p>No activities match your search.</p></div>';return;}
  list.innerHTML=filtered.map(a=>`
    <div class="act-card" id="activity-card-${a.id}">
      <div class="act-card-body">
        <div class="act-pills">
          <span class="act-name">${esc(a.name)}</span>
          ${pill(a.status,a.status==='Completed'?'pill-green':'pill-amber')}
          ${pill('📅 '+esc(a.date),'pill-blue')}
          ${(a.academicYear || getAcademicYearForDate(a.date)) ? `${pill('🎓 ' + formatAcademicYear(a.academicYear || getAcademicYearForDate(a.date)), 'pill-purple')}` : ''}
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
  const academicYear = document.getElementById('actAcademicYear') ? document.getElementById('actAcademicYear').value : getAcademicYearForDate(date);

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
      academicYear,

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

let academicYearSyncAttempted = false;

function loadActivities(){

  onSnapshot(collection(db,"activities"), async (snapshot)=>{

    acts = [];

    snapshot.forEach((docSnap)=>{

      acts.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    if(!academicYearSyncAttempted){
      academicYearSyncAttempted = true;
      await syncActivityAcademicYears();
    }

    renderActivities();
    renderDashboard();
    renderAttendanceSelects();
    renderReports();

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
  const reportSel=document.getElementById('reportActSel');
  const html = '<option value="">-- Choose an activity --</option>' + acts.map(a=>`<option value="${a.id}">${esc(a.name)} · ${esc(a.date)}</option>`).join('');
  sel.innerHTML = html;
  if(reportSel) reportSel.innerHTML = html;
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