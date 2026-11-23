// GPU version of ray-tracer.js. One fragment processes one pixel.
// The quad already spans the screen, so the vertex shader only passes its position.
const screenVertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const pathFragmentShader = `
uniform sampler2D previousImage;
uniform vec2 resolution;
uniform vec3 eye, forward, rightAxis, upAxis;
uniform float halfViewHeight;
uniform int previousSamples, maxBounces, sphereCount;

// One slot per sphere: centre + radius, then RGB colour + material type.
uniform vec4 geometry[42], materials[42];
const int MISS = -2;
const int GROUND = -1;
const int DIFFUSE = 0;
const int METAL = 1;
const float ORIGIN_OFFSET = 0.0004;

// Each pixel needs its own repeatable stream of random numbers. The hash
// scrambles consecutive integer seeds so adjacent pixels sample different paths.
uint state;
float randomValue() {
  state = state * 747796405u + 2891336453u;
  uint bits = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return float((bits >> 22u) ^ bits) / 4294967296.0;
}
vec3 randomUnitVector() {
  float height = 2.0 * randomValue() - 1.0;
  float angle = 6.2831853 * randomValue();
  float radius = sqrt(max(0.0, 1.0 - height * height));
  return vec3(radius * cos(angle), height, radius * sin(angle));
}

struct Hit {
  int objectIndex;
  float distanceAlongRay;
};

Hit closestHit(vec3 origin, vec3 direction) {
  Hit hit = Hit(MISS, 1e20);
  if (direction.y < -0.00001 && origin.y > 0.0) {
    hit = Hit(GROUND, -origin.y / direction.y);
  }

  for (int i = 0; i < sphereCount; i++) {
    vec3 offset = origin - geometry[i].xyz;
    float radius = geometry[i].w;
    // Substitute origin + t * direction into the sphere equation.
    // With a unit direction, the quadratic is t*t + 2*b*t + c = 0.
    float b = dot(offset, direction);
    float c = dot(offset, offset) - radius * radius;
    float discriminant = b * b - c;
    if (discriminant < 0.0) continue;

    float root = sqrt(discriminant);
    float distanceAlongRay = -b - root;
    // From inside glass the near root is behind us. Use the far root to exit.
    if (distanceAlongRay <= 0.0001) distanceAlongRay = -b + root;
    if (distanceAlongRay > 0.0001 && distanceAlongRay < hit.distanceAlongRay) {
      hit = Hit(i, distanceAlongRay);
    }
  }
  return hit;
}

vec3 skyColour(vec3 direction) {
  vec3 horizon = vec3(0.93, 0.95, 1.0);
  vec3 zenith = vec3(0.27, 0.55, 0.88);
  return mix(horizon, zenith, sqrt(clamp(direction.y, 0.0, 1.0)));
}

vec3 sunlightAt(vec3 point, vec3 normal) {
  vec3 sun = normalize(vec3(-0.7, 1.0, 0.4) + 0.12 * randomUnitVector());
  float cosine = max(dot(sun, normal), 0.0);
  Hit blocker = closestHit(point + normal * ORIGIN_OFFSET, sun);
  if (blocker.objectIndex != MISS) return vec3(0.0);
  return vec3(1.3, 1.18, 0.99) * cosine;
}

vec3 glassDirection(vec3 incoming, vec3 normal, bool entering) {
  float ratio = entering ? 1.0 / 1.5 : 1.5;
  vec3 transmitted = refract(incoming, normal, ratio);
  // GLSL returns a zero vector for total internal reflection.
  if (dot(transmitted, transmitted) < 0.1) return reflect(incoming, normal);

  float cosine = clamp(dot(-incoming, normal), 0.0, 1.0);
  float reflectChance = 0.04 + 0.96 * pow(1.0 - cosine, 5.0);
  if (randomValue() < reflectChance) return reflect(incoming, normal);
  return normalize(transmitted);
}

vec3 tracePath(vec3 origin, vec3 direction) {
  vec3 light = vec3(0.0);
  vec3 pathColour = vec3(1.0); // Product of the colours along this path.

  // GLSL uses a loop for the recursive traceRay calls in the CPU version.
  for (int bounce = 0; bounce <= maxBounces; bounce++) {
    Hit hit = closestHit(origin, direction);
    if (hit.objectIndex == MISS) {
      light += pathColour * skyColour(direction);
      break;
    }
    if (bounce == maxBounces) break;

    vec3 point = origin + hit.distanceAlongRay * direction;
    vec3 normal = vec3(0, 1, 0);
    vec3 colour = vec3(0.58, 0.56, 0.49);
    int material = DIFFUSE;
    if (hit.objectIndex != GROUND) {
      normal = normalize(point - geometry[hit.objectIndex].xyz);
      colour = materials[hit.objectIndex].rgb;
      material = int(materials[hit.objectIndex].w);
    }
    bool entering = dot(normal, direction) < 0.0;
    if (!entering) normal = -normal;

    if (material == DIFFUSE) {
      pathColour *= colour;
      light += pathColour * sunlightAt(point, normal);
      direction = normalize(normal + randomUnitVector());
    } else if (material == METAL) {
      pathColour *= colour;
      direction = reflect(direction, normal);
    } else {
      direction = glassDirection(direction, normal, entering);
    }
    float offset = dot(direction, normal) > 0.0 ? ORIGIN_OFFSET : -ORIGIN_OFFSET;
    origin = point + offset * normal;
  }
  return light;
}

void main() {
  uvec2 pixel = uvec2(gl_FragCoord.xy);
  state = pixel.x * 1973u + pixel.y * 9277u + uint(previousSamples) * 26699u + 911u;
  vec2 jitter = vec2(randomValue(), randomValue()) - 0.5;
  vec2 screen = (2.0 * (gl_FragCoord.xy + jitter) - resolution) / resolution.y;
  vec3 direction = normalize(forward + halfViewHeight * (screen.x * rightAxis + screen.y * upAxis));
  vec3 light = tracePath(eye, direction);

  // Average in linear light. Apply the display transform only after averaging.
  if (previousSamples > 0) {
    vec3 oldAverage = texelFetch(previousImage, ivec2(pixel), 0).rgb;
    light = mix(oldAverage, light, 1.0 / float(previousSamples + 1));
  }
  gl_FragColor = vec4(light, 1.0);
}`;

const displayFragmentShader = `
uniform sampler2D image;
void main() {
  vec3 linearLight = texelFetch(image, ivec2(gl_FragCoord.xy), 0).rgb;
  vec3 mapped = 1.24 * linearLight / (0.65 + linearLight);
  gl_FragColor = vec4(pow(mapped, vec3(1.0 / 2.2)), 1.0);
}`;
