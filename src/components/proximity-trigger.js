/**
 * ProximityTrigger — distance-based trigger for A-Frame entities.
 * Extracted from 8thwall-archive/proximity-trigger. Zero SDK dependency.
 *
 * Usage (A-Frame):
 *   <a-entity proximity-trigger="target: #player; radius: 2; hideOnEnter: true"></a-entity>
 *
 * Usage (standalone):
 *   import { ProximityTrigger } from '@psmedia/webar-core/components/proximity-trigger'
 *   const trigger = new ProximityTrigger({ radius: 2 })
 *   trigger.check(entityPos, targetPos) // returns { inside, distance }
 */

// Standalone class (framework-agnostic)
export class ProximityTrigger {
  constructor({ radius = 1 } = {}) {
    this.radius = radius
    this._inside = false
  }

  check(entityPos, targetPos) {
    const distance = Math.hypot(targetPos.x - entityPos.x, targetPos.z - entityPos.z)
    const wasInside = this._inside
    this._inside = distance <= this.radius

    return {
      inside: this._inside,
      entered: this._inside && !wasInside,
      exited: !this._inside && wasInside,
      distance,
    }
  }
}

// A-Frame component
export const proximityTriggerComponent = {
  schema: {
    target: { type: 'selector', default: '#character' },
    radius: { type: 'number', default: 1 },
    hideOnEnter: { type: 'boolean', default: true },
  },

  init() {
    this.trigger = new ProximityTrigger({ radius: this.data.radius })
  },

  update() {
    this.trigger.radius = this.data.radius
  },

  tick() {
    const target = this.data.target
    if (!target) return

    const entityPos = this.el.object3D.position
    const targetPos = target.object3D.position
    const result = this.trigger.check(entityPos, targetPos)

    if (result.entered) {
      this.el.emit('proximity-enter', { distance: result.distance })
      if (this.data.hideOnEnter) this.el.setAttribute('visible', 'false')
    }

    if (result.exited) {
      this.el.emit('proximity-exit', { distance: result.distance })
      if (this.data.hideOnEnter) this.el.setAttribute('visible', 'true')
    }
  },
}
