type VisualDiffConfig = {
  threshold: number;
  maxDiffPixelRatio: number;
  maxDiffPixels?: number;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const VISUAL_DIFF_DEFAULTS: VisualDiffConfig = {
  threshold: parseNumber(process.env.VISUAL_THRESHOLD, 0.1),
  maxDiffPixelRatio: parseNumber(process.env.VISUAL_MAX_DIFF_PIXEL_RATIO, 0.02),
  maxDiffPixels: parseOptionalNumber(process.env.VISUAL_MAX_DIFF_PIXELS),
};
