import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, InputKeys, Difficulty, CarType } from '../types';
import { PlayerCar, ObstacleCar, Truck, Barrier, GameObject, Road, CAR_CONFIGS } from '../game/engine';
import { SoundManager } from '../game/audio';
import { ParticleSystem } from '../game/effects';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { spawnRate: 0.03, speedScale: 0.02, color: 'text-green-400', label: 'EASY' },
  [Difficulty.MEDIUM]: { spawnRate: 0.05, speedScale: 0.05, color: 'text-yellow-400', label: 'MEDIUM' },
  [Difficulty.HARD]: { spawnRate: 0.08, speedScale: 0.1, color: 'text-orange-500', label: 'HARD' },
  [Difficulty.EXTREME]: { spawnRate: 0.15, speedScale: 0.2, color: 'text-red-600', label: 'EXTREME' },
};

export const RacingGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [selectedCar, setSelectedCar] = useState<CarType>(CarType.SPORTS);
  
  // Mobile Touch States for Visual Feedback
  const [touchLeft, setTouchLeft] = useState(false);
  const [touchRight, setTouchRight] = useState(false);

  // Audio Manager Ref
  const soundManagerRef = useRef<SoundManager | null>(null);

  // Game Loop Refs (to avoid re-renders)
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const playerRef = useRef<PlayerCar | null>(null);
  const difficultyRef = useRef<Difficulty>(Difficulty.MEDIUM); // Ref for access inside loop without closure staleness
  
  // POLYMORPHISM: Storing different types of obstacles in a single list of base class
  const obstaclesRef = useRef<GameObject[]>([]);
  
  const roadRef = useRef<Road>(new Road());
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  
  const keysRef = useRef<InputKeys>({ left: false, right: false });
  const scoreRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Initialize Sound Manager
  useEffect(() => {
    soundManagerRef.current = new SoundManager();
    return () => {
        soundManagerRef.current?.stopMusic();
        soundManagerRef.current?.stopEngine();
    };
  }, []);

  // Input Handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return; // Ignore hold-down repeats for sound triggers

    if (e.key === 'ArrowLeft') {
        keysRef.current.left = true;
        setTouchLeft(true);
        if (gameState === GameState.PLAYING) soundManagerRef.current?.playTurn();
    }
    if (e.key === 'ArrowRight') {
        keysRef.current.right = true;
        setTouchRight(true);
        if (gameState === GameState.PLAYING) soundManagerRef.current?.playTurn();
    }
  }, [gameState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
        keysRef.current.left = false;
        setTouchLeft(false);
    }
    if (e.key === 'ArrowRight') {
        keysRef.current.right = false;
        setTouchRight(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Touch Handlers for Mobile
  const handleTouchStart = (direction: 'left' | 'right') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent scrolling/selecting
    if (direction === 'left') {
        keysRef.current.left = true;
        setTouchLeft(true);
    } else {
        keysRef.current.right = true;
        setTouchRight(true);
    }
    if (gameState === GameState.PLAYING) soundManagerRef.current?.playTurn();
  };

  const handleTouchEnd = (direction: 'left' | 'right') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (direction === 'left') {
        keysRef.current.left = false;
        setTouchLeft(false);
    } else {
        keysRef.current.right = false;
        setTouchRight(false);
    }
  };

  // Main Game Loop
  const animate = (time: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !playerRef.current) return;

    // --- LOGIC UPDATE ---
    const settings = DIFFICULTY_CONFIG[difficultyRef.current];

    // Difficulty scaling: Speed increases with score based on difficulty scale
    const speedMultiplier = 1 + (scoreRef.current * settings.speedScale);
    
    // Update audio engine pitch
    soundManagerRef.current?.updateEngine(speedMultiplier);

    // Polymorphic update for Road
    roadRef.current.update(deltaTime, speedMultiplier);

    // Polymorphic update for Player
    playerRef.current.update(deltaTime, {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      speedMultiplier: 1, // Player moves at base speed
      keys: keysRef.current,
      obstacles: obstaclesRef.current
    });
    
    // Particle Logic: Emit smoke when turning
    if (keysRef.current.left || keysRef.current.right) {
        // Emit randomly to avoid solid lines
        if (Math.random() < 0.5) {
            const tires = playerRef.current.getRearTirePositions();
            tires.forEach(t => particleSystemRef.current.emitSmoke(t.x, t.y));
        }
    }
    particleSystemRef.current.update(deltaTime);

    // Spawn Obstacles
    if (Math.random() < settings.spawnRate) {
        // Uniform 4-lane spawn points: 50, 150, 250, 350
        const lanes = [50, 150, 250, 350]; 
        const laneX = lanes[Math.floor(Math.random() * lanes.length)];
        
        // Lane-specific overlap check
        const laneBlocked = obstaclesRef.current.some(o => 
             Math.abs(o.getBounds().left - laneX) < 30 && // Check same lane
             o.getBounds().top < 200 // More clearance needed for mixed traffic
        );

        if (!laneBlocked) {
             const typeRoll = Math.random();
             let obs: GameObject;

             if (typeRoll < 0.2) {
                // 20% Chance for Static Barrier (Cone)
                obs = new Barrier(laneX + 5); 
             } else if (typeRoll < 0.4) {
                // 20% Chance for Truck (Big, Slow moving forward -> Fast moving down)
                obs = new Truck(laneX - 5, 4.5 + Math.random());
             } else {
                // 60% Chance for Standard Car
                obs = new ObstacleCar(laneX, 2 + Math.random() * 2);
             }
             
             obstaclesRef.current.push(obs);
        }
    }

    // Polymorphic update for Obstacles
    obstaclesRef.current.forEach((obs, index) => {
      // Pass the complete obstacle list so enemies can avoid each other
      obs.update(deltaTime, {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        speedMultiplier: speedMultiplier,
        keys: keysRef.current,
        obstacles: obstaclesRef.current
      });

      // Collision Detection
      if (playerRef.current?.checkCollision(obs)) {
        // Collision point approx
        const bounds = playerRef.current.getBounds();
        particleSystemRef.current.emitSparks(bounds.left + bounds.width/2, bounds.top);
        handleGameOver();
        return; // Stop processing this frame
      }

      // Removal and Scoring
      if (obs.isOffScreen(CANVAS_HEIGHT)) {
        obstaclesRef.current.splice(index, 1);
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
    });
    
    // If game over was triggered in loop, don't draw
    if (gameState !== GameState.PLAYING) return;

    // --- DRAWING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Road
    roadRef.current.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Obstacles & Player
    obstaclesRef.current.forEach(obs => obs.draw(ctx));
    playerRef.current.draw(ctx);
    
    // Draw Particles (Sparks/Smoke on top)
    particleSystemRef.current.draw(ctx);

    // 3. Lighting Effects
    drawLighting(ctx);

    requestRef.current = requestAnimationFrame(animate);
  };
  
  const drawLighting = (ctx: CanvasRenderingContext2D) => {
      // 1. Draw Night Tint
      ctx.fillStyle = 'rgba(10, 15, 30, 0.4)'; // Blueish-black tint
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 2. Headlights
      if (!playerRef.current) return;
      
      const lights = playerRef.current.getHeadlightPositions();
      const beamLength = 250;
      const beamSpread = 60;
      
      ctx.save();
      // 'screen' blending mode adds light to the scene without over-whitening
      ctx.globalCompositeOperation = 'screen'; 
      
      lights.forEach(light => {
          // Create gradient for the beam
          // Coordinates are relative to canvas
          const grad = ctx.createLinearGradient(light.x, light.y, light.x, light.y - beamLength);
          grad.addColorStop(0, 'rgba(255, 255, 220, 0.5)'); // Bright at source
          grad.addColorStop(1, 'rgba(255, 255, 220, 0)');   // Fades out
          
          ctx.fillStyle = grad;
          
          ctx.beginPath();
          ctx.moveTo(light.x, light.y);
          ctx.lineTo(light.x - beamSpread, light.y - beamLength);
          ctx.lineTo(light.x + beamSpread, light.y - beamLength);
          ctx.fill();
      });
      
      ctx.restore();
  };

  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
    soundManagerRef.current?.stopEngine();
    soundManagerRef.current?.stopMusic();
    soundManagerRef.current?.playCrash();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const startGame = async () => {
    // Initialize audio context (requires user gesture)
    await soundManagerRef.current?.init();
    
    soundManagerRef.current?.startMusic();
    soundManagerRef.current?.startEngine();
    
    particleSystemRef.current.clear();

    setScore(0);
    scoreRef.current = 0;
    // Pass selected car type to PlayerCar
    playerRef.current = new PlayerCar(CANVAS_WIDTH, CANVAS_HEIGHT, selectedCar);
    obstaclesRef.current = [];
    lastTimeRef.current = 0;
    setGameState(GameState.PLAYING);
    requestRef.current = requestAnimationFrame(animate);
  };

  // Watch for state changes to start/stop loop
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);


  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-gray-800 w-full max-w-[400px] aspect-[2/3]">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block bg-gray-900 w-full h-full object-contain"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/50 text-white px-4 py-2 rounded-full font-mono font-bold text-xl border border-white/20">
          SCORE: {score}
        </div>
      </div>
      
      {/* Current Difficulty Indicator (while playing) */}
      {gameState === GameState.PLAYING && (
        <>
         <div className="absolute top-4 right-4 z-10">
             <div className={`px-2 py-1 rounded border border-white/20 bg-black/50 text-xs font-bold ${DIFFICULTY_CONFIG[difficulty].color}`}>
                 {DIFFICULTY_CONFIG[difficulty].label}
             </div>
         </div>
         
         {/* Mobile Touch Controls Overlay */}
         <div className="absolute inset-0 z-20 flex pointer-events-none">
            {/* Left Control Zone */}
            <div 
                className={`flex-1 flex items-end justify-start p-8 transition-colors duration-100 ${touchLeft ? 'bg-white/5' : ''}`}
                // Using pointer-events-auto to capture touches only on these zones
                style={{ pointerEvents: 'auto' }}
                onTouchStart={handleTouchStart('left')}
                onTouchEnd={handleTouchEnd('left')}
                onMouseDown={handleTouchStart('left')}
                onMouseUp={handleTouchEnd('left')}
                onMouseLeave={handleTouchEnd('left')}
            >
                <div className={`text-6xl text-white transition-opacity duration-150 ${touchLeft ? 'opacity-80' : 'opacity-20'}`}>
                    ‹
                </div>
            </div>

            {/* Right Control Zone */}
            <div 
                className={`flex-1 flex items-end justify-end p-8 transition-colors duration-100 ${touchRight ? 'bg-white/5' : ''}`}
                style={{ pointerEvents: 'auto' }}
                onTouchStart={handleTouchStart('right')}
                onTouchEnd={handleTouchEnd('right')}
                onMouseDown={handleTouchStart('right')}
                onMouseUp={handleTouchEnd('right')}
                onMouseLeave={handleTouchEnd('right')}
            >
                <div className={`text-6xl text-white transition-opacity duration-150 ${touchRight ? 'opacity-80' : 'opacity-20'}`}>
                    ›
                </div>
            </div>
         </div>
        </>
      )}

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-30">
          <h1 className="text-4xl font-extrabold italic tracking-wider mb-6 text-yellow-400">
            CAR RACER
          </h1>
          
          <div className="flex flex-col gap-6 items-center w-full px-8">
            {/* Difficulty Selector */}
            <div className="flex gap-2 flex-wrap justify-center">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setDifficulty(mode)}
                        className={`px-3 py-1 rounded text-xs font-bold border-2 transition-all ${
                            difficulty === mode 
                            ? `border-white bg-white/20 ${DIFFICULTY_CONFIG[mode].color}` 
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {DIFFICULTY_CONFIG[mode].label}
                    </button>
                ))}
            </div>

            {/* Car Selector */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 w-full justify-center">
                <button 
                    onClick={() => {
                        const cars = Object.values(CarType);
                        const idx = cars.indexOf(selectedCar);
                        const prev = idx === 0 ? cars.length - 1 : idx - 1;
                        setSelectedCar(cars[prev]);
                    }}
                    className="text-white hover:text-yellow-400 text-2xl font-bold px-2"
                >
                    ‹
                </button>
                
                <div className="flex flex-col items-center min-w-[120px]">
                    <div 
                        className="w-12 h-20 mb-2 rounded shadow-lg relative"
                        style={{ backgroundColor: CAR_CONFIGS[selectedCar].color }}
                    >
                        {/* Preview Logic */}
                        {selectedCar === CarType.MUSCLE && (
                           <>
                             <div className="absolute top-0 bottom-0 left-1/2 w-1 -ml-1.5 bg-black/50"></div>
                             <div className="absolute top-0 bottom-0 left-1/2 w-1 ml-0.5 bg-black/50"></div>
                           </>
                        )}
                        {selectedCar === CarType.F1 && (
                            <>
                                <div className="absolute -left-1 top-4 w-1 h-4 bg-gray-800"></div>
                                <div className="absolute -right-1 top-4 w-1 h-4 bg-gray-800"></div>
                                <div className="absolute -left-1 bottom-4 w-1 h-5 bg-gray-800"></div>
                                <div className="absolute -right-1 bottom-4 w-1 h-5 bg-gray-800"></div>
                            </>
                        )}
                        {selectedCar === CarType.CLASSIC && (
                            <>
                                <div className="absolute left-0 right-0 top-0 h-1 bg-white/50"></div>
                                <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/50"></div>
                                <div className="absolute left-2 right-2 top-6 h-6 bg-white/20 rounded"></div>
                            </>
                        )}
                        {selectedCar === CarType.FUTURE && (
                            <>
                                <div className="absolute left-1/2 top-0 bottom-0 w-1 -ml-0.5 bg-cyan-400/80"></div>
                                <div className="absolute left-0 top-4 w-1 h-12 bg-purple-500/50"></div>
                                <div className="absolute right-0 top-4 w-1 h-12 bg-purple-500/50"></div>
                            </>
                        )}
                         {selectedCar === CarType.TRUCK && (
                            <>
                                <div className="absolute left-0 top-8 right-0 bottom-0 bg-black/20"></div>
                                <div className="absolute -left-1 top-2 w-1 h-4 bg-black"></div>
                                <div className="absolute -right-1 top-2 w-1 h-4 bg-black"></div>
                                <div className="absolute -left-1 bottom-6 w-1 h-5 bg-black"></div>
                                <div className="absolute -right-1 bottom-6 w-1 h-5 bg-black"></div>
                            </>
                        )}
                    </div>
                    <span className="font-mono font-bold text-sm tracking-widest text-white">
                        {CAR_CONFIGS[selectedCar].name}
                    </span>
                </div>

                <button 
                     onClick={() => {
                        const cars = Object.values(CarType);
                        const idx = cars.indexOf(selectedCar);
                        const next = idx === cars.length - 1 ? 0 : idx + 1;
                        setSelectedCar(cars[next]);
                    }}
                    className="text-white hover:text-yellow-400 text-2xl font-bold px-2"
                >
                    ›
                </button>
            </div>

            <button
                onClick={startGame}
                className="w-full max-w-xs px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
            >
                START ENGINE
            </button>
          </div>
          
          <p className="mt-4 text-gray-500 text-xs">Turn on volume • Tap sides to steer</p>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-30">
          <h2 className="text-5xl font-black text-red-500 mb-2">CRASHED!</h2>
          <p className="text-xl mb-6">Final Score: {score}</p>
          <div className="mb-6 flex flex-col items-center gap-2">
             <div className="flex gap-2 text-sm">
                <span className="text-gray-400">Mode:</span>
                <span className={`font-bold ${DIFFICULTY_CONFIG[difficulty].color}`}>{DIFFICULTY_CONFIG[difficulty].label}</span>
             </div>
             <div className="flex gap-2 text-sm">
                <span className="text-gray-400">Car:</span>
                <span className="font-bold text-white">{CAR_CONFIGS[selectedCar].name}</span>
             </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded shadow-[0_4px_0_rgb(100,100,100)] active:shadow-none active:translate-y-1 transition-all"
          >
            TRY AGAIN
          </button>
          <button 
             onClick={() => setGameState(GameState.MENU)}
             className="mt-4 text-sm text-gray-400 hover:text-white underline"
          >
             Back to Menu
          </button>
        </div>
      )}
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/30 text-xs pointer-events-none">
        Tap Left / Right to Steer
      </div>
    </div>
  );
};