import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

const INITIAL_TYPES = [
  { id: 't1', label: '1x1', size: [1, 1] },
  { id: 't2', label: '1x2', size: [1, 2] },
  { id: 't3', label: '2x2', size: [2, 2] },
  { id: 't4', label: '2x4', size: [2, 4] },
];

const COLORS = ['#FF4D4D', '#4D79FF', '#FFD700', '#4CAF50', '#1A1A1A', '#FFFFFF', '#CCCCCC', '#FF8C00', '#E91E63', '#9C27B0'];

const TEMPLATES = [
  { id: 'tower', name: 'Tower', icon: '🏗️', blocks: [
    { pos: [0, 0, 0], type: [2, 2], color: '#4D79FF' },
    { pos: [0, 1, 0], type: [2, 2], color: '#4D79FF' },
    { pos: [0, 2, 0], type: [2, 2], color: '#4D79FF' },
    { pos: [0, 3, 0], type: [1, 1], color: '#FF4D4D' },
  ]},
  { id: 'wall', name: 'Wall', icon: '🧱', blocks: [
    { pos: [0, 0, 0], type: [2, 4], color: '#FF8C00' },
    { pos: [2, 0, 0], type: [2, 4], color: '#FF8C00' },
    { pos: [0, 1, 0], type: [2, 4], color: '#FF8C00' },
    { pos: [2, 1, 0], type: [2, 4], color: '#FF8C00' },
  ]},
  { id: 'house', name: 'House', icon: '🏠', blocks: [
    { pos: [0, 0, 0], type: [2, 4], color: '#4CAF50' },
    { pos: [2, 0, 0], type: [2, 4], color: '#4CAF50' },
    { pos: [0, 1, 0], type: [2, 4], color: '#4CAF50' },
    { pos: [2, 1, 0], type: [2, 4], color: '#4CAF50' },
    { pos: [1, 2, 0], type: [2, 2], color: '#FF4D4D' },
  ]},
];

const ACHIEVEMENTS = [
  { id: 'first', name: 'First Step', desc: 'Place 1 block', target: 1, icon: '🌟' },
  { id: 'ten', name: 'Builder', desc: 'Place 10 blocks', target: 10, icon: '🔨' },
  { id: 'fifty', name: 'Architect', desc: 'Place 50 blocks', target: 50, icon: '🏛️' },
  { id: 'hundred', name: 'Master', desc: 'Place 100 blocks', target: 100, icon: '👑' },
];

function playPlaceSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playDeleteSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

function playAchievementSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  } catch {}
}

