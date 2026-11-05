import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { computeFeatureCentroidLatLng, latLngToVector3 } from "../utils/geoUtils";

const NATURAL_EARTH_GEOJSON =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson";

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
    raycaster.params.Line.threshold = 0.12; // Increased for better mobile/small country detection
  }, [raycaster]);

  const entries = useMemo(() => {
    return (features || [])
      .map((f, idx) => {
        const props = f?.properties || {};
        const iso3 = props.ISO_A3 || props.ADM0_A3 || props.SOV_A3;
        const name = props.ADMIN || props.NAME || props.NAME_EN;
        const key = iso3 && iso3 !== "-99" ? String(iso3) : `__idx_${idx}`;

        const centroid = computeFeatureCentroidLatLng(f);
        const geometry = buildLineGeometryFromFeature(f, radius);
        if (!geometry) return null;

        return {
          key,
          name,
          iso3: iso3 && iso3 !== "-99" ? String(iso3) : null,
          centroid,
          geometry,
        };
      })
      .filter(Boolean);
  }, [features, radius]);

  const materials = useMemo(() => {
    const normal = new THREE.LineBasicMaterial({ color: "#9bbcff", transparent: true, opacity: 0.45 });
    const hover = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 });
    const selected = new THREE.LineBasicMaterial({ color: "#f54106", transparent: true, opacity: 0.95 });
    return { normal, hover, selected };
  }, []);

  const lastHoverRef = useRef(null);

  useFrame(() => {
    if (lastHoverRef.current && hoveredKey !== lastHoverRef.current) {
      lastHoverRef.current = hoveredKey;
    }
  });

  // Separate component to handle per-country material with proper hooks
  function BorderLine({ entry, isSelected, isHovered, onSelect, onHover }) {
    const material = useMemo(() => {
      if (isSelected) {
        return new THREE.LineBasicMaterial({ 
          color: "#ff6600", 
          transparent: true, 
          opacity: 1
        });
      }
      if (isHovered) {
        return new THREE.LineBasicMaterial({ 
          color: "#ffffff", 
          transparent: true, 
          opacity: 0.9 
        });
      }
      return new THREE.LineBasicMaterial({ 
        color: "#9bbcff", 
        transparent: true, 
        opacity: 0.45 
      });
    }, [isSelected, isHovered]);

    // Create invisible hit sphere for better click detection (especially for small countries)
    const hitSpherePosition = useMemo(() => {
      if (!entry.centroid) return new THREE.Vector3(0, 0, 0);
      return latLngToVector3(entry.centroid.lat, entry.centroid.lng, radius + 0.01);
    }, [entry.centroid, radius]);

    const hitSphereSize = useMemo(() => {
      // Estimate size based on geometry bounding sphere
      const bbox = entry.geometry.boundingSphere;
      if (!bbox) return 0.15;
      // Clamp between reasonable sizes for small and large countries
      return Math.max(0.08, Math.min(0.25, bbox.radius * 2));
    }, [entry.geometry]);

    return (
      <group>
        {/* Visible border line */}
        <lineSegments
          geometry={entry.geometry}
          material={material}
        />
        {/* Invisible hit sphere for easier clicking */}
        <mesh
          position={hitSpherePosition}
          visible={false}
          onPointerOver={(ev) => {
            ev.stopPropagation();
            onHover?.(entry.key);
          }}
          onPointerOut={(ev) => {
            ev.stopPropagation();
            onHover?.(null);
          }}
          onPointerDown={(ev) => {
            ev.stopPropagation();
            const latlng = entry.centroid;
            const fallbackLatLng = latlng || { lat: 0, lng: 0 };
            onSelect?.({
              key: entry.key,
              name: entry.name,
              cca3: entry.iso3,
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
