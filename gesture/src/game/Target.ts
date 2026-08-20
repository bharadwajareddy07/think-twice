export type TargetType = 'NORMAL' | 'GOLDEN' | 'SPEED' | 'SHIELD' | 'TIME';

export class Target {
  public x: number;
  public y: number;
  public radius: number;
  public type: TargetType;
  public points: number;
  public duration: number; // Expiration time in seconds
  public maxDuration: number;
  public isExpired: boolean = false;
  
  private pulseAngle: number = Math.random() * Math.PI * 2;
  private floatOffset: number = Math.random() * 100;

  constructor(x: number, y: number, type: TargetType = 'NORMAL', duration: number = 8.0) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.duration = duration;
    this.maxDuration = duration;

    switch (type) {
      case 'GOLDEN':
        this.radius = 24;
        this.points = 500;
        break;
      case 'SPEED':
        this.radius = 20;
        this.points = 200;
        break;
      case 'SHIELD':
        this.radius = 22;
        this.points = 250;
        break;
      case 'TIME':
        this.radius = 20;
        this.points = 150;
        break;
      case 'NORMAL':
      default:
        this.radius = 18;
        this.points = 100;
        break;
    }
  }

  public update(dt: number): void {
    this.pulseAngle += dt * 3.5;
    this.duration -= dt;
    if (this.duration <= 0) {
      this.isExpired = true;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const pulseScale = 1.0 + Math.sin(this.pulseAngle) * 0.12;
    const r = this.radius * pulseScale;
    const fadeRatio = Math.min(1.0, this.duration / 1.5); // Fade out when expiring

    ctx.save();
    ctx.globalAlpha = fadeRatio;

    // Floating motion
    const floatY = this.y + Math.sin(this.pulseAngle * 0.8 + this.floatOffset) * 4;

    let primaryColor = '#00ff88';
    let secondaryColor = '#00f0ff';
    let symbol = '★';

    switch (this.type) {
      case 'GOLDEN':
        primaryColor = '#ffd700';
        secondaryColor = '#ffaa00';
        symbol = '✦';
        break;
      case 'SPEED':
        primaryColor = '#3b82f6';
        secondaryColor = '#60a5fa';
        symbol = '⚡';
        break;
      case 'SHIELD':
        primaryColor = '#a855f7';
        secondaryColor = '#e879f9';
        symbol = '🛡';
        break;
      case 'TIME':
        primaryColor = '#10b981';
        secondaryColor = '#34d399';
        symbol = '⏳';
        break;
      case 'NORMAL':
      default:
        primaryColor = '#00ff88';
        secondaryColor = '#00f0ff';
        symbol = '✦';
        break;
    }

    // Outer aura glow
    const grad = ctx.createRadialGradient(this.x, floatY, 2, this.x, floatY, r + 10);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(0.6, secondaryColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(this.x, floatY, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 18;
    ctx.fill();

    // Core circle
    ctx.beginPath();
    ctx.arc(this.x, floatY, r, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, this.x, floatY + 1);

    // Timer ring indicator
    const ringAngle = (this.duration / this.maxDuration) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(this.x, floatY, r + 4, -Math.PI / 2, -Math.PI / 2 + ringAngle, false);
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
