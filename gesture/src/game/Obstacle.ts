export type ObstacleType = 'DANGER_ORB' | 'MOVING_MINE' | 'LASER_BAR' | 'TRACKING_MINE';

export class Obstacle {
  public x: number;
  public y: number;
  public radius: number = 22;
  public type: ObstacleType;
  public vx: number = 0;
  public vy: number = 0;
  public rotation: number = 0;
  public isExpired: boolean = false;
  
  // Laser bar properties
  public barLength: number = 140;
  public angle: number = 0;
  public rotationSpeed: number = 1.2;

  private pulse: number = Math.random() * Math.PI * 2;
  private lifeTime: number = 0;
  private maxLifeTime: number = 15; // 15s max active lifetime

  constructor(x: number, y: number, type: ObstacleType = 'DANGER_ORB', vx: number = 0, vy: number = 0) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = vx;
    this.vy = vy;

    if (type === 'LASER_BAR') {
      this.radius = 15;
      this.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5);
    } else if (type === 'TRACKING_MINE') {
      this.radius = 20;
    }
  }

  public update(dt: number, canvasWidth: number, canvasHeight: number, playerX?: number, playerY?: number): void {
    this.lifeTime += dt;
    this.pulse += dt * 5;
    this.angle += this.rotationSpeed * dt;

    if (this.lifeTime > this.maxLifeTime) {
      this.isExpired = true;
    }

    if (this.type === 'TRACKING_MINE' && playerX !== undefined && playerY !== undefined) {
      // Homing movement towards player
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const speed = 75; // px per second
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
      }
    }

    // Move obstacle
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce off canvas boundaries
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.radius > canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.radius > canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.vy = -Math.abs(this.vy);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const scale = 1.0 + Math.sin(this.pulse) * 0.08;
    const r = this.radius * scale;

    if (this.type === 'LASER_BAR') {
      // Draw rotating laser beam
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Glowing line
      ctx.beginPath();
      ctx.moveTo(-this.barLength / 2, 0);
      ctx.lineTo(this.barLength / 2, 0);
      ctx.strokeStyle = '#ff2a5f';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 20;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-this.barLength / 2, 0);
      ctx.lineTo(this.barLength / 2, 0);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center emitter node
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ff2a5f';
      ctx.fill();
    } else {
      // Standard Danger Orb / Mine
      const mainColor = this.type === 'TRACKING_MINE' ? '#ff0055' : '#ff2a5f';

      // Outer glow
      const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, r + 12);
      grad.addColorStop(0, mainColor);
      grad.addColorStop(0.7, 'rgba(255, 0, 85, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 12, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 22;
      ctx.fill();

      // Spikes
      const spikes = 8;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.pulse * 0.5);
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const outerR = r + 8;
        const innerR = r - 4;
        ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        const a2 = a + Math.PI / spikes;
        ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
      }
      ctx.closePath();
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Skull or exclamation mark inside
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', 0, 0);
    }

    ctx.restore();
  }
}
