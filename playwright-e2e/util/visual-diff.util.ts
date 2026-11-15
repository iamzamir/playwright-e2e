// In-place visual diff highlighter.
//
// Detects the region(s) that genuinely differ between the expected (baseline)
// and actual screenshots, then draws a red rectangle around each differing
// region on full-colour copies of BOTH images. The change is highlighted in
// place on the expected and the actual snapshot (e.g. a missing power-bar chip
// is boxed on each), so there is no separate/third composite diff image.
//
// Differences are detected with an anti-aliasing-aware YIQ colour-distance
// comparison (the pixelmatch algorithm, reimplemented here), so scattered
// sub-pixel / anti-alias noise is ignored and only real UI changes are boxed.
//
// Reuses the PNG codec bundled with Playwright and carries its own comparison
// so no extra runtime dependency is required. `pixelmatch` is not resolvable
// from this package and recent Playwright builds dropped the internal
// third_party/pixelmatch.js path it used to be loaded from.

interface PngInstance {
  width: number;
  height: number;
  data: Buffer;
}

interface PngConstructor {
  new (options: { width: number; height: number }): PngInstance;
  sync: {
    read(buffer: Buffer): PngInstance;
    write(png: PngInstance): Buffer;
  };
}

const { PNG } = require('playwright-core/lib/utilsBundle') as { PNG: PngConstructor };

// Maximum possible YIQ colour delta between two pixels (pixelmatch constant).
const MAX_YIQ_DELTA = 35215;

function blendOntoWhite(channel: number, alpha: number): number {
  return 255 + (channel - 255) * alpha;
}

function rgb2y(r: number, g: number, b: number): number {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}

function rgb2i(r: number, g: number, b: number): number {
  return r * 0.59597799 - g * 0.27417610 - b * 0.32180189;
}

function rgb2q(r: number, g: number, b: number): number {
  return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
}

// Perceptual (YIQ) colour distance between two RGBA pixels. The sign encodes
// whether the second pixel lightens or darkens relative to the first, which the
// anti-aliasing detector relies on. `yOnly` returns the raw brightness delta.
function colorDelta(a: Buffer, b: Buffer, offsetA: number, offsetB: number, yOnly: boolean = false): number {
  let r1 = a[offsetA], g1 = a[offsetA + 1], b1 = a[offsetA + 2], alpha1 = a[offsetA + 3];
  let r2 = b[offsetB], g2 = b[offsetB + 1], b2 = b[offsetB + 2], alpha2 = b[offsetB + 3];

  if (alpha1 === alpha2 && r1 === r2 && g1 === g2 && b1 === b2) {
    return 0;
  }

  if (alpha1 < 255) {
    const scaled = alpha1 / 255;
    r1 = blendOntoWhite(r1, scaled);
    g1 = blendOntoWhite(g1, scaled);
    b1 = blendOntoWhite(b1, scaled);
  }

  if (alpha2 < 255) {
    const scaled = alpha2 / 255;
    r2 = blendOntoWhite(r2, scaled);
    g2 = blendOntoWhite(g2, scaled);
    b2 = blendOntoWhite(b2, scaled);
  }

  const y1 = rgb2y(r1, g1, b1);
  const y2 = rgb2y(r2, g2, b2);
  const y = y1 - y2;

  if (yOnly) {
    return y;
  }

  const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
  const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
  const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

  return y1 > y2 ? -delta : delta;
}

