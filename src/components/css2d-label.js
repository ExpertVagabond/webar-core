/**
 * CSS2DLabel — floating HTML labels anchored to 3D objects.
 * Extracted from 8thwall-archive/buy-now. Zero SDK dependency.
 * Requires: three/examples/jsm/renderers/CSS2DRenderer
 *
 * Usage (A-Frame):
 *   <a-entity gltf-model="shoe.glb" css2d-label="text: Buy Now; href: https://shop.com"></a-entity>
 *
 * Usage (standalone Three.js):
 *   import { CSS2DLabelManager } from '@psmedia/webar-core/components/css2d-label'
 *   const mgr = new CSS2DLabelManager(renderer.domElement.parentElement)
 *   mgr.addLabel(mesh, { text: 'Buy Now', href: 'https://shop.com' })
 */

import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// Standalone manager (framework-agnostic)
export class CSS2DLabelManager {
  constructor(container) {
    this.scene = new THREE.Scene()
    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0px'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.labelRenderer.domElement)
    this.labels = new Map()

    window.addEventListener('resize', () => {
      this.labelRenderer.setSize(container.clientWidth, container.clientHeight)
    })
  }

  addLabel(object3D, { text = '', href = '', className = 'webar-label', offsetY = 0.3 } = {}) {
    const el = document.createElement('div')
    el.className = className

    if (href) {
      const link = document.createElement('a')
      link.href = href
      link.target = '_blank'
      link.textContent = text
      link.style.textDecoration = 'none'
      link.style.pointerEvents = 'auto'
      el.appendChild(link)
    } else {
      el.textContent = text
    }

    const labelObj = new CSS2DObject(el)
    this.scene.add(labelObj)

    this.labels.set(object3D, { labelObj, el, offsetY })
    return el
  }

  removeLabel(object3D) {
    const entry = this.labels.get(object3D)
    if (entry) {
      this.scene.remove(entry.labelObj)
      entry.el.remove()
      this.labels.delete(object3D)
    }
  }

  update(camera) {
    for (const [obj, { labelObj, offsetY }] of this.labels) {
      const box = new THREE.Box3().setFromObject(obj)
      const height = box.max.y - box.min.y
      labelObj.position.set(obj.position.x, height + offsetY, obj.position.z)
    }
    this.labelRenderer.render(this.scene, camera)
  }

  dispose() {
    this.labelRenderer.domElement.remove()
    for (const [, entry] of this.labels) {
      this.scene.remove(entry.labelObj)
      entry.el.remove()
    }
    this.labels.clear()
  }
}

// A-Frame component
export const css2dLabelComponent = {
  schema: {
    text: { type: 'string', default: '' },
    href: { type: 'string', default: '' },
    offsetY: { type: 'number', default: 0.3 },
  },

  init() {
    this._labelScene = new THREE.Scene()
    this.camera = this.el.sceneEl.camera

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0px'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    document.body.appendChild(this.labelRenderer.domElement)

    this.meshBoundsY = 0

    this.el.addEventListener('model-loaded', () => {
      const box = new THREE.Box3().setFromObject(this.el.object3D)
      this.meshBoundsY = Math.abs(box.max.y - box.min.y)
    })

    const label = document.createElement('div')
    label.className = 'webar-label'

    if (this.data.href) {
      const link = document.createElement('a')
      link.href = this.data.href
      link.target = '_blank'
      link.textContent = this.data.text
      link.style.textDecoration = 'none'
      link.style.pointerEvents = 'auto'
      label.appendChild(link)
    } else {
      label.textContent = this.data.text
    }

    document.body.appendChild(label)

    this.labelObj = new CSS2DObject(label)
    this._labelScene.add(this.labelObj)

    window.addEventListener('resize', () => {
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight)
    })
  },

  tick() {
    const pos = this.el.object3D.position
    this.labelObj.position.set(pos.x, this.meshBoundsY + this.data.offsetY, pos.z)
    this.labelRenderer.render(this._labelScene, this.camera)
  },

  remove() {
    this.labelRenderer.domElement.remove()
  },
}
