# Sphere Study

Open index.html in a browser. Three.js is bundled in vendor/. No installation or build step is needed.

## Follow one ray

1. Open **ray-tracer.js** and read **traceRay** first. Its input is a camera ray, the spheres in the scene, and the number of surface bounces left. Its result is an RGB light value.
2. Follow **closestHit** to see how the nearest sphere or the ground is selected. In **traceRay**, follow just one material branch. Metal reflects the ray. Glass chooses reflection or refraction. A diffuse surface adds sunlight to the light sampled from a new direction.
3. Open **cpu-renderer.js** to see where the camera ray comes from and how repeated samples are averaged into a pixel. **scene.js** contains the three large spheres and the seeded field of smaller spheres.

## Try the bounce limit

Choose Material trio and set Max bounces to 1. A ray through the centre of the glass can enter, but its next surface hit exhausts the budget. Raise the limit to 2 and the ray can leave the glass and see the sky. A path that also scatters off the ground needs a third bounce. Hold the camera still to compare the images after a similar number of samples.

## Follow the GPU version

A WebGL-capable browser normally runs **shaders.js**. Read **tracePath**, then **closestHit** or **glassDirection**. The shader follows the same path using a loop. At each surface it updates the colour carried along the path. **gpu-renderer.js** passes the scene to Three.js and alternates the two textures used for averaging.

**app.js** handles settings and schedules frames. **camera.js** handles orbiting and builds the camera axes. When floating-point WebGL rendering is unavailable, the demo runs the JavaScript tracer at a lower resolution.
