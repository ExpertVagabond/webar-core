/**
 * GPSGeofence — GPS-based geofencing with Haversine distance.
 * Replaces: Niantic VPS wayspot detection (no open-source web VPS exists).
 *
 * Events emitted: enter, exit, distance
 *
 * Usage:
 *   import { GPSGeofence } from '@psmedia/webar-core/adapters/gps-geofence'
 *   const geo = new GPSGeofence()
 *   geo.addWaypoint({ id: 'spot1', lat: 25.2048, lng: 55.2708, radius: 20, name: 'Dubai Frame' })
 *   geo.on('enter', (wp) => console.log('Entered:', wp.name))
 *   geo.on('exit', (wp) => console.log('Left:', wp.name))
 *   geo.start()
 */

// Haversine formula — distance in meters between two lat/lng points
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export class GPSGeofence {
  constructor({ updateInterval = 3000, highAccuracy = true } = {}) {
    this.waypoints = []
    this._listeners = {}
    this._watchId = null
    this._insideSet = new Set()
    this._lastPosition = null
    this.updateInterval = updateInterval
    this.highAccuracy = highAccuracy
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

  addWaypoint({ id, lat, lng, radius = 20, name = '', data = {} }) {
    this.waypoints.push({ id, lat, lng, radius, name, data })
    return this
  }

  removeWaypoint(id) {
    this.waypoints = this.waypoints.filter((wp) => wp.id !== id)
    this._insideSet.delete(id)
    return this
  }

  start() {
    if (!navigator.geolocation) {
      console.error('GPSGeofence: Geolocation not available')
      return this
    }

    this._watchId = navigator.geolocation.watchPosition(
      (position) => this._onPosition(position),
      (error) => this._emit('error', error),
      {
        enableHighAccuracy: this.highAccuracy,
        maximumAge: this.updateInterval,
        timeout: 10000,
      }
    )

    return this
  }

  stop() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId)
      this._watchId = null
    }
    return this
  }

  _onPosition(position) {
    const { latitude, longitude, accuracy } = position.coords
    this._lastPosition = { lat: latitude, lng: longitude, accuracy }

    const distances = []

    for (const wp of this.waypoints) {
      const distance = haversineDistance(latitude, longitude, wp.lat, wp.lng)
      const wasInside = this._insideSet.has(wp.id)
      const isInside = distance <= wp.radius

      distances.push({ ...wp, distance, isInside })

      if (isInside && !wasInside) {
        this._insideSet.add(wp.id)
        this._emit('enter', { ...wp, distance, accuracy })
      } else if (!isInside && wasInside) {
        this._insideSet.delete(wp.id)
        this._emit('exit', { ...wp, distance, accuracy })
      }
    }

    this._emit('distance', {
      position: { lat: latitude, lng: longitude, accuracy },
      waypoints: distances,
    })
  }

  // Get current distances to all waypoints (call after at least one position update)
  getDistances() {
    if (!this._lastPosition) return []
    return this.waypoints.map((wp) => ({
      ...wp,
      distance: haversineDistance(this._lastPosition.lat, this._lastPosition.lng, wp.lat, wp.lng),
      isInside: this._insideSet.has(wp.id),
    }))
  }

  get lastPosition() {
    return this._lastPosition
  }
}