const Particle = ({ position, color, onComplete }: { position: [number, number, number]; color: string; onComplete: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  const velocity = useRef([
    (Math.random() - 0.5) * 0.3,
    Math.random() * 0.4 + 0.2,
    (Math.random() - 0.5) * 0.3
  ]);
  const life = useRef(1);

  useFrame((_, delta) => {
    if (!ref.current) return;
    life.current -= delta * 2;
    if (life.current <= 0) { onComplete(); return; }
    ref.current.position.x += velocity.current[0] * delta;
    ref.current.position.y += velocity.current[1] * delta;
    ref.current.position.z += velocity.current[2] * delta;
    velocity.current[1] -= delta * 2;
    ref.current.scale.setScalar(life.current);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = life.current;
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial color={color} transparent opacity={1} />
    </mesh>
  );
};

const LegoBlock = ({
  position = [0, 0, 0],
  color = '#FF4D4D',
  type = [1, 1],
  isPreview = false,
  blockId,
  animateDrop = false,
  rotation = 0
}: any) => {
  const [w, d] = type;
  const groupRef = useRef();
  const [dropProgress, setDropProgress] = useState(animateDrop ? 0 : 1);
  const targetY = isPreview ? position[1] : position[1] + 1;

  useFrame((_, delta) => {
    if (!isPreview && groupRef.current) {
      if (dropProgress < 1) {
        const newProgress = Math.min(dropProgress + delta * 2.5, 1);
        setDropProgress(newProgress);
        const eased = 1 - Math.pow(1 - newProgress, 3);
        const bounce = Math.sin(newProgress * Math.PI * 3) * (1 - newProgress) * 0.4;
        (groupRef.current as any).position.y = targetY + 5 * (1 - eased) + bounce;
        (groupRef.current as any).rotation.y = rotation + (1 - eased) * Math.PI * 0.5;
      } else {
        (groupRef.current as any).position.y = targetY;
        (groupRef.current as any).rotation.y = rotation;
      }
    }
  });

  const studs = useMemo(() => {
    const s = [];
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        s.push(
          <mesh key={`${i}-${j}`} position={[i - (w - 1) / 2, 0.55, j - (d - 1) / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
            <meshStandardMaterial color={color} transparent={isPreview} opacity={isPreview ? 0.5 : 1} />
          </mesh>
        );
      }
    }
    return s;
  }, [w, d, color, isPreview]);

  return (
    <group
      ref={groupRef}
      position={isPreview ? position : [position[0], targetY, position[2]]}
      rotation={[0, rotation, 0]}
      userData={{ customId: blockId }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, 1, d]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.1}
          transparent={isPreview}
          opacity={isPreview ? 0.5 : 1}
          emissive={isPreview ? color : '#000000'}
          emissiveIntensity={isPreview ? 0.3 : 0}
        />
      </mesh>
      {studs}
    </group>
  );
};

const FloatingText = ({ text, position }: { text: string; position: [number, number, number] }) => {
  const ref = useRef<any>();
  const [opacity, setOpacity] = useState(1);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y += delta * 2;
    setOpacity(prev => Math.max(0, prev - delta * 1.5));
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <planeGeometry args={[2, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

export default function LegoStudio() {
  const [blocks, setBlocks] = useState([
    { id: 'start', pos: [0, 0, 0], color: '#FF4D4D', type: [1, 1], animateDrop: false, rotation: 0 }
  ]);
  const [blockTypes, setBlockTypes] = useState(INITIAL_TYPES);
  const [selectedSize, setSelectedSize] = useState([1, 1]);
  const [selectedColor, setSelectedColor] = useState('#FF4D4D');
  const [mode, setMode] = useState('add');
  const [previewPos, setPreviewPos] = useState(null);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [customW, setCustomW] = useState(2);
  const [customD, setCustomD] = useState(2);
  const [rotation, setRotation] = useState(0);
  const [particles, setParticles] = useState<{ id: string; pos: [number, number, number]; color: string }[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([[]]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [randomColor, setRandomColor] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const controlsRef = useRef();
  const comboTimer = useRef<any>(null);

  const totalBlocks = blocks.length;

  const triggerAchievement = useCallback((id: string) => {
    if (!achievements.includes(id)) {
      setAchievements(prev => [...prev, id]);
      setShowAchievement(id);
      playAchievementSound();
      setTimeout(() => setShowAchievement(null), 3000);
    }
  }, [achievements]);

  useEffect(() => {
    ACHIEVEMENTS.forEach(a => {
      if (totalBlocks >= a.target) triggerAchievement(a.id);
    });
  }, [totalBlocks, triggerAchievement]);

  const addParticles = useCallback((pos: [number, number, number], color: string) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: `p-${Date.now()}-${i}`,
      pos: [pos[0], pos[1] + 0.5, pos[2]] as [number, number, number],
      color
    }));
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const removeParticle = useCallback((id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length <= 1) return;
    const prev = undoStack[undoStack.length - 2];
    setRedoStack(r => [...r, blocks]);
    setBlocks(prev);
    setUndoStack(u => u.slice(0, -1));
  }, [undoStack, blocks]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, next]);
    setBlocks(next);
    setRedoStack(r => r.slice(0, -1));
  }, [redoStack]);

  const pushUndo = useCallback((newBlocks: any[]) => {
    setUndoStack(u => [...u, newBlocks]);
    setRedoStack([]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        setRotation(r => r + Math.PI / 4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleCreateCustom = () => {
    const newType = {
      id: `custom-${Date.now()}`,
      label: `${customW}x${customD}`,
      size: [customW, customD]
    };
    setBlockTypes([...blockTypes, newType]);
    setSelectedSize([customW, customD]);
    setShowCreator(false);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (mode !== 'add' || e.intersections.length === 0) return;
    const { face, object } = e.intersections[0];
    const parentPos = object.parent.position;
    const normal = face.normal;
    const newPos = [
      Math.round(parentPos.x + normal.x),
      Math.round(parentPos.y + normal.y),
      Math.round(parentPos.z + normal.z)
    ];
    if (isPositionOccupied(newPos, selectedSize)) {
      const highestY = getHighestBlockAtPosition(newPos, selectedSize);
      if (highestY >= 0) newPos[1] = highestY + 1;
    }
    setPreviewPos(newPos);
  };

  const isPositionOccupied = (pos: number[], size: number[]) => {
    const [w, d] = size;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const cellX = pos[0] + i - (w - 1) / 2;
        const cellZ = pos[2] + j - (d - 1) / 2;
        const occupyingBlock = blocks.find((b: any) => {
          const [bw, bd] = b.type;
          const bMinX = b.pos[0] - (bw - 1) / 2;
          const bMaxX = b.pos[0] + (bw - 1) / 2;
          const bMinZ = b.pos[2] - (bd - 1) / 2;
          const bMaxZ = b.pos[2] + (bd - 1) / 2;
          return cellX >= bMinX && cellX <= bMaxX && cellZ >= bMinZ && cellZ <= bMaxZ && Math.abs(b.pos[1] - pos[1]) < 0.5;
        });
        if (occupyingBlock) return true;
      }
    }
    return false;
  };

  const getHighestBlockAtPosition = (pos: number[], size: number[]) => {
    const [w, d] = size;
    let highestY = -1;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const cellX = pos[0] + i - (w - 1) / 2;
        const cellZ = pos[2] + j - (d - 1) / 2;
        blocks.forEach((b: any) => {
          const [bw, bd] = b.type;
          const bMinX = b.pos[0] - (bw - 1) / 2;
          const bMaxX = b.pos[0] + (bw - 1) / 2;
          const bMinZ = b.pos[2] - (bd - 1) / 2;
          const bMaxZ = b.pos[2] + (bd - 1) / 2;
          if (cellX >= bMinX && cellX <= bMaxX && cellZ >= bMinZ && cellZ <= bMaxZ) {
            highestY = Math.max(highestY, b.pos[1]);
          }
        });
      }
    }
    return highestY;
  };

  const handleZoom = (direction: string) => {
    if (!controlsRef.current) return;
    const factor = direction === 'in' ? 0.85 : 1.15;
    const camera = (controlsRef.current as any).object;
    camera.position.lerp((controlsRef.current as any).target, 1 - factor);
    (controlsRef.current as any).update();
  };

  const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  const handleAction = (e: any) => {
    e.stopPropagation();
    if (mode === 'delete') {
      const id = e.object.parent.userData?.customId;
      if (id) {
        playDeleteSound();
        const block = blocks.find((b: any) => b.id === id);
        if (block) addParticles(block.pos, block.color);
        const newBlocks = blocks.filter((b: any) => b.id !== id);
        setBlocks(newBlocks);
        pushUndo(newBlocks);
      }
      return;
    }
    if (previewPos) {
      playPlaceSound();
      addParticles(previewPos, selectedColor);
      const newBlock = {
        id: `b-${Math.random().toString(36).substr(2, 9)}`,
        pos: [...previewPos],
        color: randomColor ? getRandomColor() : selectedColor,
        type: [...selectedSize],
        animateDrop: true,
        rotation
      };
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      setCombo(c => {
        if (comboTimer.current) clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => setCombo(0), 2000);
        return c + 1;
      });
    }
  };

  const handlePlaceTemplate = (template: typeof TEMPLATES[0]) => {
    const newBlocks = template.blocks.map((b, i) => ({
      id: `tmpl-${Date.now()}-${i}`,
      pos: [...b.pos],
      color: b.color,
      type: [...b.type],
      animateDrop: true,
      rotation: 0
    }));
    setBlocks(prev => [...prev, ...newBlocks]);
    pushUndo([...blocks, ...newBlocks]);
    setShowTemplates(false);
  };

  const achievementData = ACHIEVEMENTS.find(a => a.id === showAchievement);

  return (
    <div className="w-full h-screen bg-[#F0F2F5] relative select-none overflow-hidden font-sans">
      {/* Achievement Popup */}
      {achievementData && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-4xl">{achievementData.icon}</span>
            <div>
              <div className="text-white font-black text-lg">{achievementData.name}</div>
              <div className="text-white/80 text-sm">{achievementData.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* Combo Indicator */}
      {combo > 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full shadow-lg">
            <span className="text-white font-black text-xl">COMBO x{combo}!</span>
          </div>
        </div>
      )}

      {/* Top Status */}
      <div className="absolute top-6 left-10 z-10">
        <h1 className="text-xl font-black text-gray-800 tracking-tighter italic">LEGO<span className="text-blue-600">STUDIO</span></h1>
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-2 h-2 rounded-full ${mode === 'add' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{mode === 'add' ? 'Building Mode' : 'Delete Mode'}</span>
        </div>
        <div className="mt-2 text-xs text-gray-500 font-bold">
          <span className="text-blue-500">{totalBlocks}</span> blocks
        </div>
      </div>

      {/* Block Counter Badge */}
      <div className="absolute top-6 right-24 z-10">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white">
          <span className="text-2xl font-black text-gray-700">{totalBlocks}</span>
          <span className="text-[10px] text-gray-400 ml-1">LEGO</span>
        </div>
      </div>

      {/* Right: Color Panel */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-2xl border border-white">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setSelectedColor(c)}
            className={`w-8 h-8 rounded-full transition-all ${selectedColor === c ? 'ring-4 ring-blue-400 scale-125 shadow-lg' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="w-6 h-px bg-gray-200 mx-auto my-1" />
        <button
          onClick={() => setRandomColor(!randomColor)}
          className={`w-8 h-8 rounded-full transition-all flex items-center justify-center text-sm ${randomColor ? 'bg-gradient-to-br from-red-400 via-green-400 to-blue-400 ring-2 ring-purple-400' : 'bg-gray-100'}`}
          title="Random Color"
        >
          {randomColor ? '🎲' : '🎨'}
        </button>
      </div>

      {/* Left: Main Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-4">
        <div className="bg-white/90 p-3 rounded-3xl shadow-xl flex flex-col gap-3 border border-white">
          <button onClick={() => setMode('add')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mode === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
            <span className="text-xl font-bold">＋</span>
          </button>
          <button onClick={() => setMode('delete')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mode === 'delete' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
            <span className="text-xl">🗑️</span>
          </button>
          <button onClick={() => setRotation(r => r + Math.PI / 4)} className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600" title="Rotate (R)">
            <span className="text-lg">↻</span>
          </button>
          <button onClick={() => setShowBottomBar(true)} className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-gray-100 text-gray-400">
            <span className="text-[12px]">bar</span>
          </button>
        </div>

        <div className="bg-white/90 p-3 rounded-3xl shadow-xl flex flex-col gap-3 border border-white">
          <button onClick={handleUndo} disabled={undoStack.length <= 1} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${undoStack.length > 1 ? 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600' : 'bg-gray-50 text-gray-300'}`} title="Undo (Ctrl+Z)">
            <span className="text-lg">↩</span>
          </button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${redoStack.length > 0 ? 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600' : 'bg-gray-50 text-gray-300'}`} title="Redo (Ctrl+Shift+Z)">
            <span className="text-lg">↪</span>
          </button>
        </div>

        <button
          onClick={() => setShowTemplates(true)}
          className="bg-white/90 p-4 rounded-2xl shadow-lg border border-white text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
        >
          <span className="text-xs font-black uppercase">Templates</span>
        </button>

        <button
          onClick={() => setShowCreator(true)}
          className="bg-white/90 p-4 rounded-2xl shadow-lg border border-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <span className="text-xs font-black uppercase">Custom</span>
        </button>
      </div>

      {/* Bottom: Block Selection Panel */}
      <div className={`absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-500 transform ${showBottomBar ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
        <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white flex items-end gap-4 min-w-[400px]">
          {blockTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedSize(t.size)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedSize[0] === t.size[0] && selectedSize[1] === t.size[1] ? 'bg-blue-50 ring-2 ring-blue-500 -translate-y-2' : 'hover:bg-gray-50'}`}
            >
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${t.size[0]}, minmax(0, 1fr))` }}>
                {Array(t.size[0] * t.size[1]).fill(0).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${selectedSize[0] === t.size[0] && selectedSize[1] === t.size[1] ? 'bg-blue-400' : 'bg-gray-300'}`} />
                ))}
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase">{t.label}</span>
            </button>
          ))}
          <div className="w-px h-12 bg-gray-100 mx-2" />
          <button onClick={() => setShowBottomBar(false)} className="text-[10px] font-bold text-gray-300 hover:text-gray-600 uppercase mb-3 rotate-90">Hide</button>
        </div>
      </div>

      {!showBottomBar && (
        <button
          onClick={() => setShowBottomBar(true)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/80 px-6 py-2 rounded-full shadow-lg border border-white text-[10px] font-bold text-gray-400 hover:text-blue-500"
        >
          SHOW BLOCKS
        </button>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-10 right-10 z-10 flex flex-col gap-3">
        <button
          onClick={() => handleZoom('in')}
          className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center border border-white text-2xl font-bold text-gray-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
        >
          ＋
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center border border-white text-2xl font-bold text-gray-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
        >
          －
        </button>
      </div>

      {/* Templates Dialog */}
      {showTemplates && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-96 flex flex-col gap-6">
            <h2 className="text-center font-black text-gray-800 uppercase tracking-widest">Quick Templates</h2>
            <div className="grid grid-cols-3 gap-4">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handlePlaceTemplate(t)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:ring-2 hover:ring-blue-400 transition-all"
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-xs font-bold text-gray-600">{t.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Custom Block Creator */}
      {showCreator && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-80 flex flex-col gap-6">
            <h2 className="text-center font-black text-gray-800 uppercase tracking-widest">New Block</h2>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase">Width</label>
                <input type="number" value={customW} onChange={(e) => setCustomW(parseInt(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl border-none ring-1 ring-gray-100" min="1" max="10" />
              </div>
              <span className="mt-6 text-gray-300">×</span>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase">Depth</label>
                <input type="number" value={customD} onChange={(e) => setCustomD(parseInt(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl border-none ring-1 ring-gray-100" min="1" max="10" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreator(false)} className="flex-1 p-3 bg-gray-100 rounded-xl font-bold text-gray-400">Cancel</button>
              <button onClick={handleCreateCustom} className="flex-1 p-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-200">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [10, 10, 10], fov: 40 }} onPointerMissed={() => setPreviewPos(null)}>
        <Sky sunPosition={[100, 50, 100]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[15, 15, 15]} castShadow />
        <Environment preset="city" />

        <group onPointerMove={handlePointerMove} onClick={handleAction}>
          {blocks.map((b: any) => (
            <LegoBlock key={b.id} blockId={b.id} position={b.pos} color={b.color} type={b.type} animateDrop={b.animateDrop} rotation={b.rotation} />
          ))}
          {previewPos && mode === 'add' && (
            <LegoBlock position={previewPos} color={randomColor ? getRandomColor() : selectedColor} type={selectedSize} isPreview rotation={rotation} />
          )}
        </group>

        {particles.map(p => (
          <Particle key={p.id} position={p.pos} color={p.color} onComplete={() => removeParticle(p.id)} />
        ))}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow onClick={(e: any) => {
          if (mode !== 'add') return;
          const p = e.point;
          playPlaceSound();
          addParticles([Math.round(p.x), 0, Math.round(p.z)], selectedColor);
          const newBlock = {
            id: `b-${Math.random().toString(36).substr(2, 9)}`,
            pos: [Math.round(p.x), 0, Math.round(p.z)],
            color: randomColor ? getRandomColor() : selectedColor,
            type: [...selectedSize],
            animateDrop: true,
            rotation
          };
          const newBlocks = [...blocks, newBlock];
          setBlocks(newBlocks);
          pushUndo(newBlocks);
        }}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <gridHelper args={[100, 100, '#e2e8f0', '#f1f5f9']} position={[0, -0.5, 0]} />

        <OrbitControls ref={controlsRef} makeDefault maxPolarAngle={Math.PI / 2} />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.3} scale={30} blur={2.5} far={4} />
      </Canvas>
    </div>
  );
}
