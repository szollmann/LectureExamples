function createOrbitCamera(canvas, restartSampling) {
  const target = new THREE.Vector3(0, 0.82, 0);
  const worldUp = new THREE.Vector3(0, 1, 0);
  let yaw, pitch, distance;

  function reset() {
    yaw = 0.24;
    pitch = 0.19;
    distance = 11.7;
    restartSampling();
  }
  function orbit(horizontal, vertical) {
    yaw -= horizontal;
    pitch = THREE.MathUtils.clamp(pitch + vertical, 0.045, 1.45);
    restartSampling();
  }
  function zoom(amount) {
    distance = THREE.MathUtils.clamp(distance * Math.exp(amount), 4, 35);
    restartSampling();
  }
  function view(width, height) {
    // A portrait window needs more distance to keep all three main spheres visible.
    const radius = distance * Math.max(1, (1.45 * height) / width);
    const eye = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    eye.multiplyScalar(radius).add(target);
    const forward = target.clone().sub(eye).normalize();
    const right = forward.clone().cross(worldUp).normalize();
    const up = right.clone().cross(forward);
    return { eye, forward, right, up, halfViewHeight: 0.29 };
  }

  let activePointer = null,
    lastX,
    lastY;
  canvas.onpointerdown = (event) => {
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(activePointer);
  };
  canvas.onpointermove = (event) => {
    if (event.pointerId !== activePointer) return;
    orbit((event.clientX - lastX) * 0.007, (event.clientY - lastY) * 0.006);
    lastX = event.clientX;
    lastY = event.clientY;
  };
  canvas.onlostpointercapture = () => {
    activePointer = null;
  };
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom(Math.sign(event.deltaY) * 0.075);
    },
    { passive: false },
  );
  canvas.onkeydown = (event) => {
    switch (event.key) {
      case "ArrowLeft":
        orbit(0.08, 0);
        break;
      case "ArrowRight":
        orbit(-0.08, 0);
        break;
      case "ArrowUp":
        orbit(0, 0.05);
        break;
      case "ArrowDown":
        orbit(0, -0.05);
        break;
      case "+":
      case "=":
        zoom(-0.08);
        break;
      case "-":
        zoom(0.08);
        break;
      default:
        return;
    }
    event.preventDefault();
  };
  reset();
  return { reset, view };
}
