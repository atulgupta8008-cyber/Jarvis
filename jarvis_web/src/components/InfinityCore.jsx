import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

const CoreShape = ({ state }) => {
  const meshRef = useRef();

  // Determine properties based on state
  let color = '#808080';
  let speed = 0.5;
  let distort = 0.2;

  switch (state) {
    case 'sleeping':
      color = '#808080';
      speed = 0.5;
      distort = 0.2;
      break;
    case 'listening':
      color = '#00ff66';
      speed = 2;
      distort = 0.4;
      break;
    case 'thinking':
      color = '#ffcc00';
      speed = 1.5;
      distort = 0.6;
      break;
    case 'executing':
      color = '#9d00ff';
      speed = 3;
      distort = 0.7;
      break;
    case 'speaking':
      color = '#00f3ff';
      speed = 2;
      distort = 0.5;
      break;
    default:
      break;
  }

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.5;
      meshRef.current.rotation.y += delta * speed * 0.8;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.5}>
      <MeshDistortMaterial
        color={color}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.5}
        roughness={0.2}
        distort={distort}
        speed={speed * 2}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </Sphere>
  );
};

const InfinityCore = ({ state }) => {
  return (
    <div style={{ width: '400px', height: '400px', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 5]} intensity={1} />
        <pointLight position={[-2, -2, -5]} color="#00f3ff" intensity={2} />
        <CoreShape state={state} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
};

export default InfinityCore;
