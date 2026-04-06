export interface Point {
  x: number;
  y: number;
}

/**
 * Render text to an offscreen canvas, then sample points along the
 * filled pixel edges. Returns a fixed-length array of {x, y} points
 * normalized to 0..1 range (caller maps to viewport).
 */
export function sampleTextPoints(
  text: string,
  fontFamily: string,
  targetCount: number
): Point[] {
  const fontSize = 200;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Measure text dimensions
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize; // approximate

  // Size canvas to fit text with padding
  const padding = 20;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(textHeight + padding * 2);

  // Re-set font after canvas resize (resets context)
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, padding, padding);

  // Extract pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // Collect all filled pixels (alpha > 128)
  const filledPixels: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 128) {
        // Check if this pixel is on an edge (has a transparent neighbor)
        const isEdge =
          x === 0 ||
          x === width - 1 ||
          y === 0 ||
          y === height - 1 ||
          data[(y * width + (x - 1)) * 4 + 3] <= 128 ||
          data[(y * width + (x + 1)) * 4 + 3] <= 128 ||
          data[((y - 1) * width + x) * 4 + 3] <= 128 ||
          data[((y + 1) * width + x) * 4 + 3] <= 128;

        if (isEdge) {
          filledPixels.push({
            x: x / width,
            y: y / height,
          });
        }
      }
    }
  }

  // Downsample to target count using uniform spacing
  if (filledPixels.length === 0) {
    // Fallback: return evenly spaced points on a horizontal line
    return Array.from({ length: targetCount }, (_, i) => ({
      x: i / (targetCount - 1),
      y: 0.5,
    }));
  }

  // Sort by x then y for consistent ordering (left-to-right scan)
  filledPixels.sort((a, b) => a.x - b.x || a.y - b.y);

  const step = Math.max(1, Math.floor(filledPixels.length / targetCount));
  const sampled: Point[] = [];
  for (let i = 0; i < filledPixels.length && sampled.length < targetCount; i += step) {
    sampled.push(filledPixels[i]);
  }

  // Pad if we got fewer than targetCount
  while (sampled.length < targetCount) {
    sampled.push(sampled[sampled.length - 1]);
  }

  return sampled;
}

/**
 * Generate a flat horizontal line as an array of points.
 * All points share the same y (0.5 = vertical center).
 */
export function flatLinePoints(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i / (count - 1),
    y: 0.5,
  }));
}

/**
 * Generate a sine wave as an array of points.
 * frequency and amplitude control the wave shape.
 */
export function sineWavePoints(
  count: number,
  frequency: number,
  amplitude: number
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return {
      x: t,
      y: 0.5 + Math.sin(t * Math.PI * 2 * frequency) * amplitude,
    };
  });
}
