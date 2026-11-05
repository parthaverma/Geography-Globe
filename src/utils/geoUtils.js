import * as THREE from "three";

export function latLngToVector3(lat, lng, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

export function normalizeLng(lng) {
  let l = lng;
  while (l < -180) l += 360;
  while (l > 180) l -= 360;
  return l;
}

export function computeFeatureCentroidLatLng(feature) {
  const geom = feature?.geometry;
  if (!geom) return null;

  const accum = { lat: 0, lng: 0, count: 0 };

  const addPoint = ([lng, lat]) => {
    if (typeof lat !== "number" || typeof lng !== "number") return;
    accum.lat += lat;
    accum.lng += lng;
    accum.count += 1;
  };

  const handleRing = (ring) => {
    for (const p of ring) addPoint(p);
  };

  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates || []) handleRing(ring);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates || []) {
      for (const ring of poly || []) handleRing(ring);
    }
  }

  if (!accum.count) return null;
  return {
    lat: accum.lat / accum.count,
    lng: normalizeLng(accum.lng / accum.count),
  };
}

export function quaternionToBringVectorToFront(unitVector) {
  const from = unitVector.clone().normalize();
  const to = new THREE.Vector3(0, 0, 1);
  return new THREE.Quaternion().setFromUnitVectors(from, to);
}
