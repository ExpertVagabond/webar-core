/**
 * webar-core — shared WebAR library by Purple Squirrel Media
 *
 * Open-source replacements for 8th Wall SDK features.
 * Components extracted from 8thwall-archive, adapters wrap MindAR/MediaPipe/WebXR.
 *
 * Security:
 * - GPS coordinates validated within valid ranges (-90..90 lat, -180..180 lng)
 * - Image target URLs validated before fetch (no data: or javascript: URIs)
 * - SLAM/face tracking runs client-side only — no data sent to external servers
 * - A-Frame component registration checks for duplicates (prevents override attacks)
 * - No external API calls or credential requirements — fully offline-capable
 * - All user-facing text sanitized via textContent (no innerHTML injection)
 */

// Adapters (SDK replacements)
export { ImageTargetAdapter, imageTargetSystem } from './adapters/image-target.js'
export { FaceTrackingAdapter, ATTACHMENT_POINTS } from './adapters/face-tracking.js'
export { SLAMAdapter } from './adapters/slam.js'
export { GPSGeofence, haversineDistance } from './adapters/gps-geofence.js'

// Components (A-Frame + standalone)
export { ProximityTrigger, proximityTriggerComponent } from './components/proximity-trigger.js'
export { hiderMaterialComponent, createHiderMaterial, applyHiderMaterial } from './components/hider-material.js'
export { CSS2DLabelManager, css2dLabelComponent } from './components/css2d-label.js'
export { navMeshComponent } from './components/nav-mesh.js'
export { setMorphTarget, getMorphTargets, blendAmount, gltfMorphComponent } from './components/gltf-morph-driver.js'
export { animationRigComponent } from './components/animation-rig.js'
export { VirtualJoystick, virtualJoystickComponent } from './components/virtual-joystick.js'

// Shaders
export { ChromaKeyShader, createChromaKeyMaterial } from './shaders/chromakey.js'
export { LavaShader, createLavaMaterial } from './shaders/lava.js'
export { UVScrollShader, createUVScrollMaterial } from './shaders/uv-scroll.js'

// A-Frame registration helper
export function registerAllComponents(AFRAME) {
  if (!AFRAME) {
    console.warn('webar-core: AFRAME not provided, skipping component registration')
    return
  }

  const components = {
    'proximity-trigger': proximityTriggerComponent,
    'hider-material': hiderMaterialComponent,
    'css2d-label': css2dLabelComponent,
    'nav-mesh': navMeshComponent,
    'gltf-morph': gltfMorphComponent,
    'animation-rig': animationRigComponent,
    'virtual-joystick': virtualJoystickComponent,
  }

  for (const [name, component] of Object.entries(components)) {
    if (!AFRAME.components[name]) {
      AFRAME.registerComponent(name, component)
    }
  }
}
