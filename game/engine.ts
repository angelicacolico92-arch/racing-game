import { GameContext, IGameObject, CarType } from '../types';

const LANES = [50, 150, 250, 350];

export const CAR_CONFIGS = {
  [CarType.SPORTS]: { width: 50, height: 80, color: '#ef4444', name: 'GT RACER' },
  [CarType.F1]: { width: 46, height: 86, color: '#06b6d4', name: 'FORMULA' },
  [CarType.MUSCLE]: { width: 54, height: 82, color: '#f59e0b', name: 'V8 MUSCLE' },
  [CarType.CLASSIC]: { width: 52, height: 84, color: '#0d9488', name: 'CLASSIC 50s' },
  [CarType.FUTURE]: { width: 48, height: 88, color: '#7c3aed', name: 'CYBER 2077' },
  [CarType.TRUCK]: { width: 58, height: 90, color: '#166534', name: 'OFFROAD' }
};

/**
 * ENCAPSULATION:
 * The abstract base class `GameObject` encapsulates properties like position and dimensions.
 * These are marked as `protected` so they are accessible to subclasses but hidden from the outside world.
 * Access to these properties is controlled via methods (like `getBounds`).
 */
export abstract class GameObject implements IGameObject {
  protected x: number;
  protected y: number;
  protected width: number;
  protected height: number;
  protected color: string;

  constructor(x: number, y: number, width: number, height: number, color: string) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  /**
   * POLYMORPHISM:
   * Abstract method `update` forces subclasses to define their own behavior.
   * Both PlayerCar and ObstacleCar will have an `update` method, but they will behave differently.
   */
  abstract update(deltaTime: number, context: GameContext): void;

  /**
   * POLYMORPHISM:
   * Virtual method `draw` provides a default implementation but can be overridden.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    // Draw a simple car shape (body)
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw details to look like a car
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, this.height - 20); // Roof/Window area
  }

  public getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height,
      width: this.width,
      height: this.height
    };
  }

  public checkCollision(other: GameObject): boolean {
    const r1 = this.getBounds();
    const r2 = other.getBounds();

    return !(
      r2.left > r1.right ||
      r2.right < r1.left ||
      r2.top > r1.bottom ||
      r2.bottom < r1.top
    );
  }

  // Moved up from ObstacleCar to allow polymorphic checks on all obstacles
  public isOffScreen(canvasHeight: number): boolean {
    return this.y > canvasHeight;
  }
}

/**
 * INHERITANCE:
 * `PlayerCar` inherits state and behavior from `GameObject`.
 */
export class PlayerCar extends GameObject {
  private speed: number;
  private type: CarType;

  constructor(canvasWidth: number, canvasHeight: number, type: CarType = CarType.SPORTS) {
    const config = CAR_CONFIGS[type];
    // Initial position centered horizontally, near bottom
    super(canvasWidth / 2 - config.width / 2, canvasHeight - config.height - 20, config.width, config.height, config.color);
    this.speed = 300; // pixels per second
    this.type = type;
  }

  // POLYMORPHISM: Implementation of update specific to player control
  update(deltaTime: number, context: GameContext): void {
    const moveDistance = this.speed * deltaTime;

    if (context.keys.left) {
      this.x -= moveDistance;
    }
    if (context.keys.right) {
      this.x += moveDistance;
    }

    // Boundary checks (Encapsulation of boundary logic)
    if (this.x < 10) this.x = 10;
    if (this.x > context.canvasWidth - this.width - 10) {
      this.x = context.canvasWidth - this.width - 10;
    }
  }

  // Overriding draw to add specific player details (headlights)
  draw(ctx: CanvasRenderingContext2D): void {
    switch (this.type) {
        case CarType.F1:
            this.drawF1(ctx);
            break;
        case CarType.MUSCLE:
            this.drawMuscle(ctx);
            break;
        case CarType.CLASSIC:
            this.drawClassic(ctx);
            break;
        case CarType.FUTURE:
            this.drawFuture(ctx);
            break;
        case CarType.TRUCK:
            this.drawTruck(ctx);
            break;
        default:
            this.drawSports(ctx);
            break;
    }

    // Draw lighting overlays (shared)
    this.drawLights(ctx);
  }

  private drawSports(ctx: CanvasRenderingContext2D) {
    // Body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Cabin
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x + 5, this.y + 20, this.width - 10, 30);
    
