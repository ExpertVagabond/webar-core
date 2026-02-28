/**
 * VirtualJoystick — multi-input character controller.
 * Extracted from 8thwall-archive/readyplayerme. Zero SDK dependency.
 *
 * Supports: touchscreen joystick, WASD/arrow keys, gamepad, XR controllers.
 * Emits movement vector relative to camera orientation.
 *
 * Usage (A-Frame):
 *   <a-entity virtual-joystick="speed: 0.007; cameraId: camera"></a-entity>
 *
 * Usage (standalone):
 *   import { VirtualJoystick } from '@psmedia/webar-core/components/virtual-joystick'
 *   const joy = new VirtualJoystick(containerEl)
 *   // In animation loop: joy.getInput() → { forward, side, isMoving }
 */

// Standalone class
export class VirtualJoystick {
  constructor(container, { sensitivity = 0.3 } = {}) {
    this.sensitivity = sensitivity
    this.forward = 0
    this.side = 0
    this.isMoving = false

    // Keyboard state
    this._keys = { fwd: false, back: false, left: false, right: false }

    // Touch state
    this._touchStart = null
    this._touchCurrent = null

    // Gamepad
    this._hasGamepad = false

    // DOM elements for visual joystick
    this.joystickParent = document.createElement('div')
    this.joystickParent.className = 'joystick-container'
    this.joystickParent.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;z-index:10;'

    this.joystickOrigin = document.createElement('div')
    this.joystickOrigin.className = 'joystick-origin'
    this.joystickOrigin.style.cssText = 'position:absolute;width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);transform:translate(-50%,-50%);'

    this.joystickPosition = document.createElement('div')
    this.joystickPosition.className = 'joystick-thumb'
    this.joystickPosition.style.cssText = 'position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.6);transform:translate(-50%,-50%);'

    this.joystickParent.appendChild(this.joystickOrigin)
    this.joystickParent.appendChild(this.joystickPosition)
    container.appendChild(this.joystickParent)

    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._onTouchStart = this._onTouchStart.bind(this)
    this._onTouchMove = this._onTouchMove.bind(this)
    this._onTouchEnd = this._onTouchEnd.bind(this)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    container.addEventListener('touchstart', this._onTouchStart, { passive: true })
    container.addEventListener('touchmove', this._onTouchMove, { passive: true })
    container.addEventListener('touchend', this._onTouchEnd)
    container.addEventListener('touchcancel', this._onTouchEnd)

    window.addEventListener('gamepadconnected', () => { this._hasGamepad = true })
  }

  _onKeyDown(e) {
    const k = this._keys
    if (e.key === 'ArrowUp' || e.key === 'w') k.fwd = true
    if (e.key === 'ArrowDown' || e.key === 's') k.back = true
    if (e.key === 'ArrowLeft' || e.key === 'a') k.left = true
    if (e.key === 'ArrowRight' || e.key === 'd') k.right = true
  }

  _onKeyUp(e) {
    const k = this._keys
    if (e.key === 'ArrowUp' || e.key === 'w') k.fwd = false
    if (e.key === 'ArrowDown' || e.key === 's') k.back = false
    if (e.key === 'ArrowLeft' || e.key === 'a') k.left = false
    if (e.key === 'ArrowRight' || e.key === 'd') k.right = false
  }

  _onTouchStart(e) {
    const t = e.touches[0]
    this._touchStart = { x: t.clientX, y: t.clientY }
    this._touchCurrent = { x: t.clientX, y: t.clientY }
  }

  _onTouchMove(e) {
    if (!this._touchStart) return
    const t = e.touches[0]
    this._touchCurrent = { x: t.clientX, y: t.clientY }
  }

  _onTouchEnd() {
    this._touchStart = null
    this._touchCurrent = null
    this.joystickParent.style.display = 'none'
  }

