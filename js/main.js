/* js/main.js - Cinnamon Bakery Core Game Loop */

const $ = id => document.getElementById(id);
const randomInt = n => Math.random() * n | 0;
const pickRandom = a => a[randomInt(a.length)];

const PIE_SIZE = 440; // Native sprite resolution

let state = null, isHolding = 0, isPaused = 0;
const pieCtx = $('pc').getContext('2d');
const orderCtx = $('oc').getContext('2d');

/* ---------- Save/Load System ---------- */
function loadGameData() {
    const saved = localStorage.getItem('cinnamonBakerySave');
    return saved ? JSON.parse(saved) : { day: 1, reviews: 0 };
}

function saveGameData() {
    if (state) {
        localStorage.setItem('cinnamonBakerySave', JSON.stringify({
            day: state.day,
            reviews: state.reviews
        }));
    }
}

/* ---------- Rendering Engine ---------- */
function renderPie(ctx, scale, selections, step, bakeProgress) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, PIE_SIZE, PIE_SIZE);
    
    if (selections.c >= 0) {
        ctx.drawImage(ASSETS.sprites[CRUSTS[selections.c].spriteKey], 0, 0, PIE_SIZE, PIE_SIZE);
    }
    if (selections.f >= 0 && step >= 1) {
        ctx.drawImage(ASSETS.sprites[FILLINGS[selections.f].spriteKey], 0, 0, PIE_SIZE, PIE_SIZE);
    }
    if (selections.l >= 0 && step >= 2) {
        ctx.drawImage(ASSETS.sprites[LIDS[selections.l].spriteKey], 0, 0, PIE_SIZE, PIE_SIZE);
    }
    
    // Bake effect (darkening filter)
    if (bakeProgress > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(50, 20, 5, ${bakeProgress * 0.007})`;
        ctx.fillRect(0, 0, PIE_SIZE, PIE_SIZE);
        ctx.globalCompositeOperation = 'source-over';
    }
}

const updateMainPie = () => renderPie(pieCtx, 440 / PIE_SIZE, state.pick, state.step, state.bake);

/* ---------- Step & UI Management ---------- */
const STEP_NAMES = ['Crust', 'Filling', 'Lid', 'Oven'];
const isStepValid = i => i === 0 || (i === 1 && state.pick.c >= 0) || (i === 2 && state.pick.f >= 0) || (i === 3 && state.pick.l >= 0);

function renderStepUI() {
    const p = state.pick, currentDoneness = DONENESS[state.o.d];
    const o_min = Math.max(0, currentDoneness[1] - 6);
    const o_max = Math.min(100, currentDoneness[2] + 6);

    $('tabs').innerHTML = STEP_NAMES.map((name, i) => `<button class="tab ${i === state.step ? 'on' : ''}" ${isStepValid(i) ? '' : 'disabled'} id="tab-${i}">${i + 1}. ${name}</button>`).join('');
    
    STEP_NAMES.forEach((name, i) => {
        const btn = $(`tab-${i}`);
        if(btn && !btn.disabled) btn.addEventListener('click', () => changeStep(i));
    });

    let htmlContent;
    if (state.step < 2) {
        const isFilling = state.step === 1; 
        const listData = isFilling ? FILLINGS : CRUSTS; 
        const key = isFilling ? 'f' : 'c';
        htmlContent = `<h3>${isFilling ? 'Choose a filling' : 'Pick a bottom crust'}</h3>
            <div class="grid">${listData.map((opt, i) => `<button class="opt ${p[key] === i ? 'sel' : ''}" id="opt-${key}-${i}"><i>${opt.i}</i><b>${opt.n}</b></button>`).join('')}</div>`;
    } else if (state.step === 2) {
        htmlContent = `<h3>Choose a lid</h3>
            <div class="grid">${LIDS.map((opt, i) => `<button class="opt ${p.l === i ? 'sel' : ''}" id="opt-l-${i}"><i>${opt.i}</i><b>${opt.n}</b></button>`).join('')}</div>`;
    } else {
        const hideBar = state.day >= 4;
        htmlContent = `<h3>Golden Harvest Oven</h3><p>Target: <b>${currentDoneness[3]} ${currentDoneness[0]}</b>.</p>
            ${hideBar ? `<p style="color:var(--rd); margin-bottom: 20px;"><b>Watch the pie closely!</b> The thermometer is broken.</p>` : 
            `<div id="bst">Oven is off</div><div class="gauge"><i id="gb"></i><i class="zone" style="left:${o_min}%;width:${o_max - o_min}%"></i></div>`}
            <button class="b pri big" id="bakeBtn" style="touch-action:none" oncontextmenu="return false">🔥 Hold to bake</button>
            <button class="b out big" id="trashBtn">🗑️ Burned it? Restart Pie</button>`;
    }
    
    $('step').innerHTML = htmlContent;
    $('bk').style.visibility = state.step ? 'visible' : 'hidden';
    $('nx').textContent = state.step === 3 ? '✨ Serve pie' : 'Next →';
    $('nx').disabled = state.step < 3 && !isStepValid(state.step + 1);
    
    // Attach Dynamic Listeners
    if (state.step < 2) {
        const key = state.step === 1 ? 'f' : 'c';
        (state.step === 1 ? FILLINGS : CRUSTS).forEach((_, i) => $(`opt-${key}-${i}`).addEventListener('click', () => selectIngredient(key, i)));
    } else if (state.step === 2) {
        LIDS.forEach((_, i) => $(`opt-l-${i}`).addEventListener('click', () => selectLid(i)));
    } else {
        const bakeBtn = $('bakeBtn');
        bakeBtn.addEventListener('pointerdown', () => { isHolding = 1; playSound('oven-hiss', 0.5); });
        $('trashBtn').addEventListener('click', trashPie);
        if (!hideBar) updateGaugeUI();
    }
}

function selectIngredient(key, index) { 
    state.pick[key] = index; 
    playSound(key === 'c' ? 'click-crust' : 'click-fill', 0.6); 
    renderStepUI(); 
    updateMainPie(); 
}

function selectLid(index) { 
    state.pick.l = index; 
    playSound('click-lid', 0.6); 
    renderStepUI(); 
    updateMainPie(); 
}

function changeStep(index) { 
    if (!isStepValid(index)) return; 
    state.step = index; 
    isHolding = 0; 
    playSound('click-tab', 0.5); 
    renderStepUI(); 
    updateMainPie(); 
}

function navigateStep(direction) { 
    if (state.step === 3 && direction > 0) return serveOrder(); 
    changeStep(state.step + direction); 
}

function updateGaugeUI() { 
    if($('gb')) { 
        $('gb').style.width = state.bake + '%';$('bst').textContent = isHolding ? '🔥 Baking… ' + Math.round(state.bake) + '%' : state.bake >= 100 ? '💥 Burnt to a crisp!' : state.bake ? 'Stopped at ' + Math.round(state.bake) + '%' : 'Oven is off'; 
    } 
}

function handleRelease() { 
    if (isHolding) { 
        isHolding = 0; 
        if (state && $('gb')) updateGaugeUI(); 
    } 
}

function trashPie() {
    if (!state || !state.on || isPaused) return;
    state.step = 0; 
    state.pick = { c: -1, f: -1, l: -1 }; 
    state.bake = 0; 
    isHolding = 0; 
    playSound('trash', 0.8); 
    renderStepUI(); 
    updateMainPie();
}

/* ---------- Core Game Flow ---------- */
const updateHeader = () => { 
    $('dv').textContent = state.day; 
    $('sv').textContent = state.reviews; 
    $('lvUI').innerHTML = '❤️'.repeat(state.lives) + '🖤'.repeat(3 - state.lives);
};

const showOverlay = (html) => { 
    const ov = $('ov'); 
    ov.innerHTML = html || ''; 
    ov.hidden = !html; 
};

function togglePause() {
    if(!state || !state.on) return;
    isPaused = !isPaused;
    $('pauseOv').hidden = !isPaused;
    if(isPaused) {
        $('quoteBox').textContent = `"${DAILY_QUOTES[(state.day - 1) % 10]}"`;
        state.pauseTime = performance.now();
    } else {
        state.t0 += (performance.now() - state.pauseTime);
    }
}

function startGame() {
    const savedData = loadGameData();
    state = { 
        day: savedData.day, c: 0, reviews: savedData.reviews, 
        lives: 3, step: 0, pick: { c: -1, f: -1, l: -1 }, bake: 0, 
        on: 0, o: { d: 1 }
    };
    showIntro();
}

function showIntro() {
    updateHeader();
    let msg = DAILY_MESSAGES[Math.min(state.day - 1, DAILY_MESSAGES.length - 1)];
    showOverlay(`<h1>🍂 Day ${state.day}</h1><p>${msg}</p><button class="b pri big" id="startBakingBtn">Start baking</button>`);
    $('startBakingBtn').addEventListener('click', generateOrder);
}

function generateOrder() {
    showOverlay('');
    Object.assign(state, {
        o: { c: pickRandom([0,1,2]), f: pickRandom([0,1,2,3]), l: pickRandom([0,1,2,3]), d: state.day < 2 ? 1 : randomInt(DONENESS.length), cu: pickRandom(CUSTOMERS) },
        step: 0, pick: { c: -1, f: -1, l: -1 }, bake: 0, t0: performance.now(),
        ms: PATIENCE_LEVELS[Math.min(state.day - 1, PATIENCE_LEVELS.length - 1)] * 1000, on: 1
    });
    
    isHolding = 0; 
    const target = state.o, doneness = DONENESS[target.d];
    
    $('av').textContent = target.cu[1];$('cn').textContent = target.cu[0];
    $('sp').textContent = '“' + target.cu[2] + '”';$('tn').textContent = 'Order #' + ((state.day - 1) * 3 + state.c + 1); 
    $('pt').textContent = state.ms ? '' : '☕ No rush'; 
    $('pb').style.width = '100%';$('tl').innerHTML = state.day < 3 ? 
        `<li>${CRUSTS[target.c].i} ${CRUSTS[target.c].n} crust</li><li>${FILLINGS[target.f].i} ${FILLINGS[target.f].n}</li><li>${LIDS[target.l].i} ${LIDS[target.l].n} lid</li><li>${doneness[3]} ${doneness[0]} bake</li>` : 
        `<li>Match the picture!</li><li>${doneness[3]} ${doneness[0]} bake</li>`;
    
    renderPie(orderCtx, 200 / PIE_SIZE, target, 3, (doneness[1] + doneness[2]) / 2);
    
    updateHeader(); 
    renderStepUI(); 
    updateMainPie();
}

function serveOrder() {
    if (!state.on) return;
    state.on = 0; isHolding = 0;
    
    const target = state.o, p = state.pick, doneness = DONENESS[target.d];
    const o_min = Math.max(0, doneness[1] - 6);
    const o_max = Math.min(100, doneness[2] + 6);

    const bakeMatch = state.bake >= o_min && state.bake <= o_max;
    // Only treat as "burnt" if it's over-baked AND that overshoot actually falls
    // outside this order's own accepted range. Otherwise a Dark order baked to
    // 96-100% (a legitimate match) was being scored as ruined despite matching.
    const isBurned = state.bake > 95 && !bakeMatch;
    
    const matchResults = [p.c === target.c, p.f === target.f, p.l === target.l, bakeMatch];
    let points = matchResults.filter(Boolean).length;
    if(isBurned) points = Math.min(points, 2); 

    const success = points >= 3;
    
    if(success) {
        state.reviews += (points === 4 ? 3 : 1);
        playSound(points === 4 ? 'success-perfect' : 'success-good');
    } else {
        state.lives--;
        playSound('fail');
    }
    
    saveGameData();
    updateHeader();
    
    const resultRows = [
        ['Crust', CRUSTS[target.c].n], ['Filling', FILLINGS[target.f].n], 
        ['Lid', LIDS[target.l].n], ['Bake', doneness[0] + (hideGaugeCheck() ? '' : ' (' + Math.round(state.bake) + '%)')]
    ].map((r, i) => `<li style="color:${matchResults[i] ? 'inherit' : 'var(--rd)'}">${matchResults[i] ? '✅' : '❌'} ${r[0]}: ${r[1]}</li>`).join('');
    
    const responseArr = success ? 
        (points === 4 ? ['Masterpiece!', '🤩', 'Absolutely perfect!'] : ['Warm & tasty', '🙂', 'Very nice, thank you!']) :
        (isBurned ? ['Ruined!', '🔥', 'This is completely burned!'] : ['Oh no!', '😖', 'That is not what I ordered…']);

    if(state.lives <= 0) return showGameOver();

    showOverlay(`<h1>${responseArr[0]}</h1>
        <div class="em">${responseArr[1]}</div>
        <p>${target.cu[0]}: “${responseArr[2]}”</p>
        <ul class="res">${resultRows}</ul><div class="tip">${success ? (points === 4 ? '+3 ⭐' : '+1 ⭐') : '-1 ❤️'}</div>
        <button class="b pri big" id="nextCustBtn">Next customer →</button>`);
        
    $('nextCustBtn').addEventListener('click', nextCustomer);
}

function handleLeave() {
    state.on = 0; isHolding = 0; state.lives--; 
    playSound('fail'); 
    updateHeader();
    saveGameData();
    if(state.lives <= 0) return showGameOver();
    showOverlay(`<h1>They left!</h1><div class="em">${state.o.cu[1]}💨</div><p>Patience ran out! You must work faster.</p><div class="tip">-1 ❤️</div><button class="b pri big" id="nextCustBtn2">Next customer →</button>`);
    $('nextCustBtn2').addEventListener('click', nextCustomer);
}

function showGameOver() {
    showOverlay(`<h1>Bakery Closed!</h1><div class="em">🚪</div><p>You ran out of hearts. Your bakery received <b>${state.reviews} stars</b> over ${state.day} days.</p><button class="b pri big" id="restartBtn">Try Again 🔄</button>`);
    $('restartBtn').addEventListener('click', () => {
        localStorage.removeItem('cinnamonBakerySave');
        startGame();
    });
}

function nextCustomer() {
    if (++state.c > 2) {
        state.c = 0; 
        state.day++;
        saveGameData();
        return showIntro();
    }
    generateOrder();
}

function hideGaugeCheck() { return state && state.day >= 4; }

/* ---------- Listeners & Tick Loop ---------- */
addEventListener('pointerup', handleRelease); 
addEventListener('pointercancel', handleRelease);

$('pauseBtn').addEventListener('click', togglePause);$('musicBtn').addEventListener('click', toggleMusic);
$('muteBtn').addEventListener('click', toggleMute);$('resumeBtn').addEventListener('click', togglePause);
$('bk').addEventListener('click', () => navigateStep(-1));$('nx').addEventListener('click', () => navigateStep(1));

// Main game tick: patience countdown + oven bake progress
setInterval(() => {
    if (!state || !state.on || isPaused) return;
    
    if (state.ms) {
        const timeRemaining = Math.max(0, 1 - (performance.now() - state.t0) / state.ms);
        $('pb').style.width = timeRemaining * 100 + '%';$('pt').textContent = '⏱️ ' + Math.ceil(timeRemaining * state.ms / 1000) + 's';
        if (timeRemaining <= 0) return handleLeave();
    }
    
    if (isHolding && state.step === 3 && state.bake < 100) {
        state.bake = Math.min(100, state.bake + 1 + state.day * 0.15);
        if (state.bake >= 100) { 
            isHolding = 0; 
            playSound('oven-done', 0.8); 
        }
        if (!hideGaugeCheck()) updateGaugeUI(); 
        updateMainPie();
    }
}, 50);

/* ---------- Initialization ---------- */
window.onload = () => {
    const ov = $('ov');
    ov.innerHTML = `<h1>Loading Assets...</h1><p>Preheating the oven...</p><div style="width: 200px; height: 10px; background: #322019; border-radius: 5px; margin-top: 20px; overflow: hidden;"><div id="loadBar" style="width: 0%; height: 100%; background: #e07a5f;"></div></div>`;
    
    preloadAssets(
        (progress) => { $('loadBar').style.width = (progress * 100) + '%'; },
        () => {
            ov.innerHTML = `<h1>🍂 Cinnamon Bakery 🥧</h1><p>Bake autumn pies and collect stars! The game gets harder over time as order tickets fade and your oven thermometer breaks. Don't let your hearts run out!</p><button class="b pri big" id="openBtn">Open the bakery 🚪</button>`;
            $('openBtn').addEventListener('click', () => { startMusic(); startGame(); });
        }
    );
};

