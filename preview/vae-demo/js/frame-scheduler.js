export class FrameScheduler {
  constructor() {
    this.callbacks = new Set();
    this.frameId = 0;
    this.paused = document.hidden;
    this.tick = this.tick.bind(this);
  }

  add(callback) {
    this.callbacks.add(callback);
    this.ensureRunning();
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0 && this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
      }
    };
  }

  setPaused(paused) {
    this.paused = paused;
    if (!paused) {
      this.ensureRunning();
    }
  }

  ensureRunning() {
    if (!this.frameId && this.callbacks.size > 0) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  tick(timestamp) {
    this.frameId = 0;
    if (!this.paused) {
      for (const callback of this.callbacks) {
        callback(timestamp);
      }
    }
    this.ensureRunning();
  }
}
