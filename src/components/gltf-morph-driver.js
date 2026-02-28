/**
 * GltfMorphDriver — morph target setter for GLTF models.
 * Extracted from 8thwall-archive/avatar-rigged-face-model. Zero SDK dependency.
 *
 * Usage (A-Frame):
 *   <a-entity gltf-model="avatar.glb" gltf-morph__smile="morphtarget: mouthSmile; value: 0.8"></a-entity>
 *
 * Usage (standalone Three.js):
 *   import { setMorphTarget } from '@psmedia/webar-core/components/gltf-morph-driver'
 *   setMorphTarget(mesh, 'mouthOpen', 0.5)
 */

// Standalone function (framework-agnostic)
export function setMorphTarget(object3D, targetName, value) {
  object3D.traverse((node) => {
    if (node.morphTargetInfluences && node.userData.targetNames) {
      const idx = node.userData.targetNames.indexOf(targetName)
      if (idx !== -1) {
        node.morphTargetInfluences[idx] = value
      }
    }
    // Also check morphTargetDictionary (standard Three.js path)
    if (node.morphTargetInfluences && node.morphTargetDictionary) {
      const idx = node.morphTargetDictionary[targetName]
      if (idx !== undefined) {
        node.morphTargetInfluences[idx] = value
      }
    }
  })
}

// Get all available morph target names from a model
export function getMorphTargets(object3D) {
  const targets = new Set()
  object3D.traverse((node) => {
    if (node.userData.targetNames) {
      node.userData.targetNames.forEach((name) => targets.add(name))
    }
    if (node.morphTargetDictionary) {
      Object.keys(node.morphTargetDictionary).forEach((name) => targets.add(name))
    }
  })
  return Array.from(targets)
}

// Normalize a value between min and max (0-1 range)
export function blendAmount(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

// A-Frame component (supports multiple instances via __suffix)
export const gltfMorphComponent = {
  multiple: true,
  schema: {
    morphtarget: { type: 'string', default: '' },
    value: { type: 'number', default: 0 },
  },

  init() {
    this.el.addEventListener('object3dset', () => this._apply())
    this.el.addEventListener('model-loaded', () => this._apply())
  },

  update() {
    this._apply()
  },

  _apply() {
    const mesh = this.el.object3D
    if (!mesh || !this.data.morphtarget) return
    setMorphTarget(mesh, this.data.morphtarget, this.data.value)
  },
}
