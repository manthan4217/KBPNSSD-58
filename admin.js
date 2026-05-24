const tabLabels = {
  dashboard:'Dashboard',
  activities:'Activities',
  attendance:'Attendance',
  volunteers:'Volunteers',
  marks:'Marks',
  settings:'Settings'
};

let acts = [
  {
    id:1,
    name:'Green Army Drive',
    date:'2026-05-10',
    status:'Completed'
  },
  {
    id:2,
    name:'Blood Donation Camp',
    date:'2026-05-15',
    status:'Upcoming'
  },
  {
    id:3,
    name:'Mangroves Cleanup',
    date:'2026-05-22',
    status:'Completed'
  }
];

let vols = [
  {id:'NSS001',att:85},
  {id:'NSS002',att:90},
  {id:'NSS003',att:75}
];

let marks = [1,2,3,4,5];

function switchTab(tab){
  document.querySelectorAll('.tab').forEach(el=>{
    el.classList.remove('active');
  });

  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.classList.remove('active');
  });

  document.getElementById('tab-'+tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('hdrTitle').textContent = tabLabels[tab];
}

function renderDashboard(){

  const avgAttendance = Math.round(
    vols.reduce((a,b)=>a+b.att,0) / vols.length
  );

  const cards = [
    {
      icon:'👥',
      label:'Total Volunteers',
      value:vols.length,
      trend:'+2 this month',
      color:'#2563eb'
    },
    {
      icon:'📅',
      label:'Total Activities',
      value:acts.length,
      trend:'+1 new',
      color:'#10b981'
    },
    {
      icon:'📈',
      label:'Avg Attendance',
      value:avgAttendance+'%',
      trend:'↑ 3%',
      color:'#8b5cf6'
    },
    {
      icon:'📝',
      label:'Marks Assigned',
      value:marks.length,
      trend:'Updated',
      color:'#f59e0b'
    }
  ];

  document.getElementById('dash-cards').innerHTML = cards.map(card => `
    <div class="card">
      <div class="card-top">
        <span class="card-icon">${card.icon}</span>

        <span class="pill" style="background:${card.color}22;color:${card.color}">
          ${card.trend}
        </span>
      </div>

      <div class="card-val">${card.value}</div>
      <div class="card-lbl">${card.label}</div>
    </div>
  `).join('');

  document.getElementById('dash-recent').innerHTML = acts.map(act => `
    <tr>
      <td>${act.name}</td>
      <td>${act.date}</td>
      <td>
        <span class="pill ${act.status === 'Completed' ? 'pill-green' : 'pill-amber'}">
          ${act.status}
        </span>
      </td>
    </tr>
  `).join('');
}

function showToast(message){
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(()=>{
    toast.remove();
  },3000);
}

function openModal(id){
  document.getElementById(id).classList.add('open');
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

// SIDEBAR COLLAPSE
const collapseBtn = document.getElementById('collapseBtn');

collapseBtn.addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// NAVIGATION
const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach(button=>{
  button.addEventListener('click',()=>{
    switchTab(button.dataset.tab);
  });
});


// INITIALIZE
renderDashboard();