import {
  World, createSystem, PanelUI, PanelDocument, UIKitDocument, UIKit, eq,
  Follower, InputComponent,
  Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry,
  ConeGeometry, TorusGeometry, OctahedronGeometry, RingGeometry, CircleGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion, Euler, Matrix4,
  Fog, AmbientLight, PointLight, DirectionalLight,
  BufferGeometry, Float32BufferAttribute, EdgesGeometry, LineSegments,
  AdditiveBlending, DoubleSide, Line, Raycaster, Vector2,
} from '@iwsdk/core';

// ============= CONSTANTS & TYPES =============
const CELL = 0.15;
const GRID_Y = 1.5;
const GRID_Z = -2.0;
const DIR = [[1,0],[0,1],[-1,0],[0,-1]]; // R,D,L,U
const BEAM_COLORS = [0x00ffff, 0xff00ff, 0xffff00, 0xffffff, 0xff3333, 0x33ff33, 0x3333ff];
const COLOR_NAMES = ['Cyan','Magenta','Yellow','White','Red','Green','Blue'];
const TOOL_NAMES = ['Mirror','Splitter','Prism','Filter'];
const THEMES = [
  {name:'Neon Holodeck',grid:0x00ffff,accent:0x00ffff,bg:0x000811,fog:0x000811,wall:0x003344,beam:0x00ffff,glow:0x003344},
  {name:'Crimson Grid',grid:0xff3333,accent:0xff3333,bg:0x110000,fog:0x110000,wall:0x440000,beam:0xff3333,glow:0x440000},
  {name:'Toxic Neon',grid:0x33ff33,accent:0x33ff33,bg:0x001100,fog:0x001100,wall:0x004400,beam:0x33ff33,glow:0x004400},
  {name:'Ultra Violet',grid:0xaa33ff,accent:0xaa33ff,bg:0x0a0011,fog:0x0a0011,wall:0x330066,beam:0xaa33ff,glow:0x330066},
  {name:'Solar Blaze',grid:0xff8800,accent:0xff8800,bg:0x110800,fog:0x110800,wall:0x442200,beam:0xff8800,glow:0x442200},
];
const BEAM_SKINS = [
  {name:'Classic Neon',color:null,unlock:'default'},
  {name:'Solar Flare',color:0xff6600,unlock:'10 levels'},
  {name:'Frost Core',color:0x88ddff,unlock:'5K score'},
  {name:'Plasma Pink',color:0xff44aa,unlock:'x5 combo'},
  {name:'Toxic Pulse',color:0x44ff44,unlock:'10 games'},
  {name:'Void Purple',color:0x8800ff,unlock:'3 stars on 10'},
  {name:'Chrome',color:0xcccccc,unlock:'all modes'},
  {name:'Rainbow',color:0xffffff,unlock:'all zones'},
];

type CellType = 'empty'|'emitter'|'target'|'mirror'|'splitter'|'prism'|'filter'|'wall';
interface Cell { type: CellType; dir?: number; orient?: number; color?: number; fixed?: boolean; }
interface BeamSeg { x1:number; y1:number; x2:number; y2:number; color:number; }
interface LevelDef {
  name: string; zone: number; size: number; par: number;
  emitters: number[][]; targets: number[][]; walls: number[][];
  fixed: number[][]; tools: number[];
}

// ============= LEVEL DEFINITIONS (30 levels, 5 zones) =============
const LEVELS: LevelDef[] = [
  // Zone 1 - Reflection
  {name:'First Light',zone:0,size:5,par:1,emitters:[[0,2,0,0]],targets:[[4,2,0]],walls:[],fixed:[],tools:[1,0,0,0]},
  {name:'Corner Shot',zone:0,size:5,par:1,emitters:[[0,4,0,0]],targets:[[4,0,0]],walls:[],fixed:[],tools:[1,0,0,0]},
  {name:'Double Bounce',zone:0,size:6,par:2,emitters:[[0,0,0,0]],targets:[[0,5,0]],walls:[],fixed:[],tools:[2,0,0,0]},
  {name:'The L-Turn',zone:0,size:6,par:1,emitters:[[0,2,0,0]],targets:[[3,5,0]],walls:[],fixed:[[3,2,0,0]],tools:[1,0,0,0]},
  {name:'Cross Paths',zone:0,size:6,par:2,emitters:[[0,1,0,0],[0,4,0,0]],targets:[[5,4,0],[5,1,0]],walls:[],fixed:[],tools:[2,0,0,0]},
  {name:'Zigzag',zone:0,size:7,par:3,emitters:[[0,0,0,0]],targets:[[6,6,0]],walls:[[3,0],[3,1],[3,5],[3,6]],fixed:[],tools:[3,0,0,0]},
  // Zone 2 - Splitting
  {name:'Split Decision',zone:1,size:6,par:1,emitters:[[0,2,0,0]],targets:[[5,2,0],[2,5,0]],walls:[],fixed:[],tools:[0,1,0,0]},
  {name:'Three Way',zone:1,size:6,par:2,emitters:[[0,3,0,0]],targets:[[5,3,0],[3,0,0],[3,5,0]],walls:[],fixed:[],tools:[1,1,0,0]},
  {name:'Chain Split',zone:1,size:7,par:2,emitters:[[0,3,0,0]],targets:[[6,3,0],[3,0,0],[3,6,0],[6,0,0]],walls:[],fixed:[],tools:[1,2,0,0]},
  {name:'Split and Route',zone:1,size:7,par:3,emitters:[[0,3,0,0]],targets:[[6,0,0],[6,6,0]],walls:[[3,0],[3,6]],fixed:[],tools:[2,1,0,0]},
  {name:'Double Split',zone:1,size:7,par:3,emitters:[[0,1,0,0],[0,5,0,0]],targets:[[6,1,0],[6,5,0],[3,3,0]],walls:[],fixed:[],tools:[1,2,0,0]},
  {name:'Split Maze',zone:1,size:8,par:5,emitters:[[0,3,0,0]],targets:[[7,0,0],[7,3,0],[7,7,0],[3,7,0]],walls:[[2,1],[5,1],[2,5],[5,5]],fixed:[],tools:[3,2,0,0]},
  // Zone 3 - Spectrum
  {name:'Color Shift',zone:2,size:6,par:1,emitters:[[0,2,0,0]],targets:[[5,2,1]],walls:[],fixed:[],tools:[0,0,1,0]},
  {name:'Two Colors',zone:2,size:6,par:2,emitters:[[0,1,0,0],[0,4,0,1]],targets:[[5,1,1],[5,4,2]],walls:[],fixed:[],tools:[0,0,2,0]},
  {name:'Prism Path',zone:2,size:7,par:3,emitters:[[0,0,0,0]],targets:[[6,6,2]],walls:[],fixed:[],tools:[1,0,2,0]},
  {name:'Color Route',zone:2,size:7,par:3,emitters:[[0,3,0,0]],targets:[[6,1,1],[6,3,0],[6,5,2]],walls:[],fixed:[],tools:[2,1,2,0]},
  {name:'Spectrum Split',zone:2,size:7,par:5,emitters:[[0,3,0,0]],targets:[[6,0,1],[6,3,2],[6,6,0]],walls:[[3,1],[3,5]],fixed:[],tools:[3,1,2,0]},
  {name:'Rainbow',zone:2,size:8,par:5,emitters:[[0,1,0,0],[0,4,0,1],[0,7,0,2]],targets:[[7,1,1],[7,4,2],[7,7,0]],walls:[],fixed:[],tools:[2,0,3,0]},
  // Zone 4 - Filtration
  {name:'Gate Keeper',zone:3,size:6,par:1,emitters:[[0,2,0,0]],targets:[[5,2,0]],walls:[],fixed:[[3,2,3,0]],tools:[0,0,0,0]},
  {name:'Color Gate',zone:3,size:6,par:2,emitters:[[0,1,0,0],[0,4,0,1]],targets:[[5,1,0],[5,4,1]],walls:[],fixed:[],tools:[1,0,0,2]},
  {name:'Filter Maze',zone:3,size:7,par:3,emitters:[[0,3,0,0]],targets:[[6,1,1],[6,5,0]],walls:[[3,0],[3,6]],fixed:[],tools:[2,1,1,2]},
  {name:'Selective Route',zone:3,size:7,par:4,emitters:[[0,1,0,0],[0,5,0,1]],targets:[[6,1,1],[6,3,0],[6,5,0]],walls:[],fixed:[],tools:[2,1,1,2]},
  {name:'Color Puzzle',zone:3,size:8,par:5,emitters:[[0,2,0,0],[0,5,0,1]],targets:[[7,0,1],[7,4,2],[7,7,0]],walls:[[4,1],[4,6]],fixed:[],tools:[3,1,2,2]},
  {name:'The Gauntlet',zone:3,size:8,par:6,emitters:[[0,1,0,0],[0,4,0,1],[0,7,0,2]],targets:[[7,1,2],[7,4,0],[7,7,1]],walls:[[3,0],[3,3],[3,5]],fixed:[],tools:[3,2,3,2]},
  // Zone 5 - Singularity
  {name:'Master Class',zone:4,size:8,par:5,emitters:[[0,0,0,0],[0,7,0,1]],targets:[[7,0,1],[7,7,0],[4,4,2]],walls:[[2,2],[5,5]],fixed:[],tools:[3,1,2,1]},
  {name:'The Labyrinth',zone:4,size:8,par:6,emitters:[[0,3,0,0]],targets:[[7,0,0],[7,3,1],[7,7,2],[0,7,0]],walls:[[2,1],[5,1],[2,5],[5,5],[3,3],[4,3]],fixed:[],tools:[4,2,2,1]},
  {name:'Chromatic',zone:4,size:8,par:6,emitters:[[0,0,0,0],[7,7,2,1],[0,7,0,2]],targets:[[7,0,2],[7,3,0],[0,3,1],[3,3,1]],walls:[[1,3],[6,3]],fixed:[],tools:[3,2,3,2]},
  {name:'Cascade',zone:4,size:8,par:7,emitters:[[0,0,0,0]],targets:[[7,0,0],[7,3,1],[7,7,2],[0,7,1],[3,7,2]],walls:[[4,1],[4,5]],fixed:[],tools:[5,3,2,1]},
  {name:'The Crucible',zone:4,size:8,par:8,emitters:[[0,0,0,0],[7,0,2,1],[0,7,0,2],[7,7,2,0]],targets:[[3,3,1],[4,3,2],[3,4,0],[4,4,1]],walls:[[1,1],[6,1],[1,6],[6,6]],fixed:[],tools:[4,2,3,2]},
  {name:'Singularity',zone:4,size:8,par:8,emitters:[[0,0,0,0],[7,0,2,1],[0,7,0,2]],targets:[[7,7,0],[4,0,2],[4,7,1],[0,4,1],[7,4,0]],walls:[[2,2],[5,2],[2,5],[5,5],[3,3],[4,4]],fixed:[],tools:[5,3,3,2]},
];
const ZONE_NAMES = ['Reflection','Diffraction','Spectrum','Filtration','Singularity'];

