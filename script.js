// ============================================================
// PRO EXAM v12 — Main Script
// Full Google Sheets CloudDB sync, iOS 26 UI, Comfort Eye Fix,
// Progress Chart Red Line Fix, Timer Fix & Liquid Gyroscope
// ============================================================

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC4-Axk2bQsnHJYxMhzn0fblk48j2fWAheHhCxJF5as8fH-NKlIgV0-C7uO6mQfHAM/exec";
const DB_URL            = "https://script.google.com/macros/s/AKfycbz5f2V0eKXyglWPZ6tiWC0P1ASBjJc4d_9nKfWoCYJSHhPJSn5opLxkIRamjfp3UuiyMA/exec";

const subjectNames = { musiqa_nazariyasi: "Musiqa nazariyasi", cholgu_ijrochiligi: "Cholg'u ijrochiligi", vokal_ijrochiligi: "Vokal ijrochiligi", metodika_repertuar: "Metodika" };

// ===== GOOGLE SHEETS DB (TEGILMAGAN) =====
async function dbSave(key, value) { try { await fetch(DB_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'set', key, value: JSON.stringify(value) }) }); } catch(e) {} }
async function dbLoad(key) { try { const r = await fetch(DB_URL + '?action=get&key=' + encodeURIComponent(key)); const j = await r.json(); if (j && j.value != null) return JSON.parse(j.value); } catch(e) {} return null; }
async function saveLeaderboard(user, score, subject, mode) { try { await fetch(DB_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action:'leaderboard', user, score, subject, mode, date: new Date().toISOString() }) }); } catch(e) {} }
async function sendLog(type, data) { try { await fetch(DB_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action:'log', type, data, user: localStorage.getItem('pro_exam_name')||'unknown', date: new Date().toISOString() }) }); } catch(e) {} }
let dbSaveTimer = null; function scheduledDbSave() { if (dbSaveTimer) clearTimeout(dbSaveTimer); dbSaveTimer = setTimeout(() => { if (currentUser) dbSave('stats_' + currentUser, stats); }, 2000); }

