/**
 * UVScrollShader — animated UV scroll with optional emissive pulse.
 * Extracted from 8thwall-archive/putt-putt (ported from ECS to Three.js). Zero SDK dependency.
 *
 * Usage (Three.js):
 *   import { createUVScrollMaterial } from '@psmedia/webar-core/shaders/uv-scroll'
 *   const mat = createUVScrollMaterial(texture, { speedU: 0.1, emissivePulse: true })
 *   // In animation loop: mat.uniforms.time.value = elapsedSeconds
 */

export const UVScrollShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float speedU;
    uniform float speedV;
    uniform bool emissivePulse;
    uniform float emissiveMin;
    uniform float emissiveMax;
    uniform float opacity;
    uniform bool reverseX;
    uniform sampler2D diffuseTexture;
    varying vec2 vUv;

    void main() {
      vec2 animatedUv = vUv;
      animatedUv.x += time * speedU;
      animatedUv.y += time * speedV;

      if (reverseX) {
        animatedUv.x = 1.0 - animatedUv.x;
      }

      vec4 texColor = texture2D(diffuseTexture, animatedUv);

      vec3 emissiveColor = vec3(1.0, 0.314, 0.0);
      if (emissivePulse) {
        float pulse = (sin(time * 1.5) + 1.0) / 2.0;
        float emissiveIntensity = emissiveMin + (emissiveMax - emissiveMin) * pulse;
        texColor.rgb += emissiveColor * emissiveIntensity;
      }

      gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
    }
  `,
}

export function createUVScrollMaterial(texture, {
  speedU = 0.1,
  speedV = 0.0,
  emissivePulse = true,
  emissiveMin = 1.0,
  emissiveMax = 2.0,
  opacity = 1.0,
  reverseX = false,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      speedU: { value: speedU },
      speedV: { value: speedV },
      emissivePulse: { value: emissivePulse },
      emissiveMin: { value: emissiveMin },
      emissiveMax: { value: emissiveMax },
      opacity: { value: opacity },
      reverseX: { value: reverseX },
      diffuseTexture: { value: texture },
    },
    vertexShader: UVScrollShader.vertexShader,
    fragmentShader: UVScrollShader.fragmentShader,
    transparent: true,
  })
}
