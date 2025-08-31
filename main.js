// ---- 2048: lógica y UI en ~200 líneas ----
const size = 4;
const prob4 = 0.1; // 10% de probabilidad de sacar un 4
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');
const toast = document.getElementById('toast');
const hapticsEl = document.getElementById('haptics');

let grid, score, best, tiles = new Map();
let history = [];// para deshacer

function init(){
  grid = Array.from({length:size},()=>Array(size).fill(0));
  score = 0; scoreEl.textContent = score;
  best = +localStorage.getItem('best-2048')||0; bestEl.textContent = best;
  tiles.forEach(el=>el.remove()); tiles.clear();
  addRandom(); addRandom();
  render();
  say('¡Ánimo! Llega a 2048.');
}

function saveHistory(){
  history.push({
    grid: grid.map(r=>r.slice()),
    score
  });
  if(history.length>20) history.shift();
}

function restore(){
  const last = history.pop();
  if(!last) return toastMsg('Nada que deshacer');
  grid = last.grid.map(r=>r.slice());
  score = last.score; updateScore();
  tiles.forEach(el=>el.remove()); tiles.clear();
  render(true);
  say('Movimiento deshecho.');
}

function addRandom(){
  const empties=[];
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(!grid[r][c]) empties.push([r,c]);
  if(!empties.length) return false;
  const [r,c]=empties[Math.floor(Math.random()*empties.length)];
  grid[r][c] = Math.random()<prob4?4:2;
  return true;
}

function render(skipNewAnim=false){
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const v = grid[r][c];
      const key = r+','+c;
      let el = tiles.get(key);
      if(v){
        if(!el){
          el = document.createElement('div');
          el.className = 'tile v'+v + (skipNewAnim?'':' new');
          el.textContent = v;
          boardEl.appendChild(el);
          tiles.set(key, el);
        }else{
          el.className = 'tile v'+v; el.textContent = v;
        }
        place(el,r,c);
      }else{
        if(el){ el.remove(); tiles.delete(key); }
      }
    }
  }
}

function place(el,r,c){
  const cellSize = (boardEl.clientWidth - 50)/4; // 10px gaps x 5
  const gap = 10;
  const top = 10 + r*(cellSize+gap);
  const left = 10 + c*(cellSize+gap);
  el.style.top = top+'px';
  el.style.left = left+'px';
  el.style.transform = 'scale(1)';
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

function move(dir){
  saveHistory();
  const before = JSON.stringify(grid);
  if(dir==='right'){ grid = grid.map(r=>slide(r.slice().reverse()).reverse()); }
  if(dir==='left'){ grid = grid.map(r=>slide(r)); }
  if(dir==='up'){ rotateGrid(3); grid = grid.map(r=>slide(r)); rotateGrid(1); }
  if(dir==='down'){ rotateGrid(1); grid = grid.map(r=>slide(r)); rotateGrid(3); }

  if(JSON.stringify(grid)===before){ history.pop(); return; }

  updateScore();
  addRandom();
  animateAndRender();

  if(won()) say('¡Has llegado a 2048! Puedes seguir si quieres.');
  else if(lost()) say('Sin movimientos 😵 — pulsa "Nueva partida"');
}

function animateAndRender(){
  tiles.forEach((el, key)=>{ /* keep refs but will be replaced on render */ });
  render();
  localStorage.setItem('best-2048', best);
}

function updateScore(){
  scoreEl.textContent = score;
  if(score>best){ best=score; bestEl.textContent=best; }
}

function won(){
  return grid.some(r=>r.some(v=>v>=2048));
}
function movesAvailable(){
  for(let r=0;r<size;r++) for(let c=0;c<size;c++){
    const v=grid[r][c];
    if(!v) return true;
    if(c<size-1 && v===grid[r][c+1]) return true;
    if(r<size-1 && v===grid[r+1][c]) return true;
  }
  return false;
}
function lost(){
  return !movesAvailable();
}

function doMove(dir){
  if(hapticsEl?.checked && 'vibrate' in navigator){ navigator.vibrate(8); }
  move(dir);
}

window.addEventListener('keydown',e=>{
  const k=e.key;
  if(['ArrowLeft','a','A','h','H'].includes(k)) doMove('left');
  else if(['ArrowRight','d','D','l','L'].includes(k)) doMove('right');
  else if(['ArrowUp','w','W','k','K'].includes(k)) doMove('up');
  else if(['ArrowDown','s','S','j','J'].includes(k)) doMove('down');
}, {passive:true});

let touchStartX=0,touchStartY=0;
boardEl.addEventListener('touchstart',e=>{
  const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY;
},{passive:true});
boardEl.addEventListener('touchmove',e=>{
  e.preventDefault();
}, {passive:false});
boardEl.addEventListener('touchend',e=>{
  const t=e.changedTouches[0]; const dx=t.clientX - touchStartX; const dy=t.clientY - touchStartY;
  const absX=Math.abs(dx), absY=Math.abs(dy);
  const threshold = 24;
  if(Math.max(absX,absY)<threshold) return;
  if(absX>absY) doMove(dx>0?'right':'left'); else doMove(dy>0?'down':'up');
});

document.getElementById('new').onclick=init;
document.getElementById('undo').onclick=restore;
document.getElementById('help').onclick=()=>{
  alert('Cómo jugar:\n\n— Usa flechas o desliza para mover todas las fichas.\n— Dos fichas iguales se fusionan sumando.\n— Aparece una nueva ficha tras cada movimiento.\n— Llega a 2048 para ganar.');
};

document.getElementById('fs').onclick = ()=>{
  const el = document.documentElement;
  if(!document.fullscreenElement){
    el.requestFullscreen?.();
  }else{
    document.exitFullscreen?.();
  }
};

function say(text){ msgEl.textContent = text; }
function toastMsg(t){ toast.textContent=t; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1500); }

window.addEventListener('load',()=>{ init(); setTimeout(()=>toast.classList.add('show'),400); setTimeout(()=>toast.classList.remove('show'),2200); });
window.addEventListener('resize',()=>{
  tiles.forEach((el,key)=>{
    const [r,c]=key.split(',').map(Number);
    place(el,r,c);
  });
});