// ===== IDB (TEGILMAGAN) =====
const IDB_NAME = 'adham_pro_db', IDB_VERSION = 1; let dbInstance = null;
function openIDB() { return new Promise((res,rej) => { if (dbInstance) { res(dbInstance); return; } const req = indexedDB.open(IDB_NAME, IDB_VERSION); req.onupgradeneeded = e => { const db=e.target.result; if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv',{keyPath:'key'}); }; req.onsuccess = e => { dbInstance=e.target.result; res(dbInstance); }; req.onerror = () => rej(req.error); }); }
async function idbGet(key) { try { const db = await openIDB(); return new Promise((res,rej) => { const tx = db.transaction('kv','readonly'); const req = tx.objectStore('kv').get(key); req.onsuccess = () => res(req.result ? req.result.value : null); req.onerror = () => rej(req.error); }); } catch(e) { return localStorage.getItem(key); } }
async function idbSet(key, value) { try { const db = await openIDB(); return new Promise((res,rej) => { const tx = db.transaction('kv','readwrite'); tx.objectStore('kv').put({key,value}); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }); } catch(e) { localStorage.setItem(key,value); } }
async function getOrCreateDeviceId() { let d = await idbGet('adham_pro_device_id'); if (!d) { d = 'dev_'+Math.random().toString(36).substr(2,9)+'_'+Date.now(); await idbSet('adham_pro_device_id',d); } return d; }

// ===== PWA INSTALL BUG FIX =====
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.log('SW error:', e))); }
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; const b = document.getElementById('install-app-btn'); if (b) b.classList.remove('hidden'); });
document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('install-app-btn'); if (!b) return; b.addEventListener('click', async () => { if (!deferredPrompt) return; try { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') b.classList.add('hidden'); } catch (err) {} finally { deferredPrompt = null; } }); });
window.addEventListener('appinstalled', () => { const b = document.getElementById('install-app-btn'); if (b) b.classList.add('hidden'); deferredPrompt = null; });

// ===== SECURITY & AUTOKICK (TEGILMAGAN) =====
function copyCard() { const el = document.getElementById("card-num") || document.getElementById("card-num-donate"); const t = el ? el.innerText : "9860350141282409"; navigator.clipboard.writeText(t).then(()=>alert("✓ Karta raqami nusxalandi: "+t)); }
document.addEventListener('contextmenu', e => e.preventDefault());
let cheatWarnings = 0;
document.addEventListener("visibilitychange", () => { const ts = document.getElementById("test-screen"); if (ts && !ts.classList.contains("hidden") && document.hidden) { cheatWarnings++; if (cheatWarnings >= 3) { alert("❌ 3 marta oynadan chiqdingiz. Sessiya avtomatik yakunlandi!"); finishExam(true); } else alert(`⚠ OGOHLANTIRISH (${cheatWarnings}/3)\nBoshqa oynaga o'tish test sessiyasini yakunlaydi!`); } });
let blockCheckInterval=null, heartbeatInterval=null;
async function checkAdminBlock() { const savedName = localStorage.getItem('pro_exam_name'); if (!savedName) return; try { const r = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body: JSON.stringify({action:"check_block",login:savedName}) }); const result = await r.json(); if (result.blocked) { sendLog('autokick', {reason:'admin_block',login:savedName}); localStorage.removeItem('pro_exam_auth'); localStorage.removeItem('pro_exam_name'); alert("🚫 Admin tomonidan bloklangansiz!"); location.reload(); } } catch(e) {} }
function startBlockCheck() { if (blockCheckInterval) clearInterval(blockCheckInterval); blockCheckInterval = setInterval(() => { if(localStorage.getItem('pro_exam_auth') === 'true') checkAdminBlock(); else clearInterval(blockCheckInterval); }, 30000); }
function startHeartbeat() { if (heartbeatInterval) clearInterval(heartbeatInterval); heartbeatInterval = setInterval(() => { if(localStorage.getItem('pro_exam_auth')==='true'&&!document.hidden) checkAdminBlock(); }, 45000); }

async function authenticateUser() {
    const loginVal = document.getElementById('auth-login').value.trim(), passVal = document.getElementById('auth-password').value.trim(), keygenVal = document.getElementById('auth-keygen').value.trim(), errorEl = document.getElementById('auth-error'), btn = document.getElementById('btn-auth');
    if (!loginVal||!passVal) { errorEl.innerText="Login va Parol majburiy!"; errorEl.classList.remove('hidden'); return; }
    btn.innerText="Tekshirilmoqda..."; btn.disabled=true; errorEl.classList.add('hidden');
    try { const deviceId = await getOrCreateDeviceId(); const r = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body: JSON.stringify({login:loginVal,password:passVal,keygen:keygenVal,deviceId}) }); const result = await r.json(); if (result.success) { localStorage.setItem('pro_exam_auth','true'); localStorage.setItem('pro_exam_name', result.name||loginVal); document.getElementById('student-name').value = result.name||loginVal; switchScreen('auth-screen','welcome-screen'); startBlockCheck(); startHeartbeat(); } else { errorEl.innerText=result.message||"Xato ma'lumotlar!"; errorEl.classList.remove('hidden'); } } catch(e) { errorEl.innerText="Tarmoqda xatolik."; errorEl.classList.remove('hidden'); } finally { btn.innerText="Kirish · Tasdiqlash"; btn.disabled=false; }
}

// ===== GLOBAL STATE =====
let bank=[],currentTest=[],userAnswers=[],currentIndex=0, currentUser=null, timerInterval;
let stats=JSON.parse(localStorage.getItem('adham_pro_stats'))||{learned:[],errors:[],history:[]};
let pendingSubject=null, pendingLevelQs=[], testType=null, diffTime=900, orderMode='random', isExamMode=false, testModeName="", currentChartPeriod='daily';

function switchScreen(hideId,showId) { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.classList.add('hidden');}); const el=document.getElementById(showId); if(el){el.classList.remove('hidden');el.classList.add('active');} }
function closeModal(e,id) { if(e.target.id===id) document.getElementById(id).style.display='none'; }
function closeModalDirect(id) { document.getElementById(id).style.display='none'; }

