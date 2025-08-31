// Maneja DOM, eventos y render usando la API de game.js
import * as game from './game.js';

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');
const toast = document.getElementById('toast');
const hapticsEl = document.getElementById('haptics');

let tiles = new Map();
let pendingEntrance = null; // {oldGrid, dir}

function place(el,r,c){
  const cellSize = (boardEl.clientWidth - 50)/4;
  const gap = 10;
  // actualizamos la variable CSS con el desplazamiento (tamaño celda + gap)
  boardEl.style.setProperty('--cell', `${cellSize + gap}px`);

  const top = 10 + r*(cellSize+gap);
  const left = 10 + c*(cellSize+gap);
  el.style.top = top+'px';
  el.style.left = left+'px';
  // use translate + scale so slide classes can override translate
  el.style.transform = 'translate(0px,0px) scale(1)';
}

function render(skipNew=false, newEntries = [], dir = ''){
  const grid = game.getGrid();
  for(let r=0;r<grid.length;r++){
    for(let c=0;c<grid[r].length;c++){
      const v = grid[r][c];
      const key = r+','+c;
      let el = tiles.get(key);
      const isNew = newEntries.some(p => p[0]===r && p[1]===c);
      if(v){
        if(!el){
          el = document.createElement('div');
          el.className = 'tile v'+v + (skipNew?'':' new');
          el.textContent = v;
          // start transparent for a smooth fade-in
          el.style.opacity = '0';
          boardEl.appendChild(el);
          tiles.set(key, el);
          // place then apply slide-in class (if applicable)
          place(el,r,c);
          if(isNew && dir){
            el.classList.add('slide-in-'+dir);
            // force style/layout then remove the class to animate to neutral
            requestAnimationFrame(()=> {
              el.style.opacity = '1';
              el.classList.remove('slide-in-'+dir);
            });
          }else{
            // normal fade-in
            requestAnimationFrame(()=>{ el.style.opacity = '1'; });
          }
        }else{
          el.className = 'tile v'+v;
          el.textContent = v;
          el.style.opacity = '1';
          place(el,r,c);
        }
      }else{
        if(el){ el.remove(); tiles.delete(key); }
      }
    }
  }
  updateScore();
}

function updateScore(){
  scoreEl.textContent = game.getScore();
  bestEl.textContent = game.getBest();
}

function say(text){ msgEl.textContent = text; }
function toastMsg(t){ toast.textContent=t; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1500); }

function doMove(dir){
  if(hapticsEl?.checked && 'vibrate' in navigator){ navigator.vibrate(8); }
  // save the grid before move so we can animate entries
  pendingEntrance = { oldGrid: game.getGrid(), dir };
  boardEl.classList.add('fading');
  const res = game.move(dir);
  setTimeout(()=> boardEl.classList.remove('fading'), 160);
  if(res.moved){
    if(res.won) say('¡Has llegado a 2048! Puedes seguir si quieres.');
    else if(res.lost) say('Sin movimientos 😵 — pulsa "Nueva partida"');
  }
}

/* subscribimos la UI a cambios del juego */
game.subscribe(()=>{ 
  // compute newly occupied cells from pendingEntrance (old 0 -> new nonzero)
  let newEntries = [];
  let dir = '';
  if(pendingEntrance){
    const old = pendingEntrance.oldGrid;
    const g = game.getGrid();
    dir = pendingEntrance.dir;
    for(let r=0;r<g.length;r++){
      for(let c=0;c<g[r].length;c++){
        if((!old || old[r][c]===0) && g[r][c]!==0){
          newEntries.push([r,c]);
        }
      }
    }
  }
  // render with info, then clear pending
  render(false, newEntries, dir);
  pendingEntrance = null;
});

/* eventos y controles */
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
boardEl.addEventListener('touchmove',e=>{ e.preventDefault(); }, {passive:false});
boardEl.addEventListener('touchend',e=>{
  const t=e.changedTouches[0]; const dx=t.clientX - touchStartX; const dy=t.clientY - touchStartY;
  const absX=Math.abs(dx), absY=Math.abs(dy);
  const threshold = 24;
  if(Math.max(absX,absY)<threshold) return;
  if(absX>absY) doMove(dx>0?'right':'left'); else doMove(dy>0?'down':'up');
});

document.getElementById('new').onclick = ()=> { game.init(); say('¡Ánimo! Llega a 2048.'); tiles.forEach(el=>el.remove()); tiles.clear(); };
document.getElementById('undo').onclick = ()=> {
  const ok = game.undo();
  if(!ok) toastMsg('Nada que deshacer');
  else { tiles.forEach(el=>el.remove()); tiles.clear(); render(true); say('Movimiento deshecho.'); }
};
document.getElementById('help').onclick = ()=> {
  alert('Cómo jugar:\n\n— Usa flechas o desliza para mover todas las fichas.\n— Dos fichas iguales se fusionan sumando.\n— Aparece una nueva ficha tras cada movimiento.\n— Llega a 2048 para ganar.');
};
document.getElementById('fs').onclick = ()=>{
  const el = document.documentElement;
  if(!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
};

/* resize -> recalcula variable y reposiciona */
window.addEventListener('resize',()=>{
  // update CSS variable by recalculating in place for one dummy calculation
  const cellSize = (boardEl.clientWidth - 50)/4;
  const gap = 10;
  boardEl.style.setProperty('--cell', `${cellSize + gap}px`);

  tiles.forEach((el,key)=>{
    const [r,c]=key.split(',').map(Number);
    place(el,r,c);
  });
});

/* inicio */
window.addEventListener('load',()=>{
  game.init();
  // ensure CSS var is set before first render
  const cellSize = (boardEl.clientWidth - 50)/4;
  const gap = 10;
  boardEl.style.setProperty('--cell', `${cellSize + gap}px`);

  render();
  setTimeout(()=>toast.classList.add('show'),400);
  setTimeout(()=>toast.classList.remove('show'),2200);
});