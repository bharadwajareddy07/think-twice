export interface Position {
  x: number;
  y: number;
}

export class FingerSmoother {
  private smoothed: Position | null = null;
  private velocity: Position = { x: 0, y: 0 };
  private lastTime: number = performance.now();
  
  // Smoothing factor alpha: lower = smoother, higher = faster response
  private baseAlpha: number;
  private velocityScale: number;

  constructor(baseAlpha: number = 0.3, velocityScale: number = 0.5) {
    this.baseAlpha = baseAlpha;
    this.velocityScale = velocityScale;
  }

  public update(rawPos: Position, currentTime: number = performance.now()): Position {
    if (!this.smoothed) {
      this.smoothed = { ...rawPos };
      this.lastTime = currentTime;
      return { ...this.smoothed };
    }

    const dt = Math.max(0.001, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // Calculate raw distance moved
    const dx = rawPos.x - this.smoothed.x;
    const dy = rawPos.y - this.smoothed.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Adaptive alpha based on movement speed: faster hand movement lowers smoothing to reduce lag
    const speed = dist / dt;
    const adaptiveAlpha = Math.min(0.85, Math.max(this.baseAlpha, this.baseAlpha + speed * this.velocityScale));

    // Exponential smoothing
    this.smoothed.x += dx * adaptiveAlpha;
    this.smoothed.y += dy * adaptiveAlpha;

    return { ...this.smoothed };
  }

  public reset(): void {
    this.smoothed = null;
    this.velocity = { x: 0, y: 0 };
    this.lastTime = performance.now();
  }

  public setParameters(baseAlpha: number, velocityScale: number): void {
    this.baseAlpha = baseAlpha;
    this.velocityScale = velocityScale;
  }
}