// True when a pixel has 3+ identical neighbours, i.e. it sits on a flat area
// rather than on an anti-aliased edge.
function hasManySiblings(img: Buffer, x1: number, y1: number, width: number, height: number): boolean {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const pos = (y1 * width + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

  for (let x = x0; x <= x2; x++) {
    for (let y = y0; y <= y2; y++) {
      if (x === x1 && y === y1) {
        continue;
      }
      const pos2 = (y * width + x) * 4;
      if (img[pos] === img[pos2]
        && img[pos + 1] === img[pos2 + 1]
        && img[pos + 2] === img[pos2 + 2]
        && img[pos + 3] === img[pos2 + 3]) {
        zeroes++;
      }
      if (zeroes > 2) {
        return true;
      }
    }
  }

  return false;
}

// A pixel is anti-aliased when it is both the darkest and brightest extreme
// among its neighbours and those extremes sit on flat areas in both images.
function isAntialiased(img: Buffer, other: Buffer, x1: number, y1: number, width: number, height: number): boolean {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const pos = (y1 * width + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  let min = 0;
  let max = 0;
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  for (let x = x0; x <= x2; x++) {
    for (let y = y0; y <= y2; y++) {
      if (x === x1 && y === y1) {
        continue;
      }

      const delta = colorDelta(img, img, pos, (y * width + x) * 4, true);

      if (delta === 0) {
        zeroes++;
        if (zeroes > 2) {
          return false;
        }
      } else if (delta < min) {
        min = delta;
        minX = x;
        minY = y;
      } else if (delta > max) {
        max = delta;
        maxX = x;
        maxY = y;
      }
    }
  }

  if (min === 0 || max === 0) {
    return false;
  }

  return (hasManySiblings(img, minX, minY, width, height) && hasManySiblings(other, minX, minY, width, height))
    || (hasManySiblings(img, maxX, maxY, width, height) && hasManySiblings(other, maxX, maxY, width, height));
}

// Marks differing pixels as opaque red in `mask` and returns the changed-pixel count.
// Bundled here so the framework needs no extra runtime dependency in CI.
function buildDiffMask(expected: Buffer, actual: Buffer, mask: Buffer, width: number, height: number, threshold: number): number {
  const maxDelta = MAX_YIQ_DELTA * threshold * threshold;
  let diffPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const delta = colorDelta(expected, actual, offset, offset);

      if (Math.abs(delta) <= maxDelta) {
        continue;
      }

      // Edge shimmer from font/GPU rasterisation differs between runs; ignoring
      // it keeps the highlight boxes on genuine UI changes.
      if (isAntialiased(expected, actual, x, y, width, height)
        || isAntialiased(actual, expected, x, y, width, height)) {
        continue;
      }

      mask[offset] = 255;
      mask[offset + 1] = 0;
      mask[offset + 2] = 0;
      mask[offset + 3] = 255;
      diffPixels++;
    }
  }

  return diffPixels;
}

export interface HighlightDiffOptions {
  // pixelmatch matching threshold (0..1); smaller is more sensitive.
  threshold?: number;
  // Grid cell size (px) used to cluster differing pixels into regions.
  cellSize?: number;
  // Minimum number of differing pixels a region must contain to be outlined
  // (filters out isolated noise).
  minRegionPixels?: number;
  // Thickness (px) of the red outline.
  outlineThickness?: number;
  // Padding (px) added around each detected region before drawing the outline.
  padding?: number;
  // Skip outlining a region whose bounding box covers at least this fraction of
  // the whole image (0..1). Prevents a single sprawling change from drawing a
  // near-full-page box around everything.
  maxRegionCoverage?: number;
}

export interface HighlightDiffPair {
  // Baseline screenshot with the differing region(s) boxed in red.
  expectedHighlighted: Buffer;
  // Actual screenshot with the same region(s) boxed in red.
  actualHighlighted: Buffer;
  // Standalone diff image with changed pixels emphasized and regions boxed.
  diffHighlighted: Buffer;
  diffPixels: number;
  totalPixels: number;
  // Number of regions actually outlined (after filtering).
  regionCount: number;
  // Padded bounding boxes of every outlined region (canvas pixel coordinates).
  // Exposed so callers can overlay text annotations at the right position.
  drawnRegions: Array<{ x0: number; y0: number; x1: number; y1: number }>;
}

interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixels: number;
}

// Crop an RGBA image to the top-left overlap region so mismatched dimensions can
// still be compared pixel-for-pixel.
function cropToOverlap(image: PngInstance, width: number, height: number): Buffer {
  if (image.width === width && image.height === height) {
    return image.data;
  }
  const cropped = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcStart = y * image.width * 4;
    image.data.copy(cropped, y * width * 4, srcStart, srcStart + width * 4);
  }
  return cropped;
}

