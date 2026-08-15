import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

const CoreShape = ({ state, scale = 1.3 }) => {
  const meshRef = useRef();

  // Determine properties based on state
  let color = '#808080';
  let speed = 0.5;
  let distort = 0.2;

  switch (state) {
    case 'sleeping':
      color = '#64748b';
      speed = 0.5;
      distort = 0.2;
      break;
    case 'listening':
      color = '#06b6d4';
      speed = 2;
      distort = 0.45;
      break;
    case 'thinking':
      color = '#a855f7';
      speed = 2.5;
      distort = 0.6;
      break;
    case 'executing':
      color = '#3b82f6';
      speed = 3;
      distort = 0.7;
      break;
    case 'speaking':
      color = '#10b981';
      speed = 2;
      distort = 0.5;
      break;
    default:
      break;
  }

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.4;
      meshRef.current.rotation.y += delta * speed * 0.6;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={scale}>
      <MeshDistortMaterial
        color={color}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.6}
        roughness={0.15}
        distort={distort}
        speed={speed * 2}
        emissive={color}
        emissiveIntensity={0.6}
      />
    </Sphere>
  );
};

export default function InfinityCore({ state = 'sleeping', size = '100%', scale = 1.35 }) {
  return (
    <div style={{ width: size, height: size, maxWidth: '100%', maxHeight: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Canvas camera={{ position: [0, 0, 3.6] }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 3, 5]} intensity={1.3} />
        <pointLight position={[-3, -3, -5]} color="#06b6d4" intensity={2.5} />
        <pointLight position={[3, -2, 4]} color="#a855f7" intensity={2} />
        <CoreShape state={state} scale={scale} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