/* ---------- Background Particle Effects ---------- */
const bgCanvas = $('bg'), bgCtx = bgCanvas.getContext('2d');
const LEAVES = Array.from({ length: 22 }, () => ({
    x: Math.random() * innerWidth, 
    y: Math.random() * innerHeight, 
    s: 10 + Math.random() * 12, 
    v: 0.4 + Math.random(), 
    a: Math.random() * 6, 
    k: pickRandom(['#e07a5f', '#f4a261', '#81b29a', '#d4a373'])
}));

function resizeBg() { 
    bgCanvas.width = innerWidth; 
    bgCanvas.height = innerHeight; 
}
addEventListener('resize', resizeBg); 
resizeBg();

function animateLeaves() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (const l of LEAVES) {
        bgCtx.save(); 
        bgCtx.translate(l.x, l.y); 
        bgCtx.rotate(l.a); 
        bgCtx.fillStyle = l.k;
        bgCtx.beginPath(); 
        bgCtx.ellipse(0, 0, l.s, l.s / 2, 0, 0, 7); 
        bgCtx.fill(); 
        bgCtx.restore();
        
        l.y += l.v; 
        l.x += Math.sin(l.y * 0.01) * 0.6; 
        l.a += 0.01;
        if (l.y > bgCanvas.height + 20) { 
            l.y = -20; 
            l.x = Math.random() * bgCanvas.width; 
        }
    }
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) requestAnimationFrame(animateLeaves);
}
animateLeaves();