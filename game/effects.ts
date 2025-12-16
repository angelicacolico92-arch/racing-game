/**
 * Represents a single particle in the system (smoke, spark, etc.)
 */
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
  type: 'smoke' | 'spark';

  constructor(x: number, y: number, vx: number, vy: number, color: string, size: number, decay: number, type: 'smoke' | 'spark') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = 1.0;
    this.decay = decay;
    this.type = type;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= this.decay * dt;
    
    // Smoke grows as it dissipates
    if (this.type === 'smoke') {
        this.size += 10 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    
    if (this.type === 'smoke') {
        // Draw soft circle for smoke
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Draw sharp rect for sparks
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    
    ctx.restore();
  }
}

/**
 * Manages collections of particles.
 */
export class ParticleSystem {
  particles: Particle[] = [];

  /**
   * Emits smoke puffs from tire positions.
   * Smoke moves 'down' relative to the car because the world moves down.
   */
  emitSmoke(x: number, y: number) {
    const vx = (Math.random() - 0.5) * 20; // Slight horizontal drift
    const vy = 200 + Math.random() * 50; // Moves down with the road
    this.particles.push(new Particle(x, y, vx, vy, '#a8a29e', 4, 2.5, 'smoke'));
  }

  /**
   * Emits an explosion of sparks.
   */
  emitSparks(x: number, y: number) {
    for(let i=0; i<30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 300;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        // Random colors: Yellow, Orange, White
        const colors = ['#fef08a', '#f97316', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        this.particles.push(new Particle(x, y, vx, vy, color, 3, 2.0 + Math.random(), 'spark'));
    }
  }

  update(dt: number) {
    this.particles.forEach(p => p.update(dt));
    // Remove dead particles
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => p.draw(ctx));
  }
  
  clear() {
      this.particles = [];
  }
}
