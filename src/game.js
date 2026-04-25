/**
 * Ecosystem Simulation - Zero-Crash Defensive Version
 */

// --- 1. Scientific Naming System ---
const NamingEngine = {
    genus: ['Genus', 'Lupus', 'Bovus', 'Flora', 'Cervus', 'Ursus', 'Avis', 'Reptilis', 'Silvestris', 'Aqualis'],
    species: ['Sapiens', 'Regalis', 'Magnus', 'Parvus', 'Velox', 'Ferox', 'Vulgaris', 'Giganticus', 'Toxicus', 'Decor'],
    modifiers: ['Alpha', 'Beta', 'Prime', 'Neo', 'Ancient', 'Ultra', 'Apex', 'Shadow', 'Solar', 'Void'],
    generate() { 
        return { 
            genus: this.genus[Math.floor(Math.random() * this.genus.length)], 
            species: this.species[Math.floor(Math.random() * this.species.length)], 
            modifier: '' 
        }; 
    },
    toString(n) { 
        if(!n) return 'Unknown';
        const modStr = (n.modifier && NamingEngine.modifiers.includes(n.modifier)) ? ' ' + n.modifier : '';
        return `${n.genus || 'Entity'} ${n.species || 'Unknown'}${modStr}`;
    }
};

// --- 2. Neuro-AI Brain ---
class SimpleBrain {
    constructor(weights = null) {
        // Inputs: 16개, Actions: 8개로 고정
        const actionCount = 8;
        const inputCount = 16;
        
        if (weights && Array.isArray(weights)) {
            // 로드된 가중치가 있으면 현재 액션 수(8개)에 맞게 자르거나 보정
            this.weights = weights.slice(0, actionCount).map(row => {
                const r = row.slice(0, inputCount);
                while(r.length < inputCount) r.push(Math.random()*2-1);
                return r;
            });
            while(this.weights.length < actionCount) {
                this.weights.push(Array.from({length: inputCount}, () => Math.random()*2-1));
            }
        } else {
            this.weights = Array.from({length: actionCount}, () => Array.from({length: inputCount}, () => Math.random() * 2 - 1));
        }
        
        this.lr = 0.12;
        this.lastAction = 3;
        this.lastReward = 0;
    }
    decide(inputs) {
        try {
            const inps = Array.isArray(inputs) ? inputs : [0,0,0,0,0];
            let scores = this.weights.map(w => w.map((weight, i) => weight * (inps[i] || 0)).reduce((a, b) => a + b, 0));
            return scores.indexOf(Math.max(...scores));
        } catch(e) { return 3; }
    }
    learn(action, inputs, reward) {
        try {
            if (!this.weights[action]) return;
            const inps = Array.isArray(inputs) ? inputs : [0,0,0,0,0];
            for (let i = 0; i < this.weights[action].length; i++) {
                this.weights[action][i] += this.lr * (reward || 0) * (inps[i] || 0);
                this.weights[action][i] = Math.max(-2, Math.min(2, this.weights[action][i]));
            }
        } catch(e) {}
    }
    mutate(factor = 0.1) {
        try { 
            const newWeights = this.weights.map(w => w.map(val => {
                const randomWeight = Math.random() * 2 - 1;
                return (val * factor) + (randomWeight * (1 - factor)) + (Math.random() - 0.5) * 0.05;
            }));
            return new SimpleBrain(newWeights); 
        }
        catch(e) { return new SimpleBrain(); }
    }
}

// --- 3. Camera & Effects ---
class Camera {
    constructor(canvas) { this.canvas = canvas; this.x = 0; this.y = 0; this.zoom = 1.0; this.speed = 10; }
    apply(ctx) { 
        if(!ctx) return;
        ctx.save(); 
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2); 
        ctx.scale(this.zoom, this.zoom); 
        ctx.translate(-this.x, -this.y); 
    }
    restore(ctx) { if(ctx) ctx.restore(); }
    toWorld(sx, sy) { return { x: (sx - this.canvas.width / 2) / this.zoom + this.x, y: (sy - this.canvas.height / 2) / this.zoom + this.y }; }
}

class Lightning {
    constructor(x, y) { this.x = x; this.y = y; this.life = 300; }
    draw(ctx) {
        if (!ctx || this.life <= 0) return;
        ctx.save();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 + Math.random()*3; ctx.shadowBlur = 15; ctx.shadowColor = '#4f46e5';
        ctx.beginPath(); ctx.moveTo(this.x, this.y - 800); 
        for(let i=1; i<8; i++) ctx.lineTo(this.x + (Math.random()-0.5)*60, this.y - 800 + i*100);
        ctx.lineTo(this.x, this.y); ctx.stroke(); ctx.restore(); this.life -= 20;
    }
}

// --- 4. World & Logging ---
class EventLogger {
    constructor() { this.logEl = document.getElementById('eventLog'); this.history = []; this.load(); }
    add(msg, type = 'birth') {
        const entry = { msg, type, time: Date.now() }; this.history.push(entry); if (this.history.length > 50) this.history.shift();
        this.renderEntry(entry); this.save();
    }
    renderEntry(e) {
        if (!this.logEl) return;
        const div = document.createElement('div'); div.className = `log-entry log-${e.type}`; div.textContent = `[${new Date(e.time).toLocaleTimeString()}] ${e.msg}`;
        this.logEl.appendChild(div); this.logEl.scrollTop = this.logEl.scrollHeight;
    }
    save() { try { localStorage.setItem('eco_ev_v18', JSON.stringify(this.history)); } catch(e) {} }
    load() { 
        try { 
            let d = localStorage.getItem('eco_ev_v18'); 
            if (d) { 
                this.history = JSON.parse(d); 
                if (this.logEl) { this.logEl.innerHTML = ''; this.history.forEach(e => this.renderEntry(e)); } 
            } 
        } catch(err) { this.history = []; } 
    }
    clear() { this.history = []; if (this.logEl) this.logEl.innerHTML = ''; this.save(); }
}

