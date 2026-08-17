import * as THREE from 'three'

/**
 * GEO MATH FOR THE GLOBE
 * ──────────────────────────────────────────────────────────────────────────
 * Lat/lng → 3D, and the great-circle arcs between them.
 *
 * Freight routes on a globe have to follow great circles or they look wrong
 * to anyone who has looked at a real routing map — a straight line between
 * Shanghai and Nhava Sheva across a sphere is not how a vessel goes.
 */

export const GLOBE_RADIUS = 1

/** Lat/lng in degrees → a point on the sphere. */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/** Angular separation in radians — drives how high an arc should lift. */
export function angularDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.clone().normalize().angleTo(b.clone().normalize())
}

/**
 * Great-circle arc between two points, lifted off the surface.
 *
 * `liftFactor` scales the apex height: air routes ride high, ocean routes
 * hug the surface, domestic road links barely leave it. The lift also scales
 * with distance so a short hop doesn't balloon into orbit.
 */
export function greatCircleArc(
  start: THREE.Vector3,
  end: THREE.Vector3,
  liftFactor = 0.25,
  segments = 64,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const angle = angularDistance(start, end)
  const maxLift = liftFactor * angle * GLOBE_RADIUS

  for (let i = 0; i <= segments; i++) {
    const t = i / segments

    // Spherical linear interpolation keeps the path on the great circle.
    const point = new THREE.Vector3().copy(start).lerp(end, t).normalize()

    // A sine profile lifts the middle and lands both ends flush on the surface.
    const lift = Math.sin(t * Math.PI) * maxLift
    point.multiplyScalar(GLOBE_RADIUS + lift)

    points.push(point)
  }

  return points
}

/** A smooth curve through the arc, for sampling moving particles along it. */
export function arcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  liftFactor = 0.25,
): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(greatCircleArc(start, end, liftFactor, 48))
}

/** How high each mode's arcs ride. Air is unmistakably above the ocean lanes. */
export const MODE_LIFT: Record<string, number> = {
  OCEAN_FCL: 0.22,
  OCEAN_LCL: 0.22,
  AIR: 0.52,
  DOMESTIC_FTL: 0.06,
  DOMESTIC_LTL: 0.06,
}

/** Screen-space projection, so hover panels can be real DOM rather than
 *  drei/Html — crisper text, far cheaper, and selectable. */
export function projectToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  const projected = position.clone().project(camera)
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    // z beyond 1 means the point is behind the camera's far plane / the globe.
    visible: projected.z < 1,
  }
}

/** True when a surface point faces the camera — used to hide back-side nodes. */
export function isFacingCamera(position: THREE.Vector3, cameraPosition: THREE.Vector3): boolean {
  return position.clone().normalize().dot(cameraPosition.clone().normalize()) > 0.02
}
