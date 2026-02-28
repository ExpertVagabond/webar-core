/**
 * HiderMaterial — portal occlusion material (colorWrite: false).
 * Extracted from 8thwall-archive/image-target-portal. Zero SDK dependency.
 *
 * Makes meshes invisible but still write to the depth buffer, creating
 * a "window" effect for portals and AR occlusion.
 *
 * Usage (A-Frame):
 *   <a-entity gltf-model="wall.glb" hider-material></a-entity>
 *
 * Usage (standalone Three.js):
 *   import { createHiderMaterial, applyHiderMaterial } from '@psmedia/webar-core/components/hider-material'
 *   applyHiderMaterial(mesh)
 */

export function createHiderMaterial() {
  const mat = new THREE.MeshStandardMaterial()
  mat.colorWrite = false
  return mat
}

export function applyHiderMaterial(object3D, material) {
  const hiderMat = material || createHiderMaterial()
  if (!object3D) return

  if (object3D.material) {
    object3D.material = hiderMat
  }
  object3D.traverse((node) => {
    if (node.isMesh) {
      node.material = hiderMat
    }
  })
}

// A-Frame component
export const hiderMaterialComponent = {
  init() {
    const hiderMat = createHiderMaterial()

    const apply = () => applyHiderMaterial(this.el.getObject3D('mesh'), hiderMat)

    apply()
    this.el.addEventListener('model-loaded', apply)
  },
}
