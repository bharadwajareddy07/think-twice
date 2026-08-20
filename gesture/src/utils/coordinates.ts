export interface Point {
  x: number;
  y: number;
}

export function mapNormalizedToCanvas(
  normalized: Point,
  canvasWidth: number,
  canvasHeight: number,
  mirrored: boolean = true
): Point {
  // Normalized coordinates from MediaPipe: x in [0, 1], y in [0, 1]
  // In mirrored mode: x = 1 - normalized.x so moving hand right moves player right on screen
  const x = mirrored ? (1 - normalized.x) : normalized.x;
  const y = normalized.y;

  return {
    x: Math.max(0, Math.min(canvasWidth, x * canvasWidth)),
    y: Math.max(0, Math.min(canvasHeight, y * canvasHeight)),
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}
