# webar-core

**Lightweight open-source WebAR SDK. Drop-in replacement for 8th Wall with adapters for MindAR, MediaPipe, and WebXR.**

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![A-Frame](https://img.shields.io/badge/A--Frame-EF2D5E?logo=aframe&logoColor=white)
![WebXR](https://img.shields.io/badge/WebXR-Supported-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **Image target tracking** via MindAR adapter
- **Face tracking** with attachment points via MediaPipe
- **SLAM** plane detection adapter
- **GPS/geofence** utilities for location-based AR
- **Proximity triggers** and CSS2D label overlays
- **Custom shaders** — ChromaKey, Lava, UV-Scroll
- **A-Frame component** registration helpers

## Install

```bash
npm install @psmedia/webar-core
```

## Usage

```javascript
import { ImageTracker, FaceTracker, SlamAdapter } from '@psmedia/webar-core';

const tracker = new ImageTracker({ targets: ['card.mind'] });
tracker.on('found', (event) => {
  // Place 3D content at target
});
```

## Architecture

```
src/
  adapters/
    image-tracker.js     MindAR image target adapter
    face-tracker.js      MediaPipe face mesh adapter
    slam-adapter.js      Plane detection adapter
  components/
    proximity-trigger.js  Distance-based events
    css2d-label.js       HTML overlays in 3D space
    nav-mesh.js          Navigation mesh component
  shaders/
    chroma-key.js        Green screen removal
    lava.js              Animated lava effect
    uv-scroll.js         Scrolling texture effect
  utils/
    geofence.js          GPS boundary detection
    helpers.js           A-Frame registration helpers
```

## License

[MIT](LICENSE)

## Author

Built by [Purple Squirrel Media](https://purplesquirrelmedia.io)
