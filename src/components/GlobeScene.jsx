import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import CountryBorders from "./CountryBorders";
import Earth from "./Earth";
import { getLongitudeRotationQuaternion } from "../utils/geoUtils";

function Sun({ position }) {
  return (
    <group
      position={position}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ☀️ Core Sun Disc */}
      <mesh>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshBasicMaterial color={"#fffbe8"} />
      </mesh>
      {/* 🌟 Inner Corona */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial
          color={"#ffc466"}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 🌟 Outer Solar Halo */}
      <mesh>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial
          color={"#ff8c00"}
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Scene({ selectedCountry, onSelectCountry, onReset, onHoverCountry, searchOpen }) {
  const { camera } = useThree();
  // Fixed sun position in space giving a balanced Day (left) and Night (right) hemisphere
  const sunPosition = useMemo(() => new THREE.Vector3(-18, 5, 4), []);
  const globeRef = useRef(null);
  const controlsRef = useRef(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointerDownPos = useRef({ x: 0, y: 0, time: 0 });
  const lastKeyRef = useRef(null);

  const selectedKey =
    selectedCountry?.cca3 || selectedCountry?.key || selectedCountry?.name || null;

  const flyRef = useRef({
    active: false,
    t: 0,
    duration: 1.2,
    from: new THREE.Quaternion(),
    to: new THREE.Quaternion(),
    fromDist: 3.6,
    toDist: 3.6,
  });

  const autoSpinSpeed = 0.05;
  const spinAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);

  // Return to default settings when clicking outside the globe in space
  const handleSpaceClick = () => {
    lastKeyRef.current = null;
    const currentDist = camera.position.length();

    flyRef.current.active = true;
    flyRef.current.t = 0;
    flyRef.current.duration = 1.0;
    flyRef.current.from.copy(globeRef.current ? globeRef.current.quaternion : new THREE.Quaternion());
    flyRef.current.to.copy(globeRef.current ? globeRef.current.quaternion : new THREE.Quaternion());
    flyRef.current.fromDist = currentDist;
    flyRef.current.toDist = 3.6;

    onReset?.();
  };

  const handleHover = (key, entry) => {
    setHoveredKey(key);
    onHoverCountry?.(entry || null);
  };

  useEffect(() => {
    if (!globeRef.current) return;

    if (!selectedCountry) {
      lastKeyRef.current = null;
      return;
    }

    const key = selectedCountry?.cca3 || selectedCountry?.key || selectedCountry?.name;
    // Prevent duplicate restart when detailed country fields resolve
    if (!key || key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    if (!selectedCountry?.latlng || selectedCountry.latlng.length !== 2) return;

    const lat = selectedCountry.latlng[0];
    const lng = selectedCountry.latlng[1];

    const currentQ = globeRef.current.quaternion.clone();
    const { targetQ, diffAngle } = getLongitudeRotationQuaternion(
      currentQ,
      lat,
      lng,
      camera.position
    );

    const currentDist = camera.position.length();
    // Adaptive zoom: zoom in closer for small nations (2.45) vs standard countries (3.3)
    const isSmall = selectedCountry?.isSmall;
    const targetDist = isSmall ? 2.45 : Math.min(currentDist, 3.35);

    flyRef.current.active = true;
    flyRef.current.t = 0;
    flyRef.current.duration = Math.max(0.9, Math.min(1.8, Math.abs(diffAngle) * 0.75));
    flyRef.current.from.copy(currentQ);
    flyRef.current.to.copy(targetQ);
    flyRef.current.fromDist = currentDist;
    flyRef.current.toDist = targetDist;
  }, [selectedCountry?.cca3, selectedCountry?.name, selectedCountry?.isSmall, camera]);

  useFrame((_, delta) => {
    if (!globeRef.current) return;

    // Smooth pure polar spin to country longitude (day/night regions stay 100% fixed)
    if (flyRef.current.active) {
      flyRef.current.t += delta / flyRef.current.duration;
      const progress = Math.min(flyRef.current.t, 1);
      // Smooth cubic easing (acceleration then deceleration)
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      globeRef.current.quaternion.slerpQuaternions(
        flyRef.current.from,
        flyRef.current.to,
        ease
      );

      // Smooth adaptive camera zoom along its current view direction
      if (Math.abs(flyRef.current.fromDist - flyRef.current.toDist) > 0.01) {
        const newDist = THREE.MathUtils.lerp(
          flyRef.current.fromDist,
          flyRef.current.toDist,
          ease
        );
        const camRay = camera.position.clone().normalize();
        camera.position.copy(camRay.multiplyScalar(newDist));
        controlsRef.current?.update();
      }

      if (progress >= 1) {
        flyRef.current.active = false;
      }
      return;
    }

    // Pause rotation while user drags or when search is open
    if (isDragging || searchOpen) return;

    // Intrinsic auto-spin strictly around Earth's own polar axis (0, 1, 0)
    spinQ.setFromAxisAngle(spinAxis, delta * autoSpinSpeed);
    globeRef.current.quaternion.multiply(spinQ);
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <Stars radius={60} depth={50} count={2500} factor={3.5} saturation={0} fade speed={0.6} />

      {/* 🌌 Space click detector (invisible sphere in space outside the globe) */}
      <mesh
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        }}
        onPointerUp={(e) => {
          const dx = e.clientX - pointerDownPos.current.x;
          const dy = e.clientY - pointerDownPos.current.y;
          const dist = Math.hypot(dx, dy);
          const timeDiff = Date.now() - pointerDownPos.current.time;
          if (dist < 6 && timeDiff < 450) {
            handleSpaceClick();
          }
        }}
      >
        <sphereGeometry args={[80, 16, 16]} />
        <meshBasicMaterial side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Fixed directional sunlight in world space */}
      <directionalLight
        position={sunPosition.toArray()}
        intensity={2.2}
        color={"#fff6ea"}
      />
      {/* Low ambient light ensuring high-contrast dark side */}
      <ambientLight intensity={0.05} />
      <Sun position={sunPosition.toArray()} />

      {/* 🌍 Earth & Borders: only rotate around polar axis, day/night lighting is stationary */}
      <group ref={globeRef}>
        <Earth radius={0.995} sunPosition={sunPosition} />
        <CountryBorders
          radius={1}
          selectedKey={selectedKey}
          hoveredKey={hoveredKey}
          onHover={handleHover}
          onSelect={onSelectCountry}
        />
      </group>

      <OrbitControls
        makeDefault
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={2.1}
        maxDistance={8}
        onStart={() => setIsDragging(true)}
        onEnd={() => setIsDragging(false)}
      />
    </>
  );
}

export default function GlobeScene({
  countries,
  selectedCountry,
  onSelectCountry,
  onReset,
  onHoverCountry,
  searchOpen,
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.6], fov: 45, far: 1000 }}
      gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={(e) => {
        if (e.type === "click") {
          onReset?.();
        }
      }}
    >
      <Scene
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountry}
        onReset={onReset}
        onHoverCountry={onHoverCountry}
        searchOpen={searchOpen}
      />
    </Canvas>
  );
}
