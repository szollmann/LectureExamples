// One call adds one camera ray per pixel to the running image.
function createCpuRenderer(canvas) {
  const context = canvas.getContext("2d");
  let image, totalLight;

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
    totalLight = new Float32Array(width * height * 3);
  }

  function sample(camera, spheres, maxBounces, previousSamples) {
    if (previousSamples === 0) totalLight.fill(0);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // Pick a slightly different point inside this pixel on each frame.
        const screenX =
          (2 * (x + Math.random()) - canvas.width) / canvas.height;
        const screenY =
          (canvas.height - 2 * (y + Math.random())) / canvas.height;
        const direction = camera.forward
          .clone()
          .addScaledVector(camera.right, screenX * camera.halfViewHeight)
          .addScaledVector(camera.up, screenY * camera.halfViewHeight)
          .normalize();
        const ray = new THREE.Ray(camera.eye, direction);
        const light = traceRay(ray, spheres, maxBounces);

        const pixel = y * canvas.width + x;
        for (let channel = 0; channel < 3; channel++) {
          const index = 3 * pixel + channel;
          totalLight[index] += light.getComponent(channel);
          const average = totalLight[index] / (previousSamples + 1);
          // Compress bright values and encode the result for display.
          const mapped = (1.24 * average) / (0.65 + average);
          image.data[4 * pixel + channel] = 255 * mapped ** (1 / 2.2);
        }
        image.data[4 * pixel + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  return { resize, sample, pixelBudget: 48000 };
}