// ============= BEAM TRACING ENGINE =============
function traceBeams(grid: Cell[][], size: number): { segs: BeamSeg[]; lit: Set<string> } {
  const segs: BeamSeg[] = [];
  const lit = new Set<string>();
  const visited = new Set<string>();

  function follow(col: number, row: number, d: number, c: number, depth: number) {
    if (depth > 50) return;
    const key = `${col},${row},${d},${c}`;
    if (visited.has(key)) return;
    visited.add(key);
    const [dx, dy] = DIR[d];
    let nx = col + dx, ny = row + dy;
    while (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      const cell = grid[ny][nx];
      if (cell.type === 'empty') { nx += dx; ny += dy; continue; }
      segs.push({ x1: col, y1: row, x2: nx, y2: ny, color: c });
      if (cell.type === 'wall') return;
      if (cell.type === 'target') {
        if (cell.color === c || cell.color === 3) lit.add(`${nx},${ny}`);
        return;
      }
      if (cell.type === 'mirror') {
        const o = cell.orient ?? 0;
        const nd = o === 0 ? [3,2,1,0][d] : [1,0,3,2][d];
        follow(nx, ny, nd, c, depth + 1);
        return;
      }
      if (cell.type === 'splitter') {
        const o = cell.orient ?? 0;
        const nd = o === 0 ? [3,2,1,0][d] : [1,0,3,2][d];
        follow(nx, ny, nd, c, depth + 1);
        follow(nx, ny, d, c, depth + 1);
        return;
      }
      if (cell.type === 'prism') {
        const nc = c < 3 ? (c + 1) % 3 : c;
        follow(nx, ny, d, nc, depth + 1);
        return;
      }
      if (cell.type === 'filter') {
        if ((cell.color ?? 0) === c || (cell.color ?? 0) === 3) {
          follow(nx, ny, d, c, depth + 1);
        }
        return;
      }
      if (cell.type === 'emitter') { nx += dx; ny += dy; continue; }
      return;
    }
    // Beam exits grid — add final segment to last valid cell
    segs.push({ x1: col, y1: row, x2: nx - dx, y2: ny - dy, color: c });
  }

  for (let r = 0; r < size; r++) {
    for (let cc = 0; cc < size; cc++) {
      const cell = grid[r][cc];
      if (cell.type === 'emitter') {
        follow(cc, r, cell.dir ?? 0, cell.color ?? 0, 0);
      }
    }
  }
  return { segs, lit };
}

// ============= GAME STATE MANAGER =============
const LS_KEY = 'neon-reflect-save';
interface SaveData {
  levels: Record<number, { best: number; stars: number; time: number }>;
  stats: {
    games: number; totalScore: number; bestScore: number; levelsCleared: number;
    totalMoves: number; mirrorsPlaced: number; splittersPlaced: number;
    prismsPlaced: number; filtersPlaced: number; perfectLevels: number;
    streak: number; bestStreak: number; playTime: number; modesPlayed: string[];
    dailyDone: number; dailyStreak: number; lastDaily: string;
  };
  achievements: Record<string, boolean>;
  settings: { master: number; sfx: number; music: number; theme: number; skin: number };
  xp: number; level: number;
}

function loadSave(): SaveData {
  try {
    const d = localStorage.getItem(LS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return {
    levels: {}, stats: {
      games:0,totalScore:0,bestScore:0,levelsCleared:0,totalMoves:0,
      mirrorsPlaced:0,splittersPlaced:0,prismsPlaced:0,filtersPlaced:0,
      perfectLevels:0,streak:0,bestStreak:0,playTime:0,modesPlayed:[],
      dailyDone:0,dailyStreak:0,lastDaily:'',
    },
    achievements:{},settings:{master:80,sfx:80,music:50,theme:0,skin:0},xp:0,level:1,
  };
}
let SAVE = loadSave();
function saveSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(SAVE)); } catch {} }
function xpForLevel(l: number) { return 100 + 50 * l; }
function addXP(amount: number) {
  SAVE.xp += amount;
  while (SAVE.xp >= xpForLevel(SAVE.level) && SAVE.level < 50) {
    SAVE.xp -= xpForLevel(SAVE.level);
    SAVE.level++;
  }
}
const TITLES = ['Novice','Apprentice','Student','Scholar','Adept','Expert','Specialist',
  'Professional','Master','Grandmaster','Sage','Oracle','Luminary','Virtuoso','Paragon',
  'Champion','Titan','Legend','Mythic','NEON GOD'];
function getTitle() { return TITLES[Math.min(Math.floor((SAVE.level - 1) / 2.5), 19)]; }

// Achievement definitions
const ACHV_DEFS: [string,string][] = [
  ['First Light','Complete your first level'],
  ['Ten Beams','Complete 10 levels'],
  ['Optician','Complete 20 levels'],
  ['Master Optician','Complete all 30 levels'],
  ['Star Seeker','Get 3 stars on any level'],
  ['Stellar','Get 3 stars on 10 levels'],
  ['Constellation','Get 3 stars on all 30 levels'],
  ['Minimalist','Complete a level at par'],
  ['Efficient','Complete 5 levels at or under par'],
  ['Speed Demon','Complete a level in under 20s'],
  ['Lightning','Complete 5 levels under 20s each'],
  ['Reflector','Place 50 mirrors total'],
  ['Splitter Pro','Place 25 splitters total'],
  ['Prismatic','Place 15 prisms total'],
  ['Filter Expert','Place 10 filters total'],
  ['Multi-Tool','Use all 4 tool types in one level'],
  ['Theme Tourist','Try all 5 themes'],
  ['Mode Explorer','Play all 8 game modes'],
  ['Hot Streak','Complete 3 levels in a row'],
  ['On Fire','Complete 5 levels in a row'],
  ['Unstoppable','Complete 10 in a row'],
  ['Score Hunter','Reach 5,000 total score'],
  ['Score Legend','Reach 25,000 total score'],
  ['Score God','Reach 50,000 total score'],
  ['Daily Solver','Complete a Daily Challenge'],
  ['Weekly Warrior','Complete 7 Daily Challenges'],
  ['Dedicated','Complete 14 Daily Challenges'],
  ['Zone I','Complete Reflection zone'],
  ['Zone II','Complete Diffraction zone'],
  ['Zone III','Complete Spectrum zone'],
  ['Zone IV','Complete Filtration zone'],
  ['Zone V','Complete Singularity zone'],
  ['Rookie','Reach level 5'],
  ['Expert','Reach level 15'],
  ['Grand Master','Reach level 25'],
  ['Neon God','Reach level 50'],
  ['Games 10','Play 10 games'],
  ['Games 50','Play 50 games'],
  ['Games 100','Play 100 games'],
  ['Skin Collector','Unlock a beam skin'],
];

function checkAchievements(gs: GameState) {
  const s = SAVE.stats;
  const a = SAVE.achievements;
  const grant = (id: string) => { if (!a[id]) { a[id] = true; gs.toasts.push('Achievement: ' + ACHV_DEFS.find(d=>d[0]===id)?.[0]); } };
  if (s.levelsCleared >= 1) grant('First Light');
  if (s.levelsCleared >= 10) grant('Ten Beams');
  if (s.levelsCleared >= 20) grant('Optician');
  if (s.levelsCleared >= 30) grant('Master Optician');
  const stars3 = Object.values(SAVE.levels).filter(l => l.stars === 3).length;
  if (stars3 >= 1) grant('Star Seeker');
  if (stars3 >= 10) grant('Stellar');
  if (stars3 >= 30) grant('Constellation');
  if (s.perfectLevels >= 1) grant('Minimalist');
  if (s.perfectLevels >= 5) grant('Efficient');
  if (s.mirrorsPlaced >= 50) grant('Reflector');
  if (s.splittersPlaced >= 25) grant('Splitter Pro');
  if (s.prismsPlaced >= 15) grant('Prismatic');
  if (s.filtersPlaced >= 10) grant('Filter Expert');
  if (s.streak >= 3) grant('Hot Streak');
  if (s.streak >= 5) grant('On Fire');
  if (s.streak >= 10) grant('Unstoppable');
  if (s.totalScore >= 5000) grant('Score Hunter');
  if (s.totalScore >= 25000) grant('Score Legend');
  if (s.totalScore >= 50000) grant('Score God');
  if (s.dailyDone >= 1) grant('Daily Solver');
  if (s.dailyDone >= 7) grant('Weekly Warrior');
  if (s.dailyDone >= 14) grant('Dedicated');
  for (let z = 0; z < 5; z++) {
    const all = LEVELS.filter(l => l.zone === z).every((_, i) => SAVE.levels[z * 6 + i]);
    if (all) grant(['Zone I','Zone II','Zone III','Zone IV','Zone V'][z]);
  }
  if (SAVE.level >= 5) grant('Rookie');
  if (SAVE.level >= 15) grant('Expert');
  if (SAVE.level >= 25) grant('Grand Master');
  if (SAVE.level >= 50) grant('Neon God');
  if (s.games >= 10) grant('Games 10');
  if (s.games >= 50) grant('Games 50');
  if (s.games >= 100) grant('Games 100');
  if (s.modesPlayed.length >= 8) grant('Mode Explorer');
  saveSave();
}

