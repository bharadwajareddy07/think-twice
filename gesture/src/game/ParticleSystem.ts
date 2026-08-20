export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'star';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private maxParticles: number = 250;

  public createExplosion(x: number, y: number, color: string, count: number = 25): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift(); // recycle oldest
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 280;
      const life = 0.4 + Math.random() * 0.6;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        color,
        alpha: 1.0,
        life,
        maxLife: life,
        shape: Math.random() > 0.3 ? 'circle' : 'star',
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string = '#00f0ff'): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      scale: 1.0,
      life: 1.2,
      maxLife: 1.2,
    });
  }

  public update(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt; // slight gravity for effect
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // Update floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y -= 45 * dt; // rise up
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      ft.scale = 1.0 + (1.0 - ft.life / ft.maxLife) * 0.4;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw floating texts
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.font = `bold ${Math.floor(22 * ft.scale)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  public clear(): void {
    this.particles = [];
    this.floatingTexts = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
