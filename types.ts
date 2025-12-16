export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXTREME = 'EXTREME'
}

export enum CarType {
  SPORTS = 'SPORTS',
  F1 = 'F1',
  MUSCLE = 'MUSCLE',
  CLASSIC = 'CLASSIC',
  FUTURE = 'FUTURE',
  TRUCK = 'TRUCK'
}

export interface InputKeys {
  left: boolean;
  right: boolean;
}

export interface IGameObject {
  getBounds(): { left: number, right: number, top: number, bottom: number };
}

export interface GameContext {
  canvasWidth: number;
  canvasHeight: number;
  speedMultiplier: number;
  keys: InputKeys;
  obstacles: IGameObject[];
}