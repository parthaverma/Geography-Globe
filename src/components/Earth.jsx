import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

import earthDay from "../assets/earth_day_2048.jpg";
import earthNight from "../assets/earth_night_2048.png";
import earthClouds from "../assets/earth_clouds_2048.png";

// 🌍 Earth Surface Shader - High contrast Day/Night with Sun specular, twilight & city lights
const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunPosition;
  uniform float dayIntensity;
  uniform float nightIntensity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 sunDir = normalize(sunPosition - vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float sunDot = dot(normal, sunDir);

    vec4 dayTex = texture2D(dayMap, vUv);
    vec4 nightTex = texture2D(nightMap, vUv);

    // Procedural ocean detection for water specular reflection
    float oceanMask = clamp((dayTex.b - max(dayTex.r, dayTex.g * 0.75)) * 4.0, 0.0, 1.0);

    // Day & Night transitions (the terminator)
    // Smooth transition from dark to light
    float dayFactor = smoothstep(-0.10, 0.18, sunDot);
    // City lights switch on in twilight and full darkness
    float nightFactor = 1.0 - smoothstep(-0.16, 0.06, sunDot);

    // Day side sunlight with soft wrap
    float diffuse = max((sunDot + 0.12) / 1.12, 0.0);
    vec3 dayLit = dayTex.rgb * (diffuse * dayIntensity + 0.02);

    // Twilight / Sunset warm golden-amber glow along the terminator
    float terminator = smoothstep(-0.12, -0.01, sunDot) * (1.0 - smoothstep(0.01, 0.16, sunDot));
    vec3 sunsetGlow = vec3(1.0, 0.45, 0.15) * (terminator * 0.38);

    // Ocean Specular reflection (Sun glint on oceans)
    vec3 halfVec = normalize(sunDir + viewDir);
    float NdotH = max(dot(normal, halfVec), 0.0);
    float specular = pow(NdotH, 42.0) * oceanMask * dayFactor;
    vec3 sunGlint = vec3(1.0, 0.96, 0.88) * (specular * 1.7);

    // City lights on the night side (warm vibrant electric glow)
    vec3 cityLights = nightTex.rgb * vec3(1.4, 1.2, 0.9) * (nightIntensity * nightFactor);

    // Dark side ambient so land & ocean shapes remain subtly discernible against space
    vec3 nightAmbient = dayTex.rgb * (vec3(0.015, 0.02, 0.035) * (1.0 - dayFactor));

    // Daytime atmospheric Fresnel rim on the planet limb
    float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
    float dayLimb = pow(fresnel, 3.8) * max(sunDot, 0.0) * 0.65;
    vec3 dayAtmosphere = vec3(0.3, 0.65, 1.0) * dayLimb;

    // Composite surface colors
    vec3 finalColor = (dayLit * dayFactor) + sunsetGlow + sunGlint + cityLights + nightAmbient + dayAtmosphere;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ☁️ Dynamic Clouds Shader (reduced coverage, scattered wisps, sun-lit)
const cloudsVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const cloudsFragmentShader = `
  uniform sampler2D cloudsMap;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  // Procedural noise to break up solid cloud sheets into scattered filaments
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.55 * valueNoise(p);
    p *= 2.05;
    v += 0.30 * valueNoise(p);
    p *= 2.05;
    v += 0.15 * valueNoise(p);
    return v;
  }

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 sunDir = normalize(sunPosition - vWorldPosition);

    float sunDot = dot(normal, sunDir);
    vec4 cloudSample = texture2D(cloudsMap, vUv);

    // Raw density from texture
    float rawDensity = max(cloudSample.a, max(cloudSample.r, max(cloudSample.g, cloudSample.b)));

    // Multi-scale noise to scatter and erode solid cloud cover
    float scatter = fbm(vUv * vec2(36.0, 18.0));

    // Reduce coverage: carve out thin areas and scatter into distinct cloud clusters
    float scatteredDensity = rawDensity * (0.42 + 0.88 * scatter);
    float cloudMask = smoothstep(0.30, 0.72, scatteredDensity);

    if (cloudMask <= 0.005) {
      discard;
    }

    float dayFactor = smoothstep(-0.1, 0.20, sunDot);

    // Sunset tint on clouds near the terminator
    float terminator = smoothstep(-0.12, 0.0, sunDot) * (1.0 - smoothstep(0.0, 0.18, sunDot));
    vec3 cloudColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.52, 0.25), terminator * 0.7);

    // Day clouds are luminous and light; night clouds are dark and minimal
    float brightness = dayFactor * 1.12 + 0.04;
    float alpha = cloudMask * (0.36 * dayFactor + 0.05 * (1.0 - dayFactor));

    if (alpha <= 0.005) {
      discard;
    }

    gl_FragColor = vec4(cloudColor * brightness, alpha);
  }
`;

// 🌌 Atmosphere Glow Shell
const atmosphereVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 sunPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 sunDir = normalize(sunPosition - vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    float glow = pow(rim, 3.2);

    // Glowing on sun-facing side, fading out on dark side
    float sunFacing = smoothstep(-0.2, 0.35, dot(normal, sunDir));

    // Twilight transition at terminator
    float terminator = smoothstep(-0.18, 0.0, dot(normal, sunDir)) * (1.0 - smoothstep(0.0, 0.28, dot(normal, sunDir)));
    vec3 atmosColor = mix(vec3(0.28, 0.62, 1.0), vec3(1.0, 0.5, 0.18), terminator * 0.85);

    float alpha = glow * sunFacing * 0.85;
    if (alpha <= 0.005) discard;

    gl_FragColor = vec4(atmosColor, alpha);
  }
`;

export default function Earth({ radius = 1, sunPosition = [-18, 7, 14] }) {
  const [map, nightMap, cloudsMap] = useTexture([
    earthDay,
    earthNight,
    earthClouds,
  ]);

  const cloudsRef = useRef();

  const sunPosVec = useMemo(() => {
    if (sunPosition instanceof THREE.Vector3) return sunPosition.clone();
    if (Array.isArray(sunPosition)) return new THREE.Vector3(...sunPosition);
    return new THREE.Vector3(-18, 7, 14);
  }, [sunPosition]);

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
  }, [map, nightMap, cloudsMap]);

  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: map },
        nightMap: { value: nightMap },
        sunPosition: { value: sunPosVec },
        dayIntensity: { value: 1.35 },
        nightIntensity: { value: 2.2 },
      },
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
    });
  }, [map, nightMap, sunPosVec]);

  const cloudsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        cloudsMap: { value: cloudsMap },
        sunPosition: { value: sunPosVec },
      },
      vertexShader: cloudsVertexShader,
      fragmentShader: cloudsFragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, [cloudsMap, sunPosVec]);

  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: sunPosVec },
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [sunPosVec]);

  // Subtle clouds drift relative to the surface
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <>
      {/* 🌍 Earth Surface with Day, Night, Twilight & Specular reflection */}
      <mesh
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[radius, 96, 96]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* ☁️ Clouds Layer with sunlight & terminator shading */}
      <mesh
        scale={1.006}
        ref={cloudsRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[radius, 96, 96]} />
        <primitive object={cloudsMaterial} attach="material" />
      </mesh>

      {/* 🌌 Atmospheric Glow Halo */}
      <mesh
        scale={1.025}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </>
  );
}
