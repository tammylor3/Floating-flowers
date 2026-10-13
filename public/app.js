const FLOWERS = {
  pink: { name: 'Pink hibiscus', src: '/manus-storage/pink_fc5fffe6.png', fallback: '/flowers/pink.png', size: 150 },
  magenta: { name: 'Bright hibiscus', src: '/manus-storage/magenta_ee46a899.png', fallback: '/flowers/magenta.png', size: 148 },
  lily: { name: 'White lily', src: '/manus-storage/lily_2707a1a6.png', fallback: '/flowers/lily.png', size: 158 },
  plumeria: { name: 'Plumeria', src: '/manus-storage/plumeria_79152eec.png', fallback: '/flowers/plumeria.png', size: 145 },
};

const pool = document.querySelector('#pool');
const canvas = document.querySelector('#water');
const flowerLayer = document.querySelector('#blossoms');
const rippleLayer = document.querySelector('#ripples');
const dropletLayer = document.querySelector('#droplets');
const hint = document.querySelector('#hint');
const announcer = document.querySelector('#announcer');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let selected = 'pink';
let flowers = [];
let activePointer = null;
let previousTime = performance.now();
let rafTime = 0;

// Flowing WebGL interference contours form the branching light network without
// a per-fragment neighborhood loop, keeping the pool light enough for mobile GPUs.
const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;
const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_reduced;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * (1.0 - u_reduced) * 0.53;
  vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * vec2(11.4, 10.6);
  vec2 flow = vec2(sin(p.y * .82 + t * .72) + cos(p.x * .62 - t * .56) * .48 + sin((p.x + p.y) * .34 + t * .4) * .22,
                   cos(p.x * .73 + t * .55) - sin(p.y * .69 - t * .64) * .48 + cos((p.x - p.y) * .31 - t * .38) * .22);
  p += flow * .42;
  float waveA = sin(p.x * 4.65 + sin(p.y * .92 + t * .72) * .72 + t * .32);
  float waveB = sin(p.y * 4.45 + cos(p.x * .76 - t * .67) * .72 - t * .29);
  float ridge = min(abs(waveA), abs(waveB));
  float vein = 1.0 - smoothstep(.025, .205, ridge);
  float glow = (1.0 - smoothstep(.18, .58, ridge)) * .16;
  float sparkleField = sin(p.x * 13.1 + t * 1.4) * cos(p.y * 12.3 - p.x * .72 - t * 1.1);
  float glitter = smoothstep(.88, .995, sparkleField) * .32;
  float caustic = clamp(vein * .82 + glow + glitter, 0.0, 1.0);
  float sun = .5 + .5 * sin(uv.x * 4.0 + uv.y * 2.3 + t * .55);
  float depth = smoothstep(0.0, 1.0, uv.y);
  vec3 deep = vec3(.23, .50, .55);
  vec3 shallow = vec3(.52, .76, .78);
  vec3 water = mix(deep, shallow, .42 + .27 * depth + .08 * sun);
  float shade = .035 * sin(uv.x * 8.0 + t) * cos(uv.y * 7.0 - t * .8);
  water += shade;
  vec3 light = vec3(.77, .96, .94) * caustic * (.45 + .55 * sun);
  water = mix(water, vec3(.88, 1.0, .98), min(.82, caustic * .75));
  water += light * .26;
  gl_FragColor = vec4(water, 1.0);
}
`;

function startWater() {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) {
    pool.classList.add('no-webgl');
    return null;
  }
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Pool shader failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) { pool.classList.add('no-webgl'); return null; }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Pool shader link failed:', gl.getProgramInfoLog(program));
    pool.classList.add('no-webgl');
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const timeLoc = gl.getUniformLocation(program, 'u_time');
  const reducedLoc = gl.getUniformLocation(program, 'u_reduced');
  const resize = () => {
    const ratio = Math.min((window.devicePixelRatio || 1) * .42, 1.0);
    const w = Math.max(1, Math.floor(window.innerWidth * ratio));
    const h = Math.max(1, Math.floor(window.innerHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    pool.classList.add('no-webgl');
  });
  return (time) => {
    resize();
    gl.useProgram(program);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, time / 1000);
    gl.uniform1f(reducedLoc, reduceMotion ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}
const drawWater = startWater();
let staticWaterDirty = true;
window.addEventListener('resize', () => { staticWaterDirty = true; }, { passive: true });

function wireImageFallback(image) {
  image.addEventListener('error', () => {
    if (image.dataset.fallback && !image.dataset.fallbackUsed) {
      image.dataset.fallbackUsed = 'true';
      image.src = image.dataset.fallback;
    }
  });
}
document.querySelectorAll('.choice-icon img').forEach(wireImageFallback);

function announce(message) { announcer.textContent = message; }
function selectFlower(type) {
  selected = type;
  document.querySelectorAll('.flower-choice').forEach((button) => {
    const isSelected = button.dataset.flower === type;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  hint.textContent = 'Tap the water to let it float. Drag, shake or hold to play.';
  announce(`${FLOWERS[type].name} selected. Tap the water to drop it in.`);
}

document.querySelectorAll('.flower-choice').forEach((button) => {
  button.addEventListener('click', () => selectFlower(button.dataset.flower));
});

function makeRipple(x, y, strength = 1) {
  const ringSet = document.createElement('div');
  ringSet.className = 'ripple-set';
  ringSet.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:scale(${Math.min(1.45, strength)});`;
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('i');
    ring.className = 'ripple-ring';
    ringSet.append(ring);
  }
  rippleLayer.append(ringSet);
  window.setTimeout(() => ringSet.remove(), 1750);
}

