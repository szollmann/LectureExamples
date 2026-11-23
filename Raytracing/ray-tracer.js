// Start here. traceRay returns the RGB light reaching the camera along one ray.
// RGB light is stored in THREE.Vector3 so we can add it and multiply it by colour.
function traceRay(ray, spheres, remainingBounces) {
  const hit = closestHit(ray, spheres);

  // Even the last segment can see the sky. The budget counts surface events.
  if (!hit) return skyColour(ray.direction);
  if (remainingBounces === 0) return new THREE.Vector3(0, 0, 0);

  if (hit.material === "glass") {
    const direction = glassDirection(ray.direction, hit);
    return traceRay(nextRay(hit, direction), spheres, remainingBounces - 1);
  }
  if (hit.material === "metal") {
    const direction = ray.direction.clone().reflect(hit.normal);
    const reflected = traceRay(
      nextRay(hit, direction),
      spheres,
      remainingBounces - 1,
    );
    return reflected.multiply(hit.colour);
  }

  // A matte surface receives direct sunlight plus light from its surroundings.
  // Sample one direction above the surface. Later frames sample other directions.
  const direction = new THREE.Vector3()
    .randomDirection()
    .add(hit.normal)
    .normalize();
  const indirect = traceRay(
    nextRay(hit, direction),
    spheres,
    remainingBounces - 1,
  );
  const direct = sunlightAt(hit, spheres);
  return direct.add(indirect).multiply(hit.colour);
}

const groundColour = new THREE.Vector3(0.58, 0.56, 0.49);
const horizonColour = new THREE.Vector3(0.93, 0.95, 1);
const zenithColour = new THREE.Vector3(0.27, 0.55, 0.88);

function closestHit(ray, spheres) {
  let closest = null;
  let closestDistance = Infinity;

  // Solve origin.y + distance * direction.y = 0 for the ground.
  if (ray.direction.y < -0.00001 && ray.origin.y > 0) {
    closestDistance = -ray.origin.y / ray.direction.y;
    closest = {
      point: ray.at(closestDistance, new THREE.Vector3()),
      normal: new THREE.Vector3(0, 1, 0),
      material: "diffuse",
      colour: groundColour,
    };
  }

  // Ask Three.js for each sphere's first intersection in front of the origin.
  const point = new THREE.Vector3();
  for (const sphere of spheres) {
    if (!ray.intersectSphere(sphere.shape, point)) continue;
    const distance = ray.origin.distanceTo(point);
    if (distance < 0.0001 || distance >= closestDistance) continue;

    closestDistance = distance;
    const normal = point.clone().sub(sphere.shape.center).normalize();
    const entering = ray.direction.dot(normal) < 0;
    if (!entering) normal.negate(); // Face the incoming ray, even inside glass.
    closest = {
      point: point.clone(),
      normal,
      entering,
      material: sphere.material,
      colour: sphere.colour,
    };
  }
  return closest;
}

function nextRay(hit, direction) {
  // Move the origin slightly onto the outgoing side of the surface. Otherwise
  // rounding can make the next ray immediately hit the surface it just left.
  const offset = direction.dot(hit.normal) > 0 ? 0.0004 : -0.0004;
  const origin = hit.point.clone().addScaledVector(hit.normal, offset);
  return new THREE.Ray(origin, direction);
}

function glassDirection(incoming, hit) {
  const glassIndex = 1.5;
  const ratio = hit.entering ? 1 / glassIndex : glassIndex;
  const cosIncident = Math.min(1, -incoming.dot(hit.normal));
  const sinTransmittedSquared = ratio * ratio * (1 - cosIncident * cosIncident);

  // Snell's law can have no transmitted solution when leaving glass.
  if (sinTransmittedSquared > 1) return incoming.clone().reflect(hit.normal);

  // Schlick's approximation: glass reflects more light at grazing angles.
  const reflectChance = 0.04 + 0.96 * (1 - cosIncident) ** 5;
  if (Math.random() < reflectChance)
    return incoming.clone().reflect(hit.normal);

  // Scale the tangential component, then add the transmitted normal component.
  const tangent = incoming.clone().addScaledVector(hit.normal, cosIncident);
  const cosTransmitted = Math.sqrt(1 - sinTransmittedSquared);
  return tangent
    .multiplyScalar(ratio)
    .addScaledVector(hit.normal, -cosTransmitted)
    .normalize();
}

function sunlightAt(hit, spheres) {
  const sun = new THREE.Vector3(-0.7, 1, 0.4);
  // A small spread of light directions gives shadows soft edges.
  sun.addScaledVector(new THREE.Vector3().randomDirection(), 0.12).normalize();
  if (closestHit(nextRay(hit, sun), spheres)) return new THREE.Vector3(0, 0, 0);
  const cosine = Math.max(0, sun.dot(hit.normal));
  return new THREE.Vector3(1.3, 1.18, 0.99).multiplyScalar(cosine);
}

function skyColour(direction) {
  const height = Math.sqrt(Math.max(0, direction.y));
  return horizonColour.clone().lerp(zenithColour, height);
}