  getInput() {
    const s = this.sensitivity
    this.forward = 0
    this.side = 0
    this.isMoving = false

    // Touch input
    if (this._touchStart && this._touchCurrent) {
      const maxDist = Math.min(window.innerWidth, window.innerHeight) / 6.5
      let dx = this._touchCurrent.x - this._touchStart.x
      let dy = this._touchCurrent.y - this._touchStart.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > maxDist) {
        dx *= maxDist / dist
        dy *= maxDist / dist
      }
      const normX = dx / maxDist
      const normY = dy / maxDist

      if (Math.abs(normX) > s || Math.abs(normY) > s) {
        this.forward = -Math.min(Math.max(-1, normY), 1)
        this.side = -Math.min(Math.max(-1, normX), 1)
        this.isMoving = true
      }

      // Update visual
      const wScale = 100 / window.innerWidth
      const hScale = 100 / window.innerHeight
      this.joystickParent.style.display = 'block'
      this.joystickOrigin.style.left = `${this._touchStart.x * wScale}%`
      this.joystickOrigin.style.top = `${this._touchStart.y * hScale}%`
      this.joystickPosition.style.left = `${(this._touchStart.x + dx) * wScale}%`
      this.joystickPosition.style.top = `${(this._touchStart.y + dy) * hScale}%`
    }

    // Keyboard input (overrides touch if active)
    const k = this._keys
    if (k.fwd || k.back || k.left || k.right) {
      this.forward = (k.fwd ? 1 : 0) - (k.back ? 1 : 0)
      this.side = (k.left ? 1 : 0) - (k.right ? 1 : 0)
      // Normalize diagonal
      if (this.forward !== 0 && this.side !== 0) {
        const len = Math.sqrt(this.forward * this.forward + this.side * this.side)
        this.forward /= len
        this.side /= len
      }
      this.isMoving = true
    }

    // Gamepad input
    if (this._hasGamepad && !this.isMoving) {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      if (gamepads[0]) {
        const gx = gamepads[0].axes[0]
        const gy = gamepads[0].axes[1]
        if (Math.abs(gx) > s || Math.abs(gy) > s) {
          this.forward = -Math.min(Math.max(-1, gy), 1)
          this.side = -Math.min(Math.max(-1, gx), 1)
          this.isMoving = true
        }
      }
    }

    return { forward: this.forward, side: this.side, isMoving: this.isMoving }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    this.joystickParent.remove()
  }
}

// A-Frame component
export const virtualJoystickComponent = {
  schema: {
    speed: { type: 'number', default: 0.007 },
    cameraId: { type: 'string', default: 'camera' },
    animationClipRun: { type: 'string', default: 'RUNNING' },
    animationClipIdle: { type: 'string', default: 'IDLE' },
  },

  init() {
    const overlay = document.getElementById('overlay') || document.body
    this.joystick = new VirtualJoystick(overlay)
    this.camera = document.getElementById(this.data.cameraId)
  },

  tick(time, timeDelta) {
    const { forward, side, isMoving } = this.joystick.getInput()

    if (isMoving && this.camera) {
      const camY = this.camera.object3D.rotation.y
      const rot = Math.atan2(forward, side) - camY
      const speed = this.data.speed

      this.el.object3D.position.z -= speed * Math.sin(rot) * timeDelta
      this.el.object3D.position.x -= speed * Math.cos(rot) * timeDelta
      this.el.object3D.rotation.y = -rot - Math.PI / 2

      if (this.data.animationClipRun) {
        this.el.setAttribute('animation-rig', {
          clip: this.data.animationClipRun,
          loop: 'repeat',
          crossFadeDuration: 0.4,
        })
      }
    } else {
      if (this.data.animationClipIdle) {
        this.el.setAttribute('animation-rig', {
          clip: this.data.animationClipIdle,
          loop: 'repeat',
          crossFadeDuration: 0.4,
        })
      }
    }
  },

  remove() {
    this.joystick.dispose()
  },
}
