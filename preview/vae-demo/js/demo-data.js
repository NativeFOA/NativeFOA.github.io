export const METHODS = Object.freeze([
  Object.freeze({ id: 'gt', label: 'Ground Truth', shortLabel: 'GT' }),
  Object.freeze({ id: 'omniaudio', label: 'OmniAudio', shortLabel: 'Omni' }),
  Object.freeze({
    id: 'sao2',
    label: 'Stable Audio Open 2',
    shortLabel: 'SAO2',
  }),
  Object.freeze({
    id: 'sao-wy-zx',
    label: 'SAO WY-ZX',
    shortLabel: 'WY-ZX',
  }),
  Object.freeze({
    id: 'proposed-79515',
    label: 'Proposed (step 1M)',
    shortLabel: 'Proposed',
  }),
]);

const SAMPLE_IDS = [
  '530swnPWJrQ_17',
  '530swnPWJrQ_5',
  '7ZVYcIsEeHo_130',
  'RbFEpkuFCjI_18',
  'RpNrYMA2y6c_110',
  'glZ5cH82ycE_210',
  'nagycDdW04w_10.0',
  'p5Ady9RJyhU_90',
  'u-Hpf2_wzB8_390',
  'voice_o1_ambix',
];

export const SAMPLES = Object.freeze(
  SAMPLE_IDS.map((id, index) =>
    Object.freeze({
      id,
      number: String(index + 1).padStart(2, '0'),
      media: Object.freeze({
        gt: `energy-overlay-sparta/gt/${id}.webm`,
        omniaudio: `energy-overlay-sparta/omniaudio/${id}.webm`,
        sao2: `energy-overlay-sparta/sao2/${id}.webm`,
        'sao-wy-zx': `energy-overlay-sparta/sao-wy-zx/${id}.webm`,
        'proposed-79515': `energy-overlay-sparta/proposed-79515/${id}.webm`,
      }),
    }),
  ),
);

export const DEFAULT_SAMPLE_ID = '530swnPWJrQ_17';

export function getSample(sampleId) {
  return SAMPLES.find(({ id }) => id === sampleId) ?? null;
}