// ============= AUDIO MANAGER =============
class AudioMgr {
  ctx: AudioContext | null = null;
  masterGain!: GainNode; sfxGain!: GainNode; musicGain!: GainNode;
  droneOscs: OscillatorNode[] = [];

  init() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = SAVE.settings.master / 100;
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = SAVE.settings.sfx / 100;
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = SAVE.settings.music / 100;
    this.musicGain.connect(this.masterGain);
  }

  ensure() { if (!this.ctx) this.init(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  playTone(freq: number, type: OscillatorType, dur: number, vol = 0.3) {
    this.ensure(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  place() { this.playTone(880, 'sine', 0.15, 0.3); this.playTone(1100, 'triangle', 0.1, 0.2); }
  rotate() { this.playTone(660, 'triangle', 0.12, 0.25); }
  remove() { this.playTone(440, 'sawtooth', 0.1, 0.15); }

  beamHit() {
    this.ensure(); if (!this.ctx) return;
    [660, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.2), i * 60);
    });
  }

  levelComplete() {
    this.ensure(); if (!this.ctx) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.3, 0.25), i * 100);
    });
  }

  levelFail() {
    this.ensure(); if (!this.ctx) return;
    [440, 370, 330, 294].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.25, 0.15), i * 120);
    });
  }

  click() { this.playTone(1200, 'sine', 0.05, 0.15); }

  countdownTick() { this.playTone(800, 'sine', 0.08, 0.2); }
  countdownGo() { this.playTone(1200, 'sine', 0.2, 0.3); }

  achievement() {
    this.ensure(); if (!this.ctx) return;
    [880, 1100, 1320, 1540, 1760].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.2), i * 80);
    });
  }

  startDrone() {
    this.ensure(); if (!this.ctx) return;
    if (this.droneOscs.length > 0) return;
    const freqs: [number, OscillatorType][] = [[55,'sine'],[82.5,'triangle'],[110,'sine']];
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.15; lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfo.start();
    for (const [f, t] of freqs) {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 400;
      o.type = t; o.frequency.value = f; g.gain.value = 0.06;
      lfoGain.connect(g.gain);
      o.connect(lp); lp.connect(g); g.connect(this.musicGain);
      o.start(); this.droneOscs.push(o);
    }
    this.droneOscs.push(lfo);
  }

  stopDrone() { this.droneOscs.forEach(o => { try { o.stop(); } catch {} }); this.droneOscs = []; }

  setVolumes(m: number, s: number, mu: number) {
    SAVE.settings.master = m; SAVE.settings.sfx = s; SAVE.settings.music = mu;
    if (this.masterGain) this.masterGain.gain.value = m / 100;
    if (this.sfxGain) this.sfxGain.gain.value = s / 100;
    if (this.musicGain) this.musicGain.gain.value = mu / 100;
    saveSave();
  }
}
const audio = new AudioMgr();

// ============= PARTICLE POOL =============
interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; }
class ParticlePool {
  particles: Particle[] = [];
  group: Group;
  constructor(max: number, scene: { add: (o: any) => void }) {
    this.group = new Group();
    scene.add(this.group);
    const geo = new SphereGeometry(0.005, 4, 4);
    for (let i = 0; i < max; i++) {
      const mat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
      const m = new Mesh(geo, mat);
      m.visible = false;
      this.group.add(m);
      this.particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
    }
  }
  burst(x: number, y: number, z: number, color: number, count = 15) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.life > 0 || spawned >= count) continue;
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      (p.mesh.material as MeshBasicMaterial).color.set(color);
      (p.mesh.material as MeshBasicMaterial).opacity = 1;
      const a = Math.random() * Math.PI * 2;
      const s = 0.3 + Math.random() * 0.5;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s + 0.3; p.vz = (Math.random() - 0.5) * 0.3;
      p.life = 0.6 + Math.random() * 0.4; p.maxLife = p.life;
      spawned++;
    }
  }
  update(dt: number) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 2.0 * dt;
      const t = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as MeshBasicMaterial).opacity = t;
      if (p.life <= 0) p.mesh.visible = false;
    }
  }
}

// ============= GAME STATE =============
type GameScreen = 'title'|'modeselect'|'levelselect'|'playing'|'paused'|'levelcomplete'|'gameover'|'leaderboard'|'achievements'|'settings'|'help'|'stats'|'skins'|'countdown';
type GameMode = 'campaign'|'puzzle'|'timeattack'|'endless'|'daily'|'sandbox'|'speedrun'|'practice';
interface GameState {
  screen: GameScreen;
  mode: GameMode;
  levelIdx: number;
  grid: Cell[][];
  gridSize: number;
  toolbox: number[]; // [mirrors, splitters, prisms, filters]
  selectedTool: number; // 0=mirror,1=splitter,2=prism,3=filter,-1=none
  moves: number;
  score: number;
  time: number;
  solved: boolean;
  beamSegs: BeamSeg[];
  litTargets: Set<string>;
  totalTargets: number;
  hoverCol: number;
  hoverRow: number;
  toasts: string[];
  toastTimer: number;
  countdownVal: number;
  countdownTimer: number;
  achvPage: number;
  usedTools: Set<string>;
  startTime: number;
  speedRunLevels: number[];
  speedRunIdx: number;
  speedRunTotal: number;
  endlessLevel: number;
  dailySeed: number;
}

function createGameState(): GameState {
  return {
    screen: 'title', mode: 'campaign', levelIdx: 0,
    grid: [], gridSize: 0, toolbox: [0,0,0,0], selectedTool: 0,
    moves: 0, score: 0, time: 0, solved: false,
    beamSegs: [], litTargets: new Set(), totalTargets: 0,
    hoverCol: -1, hoverRow: -1,
    toasts: [], toastTimer: 0, countdownVal: 0, countdownTimer: 0,
    achvPage: 0, usedTools: new Set(), startTime: 0,
    speedRunLevels: [], speedRunIdx: 0, speedRunTotal: 0,
    endlessLevel: 0, dailySeed: 0,
  };
}
let GS = createGameState();

function initLevel(levelIdx: number, gs: GameState) {
  const lvl = LEVELS[levelIdx];
  if (!lvl) return;
  gs.gridSize = lvl.size;
  gs.grid = Array.from({ length: lvl.size }, () =>
    Array.from({ length: lvl.size }, () => ({ type: 'empty' as CellType }))
  );
  for (const [c, r, d, col] of lvl.emitters) gs.grid[r][c] = { type: 'emitter', dir: d, color: col, fixed: true };
  for (const [c, r, col] of lvl.targets) gs.grid[r][c] = { type: 'target', color: col, fixed: true };
  for (const [c, r] of lvl.walls) gs.grid[r][c] = { type: 'wall', fixed: true };
  for (const [c, r, t, o] of lvl.fixed) {
    const types: CellType[] = ['mirror','splitter','prism','filter'];
    gs.grid[r][c] = { type: types[t] ?? 'mirror', orient: o, color: o, fixed: true };
  }
  gs.toolbox = [...lvl.tools];
  gs.selectedTool = gs.toolbox.findIndex(t => t > 0);
  if (gs.selectedTool < 0) gs.selectedTool = 0;
  gs.moves = 0; gs.score = 0; gs.time = 0; gs.solved = false;
  gs.usedTools = new Set(); gs.startTime = Date.now();
  gs.totalTargets = lvl.targets.length;
  updateBeams(gs);
}

function generateEndless(level: number, seed: number): LevelDef {
  const rng = mulberry32(seed + level * 1000);
  const size = Math.min(5 + Math.floor(level / 3), 8);
  const numTargets = Math.min(1 + Math.floor(level / 2), 5);
  const emitters: number[][] = [[0, Math.floor(rng() * size), 0, Math.floor(rng() * 3)]];
  const targets: number[][] = [];
  const walls: number[][] = [];
  const used = new Set<string>();
  used.add(`0,${emitters[0][1]}`);
  for (let i = 0; i < numTargets; i++) {
    let tc: number, tr: number;
    do { tc = 1 + Math.floor(rng() * (size - 1)); tr = Math.floor(rng() * size); } while (used.has(`${tc},${tr}`));
    targets.push([tc, tr, Math.floor(rng() * 3)]);
    used.add(`${tc},${tr}`);
  }
  const numWalls = Math.floor(rng() * 3);
  for (let i = 0; i < numWalls; i++) {
    let wc: number, wr: number;
    do { wc = Math.floor(rng() * size); wr = Math.floor(rng() * size); } while (used.has(`${wc},${wr}`));
    walls.push([wc, wr]); used.add(`${wc},${wr}`);
  }
  const mirrors = 1 + Math.floor(level / 2) + Math.floor(rng() * 2);
  const splitters = level >= 3 ? Math.floor(rng() * 2) : 0;
  const prisms = level >= 5 ? Math.floor(rng() * 2) : 0;
  const filters = level >= 7 ? Math.floor(rng() * 2) : 0;
  return { name: `Endless ${level + 1}`, zone: 4, size, par: mirrors + splitters + prisms + filters, emitters, targets, walls, fixed: [], tools: [mirrors, splitters, prisms, filters] };
}

function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function updateBeams(gs: GameState) {
  const result = traceBeams(gs.grid, gs.gridSize);
  gs.beamSegs = result.segs;
  gs.litTargets = result.lit;
  gs.solved = gs.litTargets.size >= gs.totalTargets && gs.totalTargets > 0;
}