function makeDroplets(x, y, count = 7, force = 1) {
  for (let i = 0; i < count; i++) {
    const d = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const travel = (10 + Math.random() * 39) * force;
    d.className = 'droplet';
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.style.setProperty('--d', `${3 + Math.random() * 7}px`);
    d.style.setProperty('--dx', `${Math.cos(angle) * travel}px`);
    d.style.setProperty('--dy', `${Math.sin(angle) * travel - 15 - Math.random() * 12}px`);
    dropletLayer.append(d);
    window.setTimeout(() => d.remove(), 850);
  }
}

function createFlower(type, x, y, options = {}) {
  const meta = FLOWERS[type] || FLOWERS.pink;
  const element = document.createElement('button');
  element.className = 'blossom';
  element.type = 'button';
  element.setAttribute('aria-label', `${meta.name}, floating. Press and hold to dip it under.`);
  element.setAttribute('aria-pressed', 'false');
  element.innerHTML = `<span class="floor-shadow" aria-hidden="true"></span><img src="${meta.src}" data-fallback="${meta.fallback}" alt="" draggable="false" />`;
  wireImageFallback(element.querySelector('img'));
  const flower = {
    type, name: meta.name, el: element, x, y,
    vx: options.vx || 0, vy: options.vy || 0,
    angle: Math.random() * 360 - 180,
    spin: (Math.random() - .5) * .075,
    phase: Math.random() * Math.PI * 2,
    size: options.size || meta.size * (window.innerWidth <= 800 ? .82 : 1),
    born: performance.now(), bounceUntil: performance.now() + 560,
    submerged: false, submergedAt: 0, clearAt: 0, isDragging: false,
    pointerStart: null, shakeDirection: 0, reversals: 0, lastShakeAt: 0,
  };
  element.style.setProperty('--size', `${flower.size}px`);
  flowerLayer.append(element);
  flowers.push(flower);
  makeRipple(x, y, .84);
  makeDroplets(x, y, 9, .8);
  return flower;
}

