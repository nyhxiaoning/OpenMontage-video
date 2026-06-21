import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const SPEED = 6;
const GRAVITY = -20;
const JUMP_FORCE = 8;

export default function FirstPersonController({ occupancyRef }) {
  const { camera, gl } = useThree();

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const canJump = useRef(false);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  });

  // 👇 鼠标控制
  useEffect(() => {
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== gl.domElement) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      camera.rotation.y -= movementX * 0.002;
      camera.rotation.x -= movementY * 0.002;

      camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    };

    const onClick = () => {
      gl.domElement.requestPointerLock();
    };

    document.addEventListener('mousemove', onMouseMove);
    gl.domElement.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      gl.domElement.removeEventListener('click', onClick);
    };
  }, []);

  // 👇 键盘控制
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'KeyW') keys.current.w = true;
      if (e.code === 'KeyA') keys.current.a = true;
      if (e.code === 'KeyS') keys.current.s = true;
      if (e.code === 'KeyD') keys.current.d = true;
      if (e.code === 'Space') keys.current.space = true;
    };

    const up = (e) => {
      if (e.code === 'KeyW') keys.current.w = false;
      if (e.code === 'KeyA') keys.current.a = false;
      if (e.code === 'KeyS') keys.current.s = false;
      if (e.code === 'KeyD') keys.current.d = false;
      if (e.code === 'Space') keys.current.space = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // 👇 碰撞检测（关键）
  const checkCollision = (pos) => {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    const z = Math.floor(pos.z);

    return occupancyRef.current.has(`${x},${y},${z}`);
  };

  useFrame((_, delta) => {
    const speed = SPEED * delta;

    direction.current.set(0, 0, 0);

    if (keys.current.w) direction.current.z -= 1;
    if (keys.current.s) direction.current.z += 1;
    if (keys.current.a) direction.current.x -= 1;
    if (keys.current.d) direction.current.x += 1;

    direction.current.normalize();

    // 👉 根据相机方向移动
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up);

    velocity.current.x = (forward.x * direction.current.z + right.x * direction.current.x) * speed;
    velocity.current.z = (forward.z * direction.current.z + right.z * direction.current.x) * speed;

    // 👉 重力
    velocity.current.y += GRAVITY * delta;

    // 👉 跳跃
    if (keys.current.space && canJump.current) {
      velocity.current.y = JUMP_FORCE;
      canJump.current = false;
    }

    const nextPos = camera.position.clone().add(velocity.current);

    // 👉 碰撞检测（X/Z）
    const testPosXZ = new THREE.Vector3(nextPos.x, camera.position.y, nextPos.z);

    if (!checkCollision(testPosXZ)) {
      camera.position.x = testPosXZ.x;
      camera.position.z = testPosXZ.z;
    }

    // 👉 Y轴（地面）
    const testPosY = new THREE.Vector3(camera.position.x, nextPos.y, camera.position.z);

    if (checkCollision(testPosY)) {
      velocity.current.y = 0;
      canJump.current = true;
    } else {
      camera.position.y = nextPos.y;
    }

    // 👉 防止掉下去
    if (camera.position.y < 1.8) {
      camera.position.y = 1.8;
      canJump.current = true;
    }
  });

  return null;
}