function handleCellClick(col: number, row: number, gs: GameState, rightClick = false) {
  if (gs.solved || gs.screen !== 'playing') return;
  const cell = gs.grid[row][col];

  if (rightClick) {
    // Remove piece
    if (cell.type !== 'empty' && !cell.fixed && ['mirror','splitter','prism','filter'].includes(cell.type)) {
      const toolIdx = ['mirror','splitter','prism','filter'].indexOf(cell.type);
      gs.toolbox[toolIdx]++;
      gs.grid[row][col] = { type: 'empty' };
      gs.moves++;
      audio.remove();
      updateBeams(gs);
    }
    return;
  }

  if (cell.type === 'empty') {
    // Place selected tool
    const toolTypes: CellType[] = ['mirror','splitter','prism','filter'];
    if (gs.selectedTool >= 0 && gs.selectedTool < 4 && gs.toolbox[gs.selectedTool] > 0) {
      gs.grid[row][col] = { type: toolTypes[gs.selectedTool], orient: 0, color: gs.selectedTool === 3 ? 0 : undefined };
      gs.toolbox[gs.selectedTool]--;
      gs.moves++;
      gs.usedTools.add(TOOL_NAMES[gs.selectedTool]);
      if (gs.selectedTool === 0) SAVE.stats.mirrorsPlaced++;
      else if (gs.selectedTool === 1) SAVE.stats.splittersPlaced++;
      else if (gs.selectedTool === 2) SAVE.stats.prismsPlaced++;
      else if (gs.selectedTool === 3) SAVE.stats.filtersPlaced++;
      audio.place();
      updateBeams(gs);
      if (gs.solved) onLevelSolved(gs);
    }
  } else if (!cell.fixed && ['mirror','splitter','prism','filter'].includes(cell.type)) {
    // Rotate piece
    cell.orient = ((cell.orient ?? 0) + 1) % 2;
    if (cell.type === 'filter') cell.color = ((cell.color ?? 0) + 1) % 3;
    gs.moves++;
    audio.rotate();
    updateBeams(gs);
    if (gs.solved) onLevelSolved(gs);
  }
}

function onLevelSolved(gs: GameState) {
  const lvl = LEVELS[gs.levelIdx] ?? { par: gs.moves, name: 'Custom' };
  const elapsed = (Date.now() - gs.startTime) / 1000;
  const stars = gs.moves <= lvl.par ? 3 : gs.moves <= lvl.par + 2 ? 2 : 1;
  const baseScore = 1000;
  const moveBonus = Math.max(0, (lvl.par - gs.moves + 2)) * 100;
  const timeBonus = Math.max(0, Math.floor((120 - elapsed) * 5));
  const score = baseScore + moveBonus + timeBonus;
  gs.score = score;

  // Save level progress
  if (gs.mode === 'campaign' || gs.mode === 'puzzle') {
    const prev = SAVE.levels[gs.levelIdx];
    if (!prev || score > prev.best) {
      SAVE.levels[gs.levelIdx] = { best: score, stars: Math.max(stars, prev?.stars ?? 0), time: elapsed };
    }
  }

  SAVE.stats.games++;
  SAVE.stats.levelsCleared++;
  SAVE.stats.totalScore += score;
  SAVE.stats.totalMoves += gs.moves;
  if (score > SAVE.stats.bestScore) SAVE.stats.bestScore = score;
  if (gs.moves <= lvl.par) SAVE.stats.perfectLevels++;
  SAVE.stats.streak++;
  if (SAVE.stats.streak > SAVE.stats.bestStreak) SAVE.stats.bestStreak = SAVE.stats.streak;
  if (gs.usedTools.size >= 4) {
    if (!SAVE.achievements['Multi-Tool']) {
      SAVE.achievements['Multi-Tool'] = true;
      gs.toasts.push('Achievement: Multi-Tool');
    }
  }
  if (elapsed < 20) {
    const fastWins = (SAVE.stats as any).fastWins ?? 0;
    (SAVE.stats as any).fastWins = fastWins + 1;
    if (!SAVE.achievements['Speed Demon']) { SAVE.achievements['Speed Demon'] = true; gs.toasts.push('Achievement: Speed Demon'); }
    if ((SAVE.stats as any).fastWins >= 5 && !SAVE.achievements['Lightning']) { SAVE.achievements['Lightning'] = true; gs.toasts.push('Achievement: Lightning'); }
  }
  if (gs.mode === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    if (SAVE.stats.lastDaily !== today) {
      SAVE.stats.dailyDone++;
      SAVE.stats.lastDaily = today;
    }
  }
  if (!SAVE.stats.modesPlayed.includes(gs.mode)) SAVE.stats.modesPlayed.push(gs.mode);

  addXP(Math.floor(score / 10) + 50);
  checkAchievements(gs);
  saveSave();
  audio.levelComplete();
  gs.screen = 'levelcomplete';
}

function selectTool(idx: number, gs: GameState) {
  if (idx >= 0 && idx < 4) gs.selectedTool = idx;
}

function cycleTool(dir: number, gs: GameState) {
  for (let i = 0; i < 4; i++) {
    gs.selectedTool = (gs.selectedTool + dir + 4) % 4;
    if (gs.toolbox[gs.selectedTool] > 0) return;
  }
}


// ============= 3D RENDERING =============
let worldRef: any = null;
let gridGroup: Group;
let beamGroup: Group;
let pieceGroup: Group;
let envGroup: Group;
let highlightMesh: Mesh;
let particles: ParticlePool;
const pieceMeshes: Map<string, Group> = new Map();
const beamMeshes: Mesh[] = [];
const targetRings: Map<string, { ring: Mesh; glow: Mesh }> = new Map();

function cellToWorld(col: number, row: number, size: number): [number, number, number] {
  const x = (col - (size - 1) / 2) * CELL;
  const y = GRID_Y + ((size - 1) / 2 - row) * CELL;
  return [x, y, GRID_Z];
}

function buildGrid(scene: any, size: number) {
  // Clear old
  if (gridGroup) { scene.remove(gridGroup); }
  if (pieceGroup) { scene.remove(pieceGroup); }
  if (beamGroup) { scene.remove(beamGroup); }
  gridGroup = new Group(); pieceGroup = new Group(); beamGroup = new Group();
  scene.add(gridGroup); scene.add(pieceGroup); scene.add(beamGroup);
  pieceMeshes.clear(); targetRings.clear();

  const theme = THEMES[SAVE.settings.theme];
  const halfW = size * CELL / 2;

  // Grid background
  const bgGeo = new PlaneGeometry(size * CELL + 0.02, size * CELL + 0.02);
  const bgMat = new MeshBasicMaterial({ color: 0x001122, transparent: true, opacity: 0.6, side: DoubleSide });
  const bg = new Mesh(bgGeo, bgMat);
  bg.position.set(0, GRID_Y, GRID_Z - 0.001);
  gridGroup.add(bg);

  // Grid lines
  const lineGeo = new BufferGeometry();
  const pts: number[] = [];
  for (let i = 0; i <= size; i++) {
    const off = -halfW + i * CELL;
    // Vertical
    pts.push(off, GRID_Y - halfW, GRID_Z, off, GRID_Y + halfW, GRID_Z);
    // Horizontal
    pts.push(-halfW, GRID_Y + off, GRID_Z, halfW, GRID_Y + off, GRID_Z);
  }
  lineGeo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  const lineMat = new LineBasicMaterial({ color: theme.grid, transparent: true, opacity: 0.4 });
  gridGroup.add(new LineSegments(lineGeo, lineMat));

  // Border glow
  const borderPts: number[] = [];
  const corners = [[-halfW, GRID_Y - halfW], [halfW, GRID_Y - halfW], [halfW, GRID_Y + halfW], [-halfW, GRID_Y + halfW], [-halfW, GRID_Y - halfW]];
  for (let i = 0; i < corners.length - 1; i++) {
    borderPts.push(corners[i][0], corners[i][1], GRID_Z, corners[i + 1][0], corners[i + 1][1], GRID_Z);
  }
  const borderGeo = new BufferGeometry();
  borderGeo.setAttribute('position', new Float32BufferAttribute(borderPts, 3));
  gridGroup.add(new LineSegments(borderGeo, new LineBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.8 })));

  // Highlight cell
  const hlGeo = new PlaneGeometry(CELL * 0.9, CELL * 0.9);
  const hlMat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, side: DoubleSide });
  highlightMesh = new Mesh(hlGeo, hlMat);
  highlightMesh.position.set(0, 0, GRID_Z + 0.002);
  gridGroup.add(highlightMesh);
}

