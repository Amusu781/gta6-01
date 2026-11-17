// Keyboard and mouse input, in one place. The game reads `input` each frame;
// the shot-staging code drives it synthetically instead.
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    run: false, handbrake: false,
    mouseX: 0, mouseY: 0, mouseDown: false,
    pressed: new Set(), // keys pressed since the last frame was consumed
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    const field = KEYMAP[e.code];
    if (field) { input[field] = true; e.preventDefault(); }
    if (!e.repeat) input.pressed.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const field = KEYMAP[e.code];
    if (field) input[field] = false;
  });
  window.addEventListener('blur', () => {
    // Losing focus mid-keypress must not leave Rico walking forever, and a
    // stale one-shot press must not fire when the window comes back.
    input.up = input.down = input.left = input.right = input.run = input.handbrake = false;
    input.pressed.clear();
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.pressed.add('Mouse0'); }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Consume a one-shot press (E, F, R, Enter, M, P, Escape...). Returns true once per press.
export function wasPressed(input, code) {
  if (input.pressed.has(code)) { input.pressed.delete(code); return true; }
  return false;
}
export function endFrame(input) { input.pressed.clear(); }
