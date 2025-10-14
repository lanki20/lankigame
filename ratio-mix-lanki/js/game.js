// v4.6 — '比' uses a:b pair inputs, cute large sliders, keep constraints from v4.5
(() => {
  "use strict";
  const el = (id) => document.getElementById(id);
  const overlay = el("jarOverlay");
  const glass = el("glass"), ctx = glass.getContext("2d");
  const scoreEl = el("score"), bestEl = el("best"), levelEl = el("level"), levelTotalEl = el("levelTotal"), timerEl = el("timer");
  const promptArea = el("promptArea"), sugarRange=el("sugarRange"), waterRange=el("waterRange"), sugarVal=el("sugarVal"), waterVal=el("waterVal"), ratioInput=el("ratioInput");
  const ratioBox=el("ratioBox"), pairBox=el("pairBox"), pairA=el("pairA"), pairB=el("pairB");
  const btnMix=el("btnMix"), btnReset=el("btnReset"), btnReview=el("btnReview"), btnExportCSV=el("btnExportCSV"), btnClearLogs=el("btnClearLogs");
  const face=el("face"), msg=el("msg"), modal=el("modal"), modalTitle=el("modalTitle"), modalContent=el("modalContent"), btnCloseModal=el("btnCloseModal"), studentNameInput=el("studentName");
  const confettiCanvas = document.getElementById("celebrate"); const conf = confettiCanvas.getContext("2d");

  const LEVELS = [
    {"type":"ratio","target":{"sugar":2,"water":9},"sugarStep":1,"waterStep":3,"cap":45},
    {"type":"ratio","target":{"sugar":4,"water":11},"sugarStep":2,"waterStep":1,"cap":55},
    {"type":"greater","threshold":{"num":1,"den":5},"sugarStep":3,"waterStep":7,"cap":45},
    {"type":"less","threshold":{"num":7,"den":11},"sugarStep":4,"waterStep":1,"cap":55},
    {"type":"greater","threshold":{"num":2,"den":7},"sugarStep":1,"waterStep":3,"cap":55},
    {"type":"equiv","value":{"num":3,"den":7},  "sugarStep":1, "waterStep":5, "cap":55},
    {"type":"equiv","value":{"num":1,"den":5},  "sugarStep":2, "waterStep":1, "cap":50},
    {"type":"equiv","value":{"num":2,"den":3},  "sugarStep":1, "waterStep":3, "cap":50},
    {"type":"equiv","value":{"num":5,"den":12}, "sugarStep":1, "waterStep":4, "cap":55},
    {"type":"equiv","value":{"num":1,"den":4},  "sugarStep":3, "waterStep":1, "cap":45},
    {"type":"equiv","value":{"num":3,"den":5},  "sugarStep":1, "waterStep":9, "cap":55},
    {"type":"equiv","value":{"num":2,"den":5},  "sugarStep":3, "waterStep":4, "cap":55}, // Hard #1
    {"type":"equiv","value":{"num":4,"den":9},  "sugarStep":2, "waterStep":3, "cap":50}, // Hard #2
    {"type":"equiv","value":{"num":5,"den":8},  "sugarStep":1, "waterStep":4, "cap":50},
    {"type":"equiv","value":{"num":3,"den":8},  "sugarStep":2, "waterStep":1, "cap":50}
  ];
  levelTotalEl.textContent = String(LEVELS.length);

  // State
  let current=0, score=0, best=+(localStorage.getItem("mix-v46-best")||0), tickId=null, elapsed=0, mixedVisual=false;
  let logs = JSON.parse(localStorage.getItem("mix-v46-logs")||"[]");

  // Helpers
  const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
  const toFrac=(num,den)=>{const g=gcd(num,den); return {num:num/g, den:den/g};};
  const equalFrac=(a,b)=>a.num*b.den===b.num*a.den; const greaterFrac=(a,b)=>a.num*b.den>b.num*a.den; const lessFrac=(a,b)=>a.num*b.den<b.num*a.den;
  function parseRatioText(t){ if(!t) return null; t=t.trim(); if(/^\d+\s*\/\s*\d+$/.test(t)){ const [a,b]=t.split("/").map(s=>+s.trim()); if(b===0) return null; return toFrac(a,b);} if(/^\d*\.?\d+$/.test(t)){ const x=+t, den=1000, num=Math.round(x*den); return toFrac(num,den);} return null; }
  function parsePair(aStr,bStr){ const a=+String(aStr||"").trim(), b=+String(bStr||"").trim(); if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0) return null; return toFrac(a,b); }
  const fracStr=(f)=>`${f.num}/${f.den}`; const pairStr=(f)=>`${f.num}:${f.den}`;

  // Layout
  const inner = { left:0.16, right:0.84, top:0.25, bottom:0.91, radius:0.08 };
  function fitCanvas(){ const r = overlay.getBoundingClientRect(); confettiCanvas.width=window.innerWidth; confettiCanvas.height=window.innerHeight; glass.width = Math.round(r.width); glass.height = Math.round(r.height); drawGlass(); }
  overlay.addEventListener("load", fitCanvas); window.addEventListener("resize", fitCanvas);

  function setLevel(i){
    current=i; const lv=LEVELS[current];
    if(tickId) clearInterval(tickId); elapsed=0; timerEl.textContent="0";
    tickId=setInterval(()=>{ elapsed++; timerEl.textContent=String(elapsed); },1000);
    mixedVisual=false; levelEl.textContent=String(current+1);
    sugarRange.min=0; sugarRange.max=200; sugarRange.step=lv.sugarStep||1; sugarRange.value=0; sugarVal.textContent="0";
    waterRange.min=0; waterRange.max=200; waterRange.step=lv.waterStep||1; waterRange.value=0; waterVal.textContent="0";
    ratioInput.value=""; pairA.value=""; pairB.value="";
    renderPrompt(lv); drawGlass(); msg.textContent="請依題目調出指定濃度，並填上你的比/比值。"; face.textContent="🙂";
    // 切換輸入模式
    if(lv.type==="equiv"){ ratioBox.classList.add("hidden"); pairBox.classList.remove("hidden"); }
    else{ ratioBox.classList.remove("hidden"); pairBox.classList.add("hidden"); }
  }

  function renderPrompt(lv){
    if(lv.type==="ratio"){ const {sugar,water}=lv.target; promptArea.innerHTML=`請調出：<b>糖：${sugar}　水：${water}</b>`; }
    else if(lv.type==="greater"){ const {num,den}=lv.threshold; promptArea.innerHTML=`請調出：<b>比 ${num}/${den} 更濃</b>`; }
    else if(lv.type==="less"){ const {num,den}=lv.threshold; promptArea.innerHTML=`請調出：<b>比 ${num}/${den} 更淡</b>`; }
    else if(lv.type==="equiv"){ const {num,den}=lv.value; promptArea.innerHTML=`請調出：<b>比值 = ${num}/${den}</b>`; }
  }

  // Visual
  function updateVals(){ sugarVal.textContent=sugarRange.value; waterVal.textContent=waterRange.value; drawGlass(); }
  function drawHighlight(x0,y0,x1,y1){ const w=x1-x0, h=y1-y0; const g = ctx.createLinearGradient(x0, y0, x0+w*0.2, y0); g.addColorStop(0,"rgba(255,255,255,0.55)"); g.addColorStop(1,"rgba(255,255,255,0)"); ctx.fillStyle=g; ctx.fillRect(x0+4,y0+8,w*0.18,h-16); }
  function drawBubbles(x0,y0,x1,y1,cnt){ for(let i=0;i<cnt;i++){ const r=2+Math.random()*4, x=x0+r+Math.random()*(x1-x0-2*r), y=y0+r+Math.random()*(y1-y0-2*r); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.fill(); ctx.beginPath(); ctx.arc(x-0.4*r,y-0.5*r,0.4*r,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fill(); } }
  function roundedClip(x0,y0,x1,y1,r){ ctx.save(); ctx.beginPath(); ctx.moveTo(x0+r,y0); ctx.lineTo(x1-r,y0); ctx.quadraticCurveTo(x1,y0,x1,y0+r); ctx.lineTo(x1,y1-r); ctx.quadraticCurveTo(x1,y1,x1-r,y1); ctx.lineTo(x0+r,y1); ctx.quadraticCurveTo(x0,y1,x0,y1-r); ctx.lineTo(x0,y0+r); ctx.quadraticCurveTo(x0,y0,x0+r,y0); ctx.closePath(); ctx.clip(); }
  function drawGlass(){ const w=glass.width, h=glass.height; ctx.clearRect(0,0,w,h); const x0=inner.left*w, x1=inner.right*w, y0=inner.top*h, y1=inner.bottom*h, r=inner.radius*w; roundedClip(x0,y0,x1,y1,r); const s=+sugarRange.value, wa=+waterRange.value, total=s+wa; const sugarC=[244,162,97], waterC=[59,130,246]; const fillRect=(y,hgt,c)=>{ ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},0.92)`; ctx.fillRect(x0+2,y,(x1-x0-4),hgt); }; const fillH=(y1-y0); if(!mixedVisual){ const sH = total? fillH*(s/total):0, wH = total? fillH*(wa/total):0; fillRect(y1-sH, sH, sugarC); fillRect(y1-sH-wH, wH, waterC); drawBubbles(x0+8,y1-sH-wH+8,x1-8,y1-8,Math.max(2, Math.round(wa/6))); } else { const t = total? (s/total):0; const blended=[Math.round(waterC[0]*(1-t)+sugarC[0]*t),Math.round(waterC[1]*(1-t)+sugarC[1]*t),Math.round(waterC[2]*(1-t)+sugarC[2]*t)]; fillRect(y0,fillH,blended); drawBubbles(x0+8,y0+8,x1-8,y1-8,12); } drawHighlight(x0,y0,x1,y1); ctx.restore(); }

  // Actions
  function onReset(){ sugarRange.value=0; waterRange.value=0; sugarVal.textContent="0"; waterVal.textContent="0"; ratioInput.value=""; pairA.value=""; pairB.value=""; mixedVisual=false; msg.textContent="已重設，請重新調配與填寫你的比/比值。"; face.textContent="🙂"; drawGlass(); }

  function onMix(){
    const lv=LEVELS[current]; if(!lv) return;
    const s=+sugarRange.value, w=+waterRange.value;
    if(w===0||s===0){ msg.textContent="糖與水都需大於 0 才能調出比/比值。"; face.textContent="⚠️"; return; }

    const player= toFrac(s,w); let answerOK=false; let targetText="";
    // 驗證輸入：equiv 用 a:b；其他用 1/5 或小數
    let typedOK=false;
    if(lv.type==="equiv"){
      const p = parsePair(pairA.value, pairB.value);
      if(p){ typedOK = (p.num*player.den===p.den*player.num); }
    }else{
      const r = (function(t){ if(!t) return null; t=t.trim(); if(/^\d+\s*\/\s*\d+$/.test(t)){ const [a,b]=t.split("/").map(s=>+s.trim()); if(b===0) return null; const g=(function f(x,y){return y?f(y,x%y):Math.abs(x);})(a,b); return {num:a/g, den:b/g}; } if(/^\d*\.?\d+$/.test(t)){ const x=+t, den=1000, num=Math.round(x*den); const g=(function f(x,y){return y?f(y,x%y):Math.abs(x);})(num,den); return {num:num/g, den:den/g}; } return null; })(ratioInput.value);
      if(r){ typedOK = (r.num*player.den===r.den*player.num); }
    }

    if(lv.type==="ratio"){ answerOK = (player.num*lv.target.water === player.den*lv.target.sugar); targetText=`${lv.target.sugar}/${lv.target.water}`; }
    else if(lv.type==="greater"){ const {num,den}=lv.threshold; answerOK = (player.num*den > num*player.den); targetText=`>${num}/${den}`; }
    else if(lv.type==="less"){ const {num,den}=lv.threshold; answerOK = (player.num*den < num*player.den); targetText=`<${num}/${den}`; }
    else if(lv.type==="equiv"){ const {num,den}=lv.value; answerOK = (player.num*den === num*player.den); targetText=`=${num}/${den}`; }

    const cap = lv.cap || 50; const timeFactor = Math.max(0, Math.min(1, (cap - elapsed) / cap));
    let delta=0;
    if(answerOK){
      delta=Math.round(60+40*timeFactor);
      if(!typedOK){ delta -= 10; msg.textContent=`滑桿正確，但「你的比/比值」填錯，-10 分（本題得分：${delta}）`; face.textContent="📝"; }
      else { msg.textContent=`正確！+${delta} 分（本題用時 ${elapsed}s）`; face.textContent="😋"; }
    }else{ delta=-10; msg.textContent="不符合題意，-10 分"; face.textContent="😵"; }

    score=Math.max(0, score+delta); scoreEl.textContent=String(score); mixedVisual=true; drawGlass();

    const typedText = (lv.type==="equiv") ? `${(pairA.value||"")}:${(pairB.value||"")}` : (ratioInput.value||"");
    const log = { time:new Date().toISOString(), student:studentNameInput.value||"", level:current+1, type:lv.type, target:targetText, sugar:s, water:w, playerRatio: `${player.num}/${player.den}`, typed: typedText, correct: answerOK, delta, elapsed };
    logs.push(log); localStorage.setItem("mix-v46-logs", JSON.stringify(logs));

    setTimeout(()=>{ if(current>=LEVELS.length-1) endGame(); else setLevel(current+1); }, 900);
  }

  function endGame(){
    if(score>best){ best=score; localStorage.setItem("mix-v46-best", String(best)); }
    bestEl.textContent=String(best);
    celebrate();
    openModal("特調大師 ✨", `<p><b>總分：</b>${score}</p><p><b>最高分：</b>${best}</p><p><b>完成關卡：</b>${current+1}/${LEVELS.length}</p>`);
  }

  // CSV with BOM
  function exportCSV(){
    if(!logs.length){ openModal("提示","目前沒有可匯出的紀錄。先玩一回合吧！"); return; }
    const cols = ["時間","學生","關卡","題型","目標","糖","水","玩家比","輸入","是否正確","得分變化","本題用時"];
    const rows = logs.map(r=>[r.time,r.student,r.level,r.type,r.target,r.sugar,r.water,r.playerRatio,r.typed,r.correct? "是":"否",r.delta,r.elapsed]);
    const csvCore = [cols.join(","), ...rows.map(a=>a.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(","))].join("\r\n");
    const csv = "\ufeff"+csvCore;
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a"); a.href=url; a.download=`mix-logs-${new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0);
  }

  function showReview(){
    if(!logs.length){ openModal("回顧","目前沒有紀錄。"); return; }
    const head = `<tr><th>#</th><th>時間</th><th>學生</th><th>關卡</th><th>題型</th><th>目標</th><th>糖</th><th>水</th><th>玩家比</th><th>輸入</th><th>正確</th><th>分數</th><th>用時</th></tr>`;
    const body = logs.map((r,i)=>`<tr><td>${i+1}</td><td>${r.time.replace('T',' ').slice(0,19)}</td><td>${r.student||"-"}</td><td>${r.level}</td><td>${r.type}</td><td>${r.target}</td><td>${r.sugar}</td><td>${r.water}</td><td>${r.playerRatio}</td><td>${r.typed||"-"}</td><td>${r.correct?"✅":"❌"}</td><td>${r.delta}</td><td>${r.elapsed||"-"}s</td></tr>`).join("");
    openModal("回顧紀錄", `<div style="max-height:52vh;overflow:auto;"><table class="table">${head}${body}</table></div>`);
  }
  function clearLogs(){ logs=[]; localStorage.removeItem("mix-v46-logs"); openModal("完成","已清除所有本機紀錄。"); }

  // Confetti
  function celebrate(){
    confettiCanvas.classList.remove("hidden");
    const title = document.createElement("div"); title.className="win-title"; title.textContent="🎉 你是特調大師！🎉"; document.body.appendChild(title);
    const W = confettiCanvas.width = window.innerWidth, H = confettiCanvas.height = window.innerHeight;
    const pieces = Array.from({length: 240}).map(()=>({ x: Math.random()*W, y: -20-Math.random()*H, s: 4+Math.random()*6, a: Math.random()*Math.PI*2, v: 2+Math.random()*3, col: `hsl(${Math.floor(Math.random()*360)},90%,55%)` }));
    let t=0, raf;
    const step = ()=>{
      const c = conf; c.clearRect(0,0,W,H);
      for(const p of pieces){
        p.y += p.v; p.x += Math.sin((t+p.a)/10)*1.5; p.a += 0.1;
        c.fillStyle = p.col;
        c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillRect(-p.s/2, -p.s/2, p.s, p.s*0.6); c.restore();
      }
      t++;
      if(t<260){ raf=requestAnimationFrame(step); } else { cancelAnimationFrame(raf); conf.clearRect(0,0,W,H); confettiCanvas.classList.add("hidden"); title.remove(); }
    };
    step();
  }

  // Modal
  function openModal(t,h){ modalTitle.textContent=t; modalContent.innerHTML=h; modal.classList.remove("hidden"); }
  btnCloseModal.addEventListener("click", ()=>modal.classList.add("hidden"));
  modal.addEventListener("click", (e)=>{ if(e.target===modal) modal.classList.add("hidden"); });

  function initEvents(){
    sugarRange.addEventListener("input", updateVals);
    waterRange.addEventListener("input", updateVals);
    btnReset.addEventListener("click", onReset);
    btnMix.addEventListener("click", onMix);
    btnExportCSV.addEventListener("click", exportCSV);
    btnReview.addEventListener("click", showReview);
    btnClearLogs.addEventListener("click", clearLogs);
  }

  function autoStart(){ score=0; bestEl.textContent=String(best); setLevel(0); }
  (function main(){ initEvents(); fitCanvas(); autoStart(); })();
})();