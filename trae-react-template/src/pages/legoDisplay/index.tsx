import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. 基础乐高积木组件 ---
const LegoBlock = ({ position, color, type = [1, 1], isPreview = false, blockId }) => {
  const [w, d] = type;
  const groupRef = useRef();

  useFrame(() => {
    if (!isPreview && groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1], 0.15);
    }
  });

  const studs = useMemo(() => {
    const s = [];
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        s.push(
          <mesh key={`${i}-${j}`} position={[i - (w - 1) / 2, 0.55, j - (d - 1) / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.15, 12]} />
            <meshStandardMaterial color={color} transparent={isPreview} opacity={isPreview ? 0.4 : 1} />
          </mesh>
        );
      }
    }
    return s;
  }, [w, d, color, isPreview]);

  return (
    <group 
      ref={groupRef} 
      position={isPreview ? position : [position[0], position[1] + 2, position[2]]}
      userData={{ customId: blockId }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, 1, d]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} transparent={isPreview} opacity={isPreview ? 0.5 : 1} />
      </mesh>
      {studs}
    </group>
  );
};

// --- 2. 主组件：LegoStudioPro ---
export default function LegoStudioPro() {
  const [blocks, setBlocks] = useState([{ id: 'init', pos: [0, 0, 0], color: '#FF4D4D', type: [1, 1] }]);
  const [selectedSize, setSelectedSize] = useState([1, 1]);
  const [selectedColor, setSelectedColor] = useState('#FF4D4D');
  const [mode, setMode] = useState('add');
  const [previewPos, setPreviewPos] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 用于控制缩放的引用
  const controlsRef = useRef();

  // --- 缩放控制函数 ---
  const handleZoom = (direction) => {
    if (!controlsRef.current) return;
    const factor = direction === 'in' ? 0.85 : 1.15; // 缩放倍率
    
    // 通过改变相机的距离实现缩放
    const camera = controlsRef.current.object;
    camera.position.lerp(controlsRef.current.target, 1 - factor);
    controlsRef.current.update();
  };

  // --- 图片转乐高算法 ---
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 64; // 降采样提高性能
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        const newBlocks = [];
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (imageData[index + 3] > 128) {
              const hexColor = `#${((1 << 24) + (imageData[index] << 16) + (imageData[index+1] << 8) + imageData[index+2]).toString(16).slice(1)}`;
              newBlocks.push({
                id: `img-${x}-${y}-${Date.now()}`,
                pos: [x - canvas.width / 2, canvas.height - y, 0], 
                color: hexColor,
                type: [1, 1]
              });
            }
          }
        }
        setBlocks(newBlocks);
        setIsProcessing(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePointerMove = (e) => {
    if (mode !== 'add' || e.intersections.length === 0) return;
    const { face, object } = e.intersections[0];
    const parentPos = object.parent.position;
    const normal = face.normal;
    setPreviewPos([
      Math.round(parentPos.x + normal.x),
      Math.round(parentPos.y + normal.y),
      Math.round(parentPos.z + normal.z)
    ]);
  };

  const handleAction = (e) => {
    e.stopPropagation();
    if (mode === 'delete') {
      const id = e.object.parent.userData?.customId;
      if (id) setBlocks(prev => prev.filter(b => b.id !== id));
      return;
    }
    if (previewPos) {
      setBlocks(prev => [...prev, {
        id: `b-${Math.random()}`,
        pos: [...previewPos],
        color: selectedColor,
        type: [...selectedSize]
      }]);
    }
  };

  return (
    <div className="w-full h-screen bg-[#F0F2F5] relative select-none overflow-hidden font-sans text-gray-800">
      
      {/* 顶部控制栏 */}
      <div className="absolute top-6 left-10 z-10 flex items-center gap-6">
        <h1 className="text-xl font-black italic tracking-tighter">LEGO<span className="text-blue-600">STUDIO</span></h1>
        <label className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-xl border border-white cursor-pointer hover:bg-blue-50 transition-all active:scale-95">
          <span className="text-xs font-black uppercase tracking-widest text-blue-600">{isProcessing ? "处理中..." : "📷 导入图片"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isProcessing} />
        </label>
      </div>

      {/* 右下角：放大缩小浮动按钮 */}
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

      {/* 左侧：工具面板 */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-4 bg-white/90 p-4 rounded-[32px] shadow-2xl border border-white">
        <button onClick={() => setMode('add')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mode === 'add' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400'}`}>
          <span className="text-xl font-bold">＋</span>
        </button>
        <button onClick={() => setMode('delete')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mode === 'delete' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-400'}`}>
          <span className="text-xl">🗑️</span>
        </button>
        <div className="h-px bg-gray-200 w-full my-2" />
        <div className="flex flex-col gap-2">
          {['#FF4D4D', '#4D79FF', '#FFD700', '#4CAF50', '#1A1A1A', '#FFFFFF'].map(c => (
            <button 
              key={c}
              onClick={() => setSelectedColor(c)}
              className={`w-10 h-10 rounded-full border-4 transition-all ${selectedColor === c ? 'border-blue-400 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* 3D 渲染层 */}
      <Canvas shadows camera={{ position: [25, 25, 25], fov: 40 }} onPointerMissed={() => setPreviewPos(null)}>
        <Sky sunPosition={[100, 50, 100]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[20, 20, 20]} intensity={1.2} castShadow />
        <Environment preset="city" />

        <group onPointerMove={handlePointerMove} onClick={handleAction}>
          {blocks.map((b) => (
            <LegoBlock key={b.id} blockId={b.id} position={b.pos} color={b.color} type={b.type} />
          ))}
          {previewPos && mode === 'add' && (
            <LegoBlock position={previewPos} color={selectedColor} type={selectedSize} isPreview />
          )}
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <gridHelper args={[200, 200, '#e2e8f0', '#f1f5f9']} position={[0, -0.5, 0]} />

        <OrbitControls ref={controlsRef} makeDefault />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.3} scale={60} blur={2.5} far={5} />
      </Canvas>
    </div>
  );
}