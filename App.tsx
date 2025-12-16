import React from 'react';
import { RacingGame } from './components/RacingGame';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Car Racing Game</h1>
      </div>
      
      <RacingGame />
      
      <footer className="mt-8 text-gray-500 text-sm">
        React • TypeScript • Tailwind • HTML5 Canvas
      </footer>
    </div>
  );
};

export default App;