function dropAt(x, y) {
  const margin = 56;
  const flower = createFlower(selected,
    Math.max(margin, Math.min(window.innerWidth - margin, x)),
    Math.max(margin, Math.min(window.innerHeight - margin, y)),
    { vx: (Math.random() - .5) * 28, vy: -14 - Math.random() * 22 });
  announce(`${flower.name} dropped in the water.`);
}

const keyboardPool = document.querySelector('#keyboard-pool');
keyboardPool.addEventListener('pointerdown', (event) => {
  if (activePointer) return;
  if (event.target.closest('.picker, .wordmark, .hint')) return;
  dropAt(event.clientX, event.clientY);
});
keyboardPool.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dropAt(window.innerWidth * .5, window.innerHeight * .55);
  }
});

function beginFlowerPointer(flower, event) {
  if (activePointer && activePointer.pointerId !== event.pointerId) return;
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  flower.el.setPointerCapture?.(event.pointerId);
  const now = performance.now();
  activePointer = {
    flower, pointerId: event.pointerId,
    startX: event.clientX, startY: event.clientY,
    lastX: event.clientX, lastY: event.clientY,
    lastAt: now, moved: false, holdTimer: null,
  };
  flower.pointerStart = { x: event.clientX, y: event.clientY };
  flower.vx *= .25;
  flower.vy *= .25;
  flower.el.classList.add('is-dragging');
  flower.el.style.zIndex = '7';
  makeRipple(flower.x, flower.y, .72);
  activePointer.holdTimer = window.setTimeout(() => {
    if (!activePointer || activePointer.flower !== flower || activePointer.moved) return;
    flower.submerged = true;
    flower.submergedAt = performance.now();
    flower.el.classList.add('is-submerged');
    flower.el.setAttribute('aria-pressed', 'true');
    makeRipple(flower.x, flower.y, .56);
    announce(`${flower.name} is dipping below the water.`);
  }, 390);
}

function moveFlowerPointer(event) {
  const drag = activePointer;
  if (!drag || event.pointerId !== drag.pointerId) return;
  event.preventDefault();
  const flower = drag.flower;
  const now = performance.now();
  const dx = event.clientX - drag.lastX;
  const dy = event.clientY - drag.lastY;
  const dt = Math.max(8, now - drag.lastAt);
  const vx = dx / dt * 1000;
  const vy = dy / dt * 1000;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 7) {
    drag.moved = true;
    if (drag.holdTimer) window.clearTimeout(drag.holdTimer);
  }
  if (drag.moved) {
    flower.x = Math.max(20, Math.min(window.innerWidth - 20, flower.x + dx));
    flower.y = Math.max(20, Math.min(window.innerHeight - 20, flower.y + dy));
    flower.vx = vx * .24;
    flower.vy = vy * .24;
    flower.angle += dx * .075;
    flower.isDragging = true;
    if (Math.hypot(vx, vy) > 300) {
      const dir = Math.abs(vx) > Math.abs(vy) ? Math.sign(vx) : Math.sign(vy);
      if (flower.shakeDirection && dir && dir !== flower.shakeDirection && now - flower.lastShakeAt < 520) flower.reversals++;
      if (dir) flower.shakeDirection = dir;
      flower.lastShakeAt = now;
      if (flower.reversals >= 3) {
        flower.reversals = 0;
        makeDroplets(flower.x, flower.y, 13, 1.38);
        makeRipple(flower.x, flower.y, 1.08);
        flower.vx *= 1.3;
        flower.vy *= 1.3;
      }
    } else if (now - flower.lastShakeAt > 700) flower.reversals = 0;
  }
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  drag.lastAt = now;
}

