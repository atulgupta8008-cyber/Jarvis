import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';

function CoreObject() {
  const group = useRef();
  const ring = useRef();
  // Create a particle spiral
  const particles = useMemo(() => Float32Array.from({ length: 180 }, (_, i) => {
    const radius = 1.45 + (i % 7) * 0.085;
    const angle = (i / 180) * Math.PI * 2 * 5;
    return i % 3 === 0 ? Math.cos(angle) * radius : i % 3 === 1 ? Math.sin(angle * 1.7) * 0.65 : Math.sin(angle) * radius;
  }), []);
  
  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.23;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.25) * 0.12;
    ring.current.rotation.z -= delta * 0.35;
  });
  
  return (
    <group ref={group}>
      {/* Wireframe icosahedron core */}
      <mesh>
        <icosahedronGeometry args={[0.72, 4]} />
        <meshStandardMaterial color="#7cf7ff" emissive="#0ab7d2" emissiveIntensity={2.5} roughness={0.22} metalness={0.6} wireframe />
      </mesh>
      {/* Inner glow sphere */}
      <mesh scale={0.82}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#5cecf5" transparent opacity={0.13} />
      </mesh>
      {/* Primary orbital ring */}
      <mesh ref={ring} rotation={[1.1, 0.2, 0]}>
        <torusGeometry args={[1.18, 0.018, 12, 100]} />
        <meshBasicMaterial color="#9d8cff" transparent opacity={0.82} />
      </mesh>
      {/* Secondary orbital ring */}
      <mesh rotation={[-0.5, 0.7, 0.6]}>
        <torusGeometry args={[1.55, 0.008, 8, 80]} />
        <meshBasicMaterial color="#55eff6" transparent opacity={0.55} />
      </mesh>
      {/* Particle field */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#b0f9ff" size={0.025} transparent opacity={0.75} sizeAttenuation />
      </points>
    </group>
  );
}

export default function OrbitalCore() {
  return (
    <div className="orbital-canvas">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 2, 3]} color="#66f1ff" intensity={28} />
        <pointLight position={[-3, -2, 1]} color="#7d6bff" intensity={14} />
        <Suspense fallback={null}>
          <Stars radius={12} depth={10} count={220} factor={1.2} saturation={0} fade speed={0.7} />
          <Float speed={1.9} rotationIntensity={0.25} floatIntensity={0.55}>
            <CoreObject />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
