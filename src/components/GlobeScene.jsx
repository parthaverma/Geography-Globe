import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import CountryBorders from "./CountryBorders";
import Earth from "./Earth";
import {
  latLngToVector3,
  quaternionToBringVectorToFront,
} from "../utils/geoUtils";

function Sun({ position }) {
  return (
    <group position={position}>
      <pointLight
        position={[0, 0, 0]}
        intensity={20}
        distance={0}
        decay={2}
        color={"#ffd39b"}
      />
      <directionalLight
        position={[0, 0, 0]}
        intensity={2}
        color={"#fff3dc"}
      />
      <mesh>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshBasicMaterial color={"#fff2d2"} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color={"#ffb86b"}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Scene({ selectedCountry, onSelectCountry, searchOpen }) {
  const sunPosition = useMemo(() => new THREE.Vector3(-18, 7, 14), []);
  const globeRef = useRef(null);
  const controlsRef = useRef(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedKey =
    selectedCountry?.cca3 || selectedCountry?.key || selectedCountry?.name || null;

  const flyRef = useRef({ active: false, t: 0, from: new THREE.Quaternion(), to: new THREE.Quaternion() });
  const autoSpinSpeed = 0.05;
  const spinAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    if (!selectedCountry?.latlng || selectedCountry.latlng.length !== 2) return;
    if (!globeRef.current) return;

    const lat = selectedCountry.latlng[0];
    const lng = selectedCountry.latlng[1];

    const targetVec = latLngToVector3(lat, lng, 1).normalize();
    const targetQ = quaternionToBringVectorToFront(targetVec);
    const currentQ = globeRef.current.quaternion.clone();

    flyRef.current.active = true;
    flyRef.current.t = 0;
    flyRef.current.from.copy(currentQ);
    flyRef.current.to.copy(targetQ);
  }, [selectedCountry?.latlng?.[0], selectedCountry?.latlng?.[1]]);

  useFrame((_, delta) => {
    if (!globeRef.current) return;

    // Pause rotation while user drags, during fly-to animation, or when search is open
    if (isDragging || flyRef.current.active || searchOpen) return;

    spinQ.setFromAxisAngle(spinAxis, delta * autoSpinSpeed);
    globeRef.current.quaternion.multiplyQuaternions(spinQ, globeRef.current.quaternion);
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <Stars radius={60} depth={50} count={2500} factor={3.5} saturation={0} fade speed={0.6} />

      <ambientLight intensity={0.12} />
      <Sun position={sunPosition.toArray()} />

      <group ref={globeRef}>
        <Earth radius={0.995} sunPosition={sunPosition.toArray()} />
        <CountryBorders
          radius={1}
          selectedKey={selectedKey}
          hoveredKey={hoveredKey}
          onHover={setHoveredKey}
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
        minDistance={2.2}
        maxDistance={8}
        onStart={() => setIsDragging(true)}
        onEnd={() => setIsDragging(false)}
      />
    </>
  );
}

export default function GlobeScene({ countries, selectedCountry, onSelectCountry, searchOpen }) {
  return (
    <Canvas
      eventSource={document.body}
      eventPrefix="client"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.6], fov: 45, far: 1000 }}
      gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Scene selectedCountry={selectedCountry} onSelectCountry={onSelectCountry} searchOpen={searchOpen} />
    </Canvas>
  );
}