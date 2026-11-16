import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { computeFeatureCentroidLatLng, latLngToVector3 } from "../utils/geoUtils";
import countriesData from "../data/countries.json";

const NATURAL_EARTH_GEOJSON =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson";

// Known micro-states and island nations to guarantee beacons and hit targets for
const KNOWN_MICRO_CODES = new Set([
  "SGP", "MLT", "MDV", "MCO", "BHR", "BRB", "MUS", "SYC", "AND", "LIE",
  "VAT", "SMR", "CPV", "COM", "STP", "DMA", "GRD", "KNA", "LCA", "VCT",
  "TON", "WSM", "VUT", "FSM", "PLW", "MHL", "NRU", "TUV", "LUX", "CYP",
  "QAT", "KWT", "BHS", "JAM", "FJI", "BLZ", "SLV", "LBN", "SVN", "MNE"
]);

function buildLineGeometryFromFeature(feature, radius) {
  const geom = feature?.geometry;
  if (!geom) return null;

  const positions = [];

  const pushRing = (ring) => {
    if (!Array.isArray(ring) || ring.length < 2) return;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];
      const v1 = latLngToVector3(lat1, lng1, radius + 0.002);
      const v2 = latLngToVector3(lat2, lng2, radius + 0.002);
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  };

  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates || []) pushRing(ring);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates || []) {
      for (const ring of poly || []) pushRing(ring);
    }
  }

  if (!positions.length) return null;
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  buffer.computeBoundingSphere();
  return buffer;
}