    // Spoiler
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(this.x + 2, this.y + this.height - 8, this.width - 4, 6);
  }

  private drawF1(ctx: CanvasRenderingContext2D) {
    const bodyWidth = 20;
    const wheelWidth = 8;
    const bodyX = this.x + (this.width - bodyWidth) / 2;

    // Rear Wing
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x + 2, this.y + this.height - 10, this.width - 4, 8);

    // Main Body (Narrow)
    ctx.fillRect(bodyX, this.y + 10, bodyWidth, this.height - 15);
    
    // Front Wing
    ctx.fillRect(this.x, this.y, this.width, 10);

    // Wheels (Black rectangles outside main body but within bounding box logic)
    ctx.fillStyle = '#1f2937'; // gray-800
    // Rear Wheels
    ctx.fillRect(this.x, this.y + this.height - 30, wheelWidth, 20);
    ctx.fillRect(this.x + this.width - wheelWidth, this.y + this.height - 30, wheelWidth, 20);
    // Front Wheels
    ctx.fillRect(this.x, this.y + 15, wheelWidth, 15);
    ctx.fillRect(this.x + this.width - wheelWidth, this.y + 15, wheelWidth, 15);
    
    // Driver Helmet
    ctx.fillStyle = '#fbbf24'; // yellow
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y + 45, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMuscle(ctx: CanvasRenderingContext2D) {
    // Body (Boxy)
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Racing Stripes
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.x + this.width/2 - 6, this.y, 4, this.height);
    ctx.fillRect(this.x + this.width/2 + 2, this.y, 4, this.height);

    // Roof
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(this.x + 6, this.y + 25, this.width - 12, 25);
  }

  private drawClassic(ctx: CanvasRenderingContext2D) {
    // Chrome Bumpers
    ctx.fillStyle = '#e2e8f0'; // slate-200 (chrome)
    ctx.fillRect(this.x, this.y, this.width, 5); // Front
    ctx.fillRect(this.x, this.y + this.height - 5, this.width, 5); // Rear

    // Main Body (Rounded feeling via padding)
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y + 2, this.width, this.height - 4);
    
    // Rounded Cabin
    ctx.fillStyle = '#f0fdf4'; // Light tint
    ctx.fillRect(this.x + 8, this.y + 25, this.width - 16, 25);
    
    // Side accents
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x, this.y + 35, 3, 20);
    ctx.fillRect(this.x + this.width - 3, this.y + 35, 3, 20);
  }

  private drawFuture(ctx: CanvasRenderingContext2D) {
    // Sleek Main Body
    ctx.fillStyle = '#000000'; // Black core
    ctx.fillRect(this.x + 5, this.y, this.width - 10, this.height);
    
    // Outer Armor/Neon glow
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y + 15, 5, this.height - 30);
    ctx.fillRect(this.x + this.width - 5, this.y + 15, 5, this.height - 30);

    // Neon Center Strip
    ctx.fillStyle = '#22d3ee'; // Cyan
    ctx.fillRect(this.x + this.width/2 - 2, this.y, 4, this.height);
    
    // Engine Glow
    ctx.fillStyle = '#a855f7'; // Purple glow
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y + this.height - 15, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTruck(ctx: CanvasRenderingContext2D) {
    // Large Tires protruding
    ctx.fillStyle = '#1c1917'; // stone-900
    ctx.fillRect(this.x - 2, this.y + 10, 6, 15);
    ctx.fillRect(this.x + this.width - 4, this.y + 10, 6, 15);
    ctx.fillRect(this.x - 2, this.y + this.height - 25, 6, 15);
    ctx.fillRect(this.x + this.width - 4, this.y + this.height - 25, 6, 15);

    // Main Body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Pickup Bed
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(this.x + 6, this.y + 45, this.width - 12, this.height - 50);

    // Cab
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(this.x + 4, this.y + 15, this.width - 8, 25);
    
    // Roll Bar
    ctx.fillStyle = '#d6d3d1'; // stone-300
    ctx.fillRect(this.x + 6, this.y + 42, this.width - 12, 4);
  }
  
  private drawLights(ctx: CanvasRenderingContext2D) {
    // Headlights
    ctx.fillStyle = '#fef08a'; // Yellow
    if (this.type === CarType.F1) {
        // F1 Nose cone lights (fictional for night race)
        ctx.fillRect(this.x + this.width/2 - 4, this.y + 5, 8, 4);
    } else if (this.type === CarType.FUTURE) {
        ctx.fillStyle = '#22d3ee'; // Cyan Lasers
        ctx.fillRect(this.x + 2, this.y, 2, 10);
        ctx.fillRect(this.x + this.width - 4, this.y, 2, 10);
    } else {
        ctx.fillRect(this.x + 5, this.y, 10, 5);
        ctx.fillRect(this.x + this.width - 15, this.y, 10, 5);
    }
    
    // Tail lights
    ctx.fillStyle = '#7f1d1d'; // Dark Red
    if (this.type === CarType.FUTURE) {
        ctx.fillStyle = '#f472b6'; // Pink
        ctx.fillRect(this.x, this.y + this.height - 2, this.width, 2);
    } else {
        ctx.fillRect(this.x + 5, this.y + this.height - 5, 10, 5);
        ctx.fillRect(this.x + this.width - 15, this.y + this.height - 5, 10, 5);
    }
  }
  
  public getRearTirePositions() {
    return [
      { x: this.x + 5, y: this.y + this.height - 5 }, // Left Rear
      { x: this.x + this.width - 5, y: this.y + this.height - 5 } // Right Rear
    ];
  }

  public getHeadlightPositions() {
    if (this.type === CarType.F1) {
        return [
             { x: this.x + this.width/2, y: this.y }
        ];
    }
    return [
      { x: this.x + 10, y: this.y }, // Left Front
      { x: this.x + this.width - 10, y: this.y } // Right Front
    ];
  }
}

