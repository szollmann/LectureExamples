// Three.js handles the screen quad and the two textures holding successive
// averages. The actual intersection and material code lives in shaders.js.
function createGpuRenderer(canvas, context, allSpheres) {
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  const materialIds = { diffuse: 0, metal: 1, glass: 2 };
  const geometry = [],
    materials = [];
  for (const { shape, colour, material } of allSpheres) {
    geometry.push(
      new THREE.Vector4(
        shape.center.x,
        shape.center.y,
        shape.center.z,
        shape.radius,
      ),
    );
    materials.push(
      new THREE.Vector4(colour.x, colour.y, colour.z, materialIds[material]),
    );
  }
  const uniforms = {
    geometry: { value: geometry },
    materials: { value: materials },
    previousImage: { value: null },
    resolution: { value: new THREE.Vector2() },
    eye: { value: null },
    forward: { value: null },
    rightAxis: { value: null },
    upAxis: { value: null },
    halfViewHeight: { value: 0 },
    previousSamples: { value: 0 },
    maxBounces: { value: 6 },
    sphereCount: { value: 0 },
  };
  const trace = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: screenVertexShader,
    fragmentShader: pathFragmentShader,
  });
  const display = new THREE.ShaderMaterial({
    uniforms: { image: { value: null } },
    vertexShader: screenVertexShader,
    fragmentShader: displayFragmentShader,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), trace);
  quad.frustumCulled = false;
  const screen = new THREE.Scene();
  screen.add(quad);
  const screenCamera = new THREE.Camera();
  const options = {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  };
  let previous = new THREE.WebGLRenderTarget(1, 1, options);
  let current = new THREE.WebGLRenderTarget(1, 1, options);

  function resize(width, height) {
    renderer.setSize(width, height, false);
    previous.setSize(width, height);
    current.setSize(width, height);
    uniforms.resolution.value.set(width, height);
  }

  function sample(camera, spheres, maxBounces, previousSamples) {
    uniforms.eye.value = camera.eye;
    uniforms.forward.value = camera.forward;
    uniforms.rightAxis.value = camera.right;
    uniforms.upAxis.value = camera.up;
    uniforms.halfViewHeight.value = camera.halfViewHeight;
    uniforms.sphereCount.value = spheres.length;
    uniforms.maxBounces.value = maxBounces;
    uniforms.previousSamples.value = previousSamples;
    uniforms.previousImage.value = previous.texture;

    // First draw into a fresh texture, then display that texture on the canvas.
    quad.material = trace;
    renderer.setRenderTarget(current);
    renderer.render(screen, screenCamera);
    quad.material = display;
    display.uniforms.image.value = current.texture;
    renderer.setRenderTarget(null);
    renderer.render(screen, screenCamera);
    [previous, current] = [current, previous];
  }
  return { resize, sample, pixelBudget: 720000 };
}
