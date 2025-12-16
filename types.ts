export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface InputKeys {
  left: boolean;
  right: boolean;
}

export interface GameContext {
  canvasWidth: number;
  canvasHeight: number;
  speedMultiplier: number;
  keys: InputKeys;
}