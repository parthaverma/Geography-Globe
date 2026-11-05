import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

import earthDay from "../assets/earth_day_2048.jpg";
import earthNight from "../assets/earth_night_2048.png";
import earthClouds from "../assets/earth_clouds_2048.png";

const EARTH_DAY_MAP = earthDay;
const EARTH_NIGHT_MAP = earthNight;
const EARTH_CLOUDS_MAP = earthClouds;
const EARTH_SPEC_MAP =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r158/examples/textures/planets/earth_specular_2048.jpg";

const EARTH_NORMAL_MAP =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r158/examples/textures/planets/earth_normal_2048.jpg";

// Custom shader for night lights that only shows on dark side
const nightLightsVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nightLightsFragmentShader = `
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main() {
    vec4 nightColor = texture2D(nightMap, vUv);
    
    // Calculate how much this pixel is facing away from sun
    // Dot product < 0 means dark side
    float lightDot = dot(vNormal, sunDirection);
    
    // Only show night lights on dark side (smooth transition)
    float darkness = smoothstep(-0.1, 0.2, -lightDot);
    
    // Apply night lights with warm glow color
    vec3 glowColor = vec3(1.0, 0.65, 0.35) * nightColor.rgb * darkness * intensity;
    
    gl_FragColor = vec4(glowColor, nightColor.a * darkness);
  }
`;

export default function Earth({ radius = 1, sunPosition = [-18, 7, 14] }) {
  const [map, nightMap, cloudsMap, specularMap, normalMap] = useTexture([
    EARTH_DAY_MAP,
    EARTH_NIGHT_MAP,
    EARTH_CLOUDS_MAP,
    EARTH_SPEC_MAP,
    EARTH_NORMAL_MAP,
  ]);

  const nightLightsRef = useRef();

  useEffect(() => {
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
    }
    if (nightMap) {
      nightMap.colorSpace = THREE.SRGBColorSpace;
      nightMap.anisotropy = 8;
      nightMap.needsUpdate = true;
    }
    if (cloudsMap) {
      cloudsMap.colorSpace = THREE.SRGBColorSpace;
      cloudsMap.anisotropy = 8;
      cloudsMap.needsUpdate = true;
    }
    if (specularMap) specularMap.anisotropy = 8;
    if (normalMap) normalMap.anisotropy = 8;
  }, [map, nightMap, cloudsMap, specularMap, normalMap]);

  const nightLightsMaterial = useMemo(() => {
    if (!nightMap) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        nightMap: { value: nightMap },
        sunDirection: { value: new THREE.Vector3(...sunPosition).normalize() },
        intensity: { value: 1.2 },
      },
      vertexShader: nightLightsVertexShader,
      fragmentShader: nightLightsFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [nightMap, sunPosition]);

  const earthMaterial = useMemo(
    () => ({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
      specularMap,
      specular: new THREE.Color("#2a2a2a"),
      shininess: 10,
    }),
    [map, normalMap, specularMap]
  );

  return (
    <>
      {/* 🌍 Earth Surface */}
      <mesh>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshPhongMaterial {...earthMaterial} />
      </mesh>

      {/* 🌃 Night Lights Layer - only visible on dark side */}
      {nightLightsMaterial && (
        <mesh scale={1.005} ref={nightLightsRef}>
          <sphereGeometry args={[radius, 96, 96]} />
          <primitive object={nightLightsMaterial} attach="material" />
        </mesh>
      )}

      {/* ☁️ Clouds Layer */}
      <mesh scale={1.01}>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}