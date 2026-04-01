export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointerActive = false;
    this.pointerX = 0;
    this.pointerY = 0;

    window.addEventListener('keydown', (event) => {
      this.keys.add(event.key.toLowerCase());
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    const onPointer = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.pointerX = (event.clientX - rect.left) * scaleX;
      this.pointerY = (event.clientY - rect.top) * scaleY;
    };

    this.canvas.addEventListener('pointerdown', (event) => {
      this.pointerActive = true;
      onPointer(event);
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.pointerActive) return;
      onPointer(event);
    });

    const releasePointer = () => {
      this.pointerActive = false;
    };

    this.canvas.addEventListener('pointerup', releasePointer);
    this.canvas.addEventListener('pointercancel', releasePointer);
    this.canvas.addEventListener('pointerleave', releasePointer);
  }

  getMovementAxis() {
    const left = this.keys.has('arrowleft') || this.keys.has('a');
    const right = this.keys.has('arrowright') || this.keys.has('d');
    const up = this.keys.has('arrowup') || this.keys.has('w');
    const down = this.keys.has('arrowdown') || this.keys.has('s');

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }
}
