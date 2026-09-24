export const DRAG_SENSITIVITY = 0.005;
export const MAX_PITCH = Math.PI / 2 - 0.05;
export const PANORAMA_FRONT_ROTATION_Y = -Math.PI / 2;

export function clampPitch(pitch) {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
}

export function applyDrag(
  orientation,
  deltaX,
  deltaY,
  sensitivity = DRAG_SENSITIVITY,
) {
  return {
    yaw: orientation.yaw + deltaX * sensitivity,
    pitch: clampPitch(orientation.pitch + deltaY * sensitivity),
  };
}

export function resetView() {
  return { yaw: 0, pitch: 0 };
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return '--:--';
  }

  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
