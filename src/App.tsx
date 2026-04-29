/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Settings, HelpCircle, FastForward } from 'lucide-react';
import GameCanvas from './components/GameCanvas';

export type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('neon-runner-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('neon-runner-highscore', finalScore.toString());
    }
    setGameState('GAMEOVER');
  };

  const startGame = () => {
    setGameState('PLAYING');
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-white">
      {/* Game Canvas Layer */}
      <GameCanvas 
        gameState={gameState} 
        onGameOver={handleGameOver} 
        onScoreUpdate={setScore}
      />

      {/* UI Overlay */}
      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-row items-center justify-center bg-neutral-950/80 backdrop-blur-sm p-12"
          >
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-1/2 border-r border-neutral-800 pr-12 flex flex-col justify-center items-end text-right"
            >
              <h1 className="text-8xl font-black tracking-tighter leading-none mb-4 italic">
                NEON<br />
                <span className="text-cyan-500">RUNNER</span>
              </h1>
              <p className="text-neutral-400 max-w-xs uppercase tracking-widest text-[10px] leading-relaxed">
                An endless geometric descent into the digital void. Navigate the grid, survive the surge.
              </p>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-1/2 pl-12 flex flex-col justify-center items-start"
            >
              <button 
                onClick={startGame}
                className="group relative px-10 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-xl hover:bg-cyan-400 transition-colors"
              >
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white group-hover:border-cyan-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white group-hover:border-cyan-400" />
                INITIALIZE RUN
              </button>

              <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500" /> [&uarr;] Jump</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500" /> [&darr;] Slide</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500" /> [&larr;] Left</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500" /> [&rarr;] Right</div>
              </div>

              <div className="mt-12 flex flex-col items-start opacity-50">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">Record Streak</p>
                <p className="text-3xl font-black italic tracking-tighter tabular-nums">{highScore}</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none z-10"
          >
            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">Currency</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                <span className="text-2xl font-black tabular-nums">{Math.floor(score / 10)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">Distance</div>
              <div className="text-4xl font-black italic tracking-tighter tabular-nums">
                {score}m
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">Status</div>
              <div className="text-xl font-black text-cyan-400 italic">SYSTEM ACTIVE</div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-6xl font-black tracking-tighter mb-2 italic">SYSTEM CRASH</h2>
              <p className="text-red-200 uppercase tracking-[0.3em] text-xs mb-12 font-bold">Collision detected in sector 7</p>
              
              <div className="flex gap-16 mb-16 text-center justify-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-300 uppercase tracking-[0.3em] mb-1 font-bold">Final Distance</span>
                  <span className="text-6xl font-black tabular-nums italic">{score}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-300 uppercase tracking-[0.3em] mb-1 font-bold">Previous Best</span>
                  <span className="text-6xl font-black opacity-30 tabular-nums italic">{highScore}</span>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative px-12 py-4 border-2 border-white text-white font-black uppercase tracking-widest text-lg hover:bg-white hover:text-red-950 transition-all active:scale-95"
              >
                REBOOT SYSTEM
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed multiplier hint - tiny indicator */}
      {gameState === 'PLAYING' && score > 0 && score % 1000 < 50 && (
         <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-8 right-8 flex items-center gap-2 text-cyan-400/80 font-bold"
         >
           <FastForward className="w-4 h-4" />
           <span className="text-xs uppercase tracking-widest">Speed Increasing...</span>
         </motion.div>
      )}
    </div>
  );
}