// 📍 Glowing Pinpoint Beacon for small countries and island nations
function BeaconDot({ position, isSelected, isHovered }) {
  const outerScale = isSelected ? 2.4 : isHovered ? 1.9 : 1.0;
  const innerScale = isSelected ? 1.7 : isHovered ? 1.4 : 1.0;

  const coreColor = isSelected ? "#ff6600" : isHovered ? "#ffffff" : "#00f0ff";
  const glowColor = isSelected ? "#ff4400" : isHovered ? "#66e5ff" : "#0099ff";

  return (
    <group position={position}>
      {/* Outer luminous glow ring */}
      <mesh scale={outerScale}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isSelected ? 0.85 : isHovered ? 0.7 : 0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Inner bright pinpoint core */}
      <mesh scale={innerScale}>
        <sphereGeometry args={[0.0055, 16, 16]} />
        <meshBasicMaterial color={coreColor} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function CountryBorders({
  radius = 1,
  selectedKey,
  hoveredKey,
  onHover,
  onSelect,
}) {
  const { raycaster } = useThree();
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(NATURAL_EARTH_GEOJSON)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const feats = Array.isArray(json?.features) ? json.features : [];
        setFeatures(feats);
      })
      .catch(() => {
        if (!cancelled) setFeatures([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!raycaster?.params) return;
    if (!raycaster.params.Line) raycaster.params.Line = {};
    raycaster.params.Line.threshold = 0.12;
  }, [raycaster]);

  // Lookup map from countries.json for flags and metadata
  const countryByCca3 = useMemo(() => {
    const map = new Map();
    (countriesData || []).forEach((c) => {
      if (c.cca3) map.set(String(c.cca3).toUpperCase(), c);
    });
    return map;
  }, []);

  const entries = useMemo(() => {
    const geoCodes = new Set();
    const list = [];

    // 1. Process GeoJSON features
    (features || []).forEach((f, idx) => {
      const props = f?.properties || {};
      const iso3 = props.ISO_A3 || props.ADM0_A3 || props.SOV_A3;
      const name = props.ADMIN || props.NAME || props.NAME_EN;
      const key = iso3 && iso3 !== "-99" ? String(iso3).toUpperCase() : `__idx_${idx}`;

      if (iso3 && iso3 !== "-99") {
        geoCodes.add(String(iso3).toUpperCase());
      }

      const centroid = computeFeatureCentroidLatLng(f);
      const geometry = buildLineGeometryFromFeature(f, radius);
      if (!geometry || !centroid) return;

      const bboxRadius = geometry.boundingSphere ? geometry.boundingSphere.radius : 0.05;
      const isSmall = bboxRadius < 0.08 || KNOWN_MICRO_CODES.has(key);

      const info = countryByCca3.get(key);

      list.push({
        key,
        name: info?.name || name,
        officialName: info?.officialName || name,
        iso3: iso3 && iso3 !== "-99" ? String(iso3).toUpperCase() : null,
        centroid,
        geometry,
        bboxRadius,
        isSmall,
        flag: info?.flag || "",
        emoji: info?.emoji || "",
        population: info?.population || 0,
      });
    });

    // 2. Add micro-states and island nations missing from low-res 110m GeoJSON
    (countriesData || []).forEach((c) => {
      const cca3 = String(c.cca3 || "").toUpperCase();
      if (!cca3 || geoCodes.has(cca3)) return;

      if (
        KNOWN_MICRO_CODES.has(cca3) ||
        (Array.isArray(c.latlng) && c.latlng.length === 2 && (c.population < 3000000 || KNOWN_MICRO_CODES.has(cca3)))
      ) {
        if (!Array.isArray(c.latlng) || (c.latlng[0] === 0 && c.latlng[1] === 0)) return;

        list.push({
          key: cca3,
          name: c.name,
          officialName: c.officialName || c.name,
          iso3: cca3,
          centroid: { lat: c.latlng[0], lng: c.latlng[1] },
          geometry: null,
          bboxRadius: 0.02,
          isSmall: true,
          flag: c.flag || "",
          emoji: c.emoji || "",
          population: c.population || 0,
        });
      }
    });

    return list;
  }, [features, radius, countryByCca3]);

  const lastHoverRef = useRef(null);

  useFrame(() => {
    if (lastHoverRef.current && hoveredKey !== lastHoverRef.current) {
      lastHoverRef.current = hoveredKey;
    }
  });

  function BorderLine({ entry, isSelected, isHovered, onSelect, onHover }) {
    const downPosRef = useRef({ x: 0, y: 0 });

    const material = useMemo(() => {
      if (!entry.geometry) return null;
      if (isSelected) {
        return new THREE.LineBasicMaterial({
          color: "#ff6600",
          transparent: true,
          opacity: 1,
        });
      }
      if (isHovered) {
        return new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.9,
        });
      }
      return new THREE.LineBasicMaterial({
        color: "#9bbcff",
        transparent: true,
        opacity: 0.45,
      });
    }, [isSelected, isHovered, entry.geometry]);

    const hitSpherePosition = useMemo(() => {
      if (!entry.centroid) return new THREE.Vector3(0, 0, 0);
      return latLngToVector3(entry.centroid.lat, entry.centroid.lng, radius + 0.003);
    }, [entry.centroid]);

    // Generous interactive hit sphere (especially large for small countries)
    const hitSphereSize = useMemo(() => {
      if (entry.isSmall) return 0.038;
      const bbox = entry.geometry?.boundingSphere;
      if (!bbox) return 0.12;
      return Math.max(0.06, Math.min(0.25, bbox.radius * 1.8));
    }, [entry.isSmall, entry.geometry]);

    return (
      <group>
        {/* Visible country border line if geometry exists */}
        {entry.geometry && material && (
          <lineSegments geometry={entry.geometry} material={material} />
        )}

        {/* 📍 Glowing Pinpoint Beacon for small nations & island states */}
        {entry.isSmall && (
          <BeaconDot
            position={hitSpherePosition}
            isSelected={isSelected}
            isHovered={isHovered}
          />
        )}

        {/* 🎯 Generous interactive hit target for easy mouse hover and clicking */}
        <mesh
          position={hitSpherePosition}
          visible={false}
          onPointerOver={(ev) => {
            ev.stopPropagation();
            onHover?.(entry.key, entry);
          }}
          onPointerOut={(ev) => {
            ev.stopPropagation();
            onHover?.(null, null);
          }}
          onPointerDown={(ev) => {
            ev.stopPropagation();
            downPosRef.current = { x: ev.clientX, y: ev.clientY };
          }}
          onClick={(ev) => {
            ev.stopPropagation();
            const dist = Math.hypot(
              ev.clientX - downPosRef.current.x,
              ev.clientY - downPosRef.current.y
            );
            // Ignore drags to prevent accidental selection
            if (dist > 6) return;

            const latlng = entry.centroid;
            const fallbackLatLng = latlng || { lat: 0, lng: 0 };
            onSelect?.({
              key: entry.key,
              name: entry.name,
              cca3: entry.iso3,
              isSmall: entry.isSmall,
              latlng: [fallbackLatLng.lat, fallbackLatLng.lng],
            });
          }}
        >
          <sphereGeometry args={[hitSphereSize, 16, 16]} />
          <meshBasicMaterial visible={false} transparent opacity={0} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {entries.map((e) => (
        <BorderLine
          key={e.key}
          entry={e}
          isSelected={e.key === selectedKey}
          isHovered={e.key === hoveredKey}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  );
}
