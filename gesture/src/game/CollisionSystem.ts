import { Player } from './Player';
import { Target } from './Target';
import { Obstacle } from './Obstacle';

export class CollisionSystem {
  public static checkPlayerTarget(player: Player, target: Target): boolean {
    const dx = player.x - target.x;
    const dy = player.y - target.y;
    const distSq = dx * dx + dy * dy;
    const minDist = player.radius + target.radius;
    return distSq <= minDist * minDist;
  }

  public static checkPlayerObstacle(player: Player, obstacle: Obstacle): boolean {
    if (obstacle.type === 'LASER_BAR') {
      // Check collision between player circle and rotating line segment
      const halfLen = obstacle.barLength / 2;
      const cos = Math.cos(obstacle.angle);
      const sin = Math.sin(obstacle.angle);

      // Endpoints of the laser line segment
      const x1 = obstacle.x - cos * halfLen;
      const y1 = obstacle.y - sin * halfLen;
      const x2 = obstacle.x + cos * halfLen;
      const y2 = obstacle.y + sin * halfLen;

      const distToSegment = this.distToSegment(player.x, player.y, x1, y1, x2, y2);
      return distToSegment <= player.radius + obstacle.radius;
    } else {
      // Standard circle-circle collision
      const dx = player.x - obstacle.x;
      const dy = player.y - obstacle.y;
      const distSq = dx * dx + dy * dy;
      const minDist = player.radius + obstacle.radius;
      return distSq <= minDist * minDist;
    }
  }

  private static distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);

    const dx = px - projX;
    const dy = py - projY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
