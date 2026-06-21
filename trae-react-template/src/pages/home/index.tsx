import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Stars, Environment } from '@react-three/drei';

// --- 积木组件 ---
const Block = ({ position, color, onClick }) => {
  return (
    <mesh 
      position={position} 
      castShadow 
      receiveShadow 
      // 增加 pointer 事件处理
      onClick={(e) => {
        e.stopPropagation(); // 防止点击穿透到下面的积木
        if (!e.face) return; 
        
        // 计算新积木位置：当前位置 + 法线方向
        const { x, y, z } = e.face.normal;
        const newPos = [
          Math.round(position[0] + x),
          Math.round(position[1] + y),
          Math.round(position[2] + z)
        ];
        onClick(newPos);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
    </mesh>
  );
};

export default function MinecraftTokyo() {
  const [blocks, setBlocks] = useState([
    { pos: [0, 0, 0], color: '#ff8c00' } 
  ]);

  const addBlock = (pos) => {
    // 简单的去重逻辑，防止在同一位置堆叠
    setBlocks((prev) => {
      const exists = prev.find(b => b.pos.join(',') === pos.join(','));
      if (exists) return prev;
      return [...prev, { pos, color: '#ff8c00' }];
    });
  };

  const generateTokyoTower = () => {
    const newBlocks = [];
    const maxHeight = 35;
    
    for (let y = 0; y < maxHeight; y++) {
      const width = Math.max(0, Math.floor((maxHeight - y) / 6));
      const color = (Math.floor(y / 3) % 2 === 0) ? '#ff4d4d' : '#ffffff';

      for (let x = -width; x <= width; x++) {
        for (let z = -width; z <= width; z++) {
          // 仅生成外壳，减少计算量和渲染压力
          if (Math.abs(x) === width || Math.abs(z) === width || y === 0) {
            newBlocks.push({ pos: [x, y, z], color });
          }
        }
      }
      if (width === 0) newBlocks.push({ pos: [0, y, 0], color });
    }
    setBlocks(newBlocks);
  };

  return (
    // 关键修正：确保父容器拥有 100% 的宽度和高度，并处理 overflow
    <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#111' }}>
      
      {/* UI 层：确保 z-index 高于 Canvas */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={generateTokyoTower}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-2xl font-bold transition-all active:scale-95"
        >
          🗼 生成东京塔
        </button>
        <button 
          onClick={() => setBlocks([{ pos: [0, 0, 0], color: 'orange' }])}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow-lg transition-all"
        >
          🧹 重置
        </button>
      </div>

      {/* 渲染层 */}
      <Canvas 
        shadows 
        camera={{ position: [30, 30, 30], fov: 45 }}
        // 处理可能存在的样式冲突
        style={{ width: '100%', height: '100%' }}
      >
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} />
        
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} castShadow />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

        <group>
          {blocks.map((block, i) => (
            <Block 
              key={`${block.pos.join('-')}-${i}`} // 修正 key 的生成
              position={block.pos} 
              color={block.color} 
              onClick={addBlock} 
            />
          ))}
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={0.3} />
        </mesh>

        <OrbitControls makeDefault />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}