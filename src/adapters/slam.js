/**
 * SLAMAdapter — surface detection via WebXR Hit Test (Android) with tap-to-place fallback (iOS).
 * Replaces: xrweb SLAM pipeline
 *
 * Strategy:
 *   1. Try WebXR immersive-ar session with hit-test feature (Chrome Android)
 *   2. Fall back to tap-to-place on a fixed ground plane (iOS Safari, desktop)
 *
 * Usage:
 *   import { SLAMAdapter } from '@psmedia/webar-core/adapters/slam'
 *   const slam = new SLAMAdapter(renderer, scene, camera)
 *   slam.on('place', ({ position, rotation }) => { mesh.position.copy(position) })
 *   await slam.start()
 */

export class SLAMAdapter {
  constructor(renderer, scene, camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this._listeners = {}
    this._xrSession = null
    this._hitTestSource = null
    this._reticle = null
    this._placed = false
    this._mode = null // 'webxr' | 'fallback'
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
    return this
  }

  _emit(event, detail) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((cb) => cb(detail))
    }
  }

  async start() {
    // Try WebXR first
    if (navigator.xr) {
      const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
      if (supported) {
        return this._startWebXR()
      }
    }
    // Fallback: tap-to-place on ground plane
    return this._startFallback()
  }

  async _startWebXR() {
    this._mode = 'webxr'
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
    })
    this._xrSession = session
    this.renderer.xr.enabled = true
    this.renderer.xr.setReferenceSpaceType('local')
    await this.renderer.xr.setSession(session)

    const refSpace = await session.requestReferenceSpace('viewer')
    this._hitTestSource = await session.requestHitTestSource({ space: refSpace })

    // Create reticle indicator
    this._reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.07, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide })
    )
    this._reticle.visible = false
    this.scene.add(this._reticle)

    // Tap to confirm placement
    session.addEventListener('select', () => {
      if (this._reticle.visible) {
        this._emit('place', {
          position: this._reticle.position.clone(),
          rotation: this._reticle.quaternion.clone(),
        })
        this._placed = true
      }
    })

    this._emit('ready', { mode: 'webxr' })
    return this
  }

  _startFallback() {
    this._mode = 'fallback'

    // Ground plane raycaster
    const raycaster = new THREE.Raycaster()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersection = new THREE.Vector3()

    const onClick = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        this._emit('place', {
          position: intersection.clone(),
          rotation: new THREE.Quaternion(),
        })
        this._placed = true
      }
    }

    const onTouch = (e) => {
      if (e.touches.length === 1) {
        onClick({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        })
      }
    }

    this.renderer.domElement.addEventListener('click', onClick)
    this.renderer.domElement.addEventListener('touchstart', onTouch, { passive: true })

    this._cleanupFallback = () => {
      this.renderer.domElement.removeEventListener('click', onClick)
      this.renderer.domElement.removeEventListener('touchstart', onTouch)
    }

    this._emit('ready', { mode: 'fallback' })
    return this
  }

  // Call in WebXR render loop to update reticle
  updateHitTest(frame, referenceSpace) {
    if (!this._hitTestSource || !frame || this._placed) return

    const hitTestResults = frame.getHitTestResults(this._hitTestSource)
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0]
      const pose = hit.getPose(referenceSpace)
      if (pose) {
        this._reticle.visible = true
        this._reticle.matrix.fromArray(pose.transform.matrix)
        this._reticle.matrix.decompose(
          this._reticle.position,
          this._reticle.quaternion,
          this._reticle.scale
        )
      }
    } else {
      this._reticle.visible = false
    }
  }

  stop() {
    if (this._xrSession) {
      this._xrSession.end()
      this._xrSession = null
    }
    if (this._reticle) {
      this.scene.remove(this._reticle)
      this._reticle = null
    }
    if (this._cleanupFallback) {
      this._cleanupFallback()
    }
    this._hitTestSource = null
    this._placed = false
  }

  get mode() {
    return this._mode
  }

  get isPlaced() {
    return this._placed
  }
}