function endFlowerPointer(event) {
  const drag = activePointer;
  if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
  activePointer = null;
  if (drag.holdTimer) window.clearTimeout(drag.holdTimer);
  const flower = drag.flower;
  flower.el.classList.remove('is-dragging');
  flower.el.style.zIndex = '';
  flower.isDragging = false;
  if (flower.submerged) {
    flower.submerged = false;
    flower.el.classList.remove('is-submerged');
    flower.el.setAttribute('aria-pressed', 'false');
    flower.vy -= reduceMotion ? 24 : 92;
    flower.bounceUntil = performance.now() + 720;
    makeRipple(flower.x, flower.y, 1.2);
    makeDroplets(flower.x, flower.y, 7, .86);
    announce(`${flower.name} floats back to the surface.`);
  } else if (!drag.moved) {
    flower.vx += (Math.random() - .5) * 24;
    flower.vy -= 12;
  }
}

flowerLayer.addEventListener('pointerdown', (event) => {
  const element = event.target.closest('.blossom');
  if (!element) return;
  const flower = flowers.find((item) => item.el === element);
  if (flower) beginFlowerPointer(flower, event);
});
window.addEventListener('pointermove', moveFlowerPointer, { passive: false });
window.addEventListener('pointerup', endFlowerPointer);
window.addEventListener('pointercancel', endFlowerPointer);
flowerLayer.addEventListener('keydown', (event) => {
  const element = event.target.closest('.blossom');
  const flower = flowers.find((item) => item.el === element);
  if (!flower) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    makeRipple(flower.x, flower.y, .9);
    makeDroplets(flower.x, flower.y, 4, .52);
  }
  const move = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] }[event.key];
  if (move) {
    const margin = flower.size * .38;
    flower.x = Math.max(margin, Math.min(window.innerWidth - margin, flower.x + move[0]));
    flower.y = Math.max(margin, Math.min(window.innerHeight - margin, flower.y + move[1]));
    announce(`${flower.name} moved.`);
  }
});

document.querySelector('#clear').addEventListener('click', () => {
  if (!flowers.length) {
    hint.textContent = 'The water is already clear. Pick a flower to begin.';
    window.setTimeout(() => { if (!flowers.length) hint.textContent = 'Pick a flower to drop it in the pool'; }, 2200);
    return;
  }
  const now = performance.now();
  flowers.forEach((flower, index) => {
    if (flower.clearAt) return;
    const stagger = reduceMotion ? 0 : index * 105;
    flower.clearAt = now + stagger;
    flower.clearStartY = flower.y;
    flower.clearStart = now + stagger;
    flower.el.style.pointerEvents = 'none';
  });
  makeRipple(window.innerWidth * .5, window.innerHeight * .52, 1.3);
  hint.textContent = 'A little space for the next blossom.';
  announce('The blossoms are gently sinking out of sight.');
  window.setTimeout(() => {
    if (!flowers.length) hint.textContent = 'Pick a flower to drop it in the pool';
  }, 1500);
});

