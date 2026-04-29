
import React, { useRef, useEffect, useState } from 'react';
import { Player, Obstacle, Coin, Particle, SETTINGS, ObstacleType, Lane } from '../gameLogic';
import { GameState } from '../App';

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onGameOver, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Game state refs (to avoid stale closures in loop)
  const playerRef = useRef(new Player());
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const speedRef = useRef(SETTINGS.initialSpeed);
  const lastSpawnZ = useRef(0);
  const lastSpacePress = useRef(0);
  const lightningRef = useRef(0);
  const rainRef = useRef<{x: number, y: number, length: number, speed: number}[]>([]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resizing
  useEffect(() => {
    if (!canvasRef.current || !canvasRef.current.parentElement) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    });

    resizeObserver.observe(canvasRef.current.parentElement);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize/Reset Game
  useEffect(() => {
    if (gameState === 'PLAYING') {
      playerRef.current = new Player();
      obstaclesRef.current = [];
      coinsRef.current = [];
      particlesRef.current = [];
      scoreRef.current = 0;
      distanceRef.current = 0;
      speedRef.current = SETTINGS.initialSpeed;
      lastSpawnZ.current = 2000;
      onScoreUpdate(0);
    }
  }, [gameState]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          playerRef.current.moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          playerRef.current.moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          const now = Date.now();
          if (e.key === ' ' && now - lastSpacePress.current < 300) {
            const activated = playerRef.current.activateInvincibility(distanceRef.current);
            if (activated) playSound('collect'); // Using collect sound for power-up
          }
          lastSpacePress.current = now;
          playerRef.current.jump();
          playSound('jump');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          playerRef.current.slide();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Audio helper
  const rainSoundRef = useRef<AudioContext | null>(null);
  
  const playSound = (type: 'collect' | 'hit' | 'jump' | 'thunder') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const noise = ctx.createGain();
    
    osc.connect(noise);
    noise.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'collect') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      noise.gain.setValueAtTime(0.1, now);
      noise.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
      noise.gain.setValueAtTime(0.5, now);
      noise.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      noise.gain.setValueAtTime(0.1, now);
      noise.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'thunder') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(20, now + 1);
      noise.gain.setValueAtTime(0.2, now);
      noise.gain.exponentialRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    }
  };

  // Rain Sound Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (rainSoundRef.current) {
        rainSoundRef.current.close();
        rainSoundRef.current = null;
      }
      return;
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
    rainSoundRef.current = ctx;

    return () => {
      if (rainSoundRef.current) {
        rainSoundRef.current.close();
        rainSoundRef.current = null;
      }
    };
  }, [gameState]);

  // Touch controls
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart.current || gameState !== 'PLAYING') return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 40) playerRef.current.moveRight();
      else if (dx < -40) playerRef.current.moveLeft();
    } else {
      if (dy > 40) playerRef.current.slide();
      else if (dy < -40) {
          playerRef.current.jump();
          playSound('jump');
      }
    }
    touchStart.current = null;
  };

  const project = (x: number, y: number, z: number, w: number, h: number) => {
    const cameraHeight = 600; // Drone height above ground
    const focalLength = 500;
    const scale = focalLength / (focalLength + z);
    
    const centerX = w / 2;
    const centerY = h * 0.15; // Raised vanishing point for overhead look
    
    return {
      px: centerX + x * scale,
      py: centerY + (y + cameraHeight) * scale,
      pScale: scale
    };
  };

  const spawnEntity = () => {
    const z = 4000;
    const lane = (Math.floor(Math.random() * 3) - 1) as Lane;
    
    // Check if space is clear
    const tooClose = obstaclesRef.current.some(o => Math.abs(o.z - z) < 400 && o.lane === lane);
    if (tooClose) return;

    if (Math.random() > 0.4) {
      const types: ObstacleType[] = ['BARRIER', 'TRAIN', 'LOW_BAR'];
      const type = types[Math.floor(Math.random() * types.length)];
      obstaclesRef.current.push(new Obstacle(lane, z, type));
    } else {
      // Spawn a row of coins
      for (let i = 0; i < 5; i++) {
        coinsRef.current.push(new Coin(lane, z + i * 150));
      }
    }
  };

  const gameLoop = (time: number) => {
    if (gameState === 'PLAYING') {
      const w = dimensions.width;
      const h = dimensions.height;
      
      // 1. Logic Update
      const currentSpeed = speedRef.current;
      speedRef.current = Math.min(SETTINGS.maxSpeed, currentSpeed + SETTINGS.speedIncrement);
      distanceRef.current += currentSpeed;
      
      playerRef.current.update(currentSpeed, distanceRef.current);
      
      // Update Obstacles
      obstaclesRef.current = obstaclesRef.current.filter(o => o.z > -400);
      for (const o of obstaclesRef.current) {
        o.update(currentSpeed);
        
        // Collision Detection
        const pZ = 0;
        const oStart = o.z;
        const oEnd = o.z + o.zLength;
        
        if (pZ >= oStart && pZ <= oEnd) {
          if (playerRef.current.lane === o.lane) {
             let hit = false;
             if (o.type === 'TRAIN') hit = true;
             if (o.type === 'BARRIER' && !playerRef.current.isJumping) hit = true;
             if (o.type === 'LOW_BAR' && !playerRef.current.isSliding) hit = true;
             
             if (hit) {
               if (playerRef.current.isInvincible) {
                 // Push obstacle away or just ignore
                 o.z = -500; // Remove obstacle
                 scoreRef.current += 500; // Bonus for smashing through
                 playSound('collect');
                 continue; 
               }
               playSound('hit');
               onGameOver(Math.floor(scoreRef.current + distanceRef.current / 10));
               return;
             }
          }
        }
      }

      // Update Coins
      coinsRef.current = coinsRef.current.filter(c => !c.collected && c.z > -100);
      coinsRef.current.forEach(c => {
        c.update(currentSpeed);
        if (!c.collected && Math.abs(c.z) < 50 && playerRef.current.lane === c.lane) {
          if (!playerRef.current.isJumping || c.z < 20) { 
             c.collected = true;
             scoreRef.current += 100;
             onScoreUpdate(Math.floor(scoreRef.current + distanceRef.current / 10));
             playSound('collect');
             
             // Particles
             for(let i=0; i<5; i++) {
               particlesRef.current.push(new Particle(SETTINGS.laneWidth * c.lane, -50, c.z, '#fbbf24'));
             }
          }
        }
      });

      // Update Particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => p.update());

      // Update Rain
      if (rainRef.current.length === 0) {
        for (let i = 0; i < 100; i++) {
          rainRef.current.push({
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            length: 10 + Math.random() * 20,
            speed: 15 + Math.random() * 10
          });
        }
      }
      rainRef.current.forEach(r => {
        r.y += r.speed;
        if (r.y > dimensions.height) {
          r.y = -r.length;
          r.x = Math.random() * dimensions.width;
        }
      });

      // Lightning Logic
      if (lightningRef.current > 0) {
        lightningRef.current -= 0.1;
      } else if (Math.random() > 0.995) {
        lightningRef.current = 1.0;
        playSound('thunder');
      }

      // Spawning (Distance adjusted by speed to avoid too much density at high speeds)
      const spawnInterval = 600 + (currentSpeed - SETTINGS.initialSpeed) * 20;
      if (distanceRef.current - lastSpawnZ.current > spawnInterval) {
        spawnEntity();
        lastSpawnZ.current = distanceRef.current;
      }

      // 2. Rendering
      render();
    } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        render(); // Background still renders
    }
    
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background (Sky - Stormy)
    ctx.fillStyle = lightningRef.current > 0.5 ? '#f8fafc' : '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Storm Clouds (Static but positioned relative to horizon)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)'; 
    for (let i = 0; i < 8; i++) {
        const cx = (i * 200 + distanceRef.current * 0.1) % w;
        ctx.beginPath();
        ctx.arc(cx, 120, 50, 0, Math.PI * 2);
        ctx.arc(cx + 40, 100, 70, 0, Math.PI * 2);
        ctx.arc(cx + 80, 120, 50, 0, Math.PI * 2);
        ctx.fill();
    }

    // Horizon line
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h * 0.15, w, 2);

    // Grid System (Static horizon lines moved to ground logic)
    
    // Road / Lanes
    const groundY = 0;
    const horizonZ = 4000;
    const laneColors = ['#0f172a', '#1e293b', '#0f172a']; // Stormy asphalt
    
    // Draw Lanes
    [-1, 0, 1].forEach((l, idx) => {
        const xStart = (l - 0.5) * SETTINGS.laneWidth;
        const xEnd = (l + 0.5) * SETTINGS.laneWidth;
        
        ctx.beginPath();
        const p1 = project(xStart, groundY, 0, w, h);
        const p2 = project(xEnd, groundY, 0, w, h);
        const p3 = project(xEnd, groundY, horizonZ, w, h);
        const p4 = project(xStart, groundY, horizonZ, w, h);
        
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p1.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p3.py);
        ctx.closePath();
        ctx.fillStyle = laneColors[idx];
        ctx.fill();

        // Lane markings (Daytime road lines)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Distance lines (scrolling road dots)
    const lineSpacing = 300;
    const offset = (distanceRef.current % lineSpacing);
    for (let z = lineSpacing - offset; z < horizonZ; z += lineSpacing) {
         const pLeft = project(-1.5 * SETTINGS.laneWidth, groundY, z, w, h);
         const pRight = project(1.5 * SETTINGS.laneWidth, groundY, z, w, h);
         
         // Road line
         ctx.beginPath();
         ctx.moveTo(pLeft.px, pLeft.py);
         ctx.lineTo(pRight.px, pRight.py);
         ctx.strokeStyle = 'rgba(255,255,255,0.1)';
         ctx.lineWidth = 2;
         ctx.stroke();

         // Roadside Objects (Trees/Posts)
         const drawPost = (laneX: number) => {
            const pPost = project(laneX, 0, z, w, h);
            if (pPost.pScale > 0) {
                const s = pPost.pScale;
                ctx.fillStyle = '#166534'; // Green
                ctx.fillRect(pPost.px - 10 * s, pPost.py - 100 * s, 20 * s, 100 * s);
                ctx.fillStyle = '#14532d';
                ctx.beginPath();
                ctx.arc(pPost.px, pPost.py - 110 * s, 30 * s, 0, Math.PI * 2);
                ctx.fill();
            }
         };
         drawPost(-2 * SETTINGS.laneWidth);
         drawPost(2 * SETTINGS.laneWidth);
    }

    // Render Coins
    coinsRef.current.forEach(c => {
      const p = project(c.lane * SETTINGS.laneWidth, -30, c.z, w, h);
      if (p.pScale > 0) {
        const r = 15 * p.pScale;
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * p.pScale;
        ctx.stroke();
      }
    });

    // Render Obstacles (Buses)
    obstaclesRef.current.forEach(o => {
      const p = project(o.lane * SETTINGS.laneWidth, 0, o.z, w, h);
      const pEnd = project(o.lane * SETTINGS.laneWidth, 0, o.z + o.zLength, w, h);

      if (p.pScale > 0) {
        const s = p.pScale;
        const rectW = o.width * s;
        const rectH = o.height * s;
        const x = p.px - rectW / 2;
        const y = p.py - rectH;

        // Determine Bus Color
        let busColor = '#ef4444'; // default red
        if (o.type === 'TRAIN') busColor = '#3b82f6'; // blue bus
        if (o.type === 'LOW_BAR') busColor = '#eab308'; // yellow bus
        
        ctx.save();
        
        // Draw Bus Body (Main)
        ctx.fillStyle = busColor;
        ctx.fillRect(x, y, rectW, rectH);
        
        // Front Window (Windshield)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + rectW * 0.1, y + rectH * 0.1, rectW * 0.8, rectH * 0.4);
        
        // Headlights
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10 * s;
        ctx.shadowColor = '#fff';
        ctx.fillRect(x + rectW * 0.1, y + rectH * 0.7, rectW * 0.15, rectH * 0.15);
        ctx.fillRect(x + rectW * 0.75, y + rectH * 0.7, rectW * 0.15, rectH * 0.15);
        ctx.shadowBlur = 0;

        // Draw Side (Perspective)
        if (pEnd.pScale > 0) {
          const sEnd = pEnd.pScale;
          const rectWEnd = o.width * sEnd;
          const rectHEnd = o.height * sEnd;
          const xEnd = pEnd.px - rectWEnd/2;
          const yEnd = pEnd.py - rectHEnd;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xEnd, yEnd);
          ctx.lineTo(xEnd + rectWEnd, yEnd);
          ctx.lineTo(x + rectW, y);
          ctx.closePath();
          ctx.fillStyle = busColor;
          ctx.globalAlpha = 0.8;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          
          // Side Windows
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          const midZ = (o.z + o.zLength/2);
          const pMid = project(o.lane * SETTINGS.laneWidth, 0, midZ, w, h);
          if (pMid.pScale > 0) {
              // Quick side window trapezoid
              ctx.beginPath();
              ctx.moveTo(x + rectW*0.1, y + rectH*0.15);
              ctx.lineTo(xEnd + rectWEnd*0.1, yEnd + rectHEnd*0.15);
              ctx.lineTo(xEnd + rectWEnd*0.1, yEnd + rectHEnd*0.45);
              ctx.lineTo(x + rectW*0.1, y + rectH*0.45);
              ctx.fill();
          }
        }

        // Bumper/Grill
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y + rectH * 0.8, rectW, rectH * 0.2);

        ctx.restore();
      }
    });

    // Render Player (Stylized Cartoon Runner)
    const player = playerRef.current;
    const pPos = project(player.currentVisualLane * SETTINGS.laneWidth, player.y, 0, w, h);
    
    if (pPos.pScale > 0) {
      const s = pPos.pScale;
      const runCycle = (distanceRef.current * 0.05) % (Math.PI * 2);
      const headScale = 1.1; // Slightly larger head for cartoon look
      const headY = player.isSliding ? -35 * s : -80 * s;
      const torsoY = player.isSliding ? -25 * s : -45 * s;
      
      ctx.save();
      ctx.translate(pPos.px, pPos.py);
      
      // Invincibility Glow
      if (player.isInvincible) {
        ctx.beginPath();
        ctx.arc(0, headY, 40 * s, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, headY, 10 * s, 0, headY, 40 * s);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.shadowBlur = 20 * s;
        ctx.shadowColor = '#fef08a';
      }

      // Shadow
      ctx.beginPath();
      ctx.ellipse(0, 5 * s, 25 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fill();

      // Style Variables - Vibrant "Subway" Palette
      const hoodieColor = '#06b6d4'; // Bright Cyan Hoodie
      const jeansColor = '#334155';  // Darker baggy jeans
      const sneakerColor = '#ffffff'; // White kicks
      const skinColor = '#ffedd5';   // Light skin
      const hairColor = '#451a03';   // Brown hair
      const capColor = '#ef4444';    // Red backwards cap

      // 1. Legs (Baggy Jeans & Sneakers)
      ctx.strokeStyle = jeansColor;
      ctx.lineWidth = 10 * s; // Thicker for baggy jeans
      ctx.lineCap = 'round';

      if (!player.isJumping && !player.isSliding) {
        const leg1Animate = Math.sin(runCycle) * 22 * s;
        const leg2Animate = Math.sin(runCycle + Math.PI) * 22 * s;

        // Leg 1
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5 * s);
        ctx.lineTo(leg1Animate, -15 * s);
        ctx.lineTo(leg1Animate * 0.9, 0);
        ctx.stroke();
        // Sneaker 1
        ctx.fillStyle = sneakerColor;
        ctx.fillRect(leg1Animate * 0.9 - 6 * s, -6 * s, 12 * s, 6 * s);

        // Leg 2
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5 * s);
        ctx.lineTo(leg2Animate, -15 * s);
        ctx.lineTo(leg2Animate * 0.9, 0);
        ctx.stroke();
        // Sneaker 2
        ctx.fillStyle = sneakerColor;
        ctx.fillRect(leg2Animate * 0.9 - 6 * s, -6 * s, 12 * s, 6 * s);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5 * s);
        ctx.lineTo(-12 * s, player.isSliding ? -5 * s : -10 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 5 * s);
        ctx.lineTo(12 * s, player.isSliding ? -5 * s : -10 * s);
        ctx.stroke();
      }

      // 2. Torso (Hoodie with Hood detail)
      ctx.fillStyle = hoodieColor;
      ctx.beginPath();
      // Main hoodie body
      ctx.roundRect(-10 * s, headY + 12 * s, 20 * s, (torsoY + 15 * s) - (headY + 12 * s), 6 * s);
      ctx.fill();
      
      // Hood (The actual hood hanging back)
      ctx.beginPath();
      ctx.arc(0, headY + 12 * s, 10 * s, 0, Math.PI);
      ctx.fillStyle = hoodieColor;
      ctx.fill();

      // 3. Arms (Hoodie sleeves - slightly oversized sleeves)
      ctx.strokeStyle = hoodieColor;
      ctx.lineWidth = 6 * s;
      const armCycle = runCycle + Math.PI / 2;
      const arm1Animate = Math.sin(armCycle) * 18 * s;
      const arm2Animate = Math.sin(armCycle + Math.PI) * 18 * s;

      if (!player.isSliding) {
        ctx.beginPath();
        ctx.moveTo(-8 * s, headY + 18 * s);
        ctx.lineTo(-8 * s + arm1Animate, torsoY + 10 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8 * s, headY + 18 * s);
        ctx.lineTo(8 * s + arm2Animate, torsoY + 10 * s);
        ctx.stroke();

        // Hands
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(-8 * s + arm1Animate, torsoY + 10 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8 * s + arm2Animate, torsoY + 10 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Head & Backwards Cap
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(0, headY, 10 * s * headScale, 0, Math.PI * 2);
      ctx.fill();

      // Backwards Cap
      ctx.fillStyle = capColor;
      ctx.beginPath();
      // Main cap body
      ctx.arc(0, headY - 2 * s, 11 * s * headScale, Math.PI, 0);
      ctx.fill();
      // Brim facing backwards (negative x direction or just shorter)
      ctx.fillRect(-18 * s * headScale, headY - 4 * s, 10 * s, 3 * s);

      // Hair (peeking from cap)
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, headY - 3 * s, 10 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.lineWidth = 2 * s;
      ctx.stroke();

      // Eyes (Cartoon circles)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(4 * s, headY - 2 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.arc(-4 * s, headY - 2 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();

      // 5. Movement trail
      if (gameState === 'PLAYING') {
        const pw = 40 * s;
        ctx.beginPath();
        ctx.moveTo(-pw/2, 0);
        ctx.lineTo(-pw/2 - 5, 10);
        ctx.lineTo(pw/2 + 5, 10);
        ctx.lineTo(pw/2, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }

      ctx.restore();
    }

    // Render Particles
    particlesRef.current.forEach(p => {
       const pos = project(p.x, p.y, p.z, w, h);
       ctx.globalAlpha = p.life;
       ctx.fillStyle = p.color;
       ctx.fillRect(pos.px, pos.py, 4 * pos.pScale, 4 * pos.pScale);
    });
    ctx.globalAlpha = 1.0;

    // Render Shield/Invincibility UI
    if (gameState === 'PLAYING') {
      const barW = 200;
      const barH = 8;
      const x = (w - barW) / 2;
      const y = 80;
      
      const cooldownProgress = player.getShieldCooldownProgress(distanceRef.current);
      
      if (player.isInvincible) {
        // Active state
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, barW, barH);
        const activeProgress = player.invincibleTimer / 300;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x, y, barW * activeProgress, barH);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHIELD ACTIVE', w / 2, y - 5);
      } else if (cooldownProgress < 1) {
        // Charging state
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x, y, barW * cooldownProgress, barH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`RECHARGING SHIELD (${Math.floor(cooldownProgress * 100)}%)`, w / 2, y - 5);
      } else {
        // Ready state
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHIELD READY (DOUBLE SPACE)', w / 2, y - 5);
      }
    }

    // Render Rain
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    rainRef.current.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.length);
      ctx.stroke();
    });
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, dimensions]);

  return (
    <canvas 
      ref={canvasRef}
      onMouseDown={(e) => {
          // Mock touch start for mouse swipe?
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

export default GameCanvas;