function createPieceMesh(cell: Cell, col: number, row: number, size: number): Group {
  const g = new Group();
  const [x, y, z] = cellToWorld(col, row, size);
  g.position.set(x, y, z + 0.005);
  const theme = THEMES[SAVE.settings.theme];
  const s = CELL * 0.35;

  switch (cell.type) {
    case 'emitter': {
      const c = BEAM_COLORS[cell.color ?? 0];
      const sphere = new Mesh(new SphereGeometry(s * 0.5, 12, 12), new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 }));
      g.add(sphere);
      const glow = new Mesh(new SphereGeometry(s * 0.8, 8, 8), new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, blending: AdditiveBlending }));
      g.add(glow);
      // Direction indicator
      const arrowGeo = new ConeGeometry(s * 0.2, s * 0.4, 6);
      const arrow = new Mesh(arrowGeo, new MeshBasicMaterial({ color: c }));
      const [dx, dy] = DIR[cell.dir ?? 0];
      arrow.position.set(dx * s * 0.6, -dy * s * 0.6, 0);
      arrow.rotation.z = Math.atan2(-dy, dx) - Math.PI / 2;
      g.add(arrow);
      const light = new PointLight(c, 0.3, 0.5);
      g.add(light);
      break;
    }
    case 'target': {
      const c = BEAM_COLORS[cell.color ?? 0];
      const ring = new Mesh(new TorusGeometry(s * 0.45, s * 0.06, 8, 16), new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 }));
      g.add(ring);
      const innerGlow = new Mesh(new CircleGeometry(s * 0.3, 16), new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.1, side: DoubleSide }));
      g.add(innerGlow);
      targetRings.set(`${col},${row}`, { ring, glow: innerGlow });
      break;
    }
    case 'mirror': {
      const orient = cell.orient ?? 0;
      const mirrorGeo = new PlaneGeometry(CELL * 0.7, CELL * 0.04);
      const mirrorMat = new MeshStandardMaterial({ color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1 });
      const mirror = new Mesh(mirrorGeo, mirrorMat);
      mirror.rotation.z = orient === 0 ? Math.PI / 4 : -Math.PI / 4;
      g.add(mirror);
      // Edge glow
      const edgeGeo = new EdgesGeometry(new BoxGeometry(CELL * 0.7, CELL * 0.04, 0.005));
      const edge = new LineSegments(edgeGeo, new LineBasicMaterial({ color: 0x88ccff }));
      edge.rotation.z = mirror.rotation.z;
      g.add(edge);
      if (!cell.fixed) {
        const indicator = new Mesh(new CircleGeometry(0.004, 8), new MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 }));
        indicator.position.set(0, 0, 0.003);
        g.add(indicator);
      }
      break;
    }
    case 'splitter': {
      const orient = cell.orient ?? 0;
      // Semi-transparent surface
      const splGeo = new PlaneGeometry(CELL * 0.7, CELL * 0.04);
      const splMat = new MeshBasicMaterial({ color: 0x88ffaa, transparent: true, opacity: 0.5 });
      const spl = new Mesh(splGeo, splMat);
      spl.rotation.z = orient === 0 ? Math.PI / 4 : -Math.PI / 4;
      g.add(spl);
      // Dashed center indicator
      const dashGeo = new BufferGeometry();
      const dp: number[] = [];
      for (let i = -3; i <= 3; i += 2) {
        const d = i * CELL * 0.08;
        dp.push(d - 0.003, 0, 0.002, d + 0.003, 0, 0.002);
      }
      dashGeo.setAttribute('position', new Float32BufferAttribute(dp, 3));
      const dash = new LineSegments(dashGeo, new LineBasicMaterial({ color: 0x44ff88 }));
      dash.rotation.z = spl.rotation.z;
      g.add(dash);
      break;
    }
    case 'prism': {
      const prismGeo = new ConeGeometry(s * 0.4, s * 0.7, 3);
      const prismMat = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xff88ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 });
      g.add(new Mesh(prismGeo, prismMat));
      const edgeGeo = new EdgesGeometry(new ConeGeometry(s * 0.42, s * 0.72, 3));
      g.add(new LineSegments(edgeGeo, new LineBasicMaterial({ color: 0xff44ff })));
      break;
    }
    case 'filter': {
      const c = BEAM_COLORS[cell.color ?? 0];
      const filterGeo = new RingGeometry(s * 0.25, s * 0.4, 16);
      const filterMat = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0.7, side: DoubleSide });
      g.add(new Mesh(filterGeo, filterMat));
      const edgeGeo = new EdgesGeometry(new BoxGeometry(CELL * 0.7, CELL * 0.7, 0.002));
      g.add(new LineSegments(edgeGeo, new LineBasicMaterial({ color: c, transparent: true, opacity: 0.4 })));
      break;
    }
    case 'wall': {
      const wallGeo = new BoxGeometry(CELL * 0.8, CELL * 0.8, CELL * 0.3);
      const wallMat = new MeshStandardMaterial({ color: 0x334455, emissive: 0x112233, emissiveIntensity: 0.3 });
      g.add(new Mesh(wallGeo, wallMat));
      const edgeGeo = new EdgesGeometry(wallGeo);
      g.add(new LineSegments(edgeGeo, new LineBasicMaterial({ color: THEMES[SAVE.settings.theme].grid, transparent: true, opacity: 0.5 })));
      break;
    }
  }
  return g;
}

function refreshPieces(gs: GameState, scene: any) {
  // Clear old pieces
  while (pieceGroup.children.length > 0) {
    pieceGroup.remove(pieceGroup.children[0]);
  }
  pieceMeshes.clear(); targetRings.clear();

  for (let r = 0; r < gs.gridSize; r++) {
    for (let c = 0; c < gs.gridSize; c++) {
      const cell = gs.grid[r][c];
      if (cell.type !== 'empty') {
        const mesh = createPieceMesh(cell, c, r, gs.gridSize);
        pieceGroup.add(mesh);
        pieceMeshes.set(`${c},${r}`, mesh);
      }
    }
  }
}

function refreshBeams(gs: GameState) {
  // Clear old beams
  for (let i = beamGroup.children.length - 1; i >= 0; i--) {
    const child = beamGroup.children[i] as Mesh;
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else (child.material as any).dispose();
    }
    beamGroup.remove(child);
  }

  for (const seg of gs.beamSegs) {
    const [x1, y1] = cellToWorld(seg.x1, seg.y1, gs.gridSize);
    const [x2, y2] = cellToWorld(seg.x2, seg.y2, gs.gridSize);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) continue;
    const angle = Math.atan2(dy, dx);

    const skinOverride = BEAM_SKINS[SAVE.settings.skin]?.color;
    const beamColor = skinOverride ?? seg.color;

    // Core beam
    const coreGeo = new BoxGeometry(len, 0.004, 0.004);
    const coreMat = new MeshStandardMaterial({ color: beamColor, emissive: beamColor, emissiveIntensity: 2 });
    const core = new Mesh(coreGeo, coreMat);
    core.position.set((x1 + x2) / 2, (y1 + y2) / 2, GRID_Z + 0.008);
    core.rotation.z = angle;
    beamGroup.add(core);

    // Glow
    const glowGeo = new BoxGeometry(len, 0.015, 0.015);
    const glowMat = new MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.12, blending: AdditiveBlending });
    const glow = new Mesh(glowGeo, glowMat);
    glow.position.copy(core.position);
    glow.rotation.copy(core.rotation);
    beamGroup.add(glow);

    // Wider ambient glow
    const ambGeo = new BoxGeometry(len, 0.035, 0.035);
    const ambMat = new MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.04, blending: AdditiveBlending });
    const amb = new Mesh(ambGeo, ambMat);
    amb.position.copy(core.position);
    amb.rotation.copy(core.rotation);
    beamGroup.add(amb);
  }

  // Update target ring visuals
  for (const [key, { ring, glow }] of targetRings) {
    const isLit = gs.litTargets.has(key);
    (ring.material as MeshStandardMaterial).emissiveIntensity = isLit ? 1.5 : 0.3;
    (glow.material as MeshBasicMaterial).opacity = isLit ? 0.4 : 0.1;
  }
}

function buildEnvironment(scene: any) {
  if (envGroup) scene.remove(envGroup);
  envGroup = new Group();
  scene.add(envGroup);
  const theme = THEMES[SAVE.settings.theme];

  // Floor grid
  const floorPts: number[] = [];
  for (let i = -10; i <= 10; i++) {
    floorPts.push(i, 0, -10, i, 0, 10);
    floorPts.push(-10, 0, i, 10, 0, i);
  }
  const floorGeo = new BufferGeometry();
  floorGeo.setAttribute('position', new Float32BufferAttribute(floorPts, 3));
  envGroup.add(new LineSegments(floorGeo, new LineBasicMaterial({ color: theme.grid, transparent: true, opacity: 0.15 })));

  // Ceiling grid
  const ceilPts: number[] = [];
  for (let i = -10; i <= 10; i++) {
    ceilPts.push(i, 4, -10, i, 4, 10);
    ceilPts.push(-10, 4, i, 10, 4, i);
  }
  const ceilGeo = new BufferGeometry();
  ceilGeo.setAttribute('position', new Float32BufferAttribute(ceilPts, 3));
  envGroup.add(new LineSegments(ceilGeo, new LineBasicMaterial({ color: theme.grid, transparent: true, opacity: 0.08 })));

  // Floating wireframe decorations
  const shapes = [
    new TorusGeometry(0.2, 0.04, 8, 16), new BoxGeometry(0.25, 0.25, 0.25),
    new SphereGeometry(0.15, 8, 8), new ConeGeometry(0.12, 0.3, 6),
  ];
  for (let i = 0; i < 14; i++) {
    const shape = shapes[i % shapes.length];
    const edge = new EdgesGeometry(shape);
    const ls = new LineSegments(edge, new LineBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.2 }));
    ls.position.set((Math.random() - 0.5) * 8, 0.5 + Math.random() * 3, -3 - Math.random() * 5);
    ls.userData = { rotSpeed: 0.2 + Math.random() * 0.5, bobSpeed: 0.5 + Math.random(), bobAmp: 0.1 + Math.random() * 0.15, baseY: ls.position.y };
    envGroup.add(ls);
  }

  // Ambient particles
  for (let i = 0; i < 40; i++) {
    const p = new Mesh(new SphereGeometry(0.008, 4, 4), new MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.3 }));
    p.position.set((Math.random() - 0.5) * 10, Math.random() * 4, -2 - Math.random() * 6);
    p.userData = { driftX: (Math.random() - 0.5) * 0.1, driftY: (Math.random() - 0.5) * 0.05, pulseSpeed: 1 + Math.random() * 2, baseOpacity: 0.15 + Math.random() * 0.2 };
    envGroup.add(p);
  }

  // Lights
  envGroup.add(new AmbientLight(0x112233, 0.4));
  const dir = new DirectionalLight(0xffffff, 0.3);
  dir.position.set(2, 4, 1);
  envGroup.add(dir);
  const accentL = new PointLight(theme.accent, 0.4, 8);
  accentL.position.set(-2, 2, -1);
  envGroup.add(accentL);
  const accentR = new PointLight(0xff00ff, 0.3, 8);
  accentR.position.set(2, 2, -1);
  envGroup.add(accentR);

  scene.fog = new Fog(theme.fog, 5, 20);
  scene.background = new Color(theme.bg);
}

