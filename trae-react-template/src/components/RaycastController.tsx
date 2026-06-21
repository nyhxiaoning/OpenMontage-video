import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

function Highlight({ hover }) {
  if (!hover) return null;

  return (
    <mesh position={[hover.position.x, hover.position.y + 0.5, hover.position.z]}>
      <boxGeometry args={[1.05, 1.05, 1.05]} />
      <meshBasicMaterial color="yellow" wireframe />
    </mesh>
  );
}
export default function RaycastController({
  blocks,
  setBlocks,
  occupancyRef,
  selectedColor = '#ff4d4d'
}) {
  const { camera, scene, gl } = useThree();

  const raycaster = useRef(new THREE.Raycaster());
  const [hover, setHover] = useState(null);

  // 👉 中心点（第一人称必须这样）
  const center = new THREE.Vector2(0, 0);

  useFrame(() => {
    // ✅ 从摄像机中心发射射线
    raycaster.current.setFromCamera(center, camera);
    raycaster.current.far = 6; // 限制距离

    const intersects = raycaster.current.intersectObjects(scene.children, true);

    const hit = intersects.find(i => i.instanceId !== undefined);

    if (hit) {
      const matrix = new THREE.Matrix4();
      hit.object.getMatrixAt(hit.instanceId, matrix);

      const position = new THREE.Vector3().setFromMatrixPosition(matrix);
      const normal = hit.face.normal.clone();

      setHover({
        instanceId: hit.instanceId,
        position,
        normal
      });
    } else {
      setHover(null);
    }
  });

  // ✅ 用 canvas 事件（不是 window）
  useEffect(() => {
    const handleClick = (e) => {
      if (!hover) return;

      // 👉 左键删除
      if (e.button === 0) {
        setBlocks(prev => prev.filter((_, i) => i !== hover.instanceId));
      }

      // 👉 右键放置
      if (e.button === 2) {
        const { position, normal } = hover;

        const newPos = [
          Math.round(position.x + normal.x),
          Math.round(position.y + normal.y),
          Math.round(position.z + normal.z)
        ];

        const key = newPos.join(',');

        if (occupancyRef.current.has(key)) return;

        setBlocks(prev => [
          ...prev,
          {
            pos: newPos,
            type: [1, 1],
            color: selectedColor
          }
        ]);
      }
    };

    // ❗绑定在 canvas
    gl.domElement.addEventListener('pointerdown', handleClick);

    // 禁用右键菜单
    const preventMenu = (e) => e.preventDefault();
    gl.domElement.addEventListener('contextmenu', preventMenu);

    return () => {
      gl.domElement.removeEventListener('pointerdown', handleClick);
      gl.domElement.removeEventListener('contextmenu', preventMenu);
    };
  }, [hover]);

  return <Highlight hover={hover} />;
}