// ===== THEME & COMFORT EYE BUG FIX =====
function toggleTheme() {
    const slider = document.getElementById('theme-slider');
    if (slider && slider.checked) {
        document.body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark');
        applyComfortEye(false); // Dark Mode da Comfort Eye o'chadi
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light');
        if (localStorage.getItem('comfort_eye') === 'on') applyComfortEye(true);
    }
}
function applyComfortEye(on) {
    if (on && document.body.classList.contains('dark-mode')) return;
    const btn = document.getElementById('comfortEyeToggle'), oe = document.getElementById('eye-open-icon'), ce = document.getElementById('eye-closed-icon');
    if (on) { document.body.classList.add('comfort-eye'); if(btn)btn.classList.add('eye-active'); if(oe)oe.classList.add('active-eye'); if(ce)ce.classList.remove('active-eye'); localStorage.setItem('comfort_eye', 'on'); } 
    else { document.body.classList.remove('comfort-eye'); if(btn)btn.classList.remove('eye-active'); if(ce)ce.classList.add('active-eye'); if(oe)oe.classList.remove('active-eye'); localStorage.setItem('comfort_eye', 'off'); }
}
function toggleComfortEye() {
    if (document.body.classList.contains('dark-mode')) return alert("Comfort Eye faqat yorug' rejimda ishlaydi!");
    applyComfortEye(!document.body.classList.contains('comfort-eye'));
}

// ===== DATA LOADING =====
async function loadData() {
    const files=['musiqa_nazariyasi.json','cholgu_ijrochiligi.json','vokal_ijrochiligi.json','metodika_repertuar.json']; let globalId=1;
    for (const f of files) { try { const res=await fetch(f); const data=await res.json(); const subName=f.replace('.json',''); data.forEach(q=>{ const opts=q.options.filter(o=>o!==null&&o!==undefined&&o.toString().trim()!==''); const uniqueOpts=[...new Set(opts)]; const correctText=q.options[q.answer]; if(uniqueOpts.length===3) uniqueOpts.push("Barcha javoblar to'g'ri"); bank.push({id:globalId++,subject:subName,q:q.q,originalOpts:uniqueOpts,correctText}); }); } catch(e) {} }
    const el=document.getElementById('max-learned-total'); if(el)el.innerText=`/ ${bank.length}`;
}
async function loadUserStats(userName) {
    try { const cloudStats = await dbLoad('stats_' + userName); if (cloudStats) { const localRaw = localStorage.getItem('adham_pro_stats'); const localStats = localRaw ? JSON.parse(localRaw) : {learned:[],errors:[],history:[]}; const mergedLearned = [...new Set([...(localStats.learned||[]), ...(cloudStats.learned||[])])]; const mergedErrors = [...new Set([...(localStats.errors||[]), ...(cloudStats.errors||[])])].filter(id=>!mergedLearned.includes(id)); const histMap={}; [...(cloudStats.history||[]), ...(localStats.history||[])].forEach(h=>{ if (!histMap[h.date]) histMap[h.date]={...h}; else { histMap[h.date].correct=Math.max(histMap[h.date].correct,h.correct||0); histMap[h.date].errors=Math.max(histMap[h.date].errors,h.errors||0); } }); const mergedHistory=Object.values(histMap).sort((a,b)=>a.date.localeCompare(b.date)); stats={learned:mergedLearned, errors:mergedErrors, history:mergedHistory}; localStorage.setItem('adham_pro_stats', JSON.stringify(stats)); dbSave('stats_' + userName, stats); } } catch(e) {}
}

window.onload = async () => {
    await loadData(); const isAuth=localStorage.getItem('pro_exam_auth');
    if (isAuth==='true') { const name=localStorage.getItem('pro_exam_name')||'Talaba'; document.getElementById('student-name').value=name; document.getElementById('display-name').innerText=name; currentUser=name; document.getElementById('global-nav').classList.remove('hidden'); switchScreen('auth-screen','welcome-screen'); await loadUserStats(name); checkAdminBlock(); startBlockCheck(); startHeartbeat(); }
    if (localStorage.getItem('theme')==='dark') { document.body.classList.replace('light-mode','dark-mode'); const s=document.getElementById('theme-slider'); if(s)s.checked=true; }
    if (localStorage.getItem('comfort_eye')==='on') applyComfortEye(true);
    updateDashboardStats();
};

