import { GameContext } from '../types';

/**
 * ENCAPSULATION:
 * The abstract base class `GameObject` encapsulates properties like position and dimensions.
 * These are marked as `protected` so they are accessible to subclasses but hidden from the outside world.
 * Access to these properties is controlled via methods (like `getBounds`).
 */
export abstract class GameObject {
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
}

/**
 * INHERITANCE:
 * `PlayerCar` inherits state and behavior from `GameObject`.
 */
export class PlayerCar extends GameObject {
  private speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    const width = 50;
    const height = 80;
    // Initial position centered horizontally, near bottom
    super(canvasWidth / 2 - width / 2, canvasHeight - height - 20, width, height, '#ef4444'); // Tailwind red-500
    this.speed = 300; // pixels per second
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
    super.draw(ctx);
    
    // Headlights
    ctx.fillStyle = '#fef08a'; // Yellow
    ctx.fillRect(this.x + 5, this.y, 10, 5);
    ctx.fillRect(this.x + this.width - 15, this.y, 10, 5);
  }
}

/**
 * INHERITANCE:
 * `ObstacleCar` also inherits from `GameObject`.
 */
export class ObstacleCar extends GameObject {
  private speed: number;

  constructor(x: number, speed: number) {
    super(x, -100, 50, 80, '#3b82f6'); // Tailwind blue-500
    this.speed = speed;
  }

  // POLYMORPHISM: Implementation of update specific to autonomous movement
  update(deltaTime: number, context: GameContext): void {
    // Moves downwards based on its own speed + game speed multiplier
    this.y += this.speed * context.speedMultiplier * deltaTime * 60;
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y > canvasHeight;
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
  }
}
