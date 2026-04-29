
export type Lane = -1 | 0 | 1;

export interface GameSettings {
  laneWidth: number;
  initialSpeed: number;
  speedIncrement: number;
  maxSpeed: number;
  gravity: number;
  jumpForce: number;
}

export const SETTINGS: GameSettings = {
  laneWidth: 120,
  initialSpeed: 8,
  speedIncrement: 0.002,
  maxSpeed: 40,
  gravity: 0.6,
  jumpForce: -12,
};

export class Player {
  lane: Lane = 0;
  targetLane: Lane = 0;
  y: number = 0;
  dy: number = 0;
  isJumping: boolean = false;
  isSliding: boolean = false;
  slideTimer: number = 0;
  isInvincible: boolean = false;
  invincibleTimer: number = 0;
  shieldCooldownDistance: number = 500 * 10; // 500m (since distance is internal/10 usually, or just keep it consistent)
  lastShieldDeactivatedAt: number = -500 * 10; // Start with shield available
  laneTransition: number = 0; // -1 to 1 offset from targetLane

  width: number = 40;
  height: number = 80;

  update(speed: number, currentDistance: number) {
    // Invincibility logic
    if (this.isInvincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.lastShieldDeactivatedAt = currentDistance;
      }
    }
    // Lane movement
    if (this.lane !== this.targetLane) {
      const diff = this.targetLane - this.lane;
      const step = 0.15;
      if (Math.abs(diff) < step) {
        this.lane = this.targetLane;
        this.laneTransition = 0;
      } else {
        this.laneTransition += Math.sign(diff) * step;
        if (Math.abs(this.laneTransition) >= 1) {
          this.lane = (this.lane + Math.sign(diff)) as Lane;
          this.laneTransition = 0;
        }
      }
    }

    // Jump physics
    if (this.isJumping) {
      this.y += this.dy;
      this.dy += SETTINGS.gravity;
      if (this.y >= 0) {
        this.y = 0;
        this.dy = 0;
        this.isJumping = false;
      }
    }

    // Slide logic
    if (this.isSliding) {
      this.slideTimer--;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }
  }

  jump() {
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.dy = SETTINGS.jumpForce;
    }
  }

  slide() {
    if (!this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 40;
      if (this.isJumping) {
        this.dy = 15; // Fast fall
      }
    }
  }

  moveLeft() {
    if (this.targetLane > -1) this.targetLane = (this.targetLane - 1) as Lane;
  }

  moveRight() {
    if (this.targetLane < 1) this.targetLane = (this.targetLane + 1) as Lane;
  }

  activateInvincibility(currentDistance: number) {
    const cooldownNeeded = 5000; // 500 meters (distanceRef.current is meters * 10)
    if (!this.isInvincible && currentDistance >= this.lastShieldDeactivatedAt + cooldownNeeded) {
      this.isInvincible = true;
      this.invincibleTimer = 300; // ~5 seconds at 60fps
      return true;
    }
    return false;
  }

  getShieldCooldownProgress(currentDistance: number) {
    if (this.isInvincible) return 1;
    const cooldownNeeded = 5000;
    const elapsed = currentDistance - this.lastShieldDeactivatedAt;
    return Math.min(1, Math.max(0, elapsed / cooldownNeeded));
  }

  get currentVisualLane() {
    return this.lane + this.laneTransition;
  }
}

export type ObstacleType = 'TRAIN' | 'BARRIER' | 'LOW_BAR';

export class Obstacle {
  id: string = Math.random().toString(36).substr(2, 9);
  lane: Lane;
  z: number; // Distance from player (starts far away, decreases)
  type: ObstacleType;
  width: number;
  height: number;
  zLength: number = 80;

  constructor(lane: Lane, z: number, type: ObstacleType) {
    this.lane = lane;
    this.z = z;
    this.type = type;
    
    switch (type) {
      case 'TRAIN':
        this.width = 100;
        this.height = 150;
        this.zLength = 400; // Long train
        break;
      case 'BARRIER':
        this.width = 100;
        this.height = 50; // Jumpable
        break;
      case 'LOW_BAR':
        this.width = 100;
        this.height = 120; // Must slide under (gap at bottom? or just tall enough to need sliding)
        // In Subway Surfers, some you jump, some you slide.
        break;
      default:
        this.width = 80;
        this.height = 80;
    }
  }

  update(speed: number) {
    this.z -= speed;
  }
}

export class Coin {
  id: string = Math.random().toString(36).substr(2, 9);
  lane: Lane;
  z: number;
  collected: boolean = false;

  constructor(lane: Lane, z: number) {
    this.lane = lane;
    this.z = z;
  }

  update(speed: number) {
    this.z -= speed;
  }
}

export class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number = 1.0;
  color: string;

  constructor(x: number, y: number, z: number, color: string) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.vz = (Math.random() - 0.5) * 10;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    this.life -= 0.02;
  }
}
