/**
 * ImageTargetAdapter — wraps MindAR.js to emit 8th Wall-compatible events.
 * Replaces: xrweb imageTargets pipeline
 *
 * Events emitted: xrimagefound, xrimageupdated, xrimagelost
 *
 * Usage:
 *   import { ImageTargetAdapter } from '@psmedia/webar-core/adapters/image-target'
 *   const adapter = new ImageTargetAdapter({ targetSrc: 'target.mind' })
 *   adapter.on('xrimagefound', (e) => console.log('Found!', e))
 *   await adapter.start(videoElement)
 */

export class ImageTargetAdapter {
  constructor({ targetSrc, maxTrack = 1 }) {
    this.targetSrc = targetSrc
    this.maxTrack = maxTrack
    this.controller = null
    this._listeners = {}
    this._tracking = new Map()
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
    return this
  }

  off(event, callback) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback)
    return this
  }

  _emit(event, detail) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((cb) => cb(detail))
    }
  }

  async start(videoElement) {
    // Dynamic import — MindAR must be installed by the consumer
    const { MindARThree } = await import('mind-ar/dist/mindar-image-three.prod.js')

    this.controller = new MindARThree({
      container: videoElement.parentElement,
      imageTargetSrc: this.targetSrc,
      maxTrack: this.maxTrack,
    })

    await this.controller.start()

    // MindAR provides anchors for each target
    for (let i = 0; i < this.maxTrack; i++) {
      const anchor = this.controller.addAnchor(i)

      anchor.onTargetFound = () => {
        this._tracking.set(i, true)
        this._emit('xrimagefound', {
          detail: {
            name: `target-${i}`,
            index: i,
            position: anchor.group.position.clone(),
            rotation: anchor.group.quaternion.clone(),
            scale: anchor.group.scale.clone(),
          },
        })
      }

      anchor.onTargetUpdated = () => {
        this._emit('xrimageupdated', {
          detail: {
            name: `target-${i}`,
            index: i,
            position: anchor.group.position.clone(),
            rotation: anchor.group.quaternion.clone(),
            scale: anchor.group.scale.clone(),
          },
        })
      }

      anchor.onTargetLost = () => {
        this._tracking.set(i, false)
        this._emit('xrimagelost', {
          detail: { name: `target-${i}`, index: i },
        })
      }
    }

    return this.controller
  }

  stop() {
    if (this.controller) {
      this.controller.stop()
      this.controller = null
    }
    this._tracking.clear()
  }

  getAnchorGroup(index = 0) {
    if (!this.controller) return null
    return this.controller.addAnchor(index).group
  }
}

// A-Frame system (registers as mindar-image-system)
export const imageTargetSystem = {
  schema: {
    imageTargetSrc: { type: 'string' },
    maxTrack: { type: 'number', default: 1 },
  },

  init() {
    this.adapter = new ImageTargetAdapter({
      targetSrc: this.data.imageTargetSrc,
      maxTrack: this.data.maxTrack,
    })

    // Forward events to A-Frame scene
    const scene = this.el
    ;['xrimagefound', 'xrimageupdated', 'xrimagelost'].forEach((evt) => {
      this.adapter.on(evt, (detail) => scene.emit(evt, detail))
    })
  },
}