async function handleLogin() {
    const name=document.getElementById('student-name').value.trim(); if (name.length<2) return alert("Ismingizni kiriting!");
    currentUser=name; document.getElementById('display-name').innerText=name; document.getElementById('global-nav').classList.remove('hidden');
    await loadUserStats(name); switchScreen('welcome-screen','dashboard-screen');
    updateDashboardStats(); updateProgressChart(currentChartPeriod); updateCategoryProgress();
    
    // Request Gyroscope Permission iOS
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(() => {});
    }
}
function goHome() { clearInterval(timerInterval); document.getElementById('exit-test-btn').classList.add('hidden'); switchScreen('test-screen','dashboard-screen'); updateDashboardStats(); updateProgressChart(currentChartPeriod); updateCategoryProgress(); }
function confirmExit() { if(confirm("Testdan chiqishni xohlaysizmi?\nJoriy natijalar yo'qoladi.")) goHome(); }
function logout() { if(confirm("Tizimdan chiqishni xohlaysizmi?")) { localStorage.removeItem('pro_exam_auth'); location.reload(); } }

// ===== DASHBOARD STATS & CHART FIX =====
function updateDashboardStats() {
    stats.learned=[...new Set(stats.learned)]; stats.errors=[...new Set(stats.errors)]; localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    if (currentUser) scheduledDbSave();
    const lc=document.getElementById('learned-count'), ec=document.getElementById('error-count');
    if(lc)lc.innerText=stats.learned.length; if(ec)ec.innerText=stats.errors.length;
    const eb=document.getElementById('error-work-btn'); if(eb)eb.disabled=stats.errors.length===0;
}
function updateCategoryProgress(){ ['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{ const subQs=bank.filter(q=>q.subject===sub); if(!subQs.length)return; const learned=subQs.filter(q=>stats.learned.includes(q.id)).length; const el=document.getElementById('prog-'+sub); if(el)el.innerText=Math.round((learned/subQs.length)*100)+'%'; }); }

function setChartPeriod(period,btn){currentChartPeriod=period;document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateProgressChart(period);}
function getHistoryByPeriod(period){
    const history=stats.history||[], now=new Date(); let labels=[], correctData=[], errorData=[];
    for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); const entry=history.find(h=>h.date===key)||{correct:0,errors:0}; labels.push(d.toLocaleDateString('uz',{weekday:'short'})); correctData.push(entry.correct||0); errorData.push(entry.errors||0); }
    return{labels,correctData,errorData};
}

