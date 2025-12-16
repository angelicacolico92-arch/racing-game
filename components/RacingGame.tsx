import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, InputKeys } from '../types';
import { PlayerCar, ObstacleCar, Road } from '../game/engine';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export const RacingGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  
  // Game Loop Refs (to avoid re-renders)
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const playerRef = useRef<PlayerCar | null>(null);
  const obstaclesRef = useRef<ObstacleCar[]>([]);
  const roadRef = useRef<Road>(new Road());
  const keysRef = useRef<InputKeys>({ left: false, right: false });
  const scoreRef = useRef(0);

  // Input Handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') keysRef.current.left = true;
    if (e.key === 'ArrowRight') keysRef.current.right = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') keysRef.current.left = false;
    if (e.key === 'ArrowRight') keysRef.current.right = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Main Game Loop
  const animate = (time: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !playerRef.current) return;

    // --- LOGIC UPDATE ---

    // Difficulty scaling: Speed increases with score
    const speedMultiplier = 1 + (scoreRef.current * 0.05);

    // Polymorphic update for Road
    roadRef.current.update(deltaTime, speedMultiplier);

    // Polymorphic update for Player
    playerRef.current.update(deltaTime, {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      speedMultiplier: 1, // Player moves at base speed
      keys: keysRef.current
    });

    // Spawn Obstacles
    if (Math.random() < 0.02) {
        // Random lane positions
        const lanes = [50, 150, 250, 300]; 
        const x = lanes[Math.floor(Math.random() * lanes.length)];
        const obs = new ObstacleCar(x, 2 + Math.random() * 2);
        
        // Check overlap with existing obstacles to avoid unfair spawns
        const overlap = obstaclesRef.current.some(o => 
             Math.abs(o.getBounds().top - (-100)) < 150 // Vertical distance check
        );

        if (!overlap) {
            obstaclesRef.current.push(obs);
        }
    }

    // Polymorphic update for Obstacles
    obstaclesRef.current.forEach((obs, index) => {
      obs.update(deltaTime, {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        speedMultiplier: speedMultiplier,
        keys: keysRef.current
      });

      // Collision Detection
      if (playerRef.current?.checkCollision(obs)) {
        setGameState(GameState.GAME_OVER);
      }

      // Removal and Scoring
      if (obs.isOffScreen(CANVAS_HEIGHT)) {
        obstaclesRef.current.splice(index, 1);
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
    });

    // --- DRAWING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Road
    roadRef.current.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Player
    playerRef.current.draw(ctx);

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => obs.draw(ctx));

    requestRef.current = requestAnimationFrame(animate);
  };

  const startGame = () => {
    setScore(0);
    scoreRef.current = 0;
    playerRef.current = new PlayerCar(CANVAS_WIDTH, CANVAS_HEIGHT);
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
    <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-gray-800">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block bg-gray-900"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/50 text-white px-4 py-2 rounded-full font-mono font-bold text-xl border border-white/20">
          SCORE: {score}
        </div>
      </div>

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
          <h1 className="text-4xl font-extrabold italic tracking-wider mb-8 text-yellow-400">
            CAR RACER
          </h1>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
          >
            START ENGINE
          </button>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white">
          <h2 className="text-5xl font-black text-red-500 mb-2">CRASHED!</h2>
          <p className="text-xl mb-6">Final Score: {score}</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded shadow-[0_4px_0_rgb(100,100,100)] active:shadow-none active:translate-y-1 transition-all"
          >
            TRY AGAIN
          </button>
        </div>
      )}
      
      {/* Mobile Controls Hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-sm">
        Use Arrow Keys to Move
      </div>
    </div>
  );
};