export async function generateHighlightedDiffPair(expectedBuffer: Buffer, actualBuffer: Buffer, options: HighlightDiffOptions = {}): Promise<HighlightDiffPair | null> {
  const threshold = options.threshold ?? 0.1;
  const cellSize = options.cellSize ?? 16;
  const minRegionPixels = options.minRegionPixels ?? 12;
  const outlineThickness = options.outlineThickness ?? 3;
  const padding = options.padding ?? 4;
  const maxRegionCoverage = options.maxRegionCoverage ?? 0.98;

  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);

  // Compare the overlapping region so mismatched dimensions still yield a useful diff.
  const width = Math.min(expected.width, actual.width);
  const height = Math.min(expected.height, actual.height);
  if (width === 0 || height === 0) {
    return null;
  }

  const expectedData = cropToOverlap(expected, width, height);
  const actualData = cropToOverlap(actual, width, height);

  // Anti-aliasing-aware diff mask: differing pixels are marked on a transparent
  // background so only genuine changes are considered.
  const mask = Buffer.alloc(width * height * 4);
  const diffPixels = buildDiffMask(expectedData, actualData, mask, width, height, threshold);

  // Bucket differing pixels into a coarse cell grid, then merge adjacent dirty
  // cells into regions. This groups nearby changes into cohesive boxes and keeps
  // the work cheap regardless of image size.
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cellCounts = new Int32Array(cols * rows);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // diffMask leaves matching pixels fully transparent (alpha 0).
      if (mask[(y * width + x) * 4 + 3] !== 0) {
        cellCounts[Math.floor(y / cellSize) * cols + Math.floor(x / cellSize)]++;
      }
    }
  }

  // Connected-component labelling over the cell grid (8-connectivity).
  const visited = new Uint8Array(cols * rows);
  const regions: Region[] = [];
  const stack: number[] = [];

  for (let start = 0; start < cellCounts.length; start++) {
    if (cellCounts[start] === 0 || visited[start]) {
      continue;
    }

    stack.length = 0;
    stack.push(start);
    visited[start] = 1;

    let minCol = cols;
    let minRow = rows;
    let maxCol = -1;
    let maxRow = -1;
    let pixels = 0;

    while (stack.length > 0) {
      const cell = stack.pop() as number;
      const col = cell % cols;
      const row = (cell - col) / cols;

      pixels += cellCounts[cell];
      if (col < minCol) minCol = col;
      if (row < minRow) minRow = row;
      if (col > maxCol) maxCol = col;
      if (row > maxRow) maxRow = row;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nc = col + dx;
          const nr = row + dy;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (!visited[ni] && cellCounts[ni] > 0) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }
    }

    if (pixels < minRegionPixels) {
      continue;
    }

    regions.push({
      minX: minCol * cellSize,
      minY: minRow * cellSize,
      maxX: Math.min(width - 1, (maxCol + 1) * cellSize - 1),
      maxY: Math.min(height - 1, (maxRow + 1) * cellSize - 1),
      pixels,
    });
  }

  // Compose output: draw the SAME red rectangle(s) around each differing region
  // on full-colour copies of BOTH the expected and the actual screenshots, so
  // the change is highlighted in place on each image (no separate diff image).
  const expectedOut = new PNG({ width, height });
  expectedData.copy(expectedOut.data);
  const actualOut = new PNG({ width, height });
  actualData.copy(actualOut.data);
  const diffOut = new PNG({ width, height });

  // White canvas with changed pixels painted red for easy inspection in reports.
  for (let i = 0; i < diffOut.data.length; i += 4) {
    diffOut.data[i] = 255;
    diffOut.data[i + 1] = 255;
    diffOut.data[i + 2] = 255;
    diffOut.data[i + 3] = 255;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (mask[idx + 3] !== 0) {
        diffOut.data[idx] = 229;
        diffOut.data[idx + 1] = 57;
        diffOut.data[idx + 2] = 53;
        diffOut.data[idx + 3] = 255;
      }
    }
  }

  const totalArea = width * height;
  let regionCount = 0;
  const drawnRegions: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  for (const region of regions) {
    // Skip a region that sprawls across essentially the whole image; a
    // near-total box adds no localisation value.
    const regionArea = (region.maxX - region.minX + 1) * (region.maxY - region.minY + 1);
    if (regionArea >= totalArea * maxRegionCoverage) {
      continue;
    }
    const x0 = Math.max(0, region.minX - padding);
    const y0 = Math.max(0, region.minY - padding);
    const x1 = Math.min(width - 1, region.maxX + padding);
    const y1 = Math.min(height - 1, region.maxY + padding);
    drawOutline(expectedOut.data, width, height, x0, y0, x1, y1, outlineThickness);
    drawOutline(actualOut.data, width, height, x0, y0, x1, y1, outlineThickness);
    drawOutline(diffOut.data, width, height, x0, y0, x1, y1, outlineThickness);
    drawnRegions.push({ x0, y0, x1, y1 });
    regionCount++;
  }

  return {
    expectedHighlighted: PNG.sync.write(expectedOut),
    actualHighlighted: PNG.sync.write(actualOut),
    diffHighlighted: PNG.sync.write(diffOut),
    diffPixels,
    totalPixels: width * height,
    regionCount,
    drawnRegions,
  };
}