// BUG FIX: Qizil grafikning chiqishi va aniq ko'rinishi uchun draw order va stroke qalinligi o'zgartirildi
function updateProgressChart(period){
    const canvas=document.getElementById('progressChart'); if(!canvas)return;
    const ctx=canvas.getContext('2d'); const {labels,correctData,errorData}=getHistoryByPeriod(period);
    const dpr=window.devicePixelRatio||1, W=canvas.offsetWidth||300, H=100;
    canvas.width=W*dpr; canvas.height=H*dpr; ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
    const maxVal=Math.max(...correctData,...errorData,1), padL=10, padR=10, padT=10, padB=20, chartW=W-padL-padR, chartH=H-padT-padB, step=chartW/(labels.length-1||1);
    
    function drawLine(data, color){
        if(data.every(v => v === 0)) return; // 0 bo'lsa chizmasin
        ctx.beginPath(); data.forEach((v,i)=>{ const x=padL+i*step, y=padT+chartH-(v/maxVal)*chartH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
        ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.stroke();
        data.forEach((v,i)=>{ const x=padL+i*step, y=padT+chartH-(v/maxVal)*chartH; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); });
    }
    // Xatolar qizil chizig'i birinchi ustiga chizilishi uchun to'g'rilandi
    drawLine(correctData,'rgb(48,209,88)');
    drawLine(errorData,'rgb(255,69,58)'); 
    
    ctx.fillStyle=document.body.classList.contains('dark-mode')?'#8E8E93':'#6B7280'; ctx.font='600 10px DM Sans'; ctx.textAlign='center';
    labels.forEach((l,i)=>ctx.fillText(l, padL+i*step, H-5));
}

// ===== TEST SETUP & LIQUID GYRO ENGINE =====
function openLevels(sub,title){ document.getElementById('setup-screen').style.display='flex'; pendingSubject=sub; testType='sub_mix'; }
function openChapters(){ document.getElementById('setup-screen').style.display='flex'; testType='mix_800'; }
function prepareTest(type){ testType=type; document.getElementById('setup-screen').style.display='flex'; }
function setDifficulty(level,btn){ document.querySelectorAll('.difficulty-control .seg-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); diffTime=level==='easy'?1200:level==='medium'?900:600; }
function setOrder(mode,btn){ document.querySelectorAll('.order-control .seg-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); orderMode=mode; }

function applySetup(){
    document.getElementById('setup-screen').style.display='none';
    let pool=[...bank].sort((a,b)=>a.id-b.id);
    if(testType==='mix_800') pool=pool.sort(()=>Math.random()-0.5).slice(0,20);
    else if(testType==='errors') pool=pool.filter(q=>stats.errors.includes(q.id)).sort(()=>Math.random()-0.5).slice(0,20);
    else if(testType==='sub_mix') pool=pool.filter(q=>q.subject===pendingSubject).sort(()=>Math.random()-0.5).slice(0,20);
    if(orderMode==='random') pool=pool.sort(()=>Math.random()-0.5);
    currentTest=pool; startTestSession();
}
function startExamMode(){ document.getElementById('setup-screen').style.display='none'; testType='exam'; isExamMode=true; currentTest=bank.sort(()=>Math.random()-0.5).slice(0,30); diffTime=3600; startTestSession(); }

function startTestSession(){
    switchScreen('dashboard-screen','test-screen'); document.getElementById('exit-test-btn').classList.remove('hidden');
    currentIndex=0; userAnswers=new Array(currentTest.length).fill(null);
    currentTest=currentTest.map(q=>{const shuffled=[...q.originalOpts].sort(()=>Math.random()-0.5);return{...q,options:shuffled,answer:shuffled.indexOf(q.correctText)};});
    clearInterval(timerInterval); startTimer(diffTime); renderAllQuestions(); initGyro();
}

// LIQUID GYROSCOPE LISTENER
function initGyro() {
    window.removeEventListener('deviceorientation', handleGyro);
    window.addEventListener('deviceorientation', handleGyro);
}
function handleGyro(e) {
    const gamma = e.gamma || 0; // chapga-o'ngga og'ish (-90 dan 90 gacha)
    const tilt = Math.max(-40, Math.min(40, gamma)); // Qattiq aylanishni chegaralaymiz
    document.querySelectorAll('.liquid-gyro').forEach(el => {
        el.style.transform = `rotate(${tilt}deg)`;
    });
}
function updateLiquid() {
    const correctCount = userAnswers.filter(a => a && a.isCorrect).length;
    let fillPercent = (correctCount / currentTest.length) * 100;
    let topVal = 100 - (fillPercent * 1.1); // Suv balandligi (100% da to'liq to'ladi)
    
    document.querySelectorAll('.liquid-wave').forEach(el => {
        el.style.top = `${topVal}%`;
    });
}

function renderAllQuestions(){
    const area=document.getElementById('all-questions-area'); if(!area)return;
    area.innerHTML=currentTest.map((q,idx)=>{
        const opts=q.options.map((opt,optIdx)=>`<button class="option-btn" id="btn-${idx}-${optIdx}" onclick="checkAns(${idx},${optIdx},event)" ${userAnswers[idx]?'disabled':''}>${opt}</button>`).join('');
        // BUG FIX: Timer bu yerda joylashdi (Rasmdagi kabi). Liquid HTML q-block orqasiga qo'shildi.
        return `
        <div class="q-block ${idx===currentIndex?'active-q':'blurred-q'}" id="q-block-${idx}">
            <div class="liquid-wrapper">
                <div class="liquid-gyro"><div class="liquid-wave"></div></div>
            </div>
            <div class="q-content-relative">
                <div class="q-meta">
                    <div class="q-meta-left">
                        <button class="tts-btn" onclick="speakQuestion(${idx})">🔊</button>
                        <div class="spin-box" id="spin-${idx}">${idx+1}</div>
                        <span>Savol ${idx+1} / ${currentTest.length}</span>
                    </div>
                    <div class="exam-timer">00:00</div>
                </div>
                <div class="q-text">${q.q}</div>
                <div class="options-box" id="opts-${idx}">${opts}</div>
            </div>
        </div>`;
    }).join('');
    updateMap(); scrollToActive(); updateLiquid();
}

function startTimer(seconds){
    let time=seconds;
    timerInterval=setInterval(()=>{
        time--; const m=Math.floor(time/60), s=time%60; const str = `${m}:${s<10?'0'+s:s}`;
        document.querySelectorAll('.exam-timer').forEach(el => el.innerText = str);
        if(time<=0){ clearInterval(timerInterval); showResult(userAnswers.filter(a=>a?.isCorrect).length); }
    },1000);
}

const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playFeedback(type) { if (audioCtx.state==='suspended') audioCtx.resume(); const osc=audioCtx.createOscillator(), gain=audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); if(type==='correct'){osc.type='sine'; osc.frequency.setValueAtTime(600,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200,audioCtx.currentTime+0.1); gain.gain.setValueAtTime(0.2,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.1); osc.start(); osc.stop(audioCtx.currentTime+0.1);} else {osc.type='sawtooth'; osc.frequency.setValueAtTime(300,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100,audioCtx.currentTime+0.2); gain.gain.setValueAtTime(0.2,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.2); osc.start(); osc.stop(audioCtx.currentTime+0.2);} }
function speakQuestion(idx) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const msg=new SpeechSynthesisUtterance(currentTest[idx].q); msg.lang='uz-UZ'; msg.rate=0.9; window.speechSynthesis.speak(msg); } }

function checkAns(qIdx,optIdx,event){
    if(qIdx!==currentIndex||userAnswers[qIdx])return;
    const isCorrect=optIdx===currentTest[qIdx].answer; userAnswers[qIdx]={selected:optIdx,isCorrect}; const qId=currentTest[qIdx].id; const btn=document.getElementById(`btn-${qIdx}-${optIdx}`);
    if(isCorrect){ if(!stats.learned.includes(qId))stats.learned.push(qId); stats.errors=stats.errors.filter(id=>id!==qId); btn.classList.add('magic-correct'); playFeedback('correct'); }
    else { if(!stats.errors.includes(qId))stats.errors.push(qId); btn.classList.add('magic-wrong'); playFeedback('wrong'); document.getElementById('restart-mini-btn').classList.remove('hidden'); }
    
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats)); scheduledDbSave();
    const opts=document.getElementById(`opts-${qIdx}`).getElementsByTagName('button'); for(const b of opts)b.disabled=true;
    if(userAnswers.filter(a=>a!==null).length===currentTest.length) document.getElementById('finish-btn').classList.remove('hidden');
    
    updateLiquid(); // Suv satrini yangilash
    
    setTimeout(()=>{ const next=userAnswers.findIndex(a=>a===null); if(next!==-1){currentIndex=next;updateFocus();} },800);
}

