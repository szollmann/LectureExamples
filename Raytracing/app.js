// Page entry point. To study light transport, start with traceRay in ray-tracer.js.
function start() {
  let canvas = document.getElementById("canvas");
  const allSpheres = makeScene();
  let spheres = allSpheres;
  let renderer;
  const context = canvas.getContext("webgl2");
  if (context && context.getExtension("EXT_color_buffer_float")) {
    renderer = createGpuRenderer(canvas, context, allSpheres);
  } else {
    // A canvas that already acquired WebGL cannot switch to a 2D context.
    const freshCanvas = canvas.cloneNode(false);
    canvas.replaceWith(freshCanvas);
    canvas = freshCanvas;
    renderer = createCpuRenderer(canvas);
    document.querySelector("header span").textContent =
      "Three.js / CPU preview";
  }

  let samples = 0,
    paused = false,
    maxBounces = 6;
  function restartSampling() {
    // Old samples describe a different image after a scene or camera change.
    samples = 0;
  }
  const camera = createOrbitCamera(canvas, restartSampling);
  document.getElementById("reset").onclick = camera.reset;
  document.getElementById("preset").onchange = (event) => {
    spheres =
      event.target.value === "trio" ? allSpheres.slice(0, 3) : allSpheres;
    restartSampling();
  };
  document.getElementById("depth").oninput = (event) => {
    maxBounces = Number(event.target.value);
    document.getElementById("depthValue").value = maxBounces;
    restartSampling();
  };
  document.getElementById("pause").onclick = (event) => {
    paused = !paused;
    event.target.textContent = paused ? "Resume" : "Pause";
  };
  let renderWidth = 0,
    renderHeight = 0;
  function frame() {
    const scale = Math.min(
      1,
      Math.sqrt(
        renderer.pixelBudget / (canvas.clientWidth * canvas.clientHeight),
      ),
    );
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (width !== renderWidth || height !== renderHeight) {
      renderer.resize(width, height);
      renderWidth = width;
      renderHeight = height;
      restartSampling();
    }

    // Show a new view immediately, even when further sampling is paused.
    if (samples === 0 || (!paused && samples < 256)) {
      renderer.sample(camera.view(width, height), spheres, maxBounces, samples);
      samples++;
      const unit = samples === 1 ? "sample" : "samples";
      document.getElementById("samples").value =
        samples + " " + unit + " / pixel";
    }
    requestAnimationFrame(frame);
  }
  frame();
}
try {
  start();
} catch (error) {
  const notice = document.getElementById("notice");
  notice.hidden = false;
  notice.textContent = error.message;
}
