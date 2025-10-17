# [cesium](https://cesium.com/cesiumjs/)-sensor-volumes
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0.html)

A Cesium plugin for visualizing sensor volumes. Based on [cesium-sensors](https://github.com/AnalyticalGraphicsInc/cesium-sensors) and evolved to support more recent Cesium versions.

## Install

This version isn't installable from npm as it is a customized version.

## Usage

Prebuilt minified and unminified versions of the plugin are in the [dist](dist/) directory.

### Using with the `cesium` package

Include the `cesium-sensor-volumes.js` file using a `script` tag after the `Cesium.js` `script` tag.

The plugin automatically adds support for the CZML properties `agi_conicSensor`, `agi_customPatternSensor`, and `agi_rectangularSensor`.
The corresponding `Entity` properties are `conicSensor`, `customPatternSensor`, and `rectangularSensor`.

In order to load data directly into `Entity` objects that you create directly, you must call `entity.addProperty` to create each of the sensor properties you wish to use.
The CZML processing does this automatically.

```html
<script src="path/to/Cesium.js"></script>
<script src="path/to/cesium-sensor-volumes.js"></script>
<script>
// To create an entity directly
var entityCollection = new Cesium.EntityCollection();
var entity = entityCollection.getOrCreateEntity('test');

// Configure other entity properties, e.g. position and orientation...
entity.addProperty('conicSensor');
entity.conicSensor = new CesiumSensorVolumes.ConicSensorGraphics();
entity.conicSensor.intersectionColor = new Cesium.ConstantProperty(new Cesium.Color(0.1, 0.2, 0.3, 0.4));
</script>
```

### Using with `@cesium/engine` for better tree-shaking

For projects using `@cesium/engine` instead of the full `cesium` package, you can use the engine-specific builds for more efficient tree-shaking:

**ES Module:**
```javascript
import CesiumSensorVolumes from 'cesium-sensor-volumes/engine';
// or directly:
// import CesiumSensorVolumes from './dist/cesium-sensor-volumes.engine.es.js';
```

The engine builds (`cesium-sensor-volumes.engine.es.js` and `cesium-sensor-volumes.engine.es.min.js`) import from `@cesium/engine` instead of `cesium`, allowing bundlers to better optimize your final bundle size.

**Note:** When using the engine builds, make sure you have `@cesium/engine` installed in your project:
```bash
npm install @cesium/engine
```

### Examples

Simple examples are included in the [examples](examples/) folder. 
To run locally, run `npm start` and navigate to [http://localhost:3000](http://localhost:3000) and select the example application to run.

## Build

To build, run `npm install`, then run `npm run build`.

## License

Apache 2.0.  Free for commercial and non-commercial use.  See [LICENSE.md](LICENSE.md).