/**
 * INHERITANCE:
 * `ObstacleCar` also inherits from `GameObject`.
 * Now includes intelligent lane-changing behavior.
 */
export class ObstacleCar extends GameObject {
  protected speed: number;
  private targetLaneX: number | null = null;
  private laneChangeTimer: number = 0;
  private blinkerState: boolean = false;
  private blinkerTimer: number = 0;
  private blinkerSide: 'left' | 'right' | null = null;

  constructor(x: number, speed: number) {
    super(x, -100, 50, 80, '#3b82f6'); // Tailwind blue-500
    this.speed = speed;
    this.laneChangeTimer = Math.random() * 2; // Randomize start time
  }

  // POLYMORPHISM: Implementation of update specific to autonomous movement
  update(deltaTime: number, context: GameContext): void {
    // 1. Vertical Movement
    this.y += this.speed * context.speedMultiplier * deltaTime * 60;

    // 2. AI Logic: Lane Changing
    this.laneChangeTimer += deltaTime;
    this.blinkerTimer += deltaTime;

    // Toggle blinker every 0.2s
    if (this.blinkerTimer > 0.2) {
        this.blinkerState = !this.blinkerState;
        this.blinkerTimer = 0;
    }

    if (this.targetLaneX !== null) {
        // Active Lane Change
        const moveSpeed = 100 * deltaTime;
        if (Math.abs(this.x - this.targetLaneX) < moveSpeed) {
            this.x = this.targetLaneX; // Snap to lane
            this.targetLaneX = null;
            this.blinkerSide = null;
        } else {
            if (this.x < this.targetLaneX) this.x += moveSpeed;
            else this.x -= moveSpeed;
        }
    } else {
        // Decision Making
        if (this.laneChangeTimer > 3.0) { // Consider changing every 3 seconds
            this.laneChangeTimer = 0;
            if (Math.random() < 0.3) { // 30% chance to try switching
                this.tryChangeLane(context.obstacles);
            }
        }
    }
  }
  
  private tryChangeLane(obstacles: IGameObject[]) {
      // Determine current lane
      const center = this.x;
      const currentLaneIndex = LANES.findIndex(l => Math.abs(l - center) < 30);
      
      if (currentLaneIndex === -1) return; 

      // Identify potential lanes
      const options = [];
      if (currentLaneIndex > 0) options.push(currentLaneIndex - 1);
      if (currentLaneIndex < LANES.length - 1) options.push(currentLaneIndex + 1);
      
      if (options.length === 0) return;

      const targetIndex = options[Math.floor(Math.random() * options.length)];
      const targetX = LANES[targetIndex];

      // Collision Avoidance: Check if target lane is clear
      const isBlocked = obstacles.some(obs => {
          if (obs === this) return false;
          const bounds = obs.getBounds();
          const myY = this.y;
          // Check X alignment (rough lane check)
          if (Math.abs(bounds.left - targetX) < 30) {
              // Check Y proximity (don't merge into someone close)
              if (Math.abs(bounds.top - myY) < 150) return true;
          }
          return false;
      });

      if (!isBlocked) {
          this.targetLaneX = targetX;
          this.blinkerSide = targetIndex < currentLaneIndex ? 'left' : 'right';
      }
  }
  