// Paint a hollow red rounded rectangle (border only) of the given thickness.
function drawOutline(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number, thickness: number): void {
  const setPixel = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    data[i] = 255;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  };

  const widthPx = x1 - x0 + 1;
  const heightPx = y1 - y0 + 1;
  const radius = Math.max(2, Math.min(8, Math.floor(Math.min(widthPx, heightPx) / 6)));

  const drawQuarterArc = (centerX: number, centerY: number, startAngle: number, endAngle: number, inset: number): void => {
    const outerRadius = radius - inset;
    const innerRadius = Math.max(0, outerRadius - thickness + 1);
    for (let deg = startAngle; deg <= endAngle; deg++) {
      const radians = (deg * Math.PI) / 180;
      for (let r = innerRadius; r <= outerRadius; r++) {
        const x = Math.round(centerX + Math.cos(radians) * r);
        const y = Math.round(centerY + Math.sin(radians) * r);
        setPixel(x, y);
      }
    }
  };

  for (let t = 0; t < thickness; t++) {
    const top = y0 + t;
    const bottom = y1 - t;
    const left = x0 + t;
    const right = x1 - t;
    if (top > bottom || left > right) break;

    const innerLeft = left + radius;
    const innerRight = right - radius;
    const innerTop = top + radius;
    const innerBottom = bottom - radius;

    for (let x = innerLeft; x <= innerRight; x++) {
      setPixel(x, top);
      setPixel(x, bottom);
    }
    for (let y = innerTop; y <= innerBottom; y++) {
      setPixel(left, y);
      setPixel(right, y);
    }

    drawQuarterArc(left + radius, top + radius, 180, 270, t);
    drawQuarterArc(right - radius, top + radius, 270, 360, t);
    drawQuarterArc(left + radius, bottom - radius, 90, 180, t);
    drawQuarterArc(right - radius, bottom - radius, 0, 90, t);
  }
}

/**
 * Composite a region image onto a full-page image at the given document-coordinate
 * offset (x, y). Used to construct a "full-page expected" image for area-comparison
 * failures: only the changed region differs, so the highlighter boxes it precisely.
 */
export function compositeRegionOntoFullPage(
  fullPageBuffer: Buffer,
  regionBuffer: Buffer,
  x: number,
  y: number,
): Buffer {
  const fullPage = PNG.sync.read(fullPageBuffer);
  const region = PNG.sync.read(regionBuffer);

  const result = new PNG({ width: fullPage.width, height: fullPage.height });
  fullPage.data.copy(result.data);

  const startX = Math.max(0, x);
  const startY = Math.max(0, y);
  const srcOffsetX = x < 0 ? -x : 0;
  const srcOffsetY = y < 0 ? -y : 0;
  const pasteW = Math.min(region.width - srcOffsetX, fullPage.width - startX);
  const pasteH = Math.min(region.height - srcOffsetY, fullPage.height - startY);

  if (pasteW <= 0 || pasteH <= 0) {
    return fullPageBuffer;
  }

  for (let row = 0; row < pasteH; row++) {
    const srcRowStart = ((srcOffsetY + row) * region.width + srcOffsetX) * 4;
    const dstRowStart = ((startY + row) * fullPage.width + startX) * 4;
    region.data.copy(result.data, dstRowStart, srcRowStart, srcRowStart + pasteW * 4);
  }

  return PNG.sync.write(result);
}
