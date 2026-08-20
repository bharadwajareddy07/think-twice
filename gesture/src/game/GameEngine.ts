import { CameraManager } from '../tracking/CameraManager';
import { HandTracker, TrackingData } from '../tracking/HandTracker';
import { FingerSmoother } from '../tracking/FingerSmoother';
import { mapNormalizedToCanvas } from '../utils/coordinates';
import { Player } from './Player';
import { Target, TargetType } from './Target';
import { Obstacle, ObstacleType } from './Obstacle';
import { ParticleSystem } from './ParticleSystem';
import { CollisionSystem } from './CollisionSystem';
import { AudioManager } from '../audio/AudioManager';

export type GameState =
  | 'LOADING'
  | 'CAMERA_PERMISSION'
  | 'READY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export interface GameTelemetry {
  fps: number;
  handDetected: boolean;
  confidence: number;
  rawX: number;
  rawY: number;
  smoothedX: number;
  smoothedY: number;
  activeObjectsCount: number;
  particleCount: number;
}

export class GameEngine {
  public state: GameState = 'LOADING';
  public canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Subsystems
  public cameraManager: CameraManager;
  public handTracker: HandTracker;
  public fingerSmoother: FingerSmoother;
  public audioManager: AudioManager;
  public particleSystem: ParticleSystem;
  public player: Player | null = null;

  // Entities
  public targets: Target[] = [];
  public obstacles: Obstacle[] = [];

  // Game Stats
  public score: number = 0;
  public lives: number = 3;
  public combo: number = 0;
  public maxCombo: number = 0;
  public level: number = 1;
  public survivalTime: number = 0; // seconds
  public countdownValue: number = 3;

  // Screen shake effect
  public screenShakeTime: number = 0;
  public screenShakeIntensity: number = 0;

  // Hand Loss Handling
  private handLostTimer: number = 0;
  public isHandLostWarning: boolean = false;

  // Spawners
  private targetSpawnTimer: number = 0;
  private obstacleSpawnTimer: number = 0;

  // Loop & FPS
  private animFrameId: number | null = null;
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fpsTimer: number = performance.now();
  public currentFps: number = 60;

  // Telemetry callback for React UI throttling
  private onStateChangeCb?: (state: GameState) => void;
  private onTelemetryCb?: (telemetry: GameTelemetry) => void;

  constructor() {
    this.cameraManager = new CameraManager();
    this.handTracker = new HandTracker();
    this.fingerSmoother = new FingerSmoother(0.25, 0.4);
    this.audioManager = new AudioManager();
    this.particleSystem = new ParticleSystem();
  }

  public setCallbacks(
    onStateChange?: (state: GameState) => void,
    onTelemetry?: (telemetry: GameTelemetry) => void
  ): void {
    this.onStateChangeCb = onStateChange;
    this.onTelemetryCb = onTelemetry;
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (canvas) {
      this.player = new Player(canvas.width / 2, canvas.height / 2);
    }
  }

  public async initCameraAndTracker(): Promise<void> {
    this.setState('CAMERA_PERMISSION');
    try {
      await this.handTracker.initialize();
      await this.cameraManager.startCamera();
      this.setState('READY');
    } catch (err: any) {
      console.error('Initialization error:', err);
      throw err;
    }
  }

  public setState(newState: GameState): void {
    this.state = newState;
    if (this.onStateChangeCb) {
      this.onStateChangeCb(newState);
    }

    if (newState === 'PLAYING') {
      this.audioManager.startBGM();
    } else if (newState === 'GAME_OVER' || newState === 'READY') {
      this.audioManager.stopBGM();
    }
  }