class World {
    constructor() { this.year = 1; this.month = 1; this.seasonIdx = 0; this.seasons = ['봄', '여름', '가을', '겨울']; this.weather = '맑음'; this.temp = 20; this.lastUpd = 0; this.onYear = null; this.onLightning = null; }
    update(t) { 
        if (t - this.lastUpd > 5000) { 
            this.month++; this.lastUpd = t; 
            if (this.month > 12) { this.month = 1; this.year++; if (this.onYear) this.onYear(); } 
            this.seasonIdx = Math.floor((this.month - 1) / 3) % 4; this.updateAtmosphere(); 
        } 
        if (this.weather === '비' && Math.random() < 0.003) { if (this.onLightning) this.onLightning(); } 
    }
    updateAtmosphere() { 
        const s = this.seasons[this.seasonIdx]; const r = Math.random(); 
        this.weather = (s === '여름' && r < 0.5) ? '폭염' : (s === '겨울' && r < 0.7) ? '눈' : (r < 0.3) ? '비' : '맑음'; 
        let base = (this.seasonIdx === 1 ? 30 : (this.seasonIdx === 3 ? -5 : 15)); 
        if (this.weather === '폭염') base += 10; if (this.weather === '눈') base -= 5; 
        this.temp = base + Math.round((Math.random() - 0.5) * 4); this.updateUI(); 
    }
    updateUI() { 
        try {
            const s = document.getElementById('season'), m = document.getElementById('month'), t = document.getElementById('temp'), w = document.getElementById('weather');
            if(s) s.textContent = this.seasons[this.seasonIdx]; if(m) m.textContent = this.month + '개월'; if(t) t.textContent = '온도: ' + this.temp + '°C'; if(w) w.textContent = this.weather; 
        } catch(e) {}
    }
}

// --- 5. Entities ---
class BaseEntity {
    constructor(x, y, genes) { 
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x || 0; this.y = y || 0; 
        this.genes = genes || { size: 2, color: {r:100,g:100,b:100}, vertices: [{x:0,y:0},{x:1,y:0},{x:0,y:1}] }; 
        this.hp = 100; this.age = 0; this.isDead = false; this.isCorpse = false; this.deathT = 0; 
        this.sciName = NamingEngine.generate(); this.customName = null; this.isStarred = false; this.slot = null; 
        this.fireT = 0; this.lastReason = "사망"; this.logged = false;
    }
    die(reason = "사망") { if (this.isDead) return; this.isDead = true; this.isCorpse = true; this.deathT = Date.now(); this.hp = 100; this.lastReason = reason; }
    draw(ctx, visionMode = false) {
        try {
            const { vertices, size, color } = this.genes; const c = this.isCorpse ? { r: 100, g: 100, b: 100 } : (color || {r:100,g:100,b:100});
            const isAnimal = this.type === 'Herbivore' || this.type === 'Carnivore';
            const angle = (isAnimal && !this.isCorpse) ? Math.atan2(this.vy, this.vx) : 0;
            
            if (visionMode && isAnimal && !this.isDead) {
                const range = this.genes.visionRange || (this.type === 'Herbivore' ? 300 : 400);
                ctx.save(); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.arc(this.x, this.y, range, angle - Math.PI/3, angle + Math.PI/3); ctx.lineTo(this.x, this.y);
                ctx.fillStyle = this.type === 'Herbivore' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(248, 113, 113, 0.1)'; ctx.fill(); ctx.restore();
            }

            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(angle); ctx.scale((size || 1) * 5, (size || 1) * 5); 
            if(vertices && vertices.length > 0) {
                ctx.beginPath(); ctx.moveTo(vertices[0].x, vertices[0].y); vertices.forEach(v => ctx.lineTo(v.x, v.y)); ctx.closePath();
                ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.1; ctx.stroke(); 
            }
            ctx.restore();
            
            if (this.fireT > 0) this.drawFire(ctx);
            if (!this.isCorpse || (this.isCorpse && this.hp < 100)) this.drawBars(ctx);
            if ((this.isStarred || this.customName) && !this.isDead) this.drawStar(ctx);
        } catch(e) {}
    }
    drawFire(ctx) { ctx.save(); ctx.translate(this.x, this.y); for(let i=0; i<4; i++) { ctx.fillStyle = Math.random()>0.5 ? '#f97316' : '#ef4444'; ctx.beginPath(); ctx.arc((Math.random()-0.5)*20, (Math.random()-0.5)*20, 4+Math.random()*6, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }
    drawBars(ctx) { const w = 20; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.x-w/2, this.y-15, w, 3); ctx.fillStyle = this.isCorpse ? '#94a3b8' : '#ef4444'; ctx.fillRect(this.x-w/2, this.y-15, Math.max(0, this.hp/100)*w, 3); }
    drawStar(ctx) { ctx.fillStyle = '#facc15'; ctx.font = 'bold 12px Outfit'; ctx.textAlign = 'center'; ctx.fillText(this.customName || '⭐', this.x, this.y - 18); }
}

class Plant extends BaseEntity { 
    constructor(x, y, genes, isP) { 
        super(x, y, genes); 
        this.isPoison = isP; 
        if(this.genes) this.genes.color = isP ? { r: 168, g: 85, b: 247 } : { r: 74, g: 222, b: 128 }; 
        this.maxAge = 1800 + Math.random() * 3600; // 수명 대폭 연장 (30~90분)
    } 
    update(dt) { this.age += dt/1000; if (this.age > this.maxAge) this.die("수명 다함"); if (this.fireT > 0) { this.hp -= 25*(dt/1000); this.fireT -= dt; if (this.hp <= 0) this.die("화재"); } }
}

class Animal extends BaseEntity {
    constructor(x, y, genes, type, brain = null) { 
        super(x, y, genes); this.type = type; this.hunger = 100; this.brain = brain || new SimpleBrain(); 
        this.vx = (Math.random()-0.5); this.vy = (Math.random()-0.5); this.stunT = 0; this.impulseX = 0; this.impulseY = 0; this.lastAttackT = 0; this.thought = '배회 중'; 
        this.rewards = 0; this.penalties = 0; this.pain = 0;
    }
    get totalScore() { return Math.round(this.rewards - this.penalties); }
    update(dt, w, h, amb, plants, others) {
        try {
            if (this.isDead) return;
            this.pain = Math.max(0, this.pain - (dt/1000) * 1.0); // 회복 속도를 느리게 조절 (초당 1%)
            this.hunger -= (this.genes.metabolism || 1) * (dt/1000);
            if (this.hunger < 25) this.pain += (25 - this.hunger) * 0.5 * (dt/1000); // 굶주림 고통 초당 계산
            if (this.hunger < 25) this.pain += (25 - this.hunger) * 0.5 * (dt/1000);
            if (this.hunger > 90) this.hp = Math.min(100, this.hp + 2 * (dt/1000));
            if (this.hunger <= 0) { this.die("굶주림"); this.penalties += 10; this.pain = 100; }
            if (this.hp <= 0) { this.die("사망"); this.pain = 100; }
            if (this.fireT > 0) { 
                this.hp -= 30*(dt/1000); this.fireT -= dt; this.penalties += 0.1; this.pain += 1;
                if (this.hp <= 0) { this.die("화마"); }
                if (Array.isArray(others)) {
                    others.forEach(ot => { if (ot && !ot.isDead && ot.id !== this.id && Math.sqrt((this.x-ot.x)**2+(this.y-ot.y)**2) < 25) ot.fireT = 4000; });
                }
            }
            let moveMod = (amb + (this.genes.insulation || 0) < 0 || amb + (this.genes.insulation || 0) > 40) ? 0.3 : 0.8;
            if (this.stunT > 0) { this.stunT -= dt; moveMod *= 0.1; }
            
            let speedBoost = 1.0;
            if (this.thought.includes('숨기')) speedBoost = 0.5;
            else if (this.thought.includes('휴식')) speedBoost = 0.1;

            const sp = (this.genes.speed || 1); 
            const finalSpeed = sp * moveMod * speedBoost;
            
            this.x += this.vx * finalSpeed + this.impulseX;
            this.y += this.vy * finalSpeed + this.impulseY;
            
            const b = w/2; 
            if (this.x < -b) { this.x = -b; this.vx = Math.abs(this.vx); } else if (this.x > b) { this.x = b; this.vx = -Math.abs(this.vx); }
            if (this.y < -b) { this.y = -b; this.vy = Math.abs(this.vy); } else if (this.y > b) { this.y = b; this.vy = -Math.abs(this.vy); }
            
            this.impulseX *= 0.8; this.impulseY *= 0.8; 
            this.age += dt/1000; 
            if (this.age > (this.genes.maxL || 100)) this.die("수명 다함");
        } catch(e) {}
    }
    drawBars(ctx) { 
        super.drawBars(ctx); 
        const w = 20; 
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
        ctx.fillRect(this.x-w/2, this.y-11, w, 2); 
        ctx.fillStyle = '#fbbf24'; 
        ctx.fillRect(this.x-w/2, this.y-11, Math.max(0, this.hunger/100)*w, 2); 
        
        if (!this.isDead && this.thought) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '7px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(this.thought, this.x, this.y - 22);
        }
    }
}

