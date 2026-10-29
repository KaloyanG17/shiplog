"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Sea height at (x, z) at time t. Shared by the wave mesh and the boat so the
// boat rides the same waves it's drawn on.
function waveHeight(x: number, z: number, t: number, amplitude: number) {
  return (
    amplitude *
    (Math.sin(x * 0.45 + t * 1.1) * 0.6 + Math.sin(z * 0.8 + t * 0.7) * 0.3 + Math.sin((x + z) * 0.9 + t * 1.7) * 0.2)
  );
}

// The sea runs from behind the boat to past the camera, so the bottom of the
// view is always water and the page background never shows through.
const SEA_DEPTH = 34;
const SEA_CENTER_Z = 6;

function Sea({ amplitude, speed, frozen }: { amplitude: number; speed: number; frozen: boolean }) {
  const sea = useRef<THREE.Mesh<THREE.PlaneGeometry>>(null);
  const time = useRef(0);

  // The plane lies flat (rotated -90° on X): its local Y is world -Z and its
  // local Z is height, so waves are written into Z.
  useFrame((_, delta) => {
    if (!sea.current) return;
    if (!frozen) time.current += delta * speed;
    const geometry = sea.current.geometry;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const z = SEA_CENTER_Z - positions.getY(i);
      positions.setZ(i, waveHeight(positions.getX(i), z, time.current, amplitude));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={sea} rotation-x={-Math.PI / 2} position-z={SEA_CENTER_Z}>
      <planeGeometry args={[140, SEA_DEPTH, 200, 48]} />
      <meshStandardMaterial color="#0e7490" flatShading roughness={0.4} />
    </mesh>
  );
}

// Low-poly sailboat: orange hull, mast, cream sail and a little flag.
function Boat({ amplitude, speed, frozen }: { amplitude: number; speed: number; frozen: boolean }) {
  const boat = useRef<THREE.Group>(null);
  const time = useRef(0);

  const hull = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.6, 0.5);
    shape.lineTo(1.9, 0.5);
    shape.lineTo(1.2, -0.35);
    shape.lineTo(-1.2, -0.35);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false }).translate(0, 0, -0.45);
  }, []);
  const sail = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 2.8);
    shape.lineTo(1.6, 0.2);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame((_, delta) => {
    if (!boat.current) return;
    if (!frozen) time.current += delta * speed;
    const t = time.current;
    const x = Math.sin(t * 0.08) * 14; // drifts slowly back and forth
    const y = waveHeight(x, 0, t, amplitude);
    const slope = waveHeight(x + 0.5, 0, t, amplitude) - waveHeight(x - 0.5, 0, t, amplitude);
    boat.current.position.set(x, y + 0.35, 0);
    boat.current.rotation.z = Math.atan(slope) * 0.9;
    boat.current.rotation.y = Math.cos(t * 0.08) > 0 ? 0 : Math.PI; // faces where it's heading
  });

  return (
    <group ref={boat}>
      <mesh geometry={hull}>
        <meshStandardMaterial color="#f97316" flatShading />
      </mesh>
      <mesh position={[0.1, 1.9, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.9, 6]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh geometry={sail} position={[0.18, 0.55, 0]}>
        <meshStandardMaterial color="#fde4c8" side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[0.35, 3.3, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.02]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
}

// `intensity` 0..1: how busy the past week was. Busier = rougher, faster sea.
export default function SailboatScene({ intensity }: { intensity: number }) {
  const frozen = useReducedMotion();
  const amplitude = 0.25 + intensity * 0.95;
  const speed = 0.7 + intensity * 1.3;

  return (
    <Canvas
      camera={{ position: [0, 4.5, 13], fov: 42 }}
      dpr={[1, 2]}
      gl={{ alpha: true }}
      className="!h-full w-full"
      fallback={null}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 6]} intensity={1.8} color="#fff1e0" />
      <pointLight position={[-8, 4, 4]} intensity={40} color="#22d3ee" />
      <Sea amplitude={amplitude} speed={speed} frozen={frozen} />
      <Boat amplitude={amplitude} speed={speed} frozen={frozen} />
    </Canvas>
  );
}
