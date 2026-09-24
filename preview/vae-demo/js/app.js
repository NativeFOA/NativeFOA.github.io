import {
  DEFAULT_SAMPLE_ID,
  METHODS,
  SAMPLES,
  getSample,
} from './demo-data.js?v=nativefoa-7';
import { ComparisonCoordinator } from './comparison-coordinator.js?v=nativefoa-7';
import {
  DISPLAY_MODES,
  resolveSeekControlValue,
} from './comparison-state.js';
import { FrameScheduler } from './frame-scheduler.js';
import { moveTabIndex, resolveInitialSampleId } from './sample-state.js';
import { SpatialPlayer } from './spatial-player.js?v=nativefoa-7';
import { formatTime } from './view-math.js';

const tabsElement = document.querySelector('#sample-tabs');
const gridElement = document.querySelector('#player-grid');
const selectedSampleElement = document.querySelector('#selected-sample');
const globalStatusElement = document.querySelector('#global-status');
const modeButtons = [...document.querySelectorAll('[data-display-mode]')];
const syncToggle = document.querySelector('#sync-toggle');
const sharedTransport = document.querySelector('#shared-transport');
const sharedPlayButton = document.querySelector('#shared-play');
const sharedStopButton = document.querySelector('#shared-stop');
const sharedMuteButton = document.querySelector('#shared-mute');
const sharedSeekInput = document.querySelector('#shared-seek');
const sharedVolumeInput = document.querySelector('#shared-volume');
const sharedTimeElement = document.querySelector('#shared-time');

const scheduler = new FrameScheduler();
const sampleIds = SAMPLES.map(({ id }) => id);
let activeSampleId = resolveInitialSampleId(
  window.location.hash,
  sampleIds,
  DEFAULT_SAMPLE_ID,
);
let activePlayers = [];
let audioContext = null;
let switchGeneration = 0;
let sharedSeekActive = false;

const coordinator = new ComparisonCoordinator({
  scheduler,
  onStateChange: renderComparisonState,
});

function setButtonIcon(button, { icon, label }) {
  if (button.dataset.icon === icon && button.getAttribute('aria-label') === label) {
    return;
  }
  button.dataset.icon = icon;
  button.setAttribute('aria-label', label);
  button.title = label;
  const iconElement = document.createElement('i');
  iconElement.dataset.lucide = icon;
  iconElement.setAttribute('aria-hidden', 'true');
  button.replaceChildren(iconElement);
  window.lucide?.createIcons({ root: button });
}

