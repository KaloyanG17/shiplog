"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import { moveCardAction } from "@/app/projects/[id]/actions";
import type { BoardCard } from "@/app/projects/[id]/board";
import type { CardColumn } from "@/generated/prisma/enums";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const PLANETS: { id: CardColumn; label: string; color: string }[] = [
  { id: "BACKLOG", label: "Backlog", color: "#64748b" },
  { id: "TODO", label: "To do", color: "#06b6d4" },
  { id: "IN_PROGRESS", label: "In progress", color: "#f97316" },
  { id: "IN_REVIEW", label: "In review", color: "#a855f7" },
  { id: "DONE", label: "Done", color: "#22c55e" },
];

const PLANET_GAP = 11;
const ORBIT_RADIUS = 3.6;
const DROP_DISTANCE = 4.8;
const planetX = (index: number) => (index - (PLANETS.length - 1) / 2) * PLANET_GAP;

type Drag = { id: string; position: THREE.Vector3 };

// Text drawn onto a canvas and shown as a sprite, so labels live inside the
// 3D scene (no extra DOM/React roots per label) and always face the camera.
function useLabel(text: string, { strong = false, maxChars = 26 } = {}) {
  const label = useMemo(() => {
    const shown = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const font = `${strong ? 600 : 500} 44px ${fontFamily}`;
    context.font = font;
    const width = Math.ceil(context.measureText(shown).width) + 56;
    canvas.width = width;
    canvas.height = 80;
    context.font = font;
    context.fillStyle = "rgba(6, 12, 16, 0.72)";
    context.beginPath();
    context.roundRect(0, 0, width, 80, 40);
    context.fill();
    context.fillStyle = "#ffffff";
    context.textBaseline = "middle";
    context.fillText(shown, 28, 42);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: width / 80 };
  }, [text, strong, maxChars]);

  useEffect(() => () => label.texture.dispose(), [label]);
  return label;
}

function Label({ text, position, height = 0.55, strong }: { text: string; position: [number, number, number]; height?: number; strong?: boolean }) {
  const { texture, aspect } = useLabel(text, { strong });
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} raycast={() => null}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function Planet({ index, count, highlighted }: { index: number; count: number; highlighted: boolean }) {
  const planet = PLANETS[index];
  const body = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (body.current) body.current.rotation.y += delta * 0.2;
  });
  return (
    <group position={[planetX(index), 0, 0]}>
      <mesh ref={body} scale={highlighted ? 1.15 : 1}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={highlighted ? 0.9 : 0.25}
          flatShading
          roughness={0.5}
        />
      </mesh>
      <mesh rotation-x={0.35}>
        <torusGeometry args={[ORBIT_RADIUS, 0.015, 8, 96]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
      <Label text={`${planet.label} · ${count}`} position={[0, -ORBIT_RADIUS - 1.4, 0]} height={1} strong />
    </group>
  );
}