function animate(now) {
  const dt = Math.min(.035, Math.max(.001, (now - previousTime) / 1000));
  previousTime = now;
  rafTime += reduceMotion ? 0 : dt;
  if (drawWater && (!reduceMotion || staticWaterDirty)) {
    drawWater(reduceMotion ? 0 : rafTime * 1000);
    staticWaterDirty = false;
  }
  const damping = Math.pow(reduceMotion ? .965 : .986, dt * 60);
  const remove = new Set();
  for (const flower of flowers) {
    if (!flower.isDragging) {
      flower.x += flower.vx * dt;
      flower.y += flower.vy * dt;
      flower.vx *= damping;
      flower.vy *= damping;
      if (!reduceMotion) {
        flower.vx += Math.sin(rafTime * .8 + flower.phase) * 1.15 * dt;
        flower.vy += Math.cos(rafTime * .71 + flower.phase) * .86 * dt;
      }
      if (!reduceMotion) flower.angle += flower.spin * dt * 60;
    }
    const margin = flower.size * .38;
    if (flower.x < margin || flower.x > window.innerWidth - margin) flower.vx *= -.62;
    if (flower.y < margin || flower.y > window.innerHeight - margin) flower.vy *= -.62;
    flower.x = Math.max(margin, Math.min(window.innerWidth - margin, flower.x));
    flower.y = Math.max(margin, Math.min(window.innerHeight - margin, flower.y));
  }
  // Soft overlap correction gives blossoms a little buoyant nudge instead of a hard bounce.
  for (let i = 0; i < flowers.length; i++) {
    for (let j = i + 1; j < flowers.length; j++) {
      const a = flowers[i], b = flowers[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || .001;
      const minDist = (a.size + b.size) * .46;
      if (dist < minDist) {
        const push = (minDist - dist) * .48;
      const angle = a.phase + b.phase + .73;
      const nx = dx === 0 && dy === 0 ? Math.cos(angle) : dx / dist;
      const ny = dx === 0 && dy === 0 ? Math.sin(angle) : dy / dist;
        if (!a.isDragging) { a.x -= nx * push; a.y -= ny * push; a.vx -= nx * push * 2.3; a.vy -= ny * push * 2.3; }
        if (!b.isDragging) { b.x += nx * push; b.y += ny * push; b.vx += nx * push * 2.3; b.vy += ny * push * 2.3; }
      }
    }
  }
  for (const flower of flowers) {
    const bob = reduceMotion ? 0 : Math.sin(rafTime * 1.25 + flower.phase) * 2.15;
    const bobTilt = reduceMotion ? 0 : Math.sin(rafTime * .48 + flower.phase) * 1.35;
    const bounce = !reduceMotion && now < flower.bounceUntil ? 1 + Math.sin((1 - (flower.bounceUntil - now) / 560) * Math.PI) * .11 : 1;
    let scale = flower.submerged ? .69 : bounce;
    let opacity = 1;
    let y = flower.y + bob;
    if (flower.clearAt) {
      const progress = reduceMotion ? 1 : Math.min(1, Math.max(0, (now - flower.clearStart) / 870));
      y += progress * 76;
      scale *= 1 - progress * .28;
      opacity = 1 - progress;
      flower.vx *= .92;
      flower.vy = flower.vy * .92 + .16;
      if (progress >= 1) remove.add(flower);
    }
    const submergedDepth = flower.submerged ? Math.min(1, (now - flower.submergedAt) / 380) : 0;
    const causticPhase = flower.x * .012 + flower.y * .01 + rafTime * 2.1 + flower.phase;
    const wobble = 1 + Math.sin(causticPhase) * .055;
    flower.el.style.transform = `translate3d(${flower.x}px, ${y}px, 0) translate(-50%, -50%) rotate(${flower.angle + bobTilt}deg) scale(${scale})`;
    flower.el.style.opacity = String(opacity);
    flower.el.style.filter = flower.submerged ? `blur(${submergedDepth * .55}px) saturate(${1 - submergedDepth * .38})` : '';
    flower.el.style.setProperty('--shadow-wobble', wobble.toFixed(3));
    flower.el.style.setProperty('--shadow-x', `${(Math.sin(causticPhase * .7) * 3.5).toFixed(1)}px`);
    flower.el.style.setProperty('--shadow-y', `${(Math.cos(causticPhase * .63) * 3.5).toFixed(1)}px`);
  }
  if (remove.size) {
    remove.forEach((flower) => flower.el.remove());
    flowers = flowers.filter((flower) => !remove.has(flower));
  }
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
// A couple of quiet starting blossoms echo the reference and show the toy's tactile surface.
function seedPool() {
  if (window.innerWidth > 850) {
    createFlower('pink', window.innerWidth * .67, window.innerHeight * .29, { size: 146, vx: -3, vy: 2 });
    createFlower('pink', window.innerWidth * .41, window.innerHeight * .64, { size: 153, vx: 2, vy: -1 });
  } else {
    createFlower('pink', window.innerWidth * .39, window.innerHeight * .73, { size: 118, vx: -2, vy: 1 });
  }
}
window.addEventListener('load', () => window.setTimeout(seedPool, 150));