function updateFocus(){ for(let i=0;i<currentTest.length;i++){const b=document.getElementById(`q-block-${i}`);if(b){if(i===currentIndex){b.classList.remove('blurred-q');b.classList.add('active-q');}else{b.classList.remove('active-q');b.classList.add('blurred-q');}}} scrollToActive(); updateMap(); }
function scrollToActive(){const ab=document.getElementById(`q-block-${currentIndex}`);if(ab)ab.scrollIntoView({behavior:'smooth',block:'center'});}
function updateMap(){ const answered=userAnswers.filter(a=>a!==null).length; document.getElementById('progress-fill').style.width=`${(answered/currentTest.length)*100}%`; document.getElementById('indicator-map').innerHTML=currentTest.map((_,i)=>`<div class="dot ${i===currentIndex?'active-dot':''} ${userAnswers[i]?(userAnswers[i].isCorrect?'correct':'wrong'):''}" onclick="goTo(${i})">${i+1}</div>`).join(''); }
function move(step){const n=currentIndex+step;if(n>=0&&n<currentTest.length){currentIndex=n;updateFocus();}}
function goTo(i){currentIndex=i;updateFocus();}
function confirmRestart(){ document.getElementById('modal-restart').style.display='flex'; }
function doRestart(){ document.getElementById('modal-restart').style.display='none'; clearInterval(timerInterval); startTestSession(); }

function finishExam(){
    clearInterval(timerInterval); const correctCount=userAnswers.filter(a=>a?.isCorrect).length;
    const today=new Date().toISOString().slice(0,10); const existing=stats.history.find(h=>h.date===today);
    if(existing){existing.correct+=correctCount; existing.errors+=(currentTest.length-correctCount);} else {stats.history.push({date:today,correct:correctCount,errors:(currentTest.length-correctCount)});}
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    document.getElementById('result-percent').innerText=`${Math.round((correctCount/currentTest.length)*100)}%`; document.getElementById('modal-result').style.display='flex';
}
