// Keyboard + mouse state, tracked once for the whole game.
// Movement keys are read as a direction vector; edge-triggered keys (E, P, R, M,
// Enter, Space) are consumed once per press through pressed().

const keys = new Set();
const pressedKeys = new Set();
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseClicked = false;

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressedKeys.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
      mouseClicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
  });
}

export function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function pressed(code) {
  if (pressedKeys.has(code)) {
    pressedKeys.delete(code);
    return true;
  }
  return false;
}

export function keyDown(code) {
  return keys.has(code);
}

export function consumeClick() {
  const c = mouseClicked;
  mouseClicked = false;
  return c;
}

export function mousePos() {
  return { x: mouseX, y: mouseY };
}

export function mouseHeld() {
  return mouseDown;
}

// Called once per frame after the game has read input, so a press is never
// acted on twice.
export function endFrameInput() {
  pressedKeys.clear();
  mouseClicked = false;
}
