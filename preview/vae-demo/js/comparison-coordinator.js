import {
  DISPLAY_MODES,
  resolveSharedDuration,
  shouldCorrectDrift,
} from './comparison-state.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export class ComparisonCoordinator {
  constructor({ scheduler, onStateChange = () => {} }) {
    this.scheduler = scheduler;
    this.onStateChange = onStateChange;
    this.players = [];
    this.displayMode = DISPLAY_MODES.SPATIAL;
    this.syncEnabled = false;
    this.selectedMethod = 'gt';
    this.sharedVolume = 0.85;
    this.sharedMuted = false;
    this.playing = false;
    this.orientation = { yaw: 0, pitch: 0 };
    this.removeFrameCallback = scheduler.add(() => this.syncFrame());
  }

  attachPlayers(players) {
    this.players = [...players];
    this.ensureAvailableSelection();

    for (const player of this.players) {
      player.setInteractionHandlers({
        onOrientation: (source, orientation) => {
          this.handleOrientation(source, orientation);
        },
        onSelect: (source) => this.selectMethod(source.method.id),
      });
      player.setDisplayMode(this.displayMode);
      player.setSyncEnabled(this.syncEnabled);
      player.setSharedAudioState({
        muted: this.sharedMuted,
        volume: this.sharedVolume,
      });
      player.setSelectedAudio(player.method.id === this.selectedMethod);
      if (this.syncEnabled && this.displayMode === DISPLAY_MODES.SPATIAL) {
        player.setOrientation(this.orientation);
      }
    }

    this.playing = false;
    this.notify();
  }

  setDisplayMode(mode) {
    const nextMode = mode === DISPLAY_MODES.FLAT
      ? DISPLAY_MODES.FLAT
      : DISPLAY_MODES.SPATIAL;
    if (nextMode === this.displayMode) {
      return;
    }
    this.displayMode = nextMode;
    for (const player of this.players) {
      player.setDisplayMode(nextMode);
      if (this.syncEnabled && nextMode === DISPLAY_MODES.SPATIAL) {
        player.setOrientation(this.orientation);
      }
    }
    this.notify();
  }

  setSyncEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.syncEnabled) {
      return;
    }
    this.syncEnabled = nextEnabled;
    this.ensureAvailableSelection();
    for (const player of this.players) {
      player.setSyncEnabled(nextEnabled);
      player.setSelectedAudio(player.method.id === this.selectedMethod);
      player.setSharedAudioState({
        muted: this.sharedMuted,
        volume: this.sharedVolume,
      });
      if (nextEnabled && this.displayMode === DISPLAY_MODES.SPATIAL) {
        player.setOrientation(this.orientation);
      }
    }
    this.playing = nextEnabled ? !this.masterPlayer()?.isPaused?.() : false;
    this.notify();
  }

  selectMethod(methodId) {
    const requested = this.players.find(
      (player) => player.method.id === methodId && player.isReady(),
    );
    const selected = requested ?? this.readyPlayers()[0];
    if (!selected || selected.method.id === this.selectedMethod) {
      return;
    }
    this.selectedMethod = selected.method.id;
    for (const player of this.players) {
      player.setSelectedAudio(player.method.id === this.selectedMethod);
    }
    this.notify();
  }

  handleOrientation(_sourcePlayer, orientation) {
    if (!this.syncEnabled || this.displayMode !== DISPLAY_MODES.SPATIAL) {
      return;
    }
    this.orientation = {
      yaw: Number(orientation.yaw) || 0,
      pitch: Number(orientation.pitch) || 0,
    };
    for (const player of this.players) {
      player.setOrientation(this.orientation);
    }
    this.notify();
  }

  async togglePlayback() {
    if (!this.syncEnabled) {
      return;
    }
    const ready = this.readyPlayers();
    if (!ready.length) {
      return;
    }
    if (this.playing) {
      for (const player of ready) {
        player.pauseMedia();
      }
      this.playing = false;
    } else {
      await Promise.allSettled(ready.map((player) => player.playMedia()));
      this.playing = ready.some((player) => !player.isPaused?.());
    }
    this.notify();
  }

  stop() {
    if (!this.syncEnabled) {
      return;
    }
    for (const player of this.readyPlayers()) {
      player.stop();
    }
    this.playing = false;
    this.notify();
  }

  seekRatio(ratio) {
    if (!this.syncEnabled || !this.sharedSeekReady()) {
      return;
    }
    const duration = this.sharedDuration();
    if (!Number.isFinite(duration)) {
      return;
    }
    const target = clamp01(ratio) * duration;
    for (const player of this.readyPlayers()) {
      player.seekTo(target);
    }
    this.notify();
  }

  toggleMute() {
    this.sharedMuted = !this.sharedMuted;
    this.applySharedAudioState();
    this.notify();
  }

  setVolume(volume) {
    this.sharedVolume = clamp01(volume);
    if (this.sharedVolume > 0) {
      this.sharedMuted = false;
    }
    this.applySharedAudioState();
    this.notify();
  }

  syncFrame() {
    if (!this.syncEnabled) {
      return;
    }
    const ready = this.readyPlayers();
    const playing = ready.filter((player) => !player.isPaused?.());
    const master = this.masterPlayer();
    if (!master) {
      this.playing = false;
      this.notify();
      return;
    }
    const selected = ready.find((player) => player.method.id === this.selectedMethod);
    if (playing.length && selected?.isPaused?.()) {
      this.selectMethod(playing[0].method.id);
    }
    const masterTime = master.getCurrentTime();
    for (const player of playing) {
      if (
        player !== master
        && shouldCorrectDrift(masterTime, player.getCurrentTime())
      ) {
        player.seekTo(masterTime);
      }
    }
    this.playing = playing.length > 0;
    this.notify();
  }

  snapshot() {
    const master = this.masterPlayer();
    return {
      currentTime: master?.getCurrentTime() ?? 0,
      displayMode: this.displayMode,
      duration: this.sharedDuration(),
      orientation: { ...this.orientation },
      playing: this.playing,
      readyCount: this.readyPlayers().length,
      seekReady: this.sharedSeekReady(),
      selectedMethod: this.selectedMethod,
      sharedMuted: this.sharedMuted,
      sharedVolume: this.sharedVolume,
      syncEnabled: this.syncEnabled,
    };
  }

  dispose() {
    this.removeFrameCallback?.();
    this.removeFrameCallback = null;
    for (const player of this.players) {
      player.setInteractionHandlers({});
    }
    this.players = [];
  }

  readyPlayers() {
    return this.players.filter((player) => player.isReady());
  }

  masterPlayer() {
    const ready = this.readyPlayers();
    const playing = ready.filter((player) => !player.isPaused?.());
    return playing.find((player) => player.method.id === 'gt')
      ?? playing[0]
      ?? ready.find((player) => player.method.id === 'gt')
      ?? ready[0]
      ?? null;
  }

  sharedDuration() {
    return resolveSharedDuration(
      this.readyPlayers().map((player) => player.getDuration()),
    );
  }

  sharedSeekReady() {
    const ready = this.readyPlayers();
    return ready.length > 0 && ready.every((player) => player.canSeek());
  }

  ensureAvailableSelection() {
    const ready = this.readyPlayers();
    if (!ready.length) {
      return;
    }
    const selectedIsReady = ready.some(
      (player) => player.method.id === this.selectedMethod,
    );
    if (!selectedIsReady) {
      this.selectedMethod = ready[0].method.id;
    }
  }

  applySharedAudioState() {
    for (const player of this.players) {
      player.setSharedAudioState({
        muted: this.sharedMuted,
        volume: this.sharedVolume,
      });
    }
  }

  notify() {
    this.onStateChange(this.snapshot());
  }
}
