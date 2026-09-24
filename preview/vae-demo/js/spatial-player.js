import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  VideoTexture,
  WebGLRenderer,
} from '../vendor/three.module.js';

import {
  PANORAMA_FRONT_ROTATION_Y,
  applyDrag,
  formatTime,
  resetView,
} from './view-math.js';
import {
  DISPLAY_MODES,
  effectiveOutputGain,
  latchMediaReady,
  latchSeekReady,
} from './comparison-state.js';

const KEYBOARD_STEP = 0.08;
const SEEK_STEPS = 1000;

function mediaErrorMessage(error) {
  if (!error) {
    return 'The browser could not load this four-channel WebM.';
  }

  const messages = {
    1: 'Media loading was aborted.',
    2: 'A network error interrupted media loading.',
    3: 'The browser could not decode this four-channel WebM.',
    4: 'This browser does not support the media format.',
  };
  return messages[error.code] ?? 'The media could not be loaded.';
}

function createIcon(name) {
  const icon = document.createElement('i');
  icon.dataset.lucide = name;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function syncFoaRotation(renderer, camera) {
  renderer.setRotationMatrixFromCamera(camera.matrixWorld);
}

export function audioCameraForMode(mode, spatialCamera, neutralCamera) {
  return mode === DISPLAY_MODES.FLAT ? neutralCamera : spatialCamera;
}

export function viewerPointerIntent({ button, displayMode, isPrimary }) {
  const select = button <= 0 && isPrimary !== false;
  return {
    drag: select && displayMode === DISPLAY_MODES.SPATIAL,
    select,
  };
}

export class SpatialPlayer {
  constructor({ getAudioContext, mediaPath, method, sample, scheduler }) {
    this.getAudioContext = getAudioContext;
    this.mediaPath = mediaPath;
    this.method = method;
    this.sample = sample;
    this.scheduler = scheduler;

    this.disposed = false;
    this.dragPointerId = null;
    this.lastPointer = null;
    this.orientation = resetView();
    this.dirty = true;
    this.volume = 0.85;
    this.muted = false;
    this.displayMode = DISPLAY_MODES.SPATIAL;
    this.syncEnabled = false;
    this.selectedAudio = method.id === 'gt';
    this.sharedVolume = 0.85;
    this.sharedMuted = false;
    this.mediaReady = false;
    this.seekReady = false;
    this.interactionHandlers = {};
    this.audioInitialization = null;
    this.eventController = new AbortController();

    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  mount(parent) {
    this.buildMarkup();
    parent.append(this.element);
    window.lucide?.createIcons({ root: this.element });
    this.cacheElements();
    this.createScene();
    this.bindEvents();
    this.removeFrameCallback = this.scheduler.add(() => this.renderFrame());

    this.video.src = this.mediaPath;
    this.video.load();
    return this;
  }

  buildMarkup() {
    const card = document.createElement('article');
    card.className = 'player-card';
    card.dataset.method = this.method.id;
    card.dataset.sample = this.sample.id;
    card.dataset.audioSelected = String(this.selectedAudio);
    card.dataset.displayMode = this.displayMode;
    card.dataset.syncEnabled = 'false';
    card.innerHTML = `
      <header class="player-card__header">
        <button class="player-card__method listen-control" type="button" aria-pressed="${this.selectedAudio}" aria-label="Listen to ${this.method.label}">
          <h3>${this.method.label}</h3>
          ${this.method.ours ? '<span class="method-badge">Ours</span>' : ''}
          <span class="listen-marker" aria-hidden="true">
            <i data-lucide="headphones" aria-hidden="true"></i>
            <span>Listening</span>
          </span>
        </button>
        <span class="player-status" data-state="loading" role="status" aria-live="polite">Loading</span>
      </header>
      <div
        class="viewer-shell"
        data-display-mode="spatial"
        tabindex="0"
        role="application"
        aria-label="${this.method.label}, ${this.sample.id}, interactive 360-degree view"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"
        data-yaw="0"
        data-pitch="0"
        data-audio-rotation="pending"
        data-pointer-downs="0"
        data-pointer-moves="0"
      >
        <video class="media-source" preload="auto" playsinline crossorigin="anonymous"></video>
        <div class="viewer-message">Loading energy overlay…</div>
        <div class="view-bearing" aria-hidden="true">YAW 0° · PITCH 0°</div>
        <span class="view-reticle" aria-hidden="true"></span>
      </div>
      <div class="player-controls">
        <div class="timeline-row">
          <input
            class="seek-control"
            type="range"
            min="0"
            max="${SEEK_STEPS}"
            value="0"
            step="1"
            aria-label="Playback position"
            disabled
          >
          <output class="time-label">0:00 / --:--</output>
        </div>
        <div class="control-row">
          <button class="icon-button icon-button--primary play-control" type="button" aria-label="Play" title="Play" disabled>
            <i data-lucide="play" aria-hidden="true"></i>
          </button>
          <button class="icon-button stop-control" type="button" aria-label="Stop" title="Stop" disabled>
            <i data-lucide="square" aria-hidden="true"></i>
          </button>
          <button class="icon-button mute-control" type="button" aria-label="Mute" title="Mute">
            <i data-lucide="volume-2" aria-hidden="true"></i>
          </button>
          <label class="volume-control" title="Volume">
            <span class="sr-only">Volume</span>
            <input type="range" min="0" max="1" value="${this.volume}" step="0.01" aria-label="Volume">
          </label>
          <span class="control-spacer"></span>
          <button class="icon-button reset-control" type="button" aria-label="Reset view" title="Reset view">
            <i data-lucide="rotate-ccw" aria-hidden="true"></i>
          </button>
          <button class="icon-button fullscreen-control" type="button" aria-label="Enter fullscreen" title="Enter fullscreen">
            <i data-lucide="maximize-2" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
    this.element = card;
  }

  cacheElements() {
    this.viewer = this.element.querySelector('.viewer-shell');
    this.header = this.element.querySelector('.player-card__header');
    this.listenButton = this.element.querySelector('.listen-control');
    this.video = this.element.querySelector('.media-source');
    this.message = this.element.querySelector('.viewer-message');
    this.bearing = this.element.querySelector('.view-bearing');
    this.status = this.element.querySelector('.player-status');
    this.playButton = this.element.querySelector('.play-control');
    this.stopButton = this.element.querySelector('.stop-control');
    this.muteButton = this.element.querySelector('.mute-control');
    this.resetButton = this.element.querySelector('.reset-control');
    this.fullscreenButton = this.element.querySelector('.fullscreen-control');
    this.seekInput = this.element.querySelector('.seek-control');
    this.volumeInput = this.element.querySelector('.volume-control input');
    this.timeLabel = this.element.querySelector('.time-label');
  }

  createScene() {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(72, 16 / 10, 0.1, 100);
    this.camera.rotation.order = 'YXZ';
    this.neutralCamera = new PerspectiveCamera(72, 16 / 10, 0.1, 100);
    this.neutralCamera.rotation.order = 'YXZ';
    this.neutralCamera.updateMatrixWorld(true);

    this.texture = new VideoTexture(this.video);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.generateMipmaps = false;

    this.geometry = new SphereGeometry(10, 64, 40);
    this.geometry.scale(-1, 1, 1);
    this.geometry.rotateY(PANORAMA_FRONT_ROTATION_Y);
    this.material = new MeshBasicMaterial({ map: this.texture });
    this.sphere = new Mesh(this.geometry, this.material);
    this.scene.add(this.sphere);

    this.webgl = new WebGLRenderer({ antialias: true, alpha: false });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.viewer.prepend(this.webgl.domElement);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.viewer);
    this.resize();
    this.updateOrientation();
  }

  resize() {
    if (this.disposed || !this.webgl) {
      return;
    }
    const { height, width } = this.viewer.getBoundingClientRect();
    if (width < 1 || height < 1) {
      return;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.webgl.setSize(width, height, false);
    this.dirty = true;
  }

  bindEvents() {
    const signal = this.eventController.signal;
    const on = (target, type, listener, options = {}) => {
      target.addEventListener(type, listener, { ...options, signal });
    };

    const updateMediaState = () => {
      this.updateTimeline();
      this.updateSeekAvailability();
    };
    on(this.video, 'loadedmetadata', updateMediaState);
    on(this.video, 'loadeddata', () => this.handleReady());
    on(this.video, 'canplay', () => this.handleReady());
    on(this.video, 'timeupdate', () => this.updateTimeline());
    on(this.video, 'durationchange', updateMediaState);
    on(this.video, 'progress', () => this.updateSeekAvailability());
    on(this.video, 'canplaythrough', () => this.updateSeekAvailability());
    on(this.video, 'suspend', () => this.updateSeekAvailability());
    on(this.video, 'seeking', () => {
      this.dirty = true;
      this.updateTimeline();
    });
    on(this.video, 'play', () => {
      this.setStatus('playing', 'Playing');
      this.updatePlayButton(true);
    });
    on(this.video, 'pause', () => {
      if (!this.video.ended && this.status.dataset.state !== 'error') {
        this.setStatus('paused', this.video.currentTime === 0 ? 'Ready' : 'Paused');
      }
      this.updatePlayButton(false);
    });
    on(this.video, 'ended', () => {
      this.setStatus('ended', 'Ended');
      this.updatePlayButton(false, true);
    });
    on(this.video, 'error', () => this.fail(mediaErrorMessage(this.video.error)));

    on(this.header, 'click', () => this.interactionHandlers.onSelect?.(this));
    on(this.playButton, 'click', () => this.togglePlayback());
    on(this.stopButton, 'click', () => this.stop());
    on(this.muteButton, 'click', () => this.toggleMute());
    on(this.resetButton, 'click', () => this.resetOrientation());
    on(this.fullscreenButton, 'click', () => this.enterFullscreen());
    on(this.seekInput, 'input', () => this.seek());
    on(this.volumeInput, 'input', () => this.setVolume(Number(this.volumeInput.value)));

    on(this.viewer, 'pointerdown', (event) => this.startDrag(event));
    on(this.viewer, 'pointermove', (event) => this.drag(event));
    on(this.viewer, 'pointerup', (event) => this.endDrag(event));
    on(this.viewer, 'pointercancel', (event) => this.endDrag(event));
    on(this.viewer, 'keydown', (event) => this.handleViewKey(event));
  }

  handleReady() {
    if (this.disposed || this.status.dataset.state === 'error') {
      return;
    }
    this.mediaReady = latchMediaReady(this.mediaReady, this.video.readyState);
    this.message.hidden = true;
    this.playButton.disabled = false;
    this.stopButton.disabled = false;
    this.updateSeekAvailability();
    if (this.video.paused && !this.video.ended) {
      this.setStatus('ready', 'Ready');
    }
    this.updateTimeline();
    this.dirty = true;
    this.resolveReady?.(true);
    this.resolveReady = null;
  }

  setStatus(state, label) {
    this.status.dataset.state = state;
    this.status.textContent = label;
  }

  fail(message) {
    if (this.disposed) {
      return;
    }
    this.mediaReady = false;
    this.setStatus('error', 'Unavailable');
    this.message.hidden = false;
    this.message.textContent = message;
    this.playButton.disabled = true;
    this.stopButton.disabled = true;
    this.seekInput.disabled = true;
    this.resolveReady?.(false);
    this.resolveReady = null;
  }

  renderFrame() {
    if (
      this.disposed
      || !this.webgl
      || this.displayMode === DISPLAY_MODES.FLAT
      || (!this.dirty && this.video.paused)
    ) {
      return;
    }
    this.webgl.render(this.scene, this.camera);
    this.dirty = false;
  }

  startDrag(event) {
    const intent = viewerPointerIntent({
      button: event.button,
      displayMode: this.displayMode,
      isPrimary: event.isPrimary,
    });
    if (!intent.select || this.dragPointerId !== null) {
      return;
    }
    this.interactionHandlers.onSelect?.(this);
    if (!intent.drag) {
      return;
    }
    this.viewer.dataset.pointerDowns = String(
      Number(this.viewer.dataset.pointerDowns) + 1,
    );
    this.dragPointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.viewer.setPointerCapture(event.pointerId);
    this.viewer.dataset.dragging = 'true';
  }

  drag(event) {
    if (event.pointerId !== this.dragPointerId || !this.lastPointer) {
      return;
    }
    const deltaX = event.clientX - this.lastPointer.x;
    const deltaY = event.clientY - this.lastPointer.y;
    this.viewer.dataset.pointerMoves = String(
      Number(this.viewer.dataset.pointerMoves) + 1,
    );
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.orientation = applyDrag(this.orientation, deltaX, deltaY);
    this.updateOrientation({ emit: true });
  }

  endDrag(event) {
    if (event.pointerId !== this.dragPointerId) {
      return;
    }
    if (this.viewer.hasPointerCapture(event.pointerId)) {
      this.viewer.releasePointerCapture(event.pointerId);
    }
    this.dragPointerId = null;
    this.lastPointer = null;
    delete this.viewer.dataset.dragging;
  }

  handleViewKey(event) {
    if (this.displayMode !== DISPLAY_MODES.SPATIAL) {
      return;
    }
    const next = { ...this.orientation };
    switch (event.key) {
      case 'ArrowLeft':
        next.yaw += KEYBOARD_STEP;
        break;
      case 'ArrowRight':
        next.yaw -= KEYBOARD_STEP;
        break;
      case 'ArrowUp':
        next.pitch += KEYBOARD_STEP;
        break;
      case 'ArrowDown':
        next.pitch -= KEYBOARD_STEP;
        break;
      case 'Home':
        this.resetOrientation();
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    this.orientation = applyDrag(next, 0, 0);
    this.updateOrientation({ emit: true });
  }

  resetOrientation() {
    this.orientation = resetView();
    this.updateOrientation({ emit: true });
  }

  updateOrientation({ emit = false } = {}) {
    if (!this.camera) {
      return;
    }
    this.camera.rotation.set(this.orientation.pitch, this.orientation.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld(true);

    const yawDegrees = Math.round((this.orientation.yaw * 180) / Math.PI);
    const pitchDegrees = Math.round((this.orientation.pitch * 180) / Math.PI);
    this.viewer.dataset.yaw = this.orientation.yaw.toFixed(5);
    this.viewer.dataset.pitch = this.orientation.pitch.toFixed(5);
    this.bearing.textContent = `YAW ${yawDegrees}° · PITCH ${pitchDegrees}°`;

    if (this.foaRenderer) {
      const audioCamera = audioCameraForMode(
        this.displayMode,
        this.camera,
        this.neutralCamera,
      );
      syncFoaRotation(this.foaRenderer, audioCamera);
      this.viewer.dataset.audioRotation =
        this.displayMode === DISPLAY_MODES.FLAT ? 'neutral' : 'synced';
    }
    this.dirty = true;
    if (emit) {
      this.interactionHandlers.onOrientation?.(this, { ...this.orientation });
    }
  }

  setInteractionHandlers(handlers = {}) {
    this.interactionHandlers = handlers;
  }

  setDisplayMode(mode) {
    this.displayMode = mode === DISPLAY_MODES.FLAT
      ? DISPLAY_MODES.FLAT
      : DISPLAY_MODES.SPATIAL;
    if (!this.viewer) {
      return;
    }
    this.element.dataset.displayMode = this.displayMode;
    this.viewer.dataset.displayMode = this.displayMode;
    this.webgl.domElement.hidden = this.displayMode === DISPLAY_MODES.FLAT;
    this.viewer.tabIndex = this.displayMode === DISPLAY_MODES.SPATIAL ? 0 : -1;
    this.viewer.setAttribute(
      'aria-label',
      this.displayMode === DISPLAY_MODES.SPATIAL
        ? `${this.method.label}, ${this.sample.id}, interactive 360-degree view`
        : `${this.method.label}, ${this.sample.id}, flat video`,
    );
    if (this.displayMode === DISPLAY_MODES.FLAT) {
      this.endActiveDrag();
    }
    this.updateOrientation();
  }

  setSyncEnabled(enabled) {
    this.syncEnabled = Boolean(enabled);
    if (this.element) {
      this.element.dataset.syncEnabled = String(this.syncEnabled);
    }
    this.applyGain();
  }

  setSelectedAudio(selected) {
    this.selectedAudio = Boolean(selected);
    if (this.element) {
      this.element.dataset.audioSelected = String(this.selectedAudio);
    }
    if (this.listenButton) {
      this.listenButton.setAttribute('aria-pressed', String(this.selectedAudio));
    }
    this.applyGain();
  }

  setSharedAudioState({ muted = this.sharedMuted, volume = this.sharedVolume }) {
    this.sharedMuted = Boolean(muted);
    this.sharedVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.applyGain();
  }

  setOrientation(orientation) {
    if (!orientation) {
      return;
    }
    this.orientation = applyDrag(
      {
        yaw: Number(orientation.yaw) || 0,
        pitch: Number(orientation.pitch) || 0,
      },
      0,
      0,
    );
    this.updateOrientation();
  }

  getOrientation() {
    return { ...this.orientation };
  }

  endActiveDrag() {
    if (this.dragPointerId === null) {
      return;
    }
    if (this.viewer?.hasPointerCapture(this.dragPointerId)) {
      this.viewer.releasePointerCapture(this.dragPointerId);
    }
    this.dragPointerId = null;
    this.lastPointer = null;
    delete this.viewer?.dataset.dragging;
  }

  async initializeAudio() {
    if (this.audioInitialization) {
      return this.audioInitialization;
    }

    this.audioInitialization = (async () => {
      if (!window.Omnitone?.createFOARenderer) {
        throw new Error('Omnitone is unavailable.');
      }

      const context = this.getAudioContext();
      this.audioContext = context;
      this.mediaSource = context.createMediaElementSource(this.video);
      this.foaRenderer = window.Omnitone.createFOARenderer(context, {
        channelMap: [0, 1, 2, 3],
        renderingMode: 'ambisonic',
      });
      await this.foaRenderer.initialize();

      if (this.disposed) {
        return;
      }

      this.outputGain = context.createGain();
      this.mediaSource.connect(this.foaRenderer.input);
      this.foaRenderer.output.connect(this.outputGain);
      this.outputGain.connect(context.destination);
      this.applyGain();
      this.updateOrientation();
    })();

    return this.audioInitialization;
  }

  async togglePlayback() {
    if (this.disposed || this.playButton.disabled) {
      return;
    }
    if (!this.video.paused) {
      this.pauseMedia();
      return;
    }

    this.playButton.disabled = true;
    this.setStatus('loading', 'Starting audio');
    try {
      await this.playMedia();
    } catch (error) {
      console.error(`[${this.method.id}] spatial playback failed`, error);
      this.fail(
        error instanceof Error
          ? `Spatial playback failed: ${error.message}`
          : 'Spatial playback could not start.',
      );
    } finally {
      if (!this.disposed && this.status.dataset.state !== 'error') {
        this.playButton.disabled = false;
      }
    }
  }

  async playMedia() {
    if (this.disposed || !this.isReady()) {
      return false;
    }
    await this.initializeAudio();
    await this.audioContext.resume();
    if (this.video.ended) {
      this.video.currentTime = 0;
    }
    await this.video.play();
    return true;
  }

  pauseMedia() {
    if (!this.disposed) {
      this.video.pause();
    }
  }

  stop() {
    if (this.disposed) {
      return;
    }
    this.video.pause();
    try {
      this.video.currentTime = 0;
    } catch {
      // Metadata may still be arriving; the ready handler will keep time at zero.
    }
    this.setStatus('ready', 'Ready');
    this.updateTimeline();
    this.dirty = true;
  }

  seek() {
    if (!Number.isFinite(this.video.duration)) {
      return;
    }
    this.seekTo((Number(this.seekInput.value) / SEEK_STEPS) * this.video.duration);
  }

  seekTo(seconds) {
    if (!this.canSeek()) {
      return false;
    }
    const target = Math.max(0, Math.min(this.video.duration, Number(seconds) || 0));
    this.video.currentTime = target;
    this.updateTimeline();
    this.dirty = true;
    return true;
  }

  getDuration() {
    return this.video?.duration ?? Number.NaN;
  }

  getCurrentTime() {
    return this.video?.currentTime ?? 0;
  }

  isReady() {
    return Boolean(
      !this.disposed
      && this.mediaReady
      && this.video
      && this.status?.dataset.state !== 'error'
    );
  }

  canSeek() {
    return this.seekReady;
  }

  updateSeekAvailability() {
    if (!this.video) {
      return;
    }
    const seekableEnd = this.video.seekable.length
      ? this.video.seekable.end(this.video.seekable.length - 1)
      : Number.NaN;
    this.seekReady = latchSeekReady(
      this.seekReady,
      this.video.duration,
      seekableEnd,
    );
    const seekDisabled = !this.seekReady;
    if (this.seekInput && this.seekInput.disabled !== seekDisabled) {
      this.seekInput.disabled = seekDisabled;
    }
  }

  isPaused() {
    return this.video?.paused ?? true;
  }

  updateTimeline() {
    const duration = this.video.duration;
    const currentTime = this.video.currentTime || 0;
    this.seekInput.value = Number.isFinite(duration) && duration > 0
      ? String(Math.round((currentTime / duration) * SEEK_STEPS))
      : '0';
    this.timeLabel.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.volume > 0 && this.muted) {
      this.muted = false;
      this.updateMuteButton();
    }
    this.applyGain();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.updateMuteButton();
    this.applyGain();
  }

  applyGain() {
    if (!this.outputGain || !this.audioContext) {
      return;
    }
    const target = effectiveOutputGain({
      muted: this.muted,
      selected: this.selectedAudio,
      sharedMuted: this.sharedMuted,
      sharedVolume: this.sharedVolume,
      syncEnabled: this.syncEnabled,
      volume: this.volume,
    });
    this.outputGain.gain.setTargetAtTime(target, this.audioContext.currentTime, 0.01);
  }

  updateMuteButton() {
    const label = this.muted ? 'Unmute' : 'Mute';
    this.muteButton.setAttribute('aria-label', label);
    this.muteButton.title = label;
    this.muteButton.replaceChildren(createIcon(this.muted ? 'volume-x' : 'volume-2'));
    window.lucide?.createIcons({ root: this.muteButton });
  }

  updatePlayButton(isPlaying, replay = false) {
    const label = isPlaying ? 'Pause' : replay ? 'Replay' : 'Play';
    const icon = isPlaying ? 'pause' : replay ? 'rotate-ccw' : 'play';
    this.playButton.setAttribute('aria-label', label);
    this.playButton.title = label;
    this.playButton.replaceChildren(createIcon(icon));
    window.lucide?.createIcons({ root: this.playButton });
  }

  async enterFullscreen() {
    try {
      await this.viewer.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen could not be opened.', error);
    }
  }

  debugState() {
    return {
      method: this.method.id,
      mediaReady: this.mediaReady,
      sample: this.sample.id,
      displayMode: this.displayMode,
      syncEnabled: this.syncEnabled,
      selectedAudio: this.selectedAudio,
      seekReady: this.seekReady,
      effectiveGain: effectiveOutputGain({
        muted: this.muted,
        selected: this.selectedAudio,
        sharedMuted: this.sharedMuted,
        sharedVolume: this.sharedVolume,
        syncEnabled: this.syncEnabled,
        volume: this.volume,
      }),
      yaw: this.orientation.yaw,
      pitch: this.orientation.pitch,
      audioRotation: this.viewer?.dataset.audioRotation ?? 'pending',
      paused: this.video?.paused ?? true,
      currentTime: this.video?.currentTime ?? 0,
      status: this.status?.dataset.state ?? 'unmounted',
    };
  }

  async dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.mediaReady = false;
    this.resolveReady?.(false);
    this.resolveReady = null;
    this.eventController.abort();
    this.removeFrameCallback?.();
    this.resizeObserver?.disconnect();

    this.endActiveDrag();

    this.video?.pause();
    this.mediaSource?.disconnect();
    this.foaRenderer?.output?.disconnect();
    this.outputGain?.disconnect();
    this.texture?.dispose();
    this.material?.dispose();
    this.geometry?.dispose();
    this.webgl?.dispose();
    this.webgl?.forceContextLoss();

    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
    }
    this.element?.remove();
  }
}