function renderComparisonState(state) {
  for (const button of modeButtons) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.displayMode === state.displayMode),
    );
  }

  syncToggle.checked = state.syncEnabled;
  sharedTransport.hidden = !state.syncEnabled;
  const transportReady = state.syncEnabled && state.readyCount > 0;
  const durationReady = Number.isFinite(state.duration) && state.duration > 0;
  sharedPlayButton.disabled = !transportReady;
  sharedStopButton.disabled = !transportReady;
  sharedMuteButton.disabled = !transportReady;
  const seekDisabled = !transportReady || !durationReady || !state.seekReady;
  if (sharedSeekInput.disabled !== seekDisabled) {
    sharedSeekInput.disabled = seekDisabled;
  }
  sharedVolumeInput.disabled = !transportReady;
  sharedVolumeInput.value = String(state.sharedVolume);
  sharedSeekInput.value = resolveSeekControlValue({
    currentTime: state.currentTime,
    duration: state.duration,
    isScrubbing: sharedSeekActive,
    steps: 1000,
    userValue: sharedSeekInput.value,
  });
  sharedTimeElement.textContent =
    `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;

  setButtonIcon(sharedPlayButton, {
    icon: state.playing ? 'pause' : 'play',
    label: state.playing ? 'Pause all' : 'Play all',
  });
  setButtonIcon(sharedMuteButton, {
    icon: state.sharedMuted ? 'volume-x' : 'volume-2',
    label: state.sharedMuted ? 'Unmute' : 'Mute',
  });
}

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext({ latencyHint: 'interactive' });
  }
  return audioContext;
}

function featureError() {
  if (!window.WebGLRenderingContext) {
    return 'WebGL is unavailable in this browser.';
  }
  if (!(window.AudioContext || window.webkitAudioContext)) {
    return 'Web Audio is unavailable in this browser.';
  }
  if (!window.Omnitone?.createFOARenderer) {
    return 'The local Omnitone renderer could not be loaded.';
  }
  return null;
}

function renderTabs() {
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.className = 'sample-tab';
    button.type = 'button';
    button.role = 'tab';
    button.dataset.sampleId = sample.id;
    button.setAttribute('aria-selected', String(sample.id === activeSampleId));
    button.tabIndex = sample.id === activeSampleId ? 0 : -1;
    button.innerHTML = `
      <span class="sample-tab__number">${sample.number}</span>
      <span class="sample-tab__id" translate="no">${sample.id}</span>
    `;
    button.addEventListener('click', () => switchSample(sample.id));
    button.addEventListener('keydown', handleTabKeydown);
    tabsElement.append(button);
  }
}

function handleTabKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const buttons = [...tabsElement.querySelectorAll('.sample-tab')];
  const currentIndex = buttons.indexOf(event.currentTarget);
  let nextIndex = currentIndex;
  if (event.key === 'ArrowLeft') {
    nextIndex = moveTabIndex(currentIndex, -1, buttons.length);
  } else if (event.key === 'ArrowRight') {
    nextIndex = moveTabIndex(currentIndex, 1, buttons.length);
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = buttons.length - 1;
  }
  buttons[nextIndex].focus();
  buttons[nextIndex].click();
}

function updateTabs(sampleId, disabled = false) {
  for (const button of tabsElement.querySelectorAll('.sample-tab')) {
    const selected = button.dataset.sampleId === sampleId;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.disabled = disabled;
  }
}

async function switchSample(sampleId, { initial = false } = {}) {
  if ((!initial && sampleId === activeSampleId) || !getSample(sampleId)) {
    return;
  }

  const generation = ++switchGeneration;
  activeSampleId = sampleId;
  updateTabs(sampleId, true);
  globalStatusElement.textContent = 'Loading five energy-overlay players…';

  const previousPlayers = activePlayers;
  activePlayers = [];
  coordinator.attachPlayers([]);
  await Promise.all(previousPlayers.map((player) => player.dispose()));
  if (generation !== switchGeneration) {
    return;
  }

  const sample = getSample(sampleId);
  gridElement.replaceChildren();
  selectedSampleElement.textContent = `Sample ${sample.number} · ${sample.id}`;

  try {
    activePlayers = METHODS.map((method) =>
      new SpatialPlayer({
        getAudioContext,
        mediaPath: sample.media[method.id],
        method,
        sample,
        scheduler,
      }).mount(gridElement),
    );
    coordinator.attachPlayers(activePlayers);
  } catch (error) {
    console.error('Player setup failed', error);
    globalStatusElement.textContent =
      error instanceof Error ? error.message : 'The comparison players could not be created.';
    updateTabs(sampleId, false);
    return;
  }

  window.history.replaceState(null, '', `#sample=${encodeURIComponent(sampleId)}`);
  const readiness = await Promise.all(activePlayers.map((player) => player.ready));
  if (generation !== switchGeneration) {
    return;
  }
  const readyCount = readiness.filter(Boolean).length;
  coordinator.attachPlayers(activePlayers);
  globalStatusElement.textContent =
    readyCount === METHODS.length
      ? ''
      : `${readyCount} of ${METHODS.length} players are ready. Use Chromium for four-channel WebM.`;
  updateTabs(sampleId, false);
}

async function teardown() {
  ++switchGeneration;
  const players = activePlayers;
  activePlayers = [];
  await Promise.all(players.map((player) => player.dispose()));
  coordinator.dispose();
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
  }
}

document.addEventListener('visibilitychange', () => {
  scheduler.setPaused(document.hidden);
});

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    coordinator.setDisplayMode(button.dataset.displayMode);
  });
}

syncToggle.addEventListener('change', () => {
  coordinator.setSyncEnabled(syncToggle.checked);
});

sharedPlayButton.addEventListener('click', () => {
  void coordinator.togglePlayback();
});

sharedStopButton.addEventListener('click', () => coordinator.stop());
sharedMuteButton.addEventListener('click', () => coordinator.toggleMute());
function seekFromSharedControl() {
  coordinator.seekRatio(Number(sharedSeekInput.value) / 1000);
}

function endSharedSeek() {
  if (!sharedSeekActive) {
    return;
  }
  sharedSeekActive = false;
  seekFromSharedControl();
}

sharedSeekInput.addEventListener('pointerdown', () => {
  sharedSeekActive = true;
});
sharedSeekInput.addEventListener('input', seekFromSharedControl);
sharedSeekInput.addEventListener('pointerup', endSharedSeek);
sharedSeekInput.addEventListener('pointercancel', endSharedSeek);
sharedSeekInput.addEventListener('blur', endSharedSeek);
sharedVolumeInput.addEventListener('input', () => {
  coordinator.setVolume(Number(sharedVolumeInput.value));
});

window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    void teardown();
  }
});

window.__FOA_DEMO__ = {
  getDebugState() {
    const comparison = coordinator.snapshot();
    return {
      activeSampleId,
      comparison,
      playerCount: activePlayers.length,
      players: activePlayers.map((player) => player.debugState()),
    };
  },
  selectMethod: (methodId) => coordinator.selectMethod(methodId),
  setDisplayMode: (mode) => coordinator.setDisplayMode(mode),
  setSyncEnabled: (enabled) => coordinator.setSyncEnabled(enabled),
  switchSample,
};

renderTabs();
window.lucide?.createIcons();
coordinator.setSyncEnabled(true);
renderComparisonState(coordinator.snapshot());

const unsupported = featureError();
if (unsupported) {
  globalStatusElement.textContent = unsupported;
  updateTabs(activeSampleId, false);
} else {
  void switchSample(activeSampleId, { initial: true });
}
