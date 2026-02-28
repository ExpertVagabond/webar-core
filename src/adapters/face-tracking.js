/**
 * FaceTrackingAdapter — wraps MediaPipe Face Mesh to emit 8th Wall-compatible events.
 * Replaces: xrface pipeline + xrextras-face-attachment
 *
 * Maps MediaPipe 468 landmarks to 8th Wall attachment points:
 *   upperLip → #0, lowerLip → #17, mouth → #13
 *   mouthLeftCorner → #61, mouthRightCorner → #291
 *   leftEyebrowMiddle → #107, rightEyebrowMiddle → #336
 *   noseTip → #1, leftEye → #33, rightEye → #263
 *
 * Events emitted: xrfacefound, xrfaceupdated, xrfacelost
 *
 * Usage:
 *   import { FaceTrackingAdapter } from '@psmedia/webar-core/adapters/face-tracking'
 *   const adapter = new FaceTrackingAdapter()
 *   adapter.on('xrfaceupdated', (e) => console.log(e.landmarks))
 *   await adapter.start(videoElement)
 */

// MediaPipe landmark index → 8th Wall attachment point name
export const ATTACHMENT_POINTS = {
  upperLip: 0,
  lowerLip: 17,
  mouth: 13,
  mouthLeftCorner: 61,
  mouthRightCorner: 291,
  leftEyebrowMiddle: 107,
  rightEyebrowMiddle: 336,
  noseTip: 1,
  leftEye: 33,
  rightEye: 263,
  chin: 152,
  foreheadCenter: 10,
}

export class FaceTrackingAdapter {
  constructor({ maxFaces = 1 } = {}) {
    this.maxFaces = maxFaces
    this._listeners = {}
    this._faceLandmarker = null
    this._videoElement = null
    this._animationId = null
    this._wasTracking = false
    this._faceId = 0
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
    this._videoElement = videoElement

    // Dynamic import — @mediapipe/tasks-vision must be installed by consumer
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    )

    this._faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: this.maxFaces,
    })

    this._tick()
    return this
  }

  _tick() {
    if (!this._faceLandmarker || !this._videoElement) return

    const video = this._videoElement
    if (video.readyState >= 2) {
      const results = this._faceLandmarker.detectForVideo(video, performance.now())
      const hasFace = results.faceLandmarks && results.faceLandmarks.length > 0

      if (hasFace) {
        const landmarks = results.faceLandmarks[0]
        const blendshapes = results.faceBlendshapes?.[0]?.categories || []

        // Build attachment points object
        const attachmentPoints = {}
        for (const [name, idx] of Object.entries(ATTACHMENT_POINTS)) {
          if (landmarks[idx]) {
            attachmentPoints[name] = {
              x: landmarks[idx].x,
              y: landmarks[idx].y,
              z: landmarks[idx].z,
            }
          }
        }

        // Build transform (rough head pose from key landmarks)
        const nose = landmarks[1]
        const transform = {
          position: { x: nose.x - 0.5, y: -(nose.y - 0.5), z: -nose.z },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: 1,
        }

        const detail = {
          id: this._faceId,
          transform,
          attachmentPoints,
          landmarks,
          blendshapes,
        }

        if (!this._wasTracking) {
          this._wasTracking = true
          this._emit('xrfacefound', { detail })
        } else {
          this._emit('xrfaceupdated', { detail })
        }
      } else if (this._wasTracking) {
        this._wasTracking = false
        this._emit('xrfacelost', { detail: { id: this._faceId } })
        this._faceId++
      }
    }

    this._animationId = requestAnimationFrame(() => this._tick())
  }

  stop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }
    if (this._faceLandmarker) {
      this._faceLandmarker.close()
      this._faceLandmarker = null
    }
    this._wasTracking = false
  }

  // Get specific blendshape value by name (e.g., 'mouthOpen', 'browInnerUp')
  static getBlendshape(blendshapes, name) {
    const shape = blendshapes.find((b) => b.categoryName === name)
    return shape ? shape.score : 0
  }
}