  public startCountdown(): void {
    this.resetStats();
    this.setState('COUNTDOWN');
    this.countdownValue = 3;

    const countInterval = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) {
        clearInterval(countInterval);
        this.setState('PLAYING');
      }
    }, 1000);
  }

  public resetStats(): void {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 1;
    this.survivalTime = 0;
    this.handLostTimer = 0;
    this.isHandLostWarning = false;
    this.targets = [];
    this.obstacles = [];
    this.particleSystem.clear();

    if (this.canvas) {
      this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  public togglePause(): void {
    if (this.state === 'PLAYING') {
      this.setState('PAUSED');
      this.audioManager.stopBGM();
    } else if (this.state === 'PAUSED') {
      this.setState('PLAYING');
    }
  }

  public startLoop(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.lastFrameTime = performance.now();
    this.loop();
  }

  public stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.audioManager.stopBGM();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000); // Clamp dt to max 50ms to prevent huge physics jumps
    this.lastFrameTime = now;

    // Calculate FPS
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    // 1. Process Tracking Input
    let trackingData: TrackingData = {
      handDetected: false,
      confidence: 0,
      rawIndexTip: null,
      rawThumbTip: null,
      rawWrist: null,
      landmarks: null,
    };

    const videoEl = this.cameraManager.getVideoElement();
    if (videoEl && this.cameraManager.isActive() && this.handTracker.isReady()) {
      trackingData = this.handTracker.detect(videoEl, now);
    }

    // Handle tracking & Player position update
    let smoothedPos = { x: 0.5, y: 0.5 };
    if (trackingData.handDetected && trackingData.rawIndexTip && this.canvas) {
      this.handLostTimer = 0;
      this.isHandLostWarning = false;

      // Filter raw position
      smoothedPos = this.fingerSmoother.update(trackingData.rawIndexTip, now);

      // Map to canvas
      const canvasPos = mapNormalizedToCanvas(smoothedPos, this.canvas.width, this.canvas.height, true);
      if (this.player) {
        this.player.setTargetPosition(canvasPos.x, canvasPos.y);
      }
    } else {
      // Hand lost logic
      if (this.state === 'PLAYING') {
        this.handLostTimer += dt;
        if (this.handLostTimer >= 0.5) {
          this.isHandLostWarning = true;
        }
        if (this.handLostTimer >= 3.0) {
          // Missing >3s: auto pause
          this.setState('PAUSED');
        }
      }
    }

    // 2. Update Game State when PLAYING
    if (this.state === 'PLAYING' && this.canvas) {
      this.survivalTime += dt;
      this.updateLevelProgression();
      this.updateSpawners(dt);

      if (this.player) {
        this.player.update(dt);
      }

      // Update Targets
      for (let i = this.targets.length - 1; i >= 0; i--) {
        const t = this.targets[i];
        t.update(dt);
        if (t.isExpired) {
          this.targets.splice(i, 1);
          continue;
        }

        // Collision check with Player
        if (this.player && CollisionSystem.checkPlayerTarget(this.player, t)) {
          this.handleTargetCollected(t);
          this.targets.splice(i, 1);
        }
      }

      // Update Obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.update(dt, this.canvas.width, this.canvas.height, this.player?.x, this.player?.y);
        if (obs.isExpired) {
          this.obstacles.splice(i, 1);
          continue;
        }

        // Collision check with Player
        if (this.player && CollisionSystem.checkPlayerObstacle(this.player, obs)) {
          this.handleObstacleHit(obs);
          this.obstacles.splice(i, 1);
        }
      }

      // Update Screen Shake
      if (this.screenShakeTime > 0) {
        this.screenShakeTime -= dt;
      }
    }

    // Update Particles
    this.particleSystem.update(dt);

    // 3. Render Canvas
    this.render();

    // 4. Emit Telemetry
    if (this.onTelemetryCb && this.canvas) {
      const activeObjCount = this.targets.length + this.obstacles.length;
      this.onTelemetryCb({
        fps: this.currentFps,
        handDetected: trackingData.handDetected,
        confidence: trackingData.confidence,
        rawX: trackingData.rawIndexTip ? trackingData.rawIndexTip.x : 0,
        rawY: trackingData.rawIndexTip ? trackingData.rawIndexTip.y : 0,
        smoothedX: smoothedPos.x,
        smoothedY: smoothedPos.y,
        activeObjectsCount: activeObjCount,
        particleCount: this.particleSystem.getParticleCount(),
      });
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private updateLevelProgression(): void {
    let newLevel = 1;
    if (this.score >= 20000) newLevel = 5;
    else if (this.score >= 12000) newLevel = 4;
    else if (this.score >= 6000) newLevel = 3;
    else if (this.score >= 2000) newLevel = 2;

    if (newLevel > this.level) {
      this.level = newLevel;
      this.audioManager.playLevelUp();
      if (this.canvas) {
        this.particleSystem.addFloatingText(
          this.canvas.width / 2,
          this.canvas.height / 3,
          `LEVEL UP! LEVEL ${this.level}`,
          '#ffd700'
        );
      }
    }
  }

  private updateSpawners(dt: number): void {
    if (!this.canvas) return;

    this.targetSpawnTimer += dt;
    this.obstacleSpawnTimer += dt;

    // Target spawn interval decreases with level
    const targetInterval = Math.max(1.0, 2.8 - this.level * 0.3);
    if (this.targetSpawnTimer >= targetInterval && this.targets.length < 8) {
      this.targetSpawnTimer = 0;
      this.spawnRandomTarget();
    }

    // Obstacle spawn interval
    const obstacleInterval = Math.max(1.5, 4.5 - this.level * 0.6);
    const maxObstacles = 2 + this.level;
    if (this.obstacleSpawnTimer >= obstacleInterval && this.obstacles.length < maxObstacles) {
      this.obstacleSpawnTimer = 0;
      this.spawnRandomObstacle();
    }
  }

  private spawnRandomTarget(): void {
    if (!this.canvas) return;
    const margin = 60;
    const x = margin + Math.random() * (this.canvas.width - margin * 2);
    const y = margin + Math.random() * (this.canvas.height - margin * 2);

    const rand = Math.random();
    let type: TargetType = 'NORMAL';
    if (rand > 0.88) type = 'GOLDEN';
    else if (rand > 0.76) type = 'SPEED';
    else if (rand > 0.65) type = 'SHIELD';
    else if (rand > 0.55) type = 'TIME';

    this.targets.push(new Target(x, y, type));
  }

  private spawnRandomObstacle(): void {
    if (!this.canvas) return;
    const margin = 50;
    let x = margin + Math.random() * (this.canvas.width - margin * 2);
    let y = margin + Math.random() * (this.canvas.height - margin * 2);

    // Keep safe distance from player spawn
    if (this.player) {
      while (Math.hypot(x - this.player.x, y - this.player.y) < 180) {
        x = margin + Math.random() * (this.canvas.width - margin * 2);
        y = margin + Math.random() * (this.canvas.height - margin * 2);
      }
    }

    const types: ObstacleType[] = ['DANGER_ORB'];
    if (this.level >= 2) types.push('MOVING_MINE');
    if (this.level >= 3) types.push('LASER_BAR');
    if (this.level >= 4) types.push('TRACKING_MINE');

    const selectedType = types[Math.floor(Math.random() * types.length)];
    const speed = 40 + this.level * 25;
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.obstacles.push(new Obstacle(x, y, selectedType, vx, vy));
  }

  private handleTargetCollected(target: Target): void {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Combo multiplier cap at 5x
    const multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
    const addedPoints = target.points * multiplier;
    this.score += addedPoints;

    // Trigger visual & audio effects
    if (target.type === 'GOLDEN') {
      this.audioManager.playCollectGolden();
      this.particleSystem.createExplosion(target.x, target.y, '#ffd700', 35);
      this.particleSystem.addFloatingText(target.x, target.y, `+${addedPoints} GOLD!`, '#ffd700');
    } else if (target.type === 'SPEED') {
      this.audioManager.playPowerup('speed');
      if (this.player) this.player.activateSpeedBoost(6.0);
      this.particleSystem.createExplosion(target.x, target.y, '#3b82f6', 25);
      this.particleSystem.addFloatingText(target.x, target.y, `+${addedPoints} SPEED BOOST!`, '#3b82f6');
    } else if (target.type === 'SHIELD') {
      this.audioManager.playPowerup('shield');
      if (this.player) this.player.activateShield();
      this.particleSystem.createExplosion(target.x, target.y, '#a855f7', 25);
      this.particleSystem.addFloatingText(target.x, target.y, `+${addedPoints} SHIELD UP!`, '#a855f7');
    } else if (target.type === 'TIME') {
      this.audioManager.playPowerup('time');
      this.particleSystem.createExplosion(target.x, target.y, '#10b981', 25);
      this.particleSystem.addFloatingText(target.x, target.y, `+${addedPoints} TIME BONUS!`, '#10b981');
    } else {
      this.audioManager.playCollectNormal();
      this.particleSystem.createExplosion(target.x, target.y, '#00ff88', 20);
      const text = multiplier > 1 ? `+${addedPoints} (${multiplier}x)` : `+${addedPoints}`;
      this.particleSystem.addFloatingText(target.x, target.y, text, '#00ff88');
    }
  }

  private handleObstacleHit(obstacle: Obstacle): void {
    if (this.player && this.player.consumeShield()) {
      // Shield blocked collision!
      this.audioManager.playPowerup('shield');
      this.particleSystem.createExplosion(obstacle.x, obstacle.y, '#a855f7', 30);
      this.particleSystem.addFloatingText(obstacle.x, obstacle.y, 'SHIELD SAVED!', '#a855f7');
      return;
    }

    // Life loss
    this.lives--;
    this.combo = 0; // reset combo
    this.audioManager.playHit();
    this.screenShakeTime = 0.4;
    this.screenShakeIntensity = 16;

    if (this.player) {
      this.particleSystem.createExplosion(this.player.x, this.player.y, '#ff2a5f', 40);
      this.particleSystem.addFloatingText(this.player.x, this.player.y, '-1 LIFE!', '#ff2a5f');
    }

    if (this.lives <= 0) {
      this.audioManager.playGameOver();
      this.setState('GAME_OVER');
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();

    // Apply Screen Shake
    if (this.screenShakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.screenShakeIntensity;
      const dy = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.ctx.translate(dx, dy);
    }

    // Clear Background with dynamic grid effect
    this.ctx.fillStyle = '#0a0d14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Cyber Background Grid
    this.drawBackgroundGrid();

    // Draw Targets
    for (const t of this.targets) {
      t.draw(this.ctx);
    }

    // Draw Obstacles
    for (const obs of this.obstacles) {
      obs.draw(this.ctx);
    }

    // Draw Player Orb & Trail
    if (this.player && (this.state === 'PLAYING' || this.state === 'READY' || this.state === 'COUNTDOWN')) {
      this.player.draw(this.ctx);
    }

    // Draw Particle System
    this.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }

  private drawBackgroundGrid(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    this.ctx.lineWidth = 1;

    const gridSize = 50;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  public destroy(): void {
    this.stopLoop();
    this.cameraManager.destroy();
    this.handTracker.destroy();
  }
}
