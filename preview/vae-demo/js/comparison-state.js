export const DISPLAY_MODES = Object.freeze({
  SPATIAL: 'spatial',
  FLAT: 'flat',
});

export const DRIFT_THRESHOLD_SECONDS = 0.08;
const SEEK_END_TOLERANCE_SECONDS = 0.05;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function resolveSharedDuration(durations) {
  const finite = durations.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  return finite.length ? Math.min(...finite) : Number.NaN;
}

export function isFullySeekable(duration, seekableEnd) {
  return Number.isFinite(duration)
    && duration > 0
    && Number.isFinite(seekableEnd)
    && seekableEnd >= duration - SEEK_END_TOLERANCE_SECONDS;
}

export function latchSeekReady(wasReady, duration, seekableEnd) {
  return Boolean(wasReady) || isFullySeekable(duration, seekableEnd);
}

export function latchMediaReady(wasReady, readyState) {
  return Boolean(wasReady) || Number(readyState) >= 2;
}

export function resolveSeekControlValue({
  currentTime,
  duration,
  isScrubbing,
  steps = 1000,
  userValue,
}) {
  const safeSteps = Number.isFinite(steps) && steps > 0 ? steps : 1000;
  if (isScrubbing) {
    return String(Math.round(clamp01(Number(userValue) / safeSteps) * safeSteps));
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return '0';
  }
  return String(Math.round(clamp01(currentTime / duration) * safeSteps));
}

export function shouldCorrectDrift(masterTime, followerTime) {
  return Number.isFinite(masterTime)
    && Number.isFinite(followerTime)
    && Math.abs(masterTime - followerTime) > DRIFT_THRESHOLD_SECONDS;
}

export function effectiveOutputGain({
  muted,
  selected,
  sharedMuted,
  sharedVolume,
  syncEnabled,
  volume,
}) {
  if (syncEnabled) {
    return selected && !sharedMuted ? clamp01(sharedVolume) : 0;
  }
  return muted ? 0 : clamp01(volume);
}