// One card as a little ship orbiting its planet; grab it to fly it elsewhere.
function Ship({
  card,
  planetIndex,
  slot,
  slots,
  drag,
  frozen,
  pausedRef,
  hitMeshesRef,
}: {
  card: BoardCard;
  planetIndex: number;
  slot: number;
  slots: number;
  drag: Drag | null;
  frozen: boolean;
  pausedRef: { current: boolean };
  hitMeshesRef: { current: Map<string, THREE.Mesh> };
}) {
  const ship = useRef<THREE.Group>(null);
  const time = useRef(0);
  const isDragged = drag?.id === card.id;

  useFrame((_, delta) => {
    if (!ship.current) return;
    if (isDragged && drag) {
      ship.current.position.lerp(drag.position, 0.35);
      return;
    }
    if (!frozen && !pausedRef.current) time.current += delta;
    // Evenly spaced around an orbit facing the camera (tilted slightly back,
    // like the ring), turning slowly so every card can be read.
    const angle = time.current * 0.15 + (slot / slots) * Math.PI * 2;
    const target = new THREE.Vector3(
      planetX(planetIndex) + Math.cos(angle) * ORBIT_RADIUS,
      Math.sin(angle) * ORBIT_RADIUS * Math.cos(0.35),
      -Math.sin(angle) * ORBIT_RADIUS * Math.sin(0.35),
    );
    ship.current.position.lerp(target, 0.12);
  });

  const body = (
    <mesh rotation-z={-Math.PI / 2}>
      <coneGeometry args={[0.32, 0.9, 5]} />
      <meshStandardMaterial
        color={card.issueNumber === null ? "#fde4c8" : "#e0f2fe"}
        emissive={isDragged ? "#f97316" : "#000000"}
        emissiveIntensity={isDragged ? 1.2 : 0}
        flatShading
      />
    </mesh>
  );

  return (
    <group ref={ship}>
      {/* Invisible grab zone, much bigger than the little ship itself. The
          Scene hit-tests these on pointerdown (see grabbing below). */}
      <mesh
        ref={(mesh) => {
          if (mesh) hitMeshesRef.current.set(card.id, mesh);
          else hitMeshesRef.current.delete(card.id);
        }}
        userData={{ cardId: card.id }}
        // Every orbit pauses while a ship is pointed at, so it's easy to grab.
        onPointerOver={() => {
          pausedRef.current = true;
          document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pausedRef.current = false;
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.95, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {isDragged ? (
        <Trail width={1.6} length={6} color="#fb923c" attenuation={(w) => w * w}>
          {body}
        </Trail>
      ) : (
        body
      )}
      <Label
        text={card.issueNumber !== null ? `#${card.issueNumber} ${card.title}` : card.title}
        position={[0, 0.75, 0]}
        height={0.6}
      />
    </group>
  );
}

function Scene({ cards, onMove }: { cards: BoardCard[]; onMove: (id: string, column: CardColumn) => void }) {
  const frozen = useReducedMotion();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pausedRef = useRef(false);
  const hitMeshesRef = useRef(new Map<string, THREE.Mesh>());
  const dropRef = useRef<(drag: Drag) => void>(() => {});
  const { camera, pointer, raycaster, gl } = useThree();
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  // While dragging, the ship follows the pointer across the z = 0 plane.
  useFrame(() => {
    if (!drag) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(dragPlane, drag.position);
  });

  const nearestPlanet = (position: THREE.Vector3) => {
    let best = -1;
    let bestDistance = Infinity;
    PLANETS.forEach((_, i) => {
      const distance = Math.hypot(position.x - planetX(i), position.y);
      if (distance < bestDistance) [best, bestDistance] = [i, distance];
    });
    return bestDistance <= DROP_DISTANCE ? best : -1;
  };

  // Drop: land on the nearest planet in range, else the ship flies home.
  useEffect(() => {
    dropRef.current = (dropped) => {
      const target = nearestPlanet(dropped.position);
      const card = cards.find((c) => c.id === dropped.id);
      if (target !== -1 && card && card.column !== PLANETS[target].id) onMove(dropped.id, PLANETS[target].id);
    };
  });

  // Grabbing: hit-test ships in the capture phase on the canvas's parent, so a
  // press on a ship never reaches the camera controls (which would otherwise
  // start rotating), while a press on empty space orbits as usual.
  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();

    const aim = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };

    const onPointerDown = (event: PointerEvent) => {
      aim(event);
      const hit = ray.intersectObjects([...hitMeshesRef.current.values()], false)[0];
      if (!hit) return;
      event.stopPropagation();
      const grabbed = { id: hit.object.userData.cardId as string, position: hit.point.clone() };
      dragRef.current = grabbed;
      setDrag(grabbed);
      document.body.style.cursor = "grabbing";
    };
    const onPointerUp = (event: PointerEvent) => {
      const dropped = dragRef.current;
      if (!dropped) return;
      dragRef.current = null;
      // Use where the pointer was released, not the last animated frame.
      aim(event);
      ray.ray.intersectPlane(dragPlane, dropped.position);
      dropRef.current(dropped);
      setDrag(null);
      pausedRef.current = false;
      document.body.style.cursor = "";
    };

    host.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      host.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl, dragPlane]);

  const target = drag ? nearestPlanet(drag.position) : -1;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 12, 10]} intensity={1.5} />
      <pointLight position={[0, 0, 8]} intensity={40} color="#fb923c" />
      <Stars radius={80} depth={40} count={1500} factor={3} fade speed={frozen ? 0 : 0.6} />
      {PLANETS.map((planet, i) => {
        const columnCards = cards.filter((card) => card.column === planet.id);
        return (
          <group key={planet.id}>
            <Planet index={i} count={columnCards.length} highlighted={target === i} />
            {columnCards.map((card, slot) => (
              <Ship
                key={card.id}
                card={card}
                planetIndex={i}
                slot={slot}
                slots={columnCards.length}
                drag={drag}
                frozen={frozen}
                pausedRef={pausedRef}
                hitMeshesRef={hitMeshesRef}
              />
            ))}
          </group>
        );
      })}
      <OrbitControls enabled={!drag} enablePan={false} minDistance={14} maxDistance={60} enableDamping />
    </>
  );
}

// The board as a solar system: columns are planets, cards orbit them, and
// dragging a card to another planet moves it (saved like the 2D board).
export default function Galaxy({ cards }: { cards: BoardCard[] }) {
  const [optimisticCards, applyMove] = useOptimistic(
    cards,
    (state, move: { id: string; column: CardColumn }) =>
      state.map((card) => (card.id === move.id ? { ...card, column: move.column } : card)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(id: string, column: CardColumn) {
    setError(null);
    startTransition(async () => {
      applyMove({ id, column });
      try {
        const result = await moveCardAction(id, column);
        if (result.warning) setError(result.warning);
      } catch {
        setError("Couldn't move the card. Try again.");
      }
    });
  }

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <Canvas
        // Close enough that the five planets and their orbits fill the width.
        camera={{ position: [0, 2, 27], fov: 50 }}
        dpr={[1, 2]}
        className="!h-[34rem] w-full"
        fallback={<p className="p-4 text-sm text-white/70">Galaxy view needs WebGL, which this browser doesn&apos;t support.</p>}
      >
        <Scene cards={optimisticCards} onMove={move} />
      </Canvas>
      <p className="border-t border-white/10 px-4 py-2 text-xs text-white/65">
        Grab a card and fly it to another planet to move it · drag empty space to orbit · scroll to zoom
        {error && <span className="ml-2 text-red-300">{error}</span>}
      </p>
    </div>
  );
}
