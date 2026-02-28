/**
 * AnimationRig — animation retargeting between GLTF models.
 * Extracted from 8thwall-archive/readyplayerme. Zero SDK dependency (uses Three.js).
 *
 * Copies animations from a "remote" model (animation source) and plays them
 * on the current model. Supports wildcard clip matching, crossfade, and loop modes.
 *
 * Usage (A-Frame):
 *   <a-entity id="anim-source" gltf-model="animations.glb" visible="false"></a-entity>
 *   <a-entity gltf-model="avatar.glb" animation-rig="remoteId: anim-source; clip: RUNNING"></a-entity>
 */

const LoopMode = {
  once: THREE.LoopOnce,
  repeat: THREE.LoopRepeat,
  pingpong: THREE.LoopPingPong,
}

function wildcardToRegExp(s) {
  return new RegExp(`^${s.split(/\*+/).map(regExpEscape).join('.*')}$`)
}

function regExpEscape(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
}

export const animationRigComponent = {
  schema: {
    remoteId: { default: '', type: 'string' },
    clip: { default: '*', type: 'string' },
    duration: { default: 0, type: 'number' },
    clampWhenFinished: { default: false, type: 'boolean' },
    crossFadeDuration: { default: 0, type: 'number' },
    loop: { default: 'repeat', oneOf: Object.keys(LoopMode) },
    repetitions: { default: Infinity, min: 0 },
    timeScale: { default: 1 },
  },

  init() {
    this.model = null
    this.remoteModel = null
    this.mixer = null
    this.activeActions = []

    let { remoteId } = this.data
    if (!remoteId) return

    remoteId = remoteId.charAt(0) === '#' ? remoteId.slice(1) : remoteId
    const remoteEl = document.getElementById(remoteId)
    if (!remoteEl) {
      console.error('animation-rig: Remote entity not found:', remoteId)
      return
    }

    this.model = this.el.getObject3D('mesh')
    this.remoteModel = remoteEl.getObject3D('mesh')

    const tryToLoad = () => {
      if (this.model && this.remoteModel) this._load()
    }

    if (this.model) {
      tryToLoad()
    } else {
      this.el.addEventListener('model-loaded', (e) => {
        this.model = e.detail.model
        tryToLoad()
      })
    }

    if (this.remoteModel) {
      tryToLoad()
    } else {
      remoteEl.addEventListener('model-loaded', (e) => {
        this.remoteModel = e.detail.model
        tryToLoad()
      })
    }
  },

  _load() {
    this.model.animations = [...this.remoteModel.animations]
    this.mixer = new THREE.AnimationMixer(this.model)

    this.mixer.addEventListener('loop', (e) => {
      this.el.emit('animation-loop', { action: e.action, loopDelta: e.loopDelta })
    })

    this.mixer.addEventListener('finished', (e) => {
      this.el.emit('animation-finished', { action: e.action, direction: e.direction })
    })

    if (this.data.clip) this.update({})
  },

  remove() {
    if (this.mixer) this.mixer.stopAllAction()
  },

  update(prevData) {
    if (!prevData) return
    const { data } = this
    const changes = AFRAME.utils.diff(data, prevData)

    if ('clip' in changes) {
      this._stopAction()
      if (data.clip) this._playAction()
      return
    }

    this.activeActions.forEach((action) => {
      if ('duration' in changes && data.duration) action.setDuration(data.duration)
      if ('clampWhenFinished' in changes) action.clampWhenFinished = data.clampWhenFinished
      if ('loop' in changes || 'repetitions' in changes) {
        action.setLoop(LoopMode[data.loop], data.repetitions)
      }
      if ('timeScale' in changes) action.setEffectiveTimeScale(data.timeScale)
    })
  },

  _stopAction() {
    const { data } = this
    for (const action of this.activeActions) {
      if (data.crossFadeDuration) {
        action.fadeOut(data.crossFadeDuration)
      } else {
        action.stop()
      }
    }
    this.activeActions = []
  },

  _playAction() {
    if (!this.mixer) return
    const { model, data } = this
    const clips = model.animations || (model.geometry || {}).animations || []
    if (!clips.length) return

    const re = wildcardToRegExp(data.clip)
    for (const clip of clips) {
      if (clip.name.match(re)) {
        const action = this.mixer.clipAction(clip, model)
        action.enabled = true
        action.clampWhenFinished = data.clampWhenFinished
        if (data.duration) action.setDuration(data.duration)
        if (data.timeScale !== 1) action.setEffectiveTimeScale(data.timeScale)
        action.setLoop(LoopMode[data.loop], data.repetitions).fadeIn(data.crossFadeDuration).play()
        this.activeActions.push(action)
      }
    }
  },

  tick(t, dt) {
    if (this.mixer && !Number.isNaN(dt)) this.mixer.update(dt / 1000)
  },
}