  draw(ctx: CanvasRenderingContext2D): void {
      super.draw(ctx);
      // Red Tail lights
      ctx.fillStyle = '#ef4444'; 
      ctx.fillRect(this.x + 5, this.y + this.height - 5, 10, 5);
      ctx.fillRect(this.x + this.width - 15, this.y + this.height - 5, 10, 5);

      // Render Blinkers
      if (this.blinkerSide && this.blinkerState) {
          ctx.fillStyle = '#fbbf24'; // Amber
          if (this.blinkerSide === 'left') {
              ctx.fillRect(this.x - 2, this.y + this.height - 15, 4, 10); // Left rear indicator
          } else {
              ctx.fillRect(this.x + this.width - 2, this.y + this.height - 15, 4, 10); // Right rear indicator
          }
      }
  }
}

/**
 * INHERITANCE:
 * `Truck` is a larger, slower obstacle.
 */
export class Truck extends GameObject {
  private speed: number;

  constructor(x: number, speed: number) {
    // Trucks are wider (60) and longer (120)
    super(x, -150, 60, 120, '#64748b'); // slate-500
    this.speed = speed;
  }

  update(deltaTime: number, context: GameContext): void {
    this.y += this.speed * context.speedMultiplier * deltaTime * 60;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Truck Body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Trailer details
    ctx.fillStyle = '#475569'; // slate-600
    ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 40);

    // Cab
    ctx.fillStyle = '#334155'; // slate-700
    ctx.fillRect(this.x, this.y + this.height - 35, this.width, 35);
    
    // Windshield
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillRect(this.x + 5, this.y + this.height - 25, this.width - 10, 10);
    
    // Truck Lights
    ctx.fillStyle = '#ef4444'; // Red rear lights
    ctx.fillRect(this.x + 2, this.y + this.height - 2, 15, 2);
    ctx.fillRect(this.x + this.width - 17, this.y + this.height - 2, 15, 2);
  }
}

/**
 * INHERITANCE:
 * `Barrier` is a static obstacle.
 */
export class Barrier extends GameObject {
  private speed: number;

  constructor(x: number) {
    // Small, square-ish
    super(x, -50, 40, 40, '#f59e0b'); // amber-500
    this.speed = 6; // Moves fast (same speed as road effectively)
  }

  update(deltaTime: number, context: GameContext): void {
    this.y += this.speed * context.speedMultiplier * deltaTime * 60;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    
    // Draw Cone/Barrier shape
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.fill();

    // Stripes
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 10, this.y + 15, this.width - 20, 5);
    ctx.fillRect(this.x + 5, this.y + 25, this.width - 10, 5);
  }
}

/**
 * Encapsulates the road rendering logic.
 * Not an entity, but a helper class for the environment.
 */
export class Road {
  private laneOffset: number = 0;
  private laneSpeed: number = 300;

  update(deltaTime: number, speedMultiplier: number) {
    this.laneOffset += this.laneSpeed * speedMultiplier * deltaTime;
    if (this.laneOffset > 40) { // Reset dash pattern
      this.laneOffset = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Road Asphalt
    ctx.fillStyle = '#374151'; // gray-700
    ctx.fillRect(0, 0, width, height);

    // Grass verges
    ctx.fillStyle = '#166534'; // green-800
    ctx.fillRect(0, 0, 20, height);
    ctx.fillRect(width - 20, 0, 20, height);

    // Lane markers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -this.laneOffset;

    // Center Line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Side Lines (Solid)
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d1d5db'; // gray-300
    
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(25, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 25, 0);
    ctx.lineTo(width - 25, height);
    ctx.stroke();
    
    // Additional Dashed Lines for 4-lane setup
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -this.laneOffset;
    ctx.beginPath();
    // Left lane divider
    ctx.moveTo(100, 0);
    ctx.lineTo(100, height);
    // Right lane divider
    ctx.moveTo(300, 0);
    ctx.lineTo(300, height);
    ctx.stroke();
  }
}