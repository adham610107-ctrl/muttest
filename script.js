diff --git a/script.js b/script.js
index eed63170fc6d026b81ec9550a44197640f0eeca9..733a8974bf51d38107c289ce44ae0365328487eb 100644
--- a/script.js
+++ b/script.js
@@ -80,53 +80,88 @@ async function idbGet(key) {
             req.onsuccess = () => res(req.result ? req.result.value : null);
             req.onerror = () => rej(req.error);
         });
     } catch(e) { return localStorage.getItem(key); }
 }
 async function idbSet(key, value) {
     try {
         const db = await openIDB();
         return new Promise((res,rej) => {
             const tx = db.transaction('kv','readwrite');
             tx.objectStore('kv').put({key,value});
             tx.oncomplete = () => res(true);
             tx.onerror = () => rej(tx.error);
         });
     } catch(e) { localStorage.setItem(key,value); }
 }
 async function getOrCreateDeviceId() {
     let d = await idbGet('adham_pro_device_id');
     if (!d) { d = 'dev_'+Math.random().toString(36).substr(2,9)+'_'+Date.now(); await idbSet('adham_pro_device_id',d); }
     return d;
 }
 
 // ===== PWA =====
 if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e=>console.log('SW:',e)));
 let deferredPrompt;
-window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; const b=document.getElementById('install-app-btn'); if(b)b.classList.remove('hidden'); });
-document.addEventListener('DOMContentLoaded', () => { const b=document.getElementById('install-app-btn'); if(b) b.addEventListener('click', async()=>{ if(!deferredPrompt)return; deferredPrompt.prompt(); const{outcome}=await deferredPrompt.userChoice; if(outcome==='accepted')b.classList.add('hidden'); deferredPrompt=null; }); });
-window.addEventListener('appinstalled', () => { const b=document.getElementById('install-app-btn'); if(b)b.classList.add('hidden'); deferredPrompt=null; });
+
+function setInstallButtonState() {
+    const b = document.getElementById('install-app-btn');
+    if (!b) return;
+    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
+    if (deferredPrompt && !isStandalone) {
+        b.classList.remove('hidden');
+        b.classList.add('ready');
+        b.disabled = false;
+    } else {
+        b.classList.add('hidden');
+        b.classList.remove('ready');
+        b.disabled = true;
+    }
+}
+
+window.addEventListener('beforeinstallprompt', e => {
+    e.preventDefault();
+    deferredPrompt = e;
+    setInstallButtonState();
+});
+
+document.addEventListener('DOMContentLoaded', () => {
+    const b = document.getElementById('install-app-btn');
+    setInstallButtonState();
+    if (b) b.addEventListener('click', async () => {
+        if (!deferredPrompt) return;
+        deferredPrompt.prompt();
+        const { outcome } = await deferredPrompt.userChoice;
+        if (outcome === 'accepted') deferredPrompt = null;
+        setInstallButtonState();
+    });
+});
+
+window.addEventListener('appinstalled', () => {
+    deferredPrompt = null;
+    setInstallButtonState();
+});
 
 // ===== SECURITY =====
 function copyCard() {
     const el = document.getElementById("card-num") || document.getElementById("card-num-donate");
     const t  = el ? el.innerText : "9860350141282409";
     navigator.clipboard.writeText(t).then(()=>alert("✓ Karta raqami nusxalandi: "+t)).catch(()=>alert("Karta: "+t));
 }
 document.addEventListener('contextmenu', e => e.preventDefault());
 document.addEventListener('keydown', function(e) {
     if (e.keyCode===123||(e.ctrlKey&&e.shiftKey&&(e.keyCode===73||e.keyCode===74))||(e.ctrlKey&&e.keyCode===85)) { e.preventDefault(); return false; }
     if (e.ctrlKey&&e.keyCode===67) { e.preventDefault(); alert("⚠ Nusxalash (Ctrl+C) qat'iyan taqiqlangan!"); return false; }
 });
 let cheatWarnings = 0;
 document.addEventListener("visibilitychange", () => {
     const ts = document.getElementById("test-screen");
     if (ts && !ts.classList.contains("hidden") && document.hidden) {
         cheatWarnings++;
         if (cheatWarnings >= 3) { alert("❌ 3 marta oynadan chiqdingiz. Sessiya avtomatik yakunlandi!"); finishExam(true); }
         else alert(`⚠ OGOHLANTIRISH (${cheatWarnings}/3)\nBoshqa oynaga o'tish test sessiyasini yakunlaydi!`);
     }
 });
 
 // ===== AUTOKICK — every 30s =====
 let blockCheckInterval=null, heartbeatInterval=null;
 async function checkAdminBlock() {
@@ -312,91 +347,89 @@ window.onload = async () => {
     const isAuth=localStorage.getItem('pro_exam_auth');
     if (isAuth==='true') {
         const name=localStorage.getItem('pro_exam_name')||'Talaba';
         const snEl=document.getElementById('student-name'); if(snEl)snEl.value=name;
         const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
         currentUser=name;
         document.getElementById('global-nav').classList.remove('hidden');
         const authScreen=document.getElementById('auth-screen');
         if (authScreen&&!authScreen.classList.contains('hidden')) switchScreen('auth-screen','welcome-screen');
         // Load stats from Google Sheets on startup
         await loadUserStats(name);
         checkAdminBlock(); startBlockCheck(); startHeartbeat();
     }
     if (localStorage.getItem('theme')==='dark') { document.body.classList.replace('light-mode','dark-mode'); const s=document.getElementById('theme-slider'); if(s)s.checked=true; }
     if (localStorage.getItem('comfort_eye')==='on') applyComfortEye(true);
     applyIOSNotchFix();
     updateDashboardStats(); updateDailyStreak(); updateGreeting(); updateProgressChart(currentChartPeriod); updateCategoryProgress();
 };
 
 // ===== THEME — EyeComfort dark mode fix =====
 function toggleTheme() {
     const slider=document.getElementById('theme-slider');
     if (slider&&slider.checked) {
         document.body.classList.replace('light-mode','dark-mode');
         localStorage.setItem('theme','dark');
-        // Remove sepia filter in dark mode (prevents white flash)
-        document.body.classList.remove('comfort-eye');
-        const btn=document.getElementById('comfortEyeToggle');
-        if(btn)btn.classList.remove('eye-active');
-        const oe=document.getElementById('eye-open-icon'),ce=document.getElementById('eye-closed-icon');
-        if(ce)ce.classList.add('active-eye'); if(oe)oe.classList.remove('active-eye');
+        // Dark mode yoqilganda Comfort Eye avtomatik o'chadi
+        applyComfortEye(false);
     } else {
         document.body.classList.replace('dark-mode','light-mode');
         localStorage.setItem('theme','light');
         if (localStorage.getItem('comfort_eye')==='on') applyComfortEye(true);
     }
 }
 
-// Night mode + comfort eye: dark-mode uchun alohida sinf, sepia yo'q
 function applyComfortEye(on) {
     const btn=document.getElementById('comfortEyeToggle');
     const oe=document.getElementById('eye-open-icon'),ce=document.getElementById('eye-closed-icon');
     const isDark=document.body.classList.contains('dark-mode');
-    if (on) {
-        if (!isDark) {
-            // Light mode — warm amber filter
-            document.body.classList.add('comfort-eye');
-            document.body.classList.remove('comfort-eye-dark');
-        } else {
-            // Dark mode — safe warm tint (no white bg flash)
-            document.body.classList.remove('comfort-eye');
-            document.body.classList.add('comfort-eye-dark');
-        }
+
+    // Dark mode bilan Comfort Eye birga ishlatilmaydi
+    const finalOn = on && !isDark;
+
+    document.body.classList.toggle('comfort-eye', finalOn);
+    document.body.classList.remove('comfort-eye-dark');
+
+    if(finalOn){
         if(btn)btn.classList.add('eye-active');
-        if(oe)oe.classList.add('active-eye'); if(ce)ce.classList.remove('active-eye');
+        if(oe)oe.classList.add('active-eye');
+        if(ce)ce.classList.remove('active-eye');
         localStorage.setItem('comfort_eye','on');
     } else {
-        document.body.classList.remove('comfort-eye');
-        document.body.classList.remove('comfort-eye-dark');
         if(btn)btn.classList.remove('eye-active');
-        if(ce)ce.classList.add('active-eye'); if(oe)oe.classList.remove('active-eye');
+        if(ce)ce.classList.add('active-eye');
+        if(oe)oe.classList.remove('active-eye');
         localStorage.setItem('comfort_eye','off');
     }
 }
 function toggleComfortEye() {
-    const isOn=document.body.classList.contains('comfort-eye')||document.body.classList.contains('comfort-eye-dark');
+    // Dark mode bo'lsa Comfort Eye yoqilmaydi
+    if (document.body.classList.contains('dark-mode')) {
+        applyComfortEye(false);
+        return;
+    }
+    const isOn=document.body.classList.contains('comfort-eye');
     applyComfortEye(!isOn);
 }
 
 // ===== SCREEN NAV =====
 function switchScreen(hideId,showId) {
     forceCloseAllModals();
     document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.classList.add('hidden');});
     const el=document.getElementById(showId); if(el){el.classList.remove('hidden');el.classList.add('active');}
 }
 
 // handleLogin — loads user stats from CloudDB before dashboard
 async function handleLogin() {
     const name=document.getElementById('student-name').value.trim();
     if (name.length<2) return alert("Ismingizni kiriting!");
     if (name.toLowerCase()==='adham') alert("Assalomu alaykum, Admin (Creator)! 🔑\nSizga maxsus rejim yoqildi.");
     currentUser=name;
     const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
     if (audioCtx.state==='suspended') audioCtx.resume();
     document.getElementById('global-nav').classList.remove('hidden');
     // Show loading while fetching cloud stats
     const loginBtn=document.querySelector('#welcome-screen .btn-primary');
     if(loginBtn){loginBtn.innerText="☁ Yuklanmoqda...";loginBtn.disabled=true;}
     await loadUserStats(name);
     if(loginBtn){loginBtn.innerText="Sessiyani Boshlash 🚀";loginBtn.disabled=false;}
     switchScreen('welcome-screen','dashboard-screen');