// --- 6. Main Controller ---
const GeneticEngine = {
    generateRandomShape(vc) { let v = []; for (let i = 0; i < vc; i++) { let a = (i / vc) * Math.PI * 2; let d = 0.5 + Math.random() * 0.5; v.push({ x: Math.cos(a) * d, y: Math.sin(a) * d }); } return v; },
    inheritValue(a, b, r = 0.05) { return ((a + b) / 2) + (Math.random() - 0.5) * r * 2 * ((a + b) / 2); }
};

class Simulation {
    constructor() {
        try {
            this.canvas = document.getElementById('simCanvas'); this.ctx = this.canvas.getContext('2d');
            this.world = new World(); this.logger = new EventLogger(); this.camera = new Camera(this.canvas);
            this.entities = []; this.hovered = null; this.keys = {}; this.slots = new Array(10).fill(null); this.lightnings = [];
            this.ws = 1400; this.followTarget = null; this.visionMode = false; this.namingMode = false;
            
            this.world.onLightning = (lx, ly) => { 
                const targetX = lx !== undefined ? lx : (Math.random()-0.5)*this.ws;
                const targetY = ly !== undefined ? ly : (Math.random()-0.5)*this.ws;
                this.lightnings.push(new Lightning(targetX, targetY));
                this.entities.forEach(e => { if (!e.isDead && Math.sqrt((e.x-targetX)**2+(e.y-targetY)**2) < 45) { e.die("벼락"); e.fireT = 6000; } });
            };
            this.world.onYear = () => this.entities.forEach(e => { if (e.maxAge !== undefined && !e.isDead) e.grow(); });
            
            this.currentBG = { r: 61, g: 43, b: 31 };
            this.lastTooltipUpdateTime = 0;
            this.clickMode = null;
            this.setup(); this.load(); if (this.entities.length === 0) this.init();
            this.initSummonUI();
            this.logger.add("시뮬레이션 엔진 가동 시작!", 'birth');
            setInterval(() => this.save(), 5000); requestAnimationFrame((t) => this.loop(t));
        } catch(err) { console.error("Constructor error:", err); }
    }
    setup() {
        window.addEventListener('resize', () => { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; });
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight;
        window.addEventListener('keydown', (e) => { 
            const k = e.key.toLowerCase(); this.keys[k] = true; if (k === 'v') this.visionMode = !this.visionMode;
            if (e.key >= '0' && e.key <= '9') {
                const n = parseInt(e.key === '0' ? '10' : e.key) % 10;
                if (this.hovered) { this.hovered.slot = n; this.slots[n] = this.hovered; this.hovered.isStarred = true; }
                else if (this.slots[n]) { this.camera.x = this.slots[n].x; this.camera.y = this.slots[n].y; }
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('wheel', (e) => this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom - e.deltaY*0.001)));
        window.addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; });
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                const wp = this.camera.toWorld(e.clientX, e.clientY);
                if (this.clickMode) {
                    this.handleCommandClick(wp);
                } else if (this.namingMode && this.hovered) {
                    const n = prompt("새 이름:", this.hovered.customName || ""); if (n) this.hovered.customName = n.trim(); this.namingMode = false;
                } else if (this.hovered) this.followTarget = this.hovered;
            }
        });
        window.addEventListener('mouseup', () => this.followTarget = null);
        this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (this.hovered) this.hovered.isStarred = !this.hovered.isStarred; });

        const tsEl = document.getElementById('topScorerArea'), bsEl = document.getElementById('bottomScorerArea');
        if (tsEl) {
            tsEl.onclick = () => {
                const ants = this.entities.filter(en => !en.isDead && en.type);
                if (ants.length > 0) {
                    let top = ants[0];
                    ants.forEach(a => { if(a.totalScore > top.totalScore) top = a; });
                    if (top) { this.camera.x = top.x; this.camera.y = top.y; this.followTarget = top; this.logger.add(`[이동] 최고 득점자 ${top.customName || NamingEngine.toString(top.sciName)} 추적`, 'birth'); }
                }
            };
        }
        if (bsEl) {
            bsEl.onclick = () => {
                const ants = this.entities.filter(en => !en.isDead && en.type);
                if (ants.length > 0) {
                    let bot = ants[0];
                    ants.forEach(a => { if(a.totalScore < bot.totalScore) bot = a; });
                    if (bot) { this.camera.x = bot.x; this.camera.y = bot.y; this.followTarget = bot; this.logger.add(`[이동] 최저 득점자 ${bot.customName || NamingEngine.toString(bot.sciName)} 추적`, 'death'); }
                }
            };
        }
    }
    init() { for(let i=0; i<20; i++) this.spawnPlant(); for(let i=0; i<4; i++) this.spawnAnimal('Herbivore'); for(let i=0; i<2; i++) this.spawnAnimal('Carnivore'); }
    spawnPlant() { const h = this.ws/2, g = { size: 1.5+Math.random()*2.5, vertices: GeneticEngine.generateRandomShape(5), color: {r:74,g:222,b:128} }; this.entities.push(new Plant((Math.random()-0.5)*this.ws, (Math.random()-0.5)*this.ws, g, Math.random()<0.15)); }
    spawnAnimal(type, brain = null, forcedGender = null) {
        const genes = { 
            size: 2+Math.random()*3, 
            maxL: 1200 + Math.random() * 1800, 
            speed: type==='Herbivore'?1.6:2.6, 
            metabolism: 1.4, 
            attack: 15+Math.random()*25, 
            insulation: (Math.random()-0.5)*10, 
            vertices: GeneticEngine.generateRandomShape(5), 
            color: {r:Math.random()*255,g:Math.random()*255,b:Math.random()*255}, 
            gender: forcedGender || (Math.random()>0.5?'M':'F') 
        };
        const a = new Animal((Math.random()-0.5)*this.ws, (Math.random()-0.5)*this.ws, genes, type, brain); this.entities.push(a);
        this.logger.add(`${NamingEngine.toString(a.sciName)} 탄생! (${genes.gender === 'M' ? '수컷' : '암컷'})`, 'birth');
    }
    handleHover() { 
        const wp = this.camera.toWorld(this.mx, this.my); 
        const r = 30 / this.camera.zoom; 
        this.hovered = this.entities.find(e => Math.abs(e.x - wp.x) < r && Math.abs(e.y - wp.y) < r); 
    }
    updateTooltip() {
        const tt = document.getElementById('entityTooltip'); 
        if (!this.hovered) { tt?.classList.add('hidden'); return; }
        tt.classList.remove('hidden'); 
        tt.style.left = this.mx+'px'; tt.style.top = (this.my-15)+'px'; tt.style.transform = 'translate(-50%, -100%)';
        
        const now = Date.now();
        if (now - this.lastTooltipUpdateTime < 100) return;
        this.lastTooltipUpdateTime = now;

        const nameEl = document.getElementById('tooltipName'), sciEl = document.getElementById('tooltipSci'), statEl = document.getElementById('tooltipStats');
        if(nameEl) nameEl.textContent = this.hovered.customName || NamingEngine.toString(this.hovered.sciName);
        if(sciEl) sciEl.textContent = `${this.hovered.sciName.genus} ${this.hovered.sciName.species}`;
        
        let s = '';
        const isAnimal = !!this.hovered.type;
        const isPlant = !isAnimal && !this.hovered.isCorpse;

        if (this.visionMode && isAnimal && !this.hovered.isDead) {
            try {
                s += `<div class="tooltip-section">AI 생체 신경망 (Bio-Core)</div>`;
                s += `<div style="font-size:0.75rem; color:#facc15; font-weight:700; margin-bottom:2px;">총점: ${this.hovered.totalScore} (+${Math.round(this.hovered.rewards)} / -${Math.round(this.hovered.penalties)})</div>`;
                const pColor = this.hovered.pain > 50 ? '#f43f5e' : (this.hovered.pain > 20 ? '#fbbf24' : '#94a3b8');
                s += `<div style="font-size:0.65rem; color:${pColor}; margin-bottom:8px;">고통지수: ${Math.round(this.hovered.pain)}% <div style="display:inline-block; width:60px; height:2px; background:#1e1e2e; vertical-align:middle; margin-left:5px;"><div style="width:${Math.min(100, this.hovered.pain)}%; height:100%; background:${pColor};"></div></div></div>`;
                
                const labels = ['회피','포식','번식','배회','휴식','공격','위협','숨기'];
                const animals = this.entities.filter(en => !en.isDead && en.type);
                
                const vRange = this.hovered.genes.visionRange || (this.hovered.type === 'Herbivore' ? 300 : 400);
                const pred = animals.find(p => p.type === 'Carnivore' && this.inFOV(this.hovered, p, vRange));
                const prey = this.getN(this.hovered, this.entities.filter(en => !en.isDead && (en.maxAge !== undefined || en.type)), vRange);
                const mate = animals.find(m => m.type === this.hovered.type && m !== this.hovered && this.inFOV(this.hovered, m, vRange * 1.3));
                
                const b = this.ws/2, edge = Math.min(b-Math.abs(this.hovered.x), b-Math.abs(this.hovered.y))/b;
                const density = animals.filter(ot => ot !== this.hovered && this.gD(this.hovered, ot) < 150).length / 10;
                const weatherIn = this.world.weather === '비' ? 0.5 : (this.world.weather === '눈' ? 1 : 0);
                
                const curIn = [
                    this.hovered.hunger/100, pred?1:0, prey?1:0, mate?1:0, this.hovered.hp/100, 
                    (this.world.temp+10)/50, edge, this.hovered.age/this.hovered.genes.maxL, 
                    Math.min(1, density), weatherIn, (this.hovered.stunT>0?1:0), this.world.seasonIdx/3,
                    density/2, (this.hovered.hp < 50 ? 1 : 0), this.hovered.brain.lastReward, 0.5
                ];
                const act=this.hovered.brain.decide(curIn);
                s += `<div class="neuron-grid">`; this.hovered.brain.weights.forEach((row,i) => {
                    const isActive = i === act;
                    s += `<div class="neuron-row ${isActive?'w-active-row':''}"><div class="neuron-action-label">${labels[i]}</div><div class="neuron-inputs">`;
                    row.forEach((w, idx) => { 
                        let sz=Math.max(10,Math.min(100,(Math.abs(w)+Math.random()*0.1)*100)), t=w>0?'pos':'neg', valJ=(w+(Math.random()-0.5)*0.03).toFixed(2);
                        s+=`<div class="neuron-hollow"><div class="neuron-pulse ${t} vibrate-active" style="width:${sz}%;height:${sz}%"></div><span style="position:absolute; bottom:-12px; font-size:0.35rem; color:rgba(255,255,255,0.4)">${valJ}</span></div>`; 
                    }); s += `</div></div>`;
                }); s += `</div>`;
            } catch(e) { s += "Brain decoding failure."; }
        } else {
            s += `<div class="tooltip-section">생체 데이터</div>`;
            s += `<div class="tooltip-stat"><label>종류</label><span>${isAnimal ? (this.hovered.type === 'Herbivore' ? '초식' : '육식') : (this.hovered.isCorpse ? '사체' : '식물')}</span></div>`;
            
            if (isAnimal) {
                s += `<div class="tooltip-stat"><label>성별</label><span style="color:${this.hovered.genes.gender==='M'?'#60a5fa':'#fb7185'}">${this.hovered.genes.gender === 'M' ? '수컷 (♂)' : '암컷 (♀)'}</span></div>`;
                s += `<div class="tooltip-stat"><label>체력 (HP)</label><span>${Math.round(this.hovered.hp)} / 100</span></div>`;
                s += `<div class="tooltip-stat"><label>에너지</label><span>${Math.round(this.hovered.hunger)}%</span></div>`;
                s += `<div class="tooltip-stat"><label>현재 상태</label><span style="color:#facc15">${this.hovered.thought}</span></div>`;
                s += `<div class="tooltip-stat"><label>나이/수명</label><span>${Math.floor(this.hovered.age/60)}살 / ${Math.floor(this.hovered.genes.maxL/60)}살</span></div>`;
                s += `<div class="tooltip-stat"><label>누적 점수</label><span>${this.hovered.totalScore} PTS</span></div>`;
                
                s += `<div class="tooltip-section" style="margin-top:8px;">유전 형질</div>`;
                s += `<div class="tooltip-stat"><label>이동 속도</label><span>${this.hovered.genes.speed.toFixed(2)}</span></div>`;
                s += `<div class="tooltip-stat"><label>공격력</label><span>${Math.round(this.hovered.genes.attack)}</span></div>`;
                s += `<div class="tooltip-stat"><label>신진대사</label><span>${this.hovered.genes.metabolism.toFixed(2)}</span></div>`;
                const ins = this.hovered.genes.insulation;
                s += `<div class="tooltip-stat"><label>온도 적응</label><span>${ins > 0 ? '+' : ''}${ins.toFixed(1)}°C</span></div>`;
            } else if (isPlant) {
                s += `<div class="tooltip-stat"><label>체력 (HP)</label><span>${Math.round(this.hovered.hp)} / 100</span></div>`;
                s += `<div class="tooltip-stat"><label>성장도/나이</label><span>${Math.round((this.hovered.age/this.hovered.maxAge)*100)}% / ${Math.floor(this.hovered.age/60)}살</span></div>`;
                if(this.hovered.isPoison) s += `<div class="tooltip-stat" style="color:#a855f7;"><label>특성</label><span>독성 식물</span></div>`;
            }
        }
        if(statEl) statEl.innerHTML = s;
    }
    loop(t) {
        const dt = t - (this.lastT || t); this.lastT = t; 
        if (dt > 100) return requestAnimationFrame((nt) => this.loop(nt));
        try {
            this.updateCamera(); this.world.update(t);
            
            // 배경색 서서히 변경 (Lerp)
            let target = { r: 61, g: 43, b: 31 };
            if (this.world.weather === '눈') target = { r: 241, g: 245, b: 249 };
            else if (this.world.weather === '비') target = { r: 37, g: 24, b: 15 };
            ['r','g','b'].forEach(c => { this.currentBG[c] += (target[c] - this.currentBG[c]) * 0.02; });

            const alive = this.entities.filter(e => !e.isDead), ants = alive.filter(e => e instanceof Animal), pts = alive.filter(e => e instanceof Plant);
            this.entities.forEach(e => { 
                if (e instanceof Animal) e.update(dt, this.ws, this.ws, this.world.temp, pts, ants); 
                else if (e instanceof Plant && !e.isDead) e.update(dt); 
            });
            this.handleHover();
            this.handleSurv(t, dt); this.updateTooltip(); this.draw(); this.updateUI();
        } catch(err) { console.error("Loop error:", err); }
        requestAnimationFrame((nt) => this.loop(nt));
    }
    updateCamera() {
        if (this.followTarget && !this.followTarget.isDead) { this.camera.x = this.followTarget.x; this.camera.y = this.followTarget.y; }
        else { const s = this.camera.speed / this.camera.zoom; if(this.keys['w']) this.camera.y -= s; if(this.keys['s']) this.camera.y += s; if(this.keys['a']) this.camera.x -= s; if(this.keys['d']) this.camera.x += s; }
    }
    inFOV(a, t, r) { if(this.gD(a,t) > r) return false; const f = Math.atan2(a.vy, a.vx), to = Math.atan2(t.y-a.y, t.x-a.x); let df = to - f; while(df < -Math.PI) df += Math.PI*2; while(df > Math.PI) df -= Math.PI*2; return Math.abs(df) < Math.PI/3; }
    handleSurv(now, dt) {
        const alive = this.entities.filter(e => !e.isDead), ants = alive.filter(e => e instanceof Animal), pts = alive.filter(e => e instanceof Plant), corpses = this.entities.filter(e => e.isCorpse);
        const aliveHeader = ants.filter(a => a.type === 'Herbivore');
        const aliveCarns = ants.filter(a => a.type === 'Carnivore');
        
        if (aliveHeader.length < 2) {
            const gender = aliveHeader.length === 1 ? (aliveHeader[0].genes.gender === 'M' ? 'F' : 'M') : null;
            this.spawnAnimal('Herbivore', null, gender);
        }
        if (aliveCarns.length < 2) {
            const gender = aliveCarns.length === 1 ? (aliveCarns[0].genes.gender === 'M' ? 'F' : 'M') : null;
            this.spawnAnimal('Carnivore', null, gender);
        }
        ants.forEach(a => {
            const vRange = a.genes.visionRange || (a.type === 'Herbivore' ? 300 : 400);
            const pred = a.type==='Herbivore' ? ants.find(p=>p.type==='Carnivore'&&this.inFOV(a,p,vRange)) : null;
            const prey = a.type==='Herbivore' ? this.getN(a,pts,vRange) : this.getN(a,[...ants.filter(h=>h.type==='Herbivore'), ...corpses], vRange * 1.3);
            
            // 시야 내 적절한 짝 찾기 (성별 다름, 같은 종, 성숙함)
            const matesInFOV = ants.filter(m => m.type === a.type && m !== a && m.age > 48 && m.genes.gender !== a.genes.gender);
            const mate = this.getN(a, matesInFOV, vRange * 1.3);

            const bLimit = this.ws/2;
            const distEdge = Math.min(bLimit - Math.abs(a.x), bLimit - Math.abs(a.y)) / bLimit;
            const nDensity = ants.filter(ot => ot!==a && this.gD(a,ot) < 150).length / 10;
            const weatherVal = this.world.weather === '비' ? 0.5 : (this.world.weather === '눈' ? 1 : 0);
            
            const inps = [
                a.hunger/100, pred?1:0, prey?1:0, mate?1:0, a.hp/100,
                (this.world.temp + 10) / 50, distEdge, a.age / (a.genes.maxL || 1),
                Math.min(1, nDensity), weatherVal, (a.stunT > 0 ? 1 : 0), this.world.seasonIdx/3,
                nDensity/2, (a.hp < 50 ? 1 : 0), a.brain.lastReward, (a.vx*a.vx + a.vy*a.vy) / 4
            ];
            
            let act = a.brain.decide(inps);
            if (mate && a.hunger > 35) act = 2; 

            const labels = ['회피', '포식', '번식', '배회', '휴식', '공격', '위협', '숨기'];
            a.thought = labels[act];
            a.brain.lastAction = act;

            if (act === 0 && pred) { 
                this.runAway(a, pred); a.rewards += 3; a.thought = '도망 중!'; a.brain.learn(0, inps, 2.5);
                a.brain.lastReward = 1;
            } 
            else if (act === 1 && prey) { 
                this.mT(a, prey, 0.15); // 부드럽게 추적
                a.thought = prey instanceof Plant ? '식사 중' : '사냥 중';
                if(this.gD(a,prey) < 22) { 
                    if(prey instanceof Plant) { 
                        prey.hp -= 40 * (dt/1000); a.hunger = Math.min(100, a.hunger + 30 * (dt/1000));
                        if(prey.isPoison) { a.hp -= 15 * (dt/1000); a.stunT = 2000; a.brain.learn(1, inps, -4); } 
                        if(prey.hp <= 0) { prey.die("먹힘"); a.brain.learn(1,inps,2); a.brain.lastReward = 1; }
                    } else { 
                        prey.hp -= (a.genes.attack||10)*0.1;
                        if(prey.hp<=0) { a.hunger=100; prey.die("사냥당함"); a.brain.learn(1,inps,4); a.brain.lastReward = 2; } 
                    } 
                } 
            }
            else if (act === 2) {
                const searchMate = mate || ants.find(m => m.type === a.type && m !== a && m.age > 48 && m.genes.gender !== a.genes.gender);
                if (searchMate) {
                    this.mT(a, searchMate);
                    if(this.gD(a,searchMate) < 22 && mate) { 
                        this.repr(a, searchMate); a.hunger-=30; searchMate.hunger-=30; a.brain.learn(2,inps,2.5); a.brain.lastReward = 2;
                    }
                } else { a.brain.learn(2, inps, -1.5); a.brain.lastReward = -1; }
            } 
            else if (act === 3) { a.thought = '배회 중'; if (a.hunger < 20) a.brain.learn(3, inps, -2); }
            else if (act === 4) { // 휴식
                a.hp = Math.min(100, a.hp + 8 * (dt/1000));
                if (pred) { a.brain.learn(4, inps, -4); a.brain.lastReward = -3; }
                else if (a.hp < 70) { a.brain.learn(4, inps, 1.5); a.brain.lastReward = 1; }
            }
            else if (act === 5) { // 공격
                const target = this.getN(a, ants.filter(o => o!==a), 160);
                if (target) { this.mT(a, target); target.hp -= 8 * (dt/1000); target.pain += 15; a.brain.learn(5, inps, 1); a.brain.lastReward = 1; }
                else { a.brain.learn(5, inps, -2); a.brain.lastReward = -1; }
            }
            else if (act === 6) { // 위협
                a.thought = '💢 위협 중!! 💢';
                ants.forEach(ot => { if(ot!==a && this.gD(a,ot)<120) this.runAway(ot, a); });
                a.brain.learn(6, inps, pred ? 1.0 : -1);
            }
            else if (act === 7) { // 숨기
                a.thought = '🍃 숨기... 🍃'; 
                a.brain.learn(7, inps, pred ? 1.5 : -0.5);
            }

            if (a.hunger < 30 && prey && act !== 1) { 
                const p = 1 * (dt/1000); a.penalties += p; a.pain += p*5; // 먹이 방치 시 초당 벌점
            } 
            if (Math.random()<0.01) { 
                const an = Math.random() * Math.PI * 2;
                a.vx = Math.cos(an); a.vy = Math.sin(an); 
            }
        });
        if (Math.random() < 0.02 && pts.length < 80) this.spawnPlant();
        const cr = Date.now(); for (let i = this.entities.length - 1; i >= 0; i--) { let e = this.entities[i]; if (e.isDead && !e.logged) { this.logger.add(`${e.customName || NamingEngine.toString(e.sciName)} 사망 (${e.lastReason || '사유 불명'})`, 'death'); e.logged = true; } if (e.isDead && (e.isCorpse ? (cr - e.deathT > 5000) : true)) this.entities.splice(i, 1); }
    }
    getN(a, l, r) { let md = r, n = null; l.forEach(t => { if (this.inFOV(a, t, r)) { let d = this.gD(a, t); if (d < md) { md = d; n = t; } } }); return n; }
    gD(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
    mT(a, t, lerp = 0.1) { 
        const an = Math.atan2(t.y - a.y, t.x - a.x); 
        const tx = Math.cos(an), ty = Math.sin(an);
        a.vx += (tx - a.vx) * lerp;
        a.vy += (ty - a.vy) * lerp;
        const mag = Math.sqrt(a.vx*a.vx + a.vy*a.vy);
        if (mag > 0) { a.vx /= mag; a.vy /= mag; }
    }
    runAway(a, t, lerp = 0.2) { 
        const an = Math.atan2(a.y - t.y, a.x - t.x); 
        const tx = Math.cos(an), ty = Math.sin(an);
        a.vx += (tx - a.vx) * lerp;
        a.vy += (ty - a.vy) * lerp;
        const mag = Math.sqrt(a.vx*a.vx + a.vy*a.vy);
        if (mag > 0) { a.vx /= mag; a.vy /= mag; }
    }
    handleCommandClick(wp) {
        const r = 30 / this.camera.zoom;
        const target = this.entities.find(e => Math.abs(e.x - wp.x) < r && Math.abs(e.y - wp.y) < r);
        
        if (this.clickMode === 'feed' && target && target instanceof Animal && !target.isDead) {
            target.hunger = 100;
            target.hp = Math.min(100, target.hp + 20);
            this.logger.add(`[명령어] ${target.customName || NamingEngine.toString(target.sciName)}의 배고픔을 채웠습니다.`, 'birth');
            this.clickMode = null;
        } else if (this.clickMode === 'resurrect' && target && target.isCorpse) {
            target.isDead = false;
            target.isCorpse = false;
            target.hp = 100;
            if (target instanceof Animal) target.hunger = 100;
            this.logger.add(`[명령어] ${target.customName || NamingEngine.toString(target.sciName)}을(를) 부활시켰습니다!`, 'birth');
            this.clickMode = null;
        } else if (this.clickMode === 'punish') {
            this.world.onLightning(wp.x, wp.y);
            this.logger.add(`[명령어] 지정된 위치에 번개를 떨어뜨렸습니다.`, 'death');
            this.clickMode = null;
        }
    }

    initSummonUI() {
        const modal = document.getElementById('summonModal');
        const confirmBtn = document.getElementById('confirmSummon');
        const cancelBtn = document.getElementById('cancelSummon');
        const colorInput = document.getElementById('summonColor');
        const colorPreview = document.getElementById('colorPreview');

        if (!modal || !confirmBtn || !cancelBtn) return;

        if (colorInput && colorPreview) {
            const updatePreview = () => colorPreview.style.backgroundColor = colorInput.value;
            colorInput.oninput = updatePreview;
            updatePreview();
        }

        confirmBtn.onclick = () => {
            const name = document.getElementById('summonName').value;
            const type = document.getElementById('summonType').value;
            const size = parseFloat(document.getElementById('summonSize').value);
            const speed = parseFloat(document.getElementById('summonSpeed').value);
            const attack = parseFloat(document.getElementById('summonAttack').value);
            const maxL = parseFloat(document.getElementById('summonMaxL').value);
            const metabolism = parseFloat(document.getElementById('summonMetabolism').value);
            const insulation = parseFloat(document.getElementById('summonInsulation').value);
            const vision = parseFloat(document.getElementById('summonVision').value);
            const hp = parseFloat(document.getElementById('summonHp').value);
            const hunger = parseFloat(document.getElementById('summonHunger').value);
            const gender = document.getElementById('summonGender').value;
            
            const hex = colorInput.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);

            const wp = this.camera.toWorld(this.canvas.width / 2, this.canvas.height / 2);
            
            const genes = { 
                size: size, 
                maxL: maxL, 
                speed: speed, 
                metabolism: metabolism, 
                attack: attack, 
                insulation: insulation, 
                visionRange: vision,
                vertices: GeneticEngine.generateRandomShape(5), 
                color: { r, g, b }, 
                gender: gender 
            };
            
            const a = new Animal(wp.x, wp.y, genes, type);
            if (name) a.customName = name;
            a.hp = hp;
            a.hunger = hunger;
            this.entities.push(a);
            
            this.logger.add(`[소환] ${name || NamingEngine.toString(a.sciName)}이(가) 소환되었습니다!`, 'birth');
            modal.classList.add('hidden');
        };

        cancelBtn.onclick = () => modal.classList.add('hidden');
    }

    showSummonModal() {
        const modal = document.getElementById('summonModal');
        if (modal) modal.classList.remove('hidden');
    }

    repr(a, b) { 
        const mut = () => (Math.random() * 0.2 - 0.1); // 10% 변이
        const g = { 
            size: ((a.genes.size+b.genes.size)/2) * (1 + mut()), 
            maxL: ((a.genes.maxL+b.genes.maxL)/2) * (1 + mut()), 
            speed: ((a.genes.speed+b.genes.speed)/2) * (1 + mut()), 
            metabolism: 1.4, 
            attack: ((a.genes.attack+b.genes.attack)/2) * (1 + mut()), 
            insulation: ((a.genes.insulation+b.genes.insulation)/2) + (Math.random()*2-1),
            vertices: a.genes.vertices, 
            color: {
                r: Math.max(0, Math.min(255, (a.genes.color.r + b.genes.color.r)/2 + (Math.random()*20-10))),
                g: Math.max(0, Math.min(255, (a.genes.color.g + b.genes.color.g)/2 + (Math.random()*20-10))),
                b: Math.max(0, Math.min(255, (a.genes.color.b + b.genes.color.b)/2 + (Math.random()*20-10))),
            },
            gender: Math.random()>0.5?'M':'F' 
        }; 
        const bb = new Animal((a.x+b.x)/2, (a.y+b.y)/2, g, a.type, a.brain.mutate()); 
        bb.type = a.type; // 명시적 재할당
        this.entities.push(bb);
        
        a.thought = '번식 성공';
        b.thought = '번식 성공';
        this.logger.add(`${NamingEngine.toString(a.sciName)} & ${NamingEngine.toString(b.sciName)} 번식 성공!`, 'birth');
    }
    save() { try { const sd = { realStart: this.realStartTime, world: { y: this.world.year, m: this.world.month, s: this.world.seasonIdx }, camera: { x: this.camera.x, y: this.camera.y, z: this.camera.zoom }, entities: this.entities.map(e => ({ type: e.type || 'Plant', x: e.x, y: e.y, genes: e.genes, hp: e.hp, age: e.age, sciName: e.sciName, customName: e.customName, starred: e.isStarred, rw: e.rewards, pn: e.penalties, pi: e.pain, br: e.brain?.weights })) }; localStorage.setItem('eco_rl_save', JSON.stringify(sd)); } catch(e) {} }
    load() { 
        try { 
            const item = localStorage.getItem('eco_rl_save');
            if(!item) return;
            const d = JSON.parse(item); 
            if (d && d.entities) { 
                this.realStartTime = d.realStart || Date.now();
                this.world.year = d.world.y || 1; this.world.month = d.world.m || 1; this.world.seasonIdx = d.world.s || 0; 
                this.camera.x = d.camera.x || 0; this.camera.y = d.camera.y || 0; this.camera.zoom = d.camera.zoom || 1; 
                this.entities = d.entities.map(dt => { 
                    const br = dt.br ? new SimpleBrain(dt.br) : null; 
                    let e = (dt.type==='Herbivore'||dt.type==='Carnivore') ? new Animal(dt.x,dt.y,dt.genes,dt.type,br) : new Plant(dt.x,dt.y,dt.genes,dt.genes?.color?.r>100); 
                    e.hp=dt.hp; e.age=dt.age; e.sciName=dt.sciName; e.customName=dt.customName; e.isStarred=dt.starred; 
                    if(e instanceof Animal) { e.rewards = dt.rw || 0; e.penalties = dt.pn || 0; e.pain = dt.pi || 0; }
                    return e; 
                }); 
            } 
        } catch(err) { console.error("Load crash:", err); localStorage.removeItem('eco_rl_save'); this.init(); }
    }
    draw() { 
        // 1. 전체 캔버스를 검정색(우주/공허)으로 채움
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.camera.apply(this.ctx); 
        
        // 2. 생태계 내부(벽 안쪽) 배경색 설정 (부드러운 전환 적용)
        const b = this.ws/2; 
        this.ctx.fillStyle = `rgb(${Math.round(this.currentBG.r)}, ${Math.round(this.currentBG.g)}, ${Math.round(this.currentBG.b)})`;
        this.ctx.fillRect(-b, -b, this.ws, this.ws);
        
        // 3. 격자 및 경계선
        this.ctx.strokeStyle = this.currentBG.r > 200 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; 
        for (let i = -b; i <= b; i += 100) { this.ctx.beginPath(); this.ctx.moveTo(i, -b); this.ctx.lineTo(i, b); this.ctx.stroke(); this.ctx.beginPath(); this.ctx.moveTo(-b, i); this.ctx.lineTo(b, i); this.ctx.stroke(); } 
        
        this.entities.forEach(e => { try { e.draw(this.ctx, this.visionMode); } catch(err) {} }); 
        this.lightnings.forEach(l => { try { l.draw(this.ctx); } catch(err) {} }); 
        
        this.ctx.strokeStyle = this.currentBG.r > 200 ? '#cbd5e1' : '#57534e'; 
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-b,-b,this.ws,this.ws); this.camera.restore(this.ctx); 
    }
    updateUI() { 
        try { 
            const h = document.getElementById('herbivoreCount'), c = document.getElementById('carnivoreCount'), p = document.getElementById('plantCount'); 
            if(h) h.textContent = this.entities.filter(en => en.type === 'Herbivore' && !en.isDead).length; 
            if(c) c.textContent = this.entities.filter(en => en.type === 'Carnivore' && !en.isDead).length; 
            if(p) p.textContent = this.entities.filter(en => en instanceof Plant && !en.isDead).length; 
            
            // 시간 UI 업데이트
            const yEl = document.getElementById('year'), mEl = document.getElementById('month'), rsEl = document.getElementById('simStarted'), reEl = document.getElementById('simElapsed');
            if(yEl) yEl.textContent = `${this.world.year}년차`;
            if(mEl) mEl.textContent = `${this.world.month}개월`;
            if(rsEl) rsEl.textContent = `시작: ${new Date(this.realStartTime).toLocaleString([], {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}`;
            
            const elapsedMs = Date.now() - this.realStartTime;
            const elapsedMin = Math.floor(elapsedMs / 60000);
            const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
            if(reEl) reEl.textContent = `실제 경과: ${elapsedMin}분 ${elapsedSec}초`;

            // 가상 날짜 계산 (시작 날짜 + 시뮬레이션 경과 월수)
            const sdEl = document.getElementById('simDate');
            if (sdEl) {
                const simDate = new Date(this.realStartTime);
                const totalMonths = (this.world.year - 1) * 12 + (this.world.month - 1);
                simDate.setMonth(simDate.getMonth() + totalMonths);
                sdEl.textContent = `가상 날짜: ${simDate.getFullYear()}년 ${simDate.getMonth() + 1}월 ${simDate.getDate()}일`;
            }

            // 리더보드 업데이트 (최고/최저)
            const tsNm = document.getElementById('topScorerName'), bsNm = document.getElementById('bottomScorerName');
            const ants = this.entities.filter(en => !en.isDead && en instanceof Animal);
            if (ants.length > 0) {
                let top = ants[0], bot = ants[0];
                ants.forEach(a => { 
                    if(a.totalScore > top.totalScore) top = a; 
                    if(a.totalScore < bot.totalScore) bot = a; 
                });
                if (tsNm) tsNm.textContent = `${top.customName || NamingEngine.toString(top.sciName)} (${top.totalScore}점)`;
                if (bsNm) bsNm.textContent = `${bot.customName || NamingEngine.toString(bot.sciName)} (${bot.totalScore}점)`;
            } else {
                if (tsNm) tsNm.textContent = "집계 중...";
                if (bsNm) bsNm.textContent = "집계 중...";
            }
        } catch(e) {} 
    }
    reset() { 
        this.realStartTime = Date.now();
        localStorage.removeItem('eco_rl_save');
        localStorage.removeItem('eco_ev_v18'); // 로그도 초기화
        this.entities = []; 
        this.lightnings = []; 
        this.slots = new Array(10).fill(null);
        this.followTarget = null; 
        this.namingMode = false;
        this.world.month = 1;
        this.world.year = 1;
        this.world.seasonIdx = 0;
        this.camera.x = 0; 
        this.camera.y = 0; 
        this.camera.zoom = 1.0; 
        this.currentBG = { r: 61, g: 43, b: 31 }; // 배경색 물리적 강제 초기화
        this.logger.clear(); // 로그 화면 지우기
        this.init(); 
        this.logger.add("천지개벽: 세상이 초기화되고 공허에서 생명이 시작됩니다.", 'birth'); 
    }
}

