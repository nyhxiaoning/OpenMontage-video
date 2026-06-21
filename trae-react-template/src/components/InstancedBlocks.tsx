import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function InstancedBlocks({ blocks }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();

    blocks.forEach((block, i) => {
      const [x, y, z] = block.pos;
      const [w, d] = block.type;

      // 👉 设置位置 + 尺寸
      dummy.position.set(x, y + 0.5, z);
      dummy.scale.set(w, 1, d);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // 👉 设置颜色
      mesh.setColorAt(i, new THREE.Color(block.color));
    });

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

  }, [blocks]);

  return (
 <instancedMesh
  ref={meshRef}
  args={[undefined, undefined, blocks.length]}
  castShadow
  receiveShadow
>
      {/* 统一 geometry */}
      <boxGeometry args={[1, 1, 1]} />

      {/* 必须开启 vertexColors */}
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
}