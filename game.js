// Lógica del juego (sin DOM). Exporta una API mínima para la UI.
const size = 4;
const prob4 = 0.1;

let grid, score, best, history = [];
const listeners = [];

function notify(){ listeners.forEach(fn=>fn()); }

export function subscribe(fn){ listeners.push(fn); return ()=> {
  const i = listeners.indexOf(fn); if(i>=0) listeners.splice(i,1);
}; }

export function getSize(){ return size; }
export function getGrid(){ return grid.map(r=>r.slice()); }
export function getScore(){ return score; }
export function getBest(){ return best; }

export function init(){
  grid = Array.from({length:size},()=>Array(size).fill(0));
  score = 0;
  best = +localStorage.getItem('best-2048') || 0;
  history = [];
  addRandom(); addRandom();
  notify();
}

function saveHistory(){
  history.push({ grid: grid.map(r=>r.slice()), score });
  if(history.length>20) history.shift();
}

export function undo(){
  const last = history.pop();
  if(!last) return false;
  grid = last.grid.map(r=>r.slice());
  score = last.score;
  notify();
  return true;
}

function addRandom(){
  const empties=[];
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(!grid[r][c]) empties.push([r,c]);
  if(!empties.length) return false;
  const [r,c]=empties[Math.floor(Math.random()*empties.length)];
  grid[r][c] = Math.random()<prob4?4:2;
  return true;
}

function slide(row){
  const arr = row.filter(v=>v);
  for(let i=0;i<arr.length-1;i++){
    if(arr[i]===arr[i+1]){ arr[i]*=2; score += arr[i]; arr.splice(i+1,1); }
  }
  while(arr.length<size) arr.push(0);
  return arr;
}

function rotateGrid(times){
  for(let t=0;t<times;t++){
    const g = Array.from({length:size},()=>Array(size).fill(0));
    for(let r=0;r<size;r++) for(let c=0;c<size;c++) g[c][size-1-r]=grid[r][c];
    grid=g;
  }
}

export function move(dir){
  saveHistory();
  const before = JSON.stringify(grid);
  if(dir==='right'){ grid = grid.map(r=>slide(r.slice().reverse()).reverse()); }
  if(dir==='left'){ grid = grid.map(r=>slide(r)); }
  if(dir==='up'){ rotateGrid(3); grid = grid.map(r=>slide(r)); rotateGrid(1); }
  if(dir==='down'){ rotateGrid(1); grid = grid.map(r=>slide(r)); rotateGrid(3); }

  if(JSON.stringify(grid)===before){ history.pop(); return {moved:false, won:won(), lost:lost()}; }

  if(score>best) best = score;
  localStorage.setItem('best-2048', best);

  addRandom();
  notify();
  return {moved:true, won:won(), lost:lost()};
}

export function won(){ return grid.some(r=>r.some(v=>v>=2048)); }

export function movesAvailable(){
  for(let r=0;r<size;r++) for(let c=0;c<size;c++){
    const v=grid[r][c];
    if(!v) return true;
    if(c<size-1 && v===grid[r][c+1]) return true;
    if(r<size-1 && v===grid[r+1][c]) return true;
  }
  return false;
}

export function lost(){ return !movesAvailable(); }