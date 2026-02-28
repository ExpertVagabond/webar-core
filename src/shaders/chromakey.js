/**
 * ChromaKeyShader — green/blue screen removal in GLSL.
 * Extracted from 8thwall-archive/video-and-audio. Zero SDK dependency.
 *
 * Usage (Three.js):
 *   import { ChromaKeyShader, createChromaKeyMaterial } from '@psmedia/webar-core/shaders/chromakey'
 *   const material = createChromaKeyMaterial(videoTexture, { keyColor: [0, 1, 0] })
 */

export const ChromaKeyShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tex;
    uniform vec3 keyColor;
    uniform float similarity;
    uniform float smoothness;
    uniform float spill;
    varying vec2 vUv;

    vec2 RGBtoUV(vec3 rgb) {
      return vec2(
        rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5 + 0.5,
        rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
      );
    }

    vec4 ProcessChromaKey(vec2 texCoord) {
      vec4 rgba = texture2D(tex, texCoord);
      float chromaDist = distance(RGBtoUV(rgba.rgb), RGBtoUV(keyColor));
      float baseMask = chromaDist - similarity;
      float fullMask = pow(clamp(baseMask / smoothness, 0.0, 1.0), 1.5);
      rgba.a = fullMask;
      float spillVal = pow(clamp(baseMask / spill, 0.0, 1.0), 1.5);
      float desat = clamp(rgba.r * 0.2126 + rgba.g * 0.7152 + rgba.b * 0.0722, 0.0, 1.0);
      rgba.rgb = mix(vec3(desat), rgba.rgb, spillVal);
      return rgba;
    }

    void main() {
      gl_FragColor = ProcessChromaKey(vUv);
    }
  `,
}

export function createChromaKeyMaterial(texture, {
  keyColor = [0.0, 1.0, 0.0],
  similarity = 0.4,
  smoothness = 0.08,
  spill = 0.1,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      keyColor: { value: new THREE.Color(...keyColor) },
      similarity: { value: similarity },
      smoothness: { value: smoothness },
      spill: { value: spill },
    },
    vertexShader: ChromaKeyShader.vertexShader,
    fragmentShader: ChromaKeyShader.fragmentShader,
    transparent: true,
  })
}