window.addEventListener('load', () => {
    try {
        const sim = new Simulation(), ci = document.getElementById('chatInput'), co = document.getElementById('chatOverlay');
        window.addEventListener('keydown', (e) => { 
            if (e.key === '/') { 
                if (co) { 
                    co.classList.remove('hidden'); 
                    if(ci) { ci.value = '/'; ci.focus(); }
                    e.preventDefault(); 
                } 
            } 
            if (e.key === 'Escape') co?.classList.add('hidden'); 
        });
        ci?.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                const v = ci.value.trim(); 
                if (v === '/meteo') { 
                    const ov = document.getElementById('effectOverlay'); ov?.classList.add('flash-active'); 
                    setTimeout(() => { sim.reset(); ov?.classList.remove('flash-active'); }, 1000); 
                } else if (v === '/named') { 
                    sim.namingMode = true; sim.logger.add("이름 모드 활성: 개체를 클릭하세요.", 'birth'); 
                } else if (v === '/feed') {
                    sim.clickMode = 'feed'; sim.logger.add("피딩 모드 활성: 배고픈 개체를 클릭하세요.", 'birth');
                } else if (v === '/resurrection') {
                    sim.clickMode = 'resurrect'; sim.logger.add("부활 모드 활성: 사체를 클릭하세요.", 'birth');
                } else if (v === '/punish') {
                    sim.clickMode = 'punish'; sim.logger.add("징벌 모드 활성: 번개를 내릴 위치를 클릭하세요.", 'death');
                } else if (v === '/summon') {
                    sim.showSummonModal();
                } else if (v.startsWith('/tp ')) { 
                    const n = v.substring(4).trim(), t = sim.entities.find(e => e.customName?.toLowerCase() === n.toLowerCase()); 
                    if(t){ sim.camera.x = t.x; sim.camera.y = t.y; sim.logger.add(`${n}에게 이동함`, 'birth'); } 
                } 
                ci.value = ''; co?.classList.add('hidden'); 
            } 
        });
    } catch(err) { console.error("Entry error:", err); }
});
