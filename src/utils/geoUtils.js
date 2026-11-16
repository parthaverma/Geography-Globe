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

/**
 * Calculates a rotation that strictly spins the globe around its Y axis (polar axis)
 * to bring the target country's longitude facing the camera.
 * The North Pole stays strictly (0, 1, 0) and the world day/night regions remain fixed.
 */
export function getLongitudeRotationQuaternion(currentQ, lat, lng, cameraPos = new THREE.Vector3(0, 0, 3.6)) {
  const vLocal = latLngToVector3(lat, lng, 1);
  const vWorld = vLocal.clone().applyQuaternion(currentQ);

  const currentAzimuth = Math.atan2(vWorld.x, vWorld.z);
  const camAzimuth = Math.atan2(cameraPos.x, cameraPos.z);

  let diffAngle = camAzimuth - currentAzimuth;
  while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
  while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

  const rotStep = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), diffAngle);
  const targetQ = currentQ.clone().premultiply(rotStep);

  return { targetQ, diffAngle };
}

export function quaternionToBringVectorToFront(unitVector) {
  const v = unitVector.clone().normalize();
  const angleY = -Math.atan2(v.x, v.z);
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
  const v1 = v.clone().applyQuaternion(qY);
  const angleX = Math.atan2(v1.y, v1.z);
  const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angleX);
  return new THREE.Quaternion().multiplyQuaternions(qX, qY);
}
