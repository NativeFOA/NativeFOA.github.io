export function resolveInitialSampleId(hash, sampleIds, defaultSampleId) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  const requested = params.get('sample');
  return requested && sampleIds.includes(requested) ? requested : defaultSampleId;
}

export function moveTabIndex(currentIndex, delta, itemCount) {
  if (itemCount <= 0) {
    return -1;
  }

  return (currentIndex + delta + itemCount) % itemCount;
}
