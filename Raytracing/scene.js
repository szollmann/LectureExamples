// A sphere has a centre, a radius, and a material. Its centre is one radius
// above the ground (y = 0), so all spheres sit on the same plane.
function makeSphere(x, z, radius, material, red, green, blue) {
  return {
    shape: new THREE.Sphere(new THREE.Vector3(x, radius, z), radius),
    material,
    colour: new THREE.Vector3(red, green, blue),
  };
}

function makeScene() {
  const spheres = [
    makeSphere(-2.65, 0, 1.02, "diffuse", 0.52, 0.105, 0.045),
    makeSphere(0, 0, 1.25, "glass", 1, 1, 1),
    makeSphere(2.85, -0.35, 1.08, "metal", 0.91, 0.77, 0.54),
  ];

  // Keep the small spheres in the same places each time the page opens.
  let seed = 21;
  function random() {
    seed = (1664525 * seed + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  const palette = [
    [0.08, 0.29, 0.29],
    [0.67, 0.3, 0.08],
    [0.12, 0.2, 0.39],
    [0.52, 0.23, 0.18],
    [0.36, 0.43, 0.21],
  ];
  while (spheres.length < 42) {
    const x = random() * 19 - 9.5;
    const z = random() * 14 - 10;
    const radius = 0.14 + random() * 0.25;
    const overlaps = spheres.some(
      ({ shape }) =>
        Math.hypot(x - shape.center.x, z - shape.center.z) <
        radius + shape.radius + 0.28,
    );
    if (overlaps) continue;

    const roll = random();
    let material = "diffuse";
    if (roll >= 0.87) material = "glass";
    else if (roll >= 0.63) material = "metal";
    let colour = [0.84, 0.85, 0.84];
    if (material !== "metal")
      colour = palette[Math.floor(random() * palette.length)];
    spheres.push(makeSphere(x, z, radius, material, ...colour));
  }
  return spheres;
}
