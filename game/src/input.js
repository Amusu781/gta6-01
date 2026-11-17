// Keyboard and mouse input, in one place. The game reads `input` each
// frame; the shot-staging code drives it synthetically instead.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // Edge-triggered presses, consumed by the game once per frame.
    pressed: new Set(),
    key(code) {
      return keys.has(code);
    },
    consume(code) {
      if (input.pressed.has(code)) {
        input.pressed.delete(code);
        return true;
      }
      return false;
    },
    endFrame() {
      input.pressed.clear();
    },
  };

  const DOWN = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'shoot',
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.code);
    keys.add(e.code);
    const field = DOWN[e.code];
    if (field) input[field] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    const field = DOWN[e.code];
    if (field) input[field] = keys.has('KeyW') || keys.has('ArrowUp') ? true : false;
    if (field === 'up') input.up = keys.has('KeyW') || keys.has('ArrowUp');
    if (field === 'down') input.down = keys.has('KeyS') || keys.has('ArrowDown');
    if (field === 'left') input.left = keys.has('KeyA') || keys.has('ArrowLeft');
    if (field === 'right') input.right = keys.has('KeyD') || keys.has('ArrowRight');
    if (field === 'shoot') input.shoot = keys.has('Space') || input.mouseDown;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouseDown = true;
      input.shoot = true;
      input.pressed.add('Mouse0');
      const r = canvas.getBoundingClientRect();
      input.mouseX = e.clientX - r.left;
      input.mouseY = e.clientY - r.top;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      input.mouseDown = false;
      input.shoot = keys.has('Space');
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}