function updateEnvironment(dt: number, time: number) {
  if (!envGroup) return;
  for (const child of envGroup.children) {
    if (child.userData.rotSpeed) {
      child.rotation.y += child.userData.rotSpeed * dt;
      child.rotation.x += child.userData.rotSpeed * 0.3 * dt;
      child.position.y = child.userData.baseY + Math.sin(time * child.userData.bobSpeed) * child.userData.bobAmp;
    }
    if (child.userData.driftX) {
      child.position.x += child.userData.driftX * dt;
      child.position.y += child.userData.driftY * dt;
      if (child.position.x > 5) child.position.x = -5;
      if (child.position.x < -5) child.position.x = 5;
      const mat = (child as Mesh).material as MeshBasicMaterial;
      if (mat.opacity !== undefined) mat.opacity = child.userData.baseOpacity * (0.5 + 0.5 * Math.sin(time * child.userData.pulseSpeed));
    }
  }
}

// ============= UI PANEL HELPERS =============
const getDoc = (e: any) => e.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
const setText = (e: any, id: string, text: string) =>
  (getDoc(e)?.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
const setVis = (e: any, id: string, vis: boolean) =>
  (getDoc(e)?.getElementById(id) as UIKit.Text | undefined)?.setProperties({
    display: vis ? 'flex' : 'none'
  });

// ============= PANEL ENTITY REFERENCES =============
const panels: Record<string, any> = {};

// ============= GAME UI SYSTEM =============
class GameUISystem extends createSystem({
  title: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
  modeselect: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/modeselect.json')] },
  levelselect: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/levelselect.json')] },
  hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  toolbox: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toolbox.json')] },
  pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  levelcomplete: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/levelcomplete.json')] },
  leaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
  achvlist: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achvlist.json')] },
  settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  help: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
  stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  skins: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/skins.json')] },
  toast: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
  countdown: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/countdown.json')] },
}) {
  init() {
    const bindPanel = (name: string, query: any, setup: (e: any) => void) => {
      query.subscribe('qualify', (entity: any) => { panels[name] = entity; setup(entity); });
    };

    // TITLE
    bindPanel('title', this.queries.title, (e) => {
      const doc = getDoc(e); if (!doc) return;
      const btn = (id: string, fn: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', () => { audio.click(); fn(); });
      };
      btn('btn-play', () => showScreen('modeselect'));
      btn('btn-scores', () => showScreen('leaderboard'));
      btn('btn-achievements', () => { GS.achvPage = 0; showScreen('achievements'); });
      btn('btn-stats', () => showScreen('stats'));
      btn('btn-skins', () => showScreen('skins'));
      btn('btn-settings', () => showScreen('settings'));
      btn('btn-help', () => showScreen('help'));
    });

    // MODE SELECT
    bindPanel('modeselect', this.queries.modeselect, (e) => {
      const doc = getDoc(e); if (!doc) return;
      const modes: [string, GameMode][] = [
        ['btn-campaign','campaign'],['btn-puzzle','puzzle'],['btn-timeattack','timeattack'],
        ['btn-endless','endless'],['btn-daily','daily'],['btn-sandbox','sandbox'],
        ['btn-speedrun','speedrun'],['btn-practice','practice'],
      ];
      for (const [id, mode] of modes) {
        (doc.getElementById(id) as UIKit.Text | undefined)?.addEventListener('click', () => {
          audio.click(); GS.mode = mode;
          if (mode === 'campaign' || mode === 'puzzle' || mode === 'sandbox') {
            showScreen('levelselect');
          } else {
            startGame(mode, 0);
          }
        });
      }
      (doc.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // LEVEL SELECT
    bindPanel('levelselect', this.queries.levelselect, (e) => {
      const doc = getDoc(e); if (!doc) return;
      for (let i = 0; i < 30; i++) {
        (doc.getElementById(`btn-lv${i}`) as UIKit.Text | undefined)?.addEventListener('click', () => {
          audio.click(); startGame(GS.mode, i);
        });
      }
      (doc.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('modeselect'); });
    });

    // HUD — no click handlers needed, just data display

    // TOOLBOX
    bindPanel('toolbox', this.queries.toolbox, (e) => {
      const doc = getDoc(e); if (!doc) return;
      for (let i = 0; i < 4; i++) {
        (doc.getElementById(`btn-tool${i}`) as UIKit.Text | undefined)?.addEventListener('click', () => {
          audio.click(); selectTool(i, GS);
        });
      }
    });

    // PAUSE
    bindPanel('pause', this.queries.pause, (e) => {
      const doc = getDoc(e); if (!doc) return;
      (doc.getElementById('btn-resume') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('playing'); });
      (doc.getElementById('btn-quit') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // LEVEL COMPLETE
    bindPanel('levelcomplete', this.queries.levelcomplete, (e) => {
      const doc = getDoc(e); if (!doc) return;
      (doc.getElementById('btn-next') as UIKit.Text | undefined)?.addEventListener('click', () => {
        audio.click();
        if (GS.mode === 'speedrun') {
          GS.speedRunIdx++;
          if (GS.speedRunIdx < GS.speedRunLevels.length) {
            startGame('speedrun', GS.speedRunLevels[GS.speedRunIdx]);
          } else { showScreen('title'); }
        } else if (GS.mode === 'endless') {
          GS.endlessLevel++;
          const lvl = generateEndless(GS.endlessLevel, GS.dailySeed);
          GS.levelIdx = -1;
          LEVELS[30] = lvl;
          startGame('endless', 30);
        } else if (GS.levelIdx < 29) {
          startGame(GS.mode, GS.levelIdx + 1);
        } else { showScreen('title'); }
      });
      (doc.getElementById('btn-retry') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); startGame(GS.mode, GS.levelIdx); });
      (doc.getElementById('btn-menu') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // LEADERBOARD
    bindPanel('leaderboard', this.queries.leaderboard, (e) => {
      (getDoc(e)?.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // ACHIEVEMENTS
    bindPanel('achvlist', this.queries.achvlist, (e) => {
      const doc = getDoc(e); if (!doc) return;
      (doc.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
      (doc.getElementById('btn-prev') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); GS.achvPage = Math.max(0, GS.achvPage - 1); updateAchievements(); });
      (doc.getElementById('btn-next') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); GS.achvPage = Math.min(Math.floor((ACHV_DEFS.length - 1) / 15), GS.achvPage + 1); updateAchievements(); });
    });

    // SETTINGS
    bindPanel('settings', this.queries.settings, (e) => {
      const doc = getDoc(e); if (!doc) return;
      const volBtn = (id: string, fn: () => void) => (doc.getElementById(id) as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); fn(); updateSettings(); });
      volBtn('btn-master-up', () => { SAVE.settings.master = Math.min(100, SAVE.settings.master + 10); });
      volBtn('btn-master-dn', () => { SAVE.settings.master = Math.max(0, SAVE.settings.master - 10); });
      volBtn('btn-sfx-up', () => { SAVE.settings.sfx = Math.min(100, SAVE.settings.sfx + 10); });
      volBtn('btn-sfx-dn', () => { SAVE.settings.sfx = Math.max(0, SAVE.settings.sfx - 10); });
      volBtn('btn-music-up', () => { SAVE.settings.music = Math.min(100, SAVE.settings.music + 10); });
      volBtn('btn-music-dn', () => { SAVE.settings.music = Math.max(0, SAVE.settings.music - 10); });
      volBtn('btn-theme-prev', () => { SAVE.settings.theme = (SAVE.settings.theme - 1 + THEMES.length) % THEMES.length; if (worldRef) { buildEnvironment(worldRef.scene); buildGrid(worldRef.scene, GS.gridSize || 8); } });
      volBtn('btn-theme-next', () => { SAVE.settings.theme = (SAVE.settings.theme + 1) % THEMES.length; if (worldRef) { buildEnvironment(worldRef.scene); buildGrid(worldRef.scene, GS.gridSize || 8); } });
      (doc.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); audio.setVolumes(SAVE.settings.master, SAVE.settings.sfx, SAVE.settings.music); showScreen('title'); });
    });

    // HELP
    bindPanel('help', this.queries.help, (e) => {
      (getDoc(e)?.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // STATS
    bindPanel('stats', this.queries.stats, (e) => {
      (getDoc(e)?.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // SKINS
    bindPanel('skins', this.queries.skins, (e) => {
      const doc = getDoc(e); if (!doc) return;
      for (let i = 0; i < 8; i++) {
        (doc.getElementById(`btn-skin${i}`) as UIKit.Text | undefined)?.addEventListener('click', () => {
          audio.click(); SAVE.settings.skin = i; saveSave();
          if (GS.screen === 'playing') refreshBeams(GS);
          updateSkins();
        });
      }
      (doc.getElementById('btn-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); showScreen('title'); });
    });

    // TOAST
    bindPanel('toast', this.queries.toast, () => {});

    // COUNTDOWN
    bindPanel('countdown', this.queries.countdown, () => {});
  }
}

// ============= SCREEN MANAGEMENT =============
const SCREEN_PANELS: Record<GameScreen, string[]> = {
  title: ['title'],
  modeselect: ['modeselect'],
  levelselect: ['levelselect'],
  playing: ['hud', 'toolbox'],
  paused: ['pause'],
  levelcomplete: ['levelcomplete'],
  gameover: [],
  leaderboard: ['leaderboard'],
  achievements: ['achvlist'],
  settings: ['settings'],
  help: ['help'],
  stats: ['stats'],
  skins: ['skins'],
  countdown: ['countdown'],
};

function showScreen(screen: GameScreen) {
  GS.screen = screen;
  // Hide all panels, show relevant ones
  for (const [name, entity] of Object.entries(panels)) {
    if (!entity) continue;
    const visible = SCREEN_PANELS[screen]?.includes(name) ?? false;
    const panelEntity = entity;
    try {
      // Move panel far away to hide, or bring close to show
      if (name === 'hud' || name === 'toolbox' || name === 'toast' || name === 'countdown') {
        // Follower panels — toggle via offset
        const offset = panelEntity.getVectorView(Follower, 'offsetPosition');
        if (visible) {
          if (name === 'hud') { offset[0] = 0; offset[1] = 0.12; offset[2] = -0.5; }
          else if (name === 'toolbox') { offset[0] = -0.18; offset[1] = -0.08; offset[2] = -0.5; }
          else if (name === 'toast') { offset[0] = 0; offset[1] = -0.15; offset[2] = -0.5; }
          else if (name === 'countdown') { offset[0] = 0; offset[1] = 0; offset[2] = -0.5; }
        } else {
          offset[0] = 0; offset[1] = 100; offset[2] = 0; // Move far away
        }
      } else {
        // World-space panels — position in front of player or hide
        if (panelEntity.object3D) {
          if (visible) {
            panelEntity.object3D.position.set(0, 1.5, -1.5);
            panelEntity.object3D.scale.set(1, 1, 1);
          } else {
            panelEntity.object3D.position.set(0, 100, 0);
          }
        }
      }
    } catch {}
  }

  // Toast always visible when there's content
  if (screen === 'playing' || screen === 'countdown') {
    try {
      const toastE = panels.toast;
      if (toastE) {
        const offset = toastE.getVectorView(Follower, 'offsetPosition');
        offset[0] = 0; offset[1] = -0.15; offset[2] = -0.5;
      }
    } catch {}
  }

  // Update panel content
  if (screen === 'title') updateTitle();
  if (screen === 'levelselect') updateLevelSelect();
  if (screen === 'levelcomplete') updateLevelComplete();
  if (screen === 'leaderboard') updateLeaderboard();
  if (screen === 'achievements') updateAchievements();
  if (screen === 'settings') updateSettings();
  if (screen === 'stats') updateStats();
  if (screen === 'skins') updateSkins();

  // Show/hide grid
  if (gridGroup) gridGroup.visible = screen === 'playing' || screen === 'paused' || screen === 'countdown';
  if (pieceGroup) pieceGroup.visible = screen === 'playing' || screen === 'paused' || screen === 'countdown';
  if (beamGroup) beamGroup.visible = screen === 'playing' || screen === 'paused' || screen === 'countdown';
}

function updateTitle() {
  const e = panels.title; if (!e) return;
  setText(e, 'lbl-level', `Lv ${SAVE.level} - ${getTitle()}`);
}

function updateLevelSelect() {
  const e = panels.levelselect; if (!e) return;
  for (let i = 0; i < 30; i++) {
    const lvl = LEVELS[i];
    const prog = SAVE.levels[i];
    const stars = prog ? '*'.repeat(prog.stars) : '';
    setText(e, `lbl-lv${i}`, `${i + 1}. ${lvl.name} ${stars}`);
  }
}

function updateLevelComplete() {
  const e = panels.levelcomplete; if (!e) return;
  const lvl = LEVELS[GS.levelIdx];
  setText(e, 'lbl-name', lvl?.name ?? 'Level');
  setText(e, 'lbl-score', `Score: ${GS.score}`);
  setText(e, 'lbl-moves', `Moves: ${GS.moves} / Par: ${lvl?.par ?? 0}`);
  const elapsed = Math.floor((Date.now() - GS.startTime) / 1000);
  setText(e, 'lbl-time', `Time: ${elapsed}s`);
  const stars = GS.moves <= (lvl?.par ?? 0) ? 3 : GS.moves <= (lvl?.par ?? 0) + 2 ? 2 : 1;
  setText(e, 'lbl-stars', '* '.repeat(stars).trim());
  setText(e, 'lbl-targets', `Targets: ${GS.litTargets.size}/${GS.totalTargets}`);
}

function updateLeaderboard() {
  const e = panels.leaderboard; if (!e) return;
  // Show best scores per level
  const entries: [string, number][] = [];
  for (let i = 0; i < 30; i++) {
    if (SAVE.levels[i]) entries.push([LEVELS[i].name, SAVE.levels[i].best]);
  }
  entries.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < 10; i++) {
    const entry = entries[i];
    setText(e, `lbl-row${i}`, entry ? `${i + 1}. ${entry[0]} - ${entry[1]}` : `${i + 1}. ---`);
  }
}

function updateAchievements() {
  const e = panels.achvlist; if (!e) return;
  const start = GS.achvPage * 15;
  for (let i = 0; i < 15; i++) {
    const idx = start + i;
    const def = ACHV_DEFS[idx];
    if (def) {
      const done = SAVE.achievements[def[0]] ? '[X]' : '[ ]';
      setText(e, `lbl-achv${i}`, `${done} ${def[0]}: ${def[1]}`);
    } else {
      setText(e, `lbl-achv${i}`, '');
    }
  }
  setText(e, 'lbl-page', `Page ${GS.achvPage + 1}/${Math.ceil(ACHV_DEFS.length / 15)}`);
}

function updateSettings() {
  const e = panels.settings; if (!e) return;
  setText(e, 'lbl-master', `Master: ${SAVE.settings.master}%`);
  setText(e, 'lbl-sfx', `SFX: ${SAVE.settings.sfx}%`);
  setText(e, 'lbl-music', `Music: ${SAVE.settings.music}%`);
  setText(e, 'lbl-theme', `Theme: ${THEMES[SAVE.settings.theme].name}`);
}

function updateStats() {
  const e = panels.stats; if (!e) return;
  const s = SAVE.stats;
  setText(e, 'lbl-s0', `Games: ${s.games}`);
  setText(e, 'lbl-s1', `Levels Cleared: ${s.levelsCleared}`);
  setText(e, 'lbl-s2', `Total Score: ${s.totalScore}`);
  setText(e, 'lbl-s3', `Best Score: ${s.bestScore}`);
  setText(e, 'lbl-s4', `Total Moves: ${s.totalMoves}`);
  setText(e, 'lbl-s5', `Perfect Levels: ${s.perfectLevels}`);
  setText(e, 'lbl-s6', `Best Streak: ${s.bestStreak}`);
  setText(e, 'lbl-s7', `Mirrors Placed: ${s.mirrorsPlaced}`);
  setText(e, 'lbl-s8', `Daily Done: ${s.dailyDone}`);
  setText(e, 'lbl-s9', `Level: ${SAVE.level} (${getTitle()})`);
}

function updateSkins() {
  const e = panels.skins; if (!e) return;
  for (let i = 0; i < 8; i++) {
    const skin = BEAM_SKINS[i];
    const equipped = SAVE.settings.skin === i;
    setText(e, `lbl-skin${i}`, `${equipped ? '>' : ' '} ${skin.name}${equipped ? ' <' : ''}`);
  }
}

function updateHUD() {
  const e = panels.hud; if (!e) return;
  const lvl = LEVELS[GS.levelIdx];
  setText(e, 'lbl-level', lvl ? `${ZONE_NAMES[lvl.zone]} - ${lvl.name}` : `Endless ${GS.endlessLevel + 1}`);
  setText(e, 'lbl-moves', `Moves: ${GS.moves}`);
  setText(e, 'lbl-par', `Par: ${lvl?.par ?? '?'}`);
  setText(e, 'lbl-targets', `Targets: ${GS.litTargets.size}/${GS.totalTargets}`);
  const elapsed = Math.floor((Date.now() - GS.startTime) / 1000);
  setText(e, 'lbl-time', GS.mode === 'timeattack' ? `Time: ${Math.max(0, 60 - elapsed)}s` : `${elapsed}s`);
  setText(e, 'lbl-mode', GS.mode.toUpperCase());
}

function updateToolbox() {
  const e = panels.toolbox; if (!e) return;
  for (let i = 0; i < 4; i++) {
    const sel = GS.selectedTool === i ? '>' : ' ';
    setText(e, `lbl-tool${i}`, `${sel}${TOOL_NAMES[i]}: ${GS.toolbox[i]}${sel === '>' ? ' <' : ''}`);
  }
}

function showToast(msg: string) {
  GS.toasts.push(msg);
  GS.toastTimer = 2.0;
}

function updateToast() {
  const e = panels.toast; if (!e) return;
  if (GS.toasts.length > 0 && GS.toastTimer > 0) {
    setText(e, 'lbl-toast', GS.toasts[0]);
  } else {
    setText(e, 'lbl-toast', '');
    if (GS.toasts.length > 0) GS.toasts.shift();
  }
}

// ============= START GAME =============
function startGame(mode: GameMode, levelIdx: number) {
  GS.mode = mode;
  GS.levelIdx = levelIdx;

  if (mode === 'daily') {
    GS.dailySeed = getDailySeed();
    const lvl = generateEndless(0, GS.dailySeed);
    LEVELS[30] = lvl;
    GS.levelIdx = 30;
    initLevel(30, GS);
  } else if (mode === 'endless') {
    GS.endlessLevel = levelIdx === 30 ? GS.endlessLevel : 0;
    GS.dailySeed = Date.now();
    const lvl = generateEndless(GS.endlessLevel, GS.dailySeed);
    LEVELS[30] = lvl;
    GS.levelIdx = 30;
    initLevel(30, GS);
  } else if (mode === 'speedrun') {
    const rng = mulberry32(Date.now());
    GS.speedRunLevels = [];
    const available = Array.from({ length: 30 }, (_, i) => i);
    for (let i = 0; i < 5 && available.length > 0; i++) {
      const idx = Math.floor(rng() * available.length);
      GS.speedRunLevels.push(available.splice(idx, 1)[0]);
    }
    GS.speedRunIdx = 0;
    GS.speedRunTotal = 0;
    GS.levelIdx = GS.speedRunLevels[0];
    initLevel(GS.levelIdx, GS);
  } else {
    initLevel(levelIdx, GS);
  }

  if (worldRef) {
    buildGrid(worldRef.scene, GS.gridSize);
    refreshPieces(GS, worldRef.scene);
    refreshBeams(GS);
  }

  // Countdown
  GS.countdownVal = 3;
  GS.countdownTimer = 0;
  showScreen('countdown');
}

// ============= MAIN GAME LOOP SYSTEM =============
class GameLoopSystem extends createSystem({}) {
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private lastClickTime = 0;
  private gameTime = 0;

  init() {
    // Mouse input
    document.addEventListener('mousemove', (ev: MouseEvent) => {
      this.mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    });
    document.addEventListener('click', (ev: MouseEvent) => {
      if (GS.screen !== 'playing') return;
      if (Date.now() - this.lastClickTime < 200) return;
      this.lastClickTime = Date.now();
      this.handleMouseClick(false);
    });
    document.addEventListener('contextmenu', (ev: MouseEvent) => {
      ev.preventDefault();
      if (GS.screen !== 'playing') return;
      this.handleMouseClick(true);
    });
    document.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P') {
        if (GS.screen === 'playing') showScreen('paused');
        else if (GS.screen === 'paused') showScreen('playing');
      }
      if (GS.screen === 'playing') {
        if (ev.key === '1') selectTool(0, GS);
        if (ev.key === '2') selectTool(1, GS);
        if (ev.key === '3') selectTool(2, GS);
        if (ev.key === '4') selectTool(3, GS);
        if (ev.key === 'q' || ev.key === 'Q') cycleTool(-1, GS);
        if (ev.key === 'e' || ev.key === 'E') cycleTool(1, GS);
      }
      if (ev.key === 'r' || ev.key === 'R') {
        if (GS.screen === 'levelcomplete') startGame(GS.mode, GS.levelIdx);
      }
    });
    document.addEventListener('wheel', (ev: WheelEvent) => {
      if (GS.screen === 'playing') {
        cycleTool(ev.deltaY > 0 ? 1 : -1, GS);
      }
    });
  }

  handleMouseClick(rightClick: boolean) {
    if (!worldRef) return;
    this.raycaster.setFromCamera(this.mouse, worldRef.camera);

    // Intersect with grid plane at z = GRID_Z
    const planeNormal = new Vector3(0, 0, 1);
    const planePoint = new Vector3(0, 0, GRID_Z);
    const ray = this.raycaster.ray;
    const denom = planeNormal.dot(ray.direction);
    if (Math.abs(denom) < 0.001) return;
    const t = planePoint.clone().sub(ray.origin).dot(planeNormal) / denom;
    if (t < 0) return;
    const hit = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));

    // Convert to grid coords
    const halfW = GS.gridSize * CELL / 2;
    const col = Math.floor((hit.x + halfW) / CELL);
    const row = Math.floor((-hit.y + GRID_Y + halfW) / CELL);
    if (col >= 0 && col < GS.gridSize && row >= 0 && row < GS.gridSize) {
      handleCellClick(col, row, GS, rightClick);
      if (worldRef) {
        refreshPieces(GS, worldRef.scene);
        refreshBeams(GS);
      }
      updateHUD();
      updateToolbox();
    }
  }

  update(delta: number, time: number) {
    if (!worldRef) return;
    this.gameTime = time;

    // Countdown logic
    if (GS.screen === 'countdown') {
      GS.countdownTimer += delta;
      if (GS.countdownTimer >= 1.0) {
        GS.countdownTimer = 0;
        GS.countdownVal--;
        if (GS.countdownVal > 0) {
          audio.countdownTick();
          setText(panels.countdown, 'lbl-count', `${GS.countdownVal}`);
        } else {
          audio.countdownGo();
          setText(panels.countdown, 'lbl-count', 'REFLECT!');
          setTimeout(() => { GS.startTime = Date.now(); showScreen('playing'); updateHUD(); updateToolbox(); }, 500);
        }
      }
    }

    // Time attack check
    if (GS.screen === 'playing' && GS.mode === 'timeattack') {
      const elapsed = (Date.now() - GS.startTime) / 1000;
      if (elapsed >= 60 && !GS.solved) {
        SAVE.stats.games++;
        SAVE.stats.streak = 0;
        saveSave();
        audio.levelFail();
        showScreen('title');
        showToast('Time up!');
      }
    }

    // HUD update
    if (GS.screen === 'playing') {
      updateHUD();
    }

    // Toast timer
    if (GS.toastTimer > 0) {
      GS.toastTimer -= delta;
      if (GS.toastTimer <= 0 && GS.toasts.length > 0) {
        GS.toasts.shift();
        if (GS.toasts.length > 0) GS.toastTimer = 2.0;
      }
    }
    updateToast();

    // Hover highlight
    if (GS.screen === 'playing' && highlightMesh) {
      this.raycaster.setFromCamera(this.mouse, worldRef.camera);
      const planeNormal = new Vector3(0, 0, 1);
      const planePoint = new Vector3(0, 0, GRID_Z);
      const denom = planeNormal.dot(this.raycaster.ray.direction);
      if (Math.abs(denom) > 0.001) {
        const t = planePoint.clone().sub(this.raycaster.ray.origin).dot(planeNormal) / denom;
        if (t > 0) {
          const hit = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(t));
          const halfW = GS.gridSize * CELL / 2;
          const col = Math.floor((hit.x + halfW) / CELL);
          const row = Math.floor((-hit.y + GRID_Y + halfW) / CELL);
          if (col >= 0 && col < GS.gridSize && row >= 0 && row < GS.gridSize) {
            const [cx, cy] = cellToWorld(col, row, GS.gridSize);
            highlightMesh.position.set(cx, cy, GRID_Z + 0.002);
            (highlightMesh.material as MeshBasicMaterial).opacity = 0.15;
            GS.hoverCol = col; GS.hoverRow = row;
          } else {
            (highlightMesh.material as MeshBasicMaterial).opacity = 0;
            GS.hoverCol = -1; GS.hoverRow = -1;
          }
        }
      }
    }

    // Animate target rings (pulse)
    for (const [key, { ring }] of targetRings) {
      const isLit = GS.litTargets.has(key);
      const pulse = isLit ? 1.0 + Math.sin(time * 4) * 0.3 : 0.3 + Math.sin(time * 2) * 0.1;
      (ring.material as MeshStandardMaterial).emissiveIntensity = pulse;
    }

    // Beam glow animation
    if (beamGroup) {
      for (let i = 0; i < beamGroup.children.length; i++) {
        const child = beamGroup.children[i] as Mesh;
        const mat = child.material as any;
        if (mat.blending === AdditiveBlending && mat.opacity !== undefined) {
          mat.opacity = (i % 3 === 1 ? 0.12 : 0.04) * (0.8 + 0.2 * Math.sin(time * 3 + i * 0.5));
        }
      }
    }

    // Environment animation
    updateEnvironment(delta, time);

    // Particles
    if (particles) particles.update(delta);

    // Celebration particles on solve
    if (GS.solved && GS.screen === 'playing' && particles) {
      for (const key of GS.litTargets) {
        const [c, r] = key.split(',').map(Number);
        const [x, y, z] = cellToWorld(c, r, GS.gridSize);
        if (Math.random() < delta * 2) particles.burst(x, y, z, BEAM_COLORS[0], 5);
      }
    }

    // XR controller input
    try {
      const input = worldRef.input;
      if (input?.xr) {
        const xr = input.xr as any;
        // B button = pause
        if (xr.getButtonDown?.(InputComponent.B_Button)) {
          if (GS.screen === 'playing') showScreen('paused');
          else if (GS.screen === 'paused') showScreen('playing');
        }
        // Thumbstick for tool cycling
        const axes = xr.getAxesValues?.(InputComponent.Thumbstick);
        if (axes && Math.abs(axes.x) > 0.5) {
          cycleTool(axes.x > 0 ? 1 : -1, GS);
        }
      }
    } catch {}
  }
}

// ============= WORLD CREATION =============
async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  if (!container) return;

  const world = await (World.create as any)(container, {
    xr: { offer: 'once' },
    browserControls: true,
  });

  worldRef = world;

  // Build environment
  buildEnvironment(world.scene);
  buildGrid(world.scene, 8);

  // Init particles
  particles = new ParticlePool(150, world.scene);

  // Create UI panels — world-space panels
  const worldPanelConfigs = ['title','modeselect','levelselect','pause','levelcomplete','leaderboard','achvlist','settings','help','stats','skins'];
  for (const name of worldPanelConfigs) {
    const mesh = new Mesh(new PlaneGeometry(0.001, 0.001), new MeshBasicMaterial({ visible: false }));
    mesh.position.set(0, 100, 0);
    world.scene.add(mesh);
    const e = world.createTransformEntity(mesh);
    e.addComponent(PanelUI, { config: `./ui/${name}.json` });
  }

  // Head-following panels
  const followerConfigs = ['hud','toolbox','toast','countdown'];
  for (const name of followerConfigs) {
    const mesh = new Mesh(new PlaneGeometry(0.001, 0.001), new MeshBasicMaterial({ visible: false }));
    mesh.position.set(0, 100, 0);
    world.scene.add(mesh);
    const e = world.createTransformEntity(mesh);
    e.addComponent(PanelUI, { config: `./ui/${name}.json` });
    e.addComponent(Follower, { target: world.player.head });
    const offset = e.getVectorView(Follower, 'offsetPosition');
    offset[0] = 0; offset[1] = 100; offset[2] = 0; // Start hidden
  }

  // Register systems
  world.registerSystem(GameUISystem);
  world.registerSystem(GameLoopSystem);

  // Start drone music
  audio.startDrone();

  // Show title after a brief delay (let panels load)
  setTimeout(() => showScreen('title'), 500);
}

main();
