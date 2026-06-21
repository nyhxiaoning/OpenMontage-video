// 点击画面 → 锁定鼠标
// W A S D → 移动
// 鼠标 → 看方向
// 空格 → 跳跃
// ESC → 退出锁定

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// components
import FirstPersonController from '@/components/FirstPersonController';
import InstancedBlocks from '@/components/InstancedBlocks';
import RaycastController from '@/components/RaycastController';

export default function Lego() {
  const [blocks, setBlocks] = useState([
    { pos: [0, 0, 0], type: [1, 1], color: '#ff4d4d' },
    { pos: [1, 0, 0], type: [1, 1], color: '#4d79ff' },
    { pos: [2, 0, 0], type: [1, 1], color: '#ffd700' },
  ]);

  const occupancyRef = useRef(new Set());

  useEffect(() => {
    const set = new Set();

    blocks.forEach(b => {
      const [x, y, z] = b.pos;
      set.add(`${x},${y},${z}`);
    });

    occupancyRef.current = set;
  }, [blocks]);

  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} />

        <FirstPersonController occupancyRef={occupancyRef} />

 <RaycastController
    blocks={blocks}
    setBlocks={setBlocks}
    occupancyRef={occupancyRef}
  />

  <InstancedBlocks blocks={blocks} />

        {/* 地面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#ccc" />
        </mesh>

      </Canvas>
    </div>
  );
}