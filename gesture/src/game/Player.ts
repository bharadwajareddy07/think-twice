export interface TrailPoint {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

export class Player {
  public x: number;
  public y: number;
  public radius: number = 22;
  public targetX: number;
  public targetY: number;
  public speedMultiplier: number = 1.0;
  public speedBoostTimer: number = 0;
  public hasShield: boolean = false;
  public shieldHitsRemaining: number = 0;
  
  public trail: TrailPoint[] = [];
  private maxTrailLength: number = 18;
  private glowPulse: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.targetY = startY;
  }

  public setTargetPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public update(dt: number): void {
    this.glowPulse += dt * 4;

    // Smooth movement towards target fingertip position
    const lerpFactor = Math.min(1.0, (14 * this.speedMultiplier) * dt);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;

    // Update speed boost timer
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) {
        this.speedMultiplier = 1.0;
      }
    }

    // Add trail point
    const activeColor = this.speedBoostTimer > 0 
      ? '#3b82f6' 
      : this.hasShield 
      ? '#a855f7' 
      : '#00f0ff';

    this.trail.unshift({
      x: this.x,
      y: this.y,
      radius: this.radius * (0.8 + Math.sin(this.glowPulse) * 0.1),
      alpha: 1.0,
      color: activeColor,
    });

    // Decay trail
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1.0 - i / this.maxTrailLength;
    }
  }

  public activateSpeedBoost(durationSeconds: number = 5.0): void {
    this.speedBoostTimer = durationSeconds;
    this.speedMultiplier = 1.6;
  }

  public activateShield(): void {
    this.hasShield = true;
    this.shieldHitsRemaining = 1;
  }

  public consumeShield(): boolean {
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldHitsRemaining = 0;
      return true;
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 1. Draw glowing trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - i / (this.maxTrailLength * 1.2)), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.45;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    // 2. Draw Shield aura if active
    if (this.hasShield) {
      const shieldRadius = this.radius + 12 + Math.sin(this.glowPulse * 3) * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, shieldRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 20;
      ctx.stroke();

      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.fill();
    }

    // 3. Draw Speed Aura if active
    if (this.speedBoostTimer > 0) {
      const speedRadius = this.radius + 8 + Math.cos(this.glowPulse * 4) * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, speedRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
    }

    // 4. Outer Glow Orb
    const mainColor = this.speedBoostTimer > 0 ? '#3b82f6' : (this.hasShield ? '#c084fc' : '#00f0ff');
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 2,
      this.x, this.y, this.radius + 8
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, mainColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 25;
    ctx.fill();

    // 5. Core Energy Orb
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
  }
}
