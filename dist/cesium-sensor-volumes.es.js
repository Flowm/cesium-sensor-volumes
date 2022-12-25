/**
 * Cesium Sensor Volumes - https://github.com/Flowm/cesium-sensor-volumes
 *
 * Copyright 2016 Jonathan Lounsbury
 * Copyright 2011-2014 Analytical Graphics Inc. and Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Portions licensed separately.
 * See https://github.com/Flowm/cesium-sensor-volumes/blob/master/LICENSE.md for full licensing details.
 *
 * Derived from Cesium Sensors - https://github.com/AnalyticalGraphicsInc/cesium-sensors
 */

import Cartesian3 from 'Cesium/Core/Cartesian3';
import Color from 'Cesium/Core/Color';
import defined from 'Cesium/Core/defined';
import Spherical from 'Cesium/Core/Spherical';
import TimeInterval from 'Cesium/Core/TimeInterval';
import CzmlDataSource from 'Cesium/DataSources/CzmlDataSource';
import DataSourceDisplay from 'Cesium/DataSources/DataSourceDisplay';
import defaultValue from 'Cesium/Core/defaultValue';
import DeveloperError from 'Cesium/Core/DeveloperError';
import Event from 'Cesium/Core/Event';
import createMaterialPropertyDescriptor from 'Cesium/DataSources/createMaterialPropertyDescriptor';
import createPropertyDescriptor from 'Cesium/DataSources/createPropertyDescriptor';
import AssociativeArray from 'Cesium/Core/AssociativeArray';
import destroyObject from 'Cesium/Core/destroyObject';
import CesiumMath from 'Cesium/Core/Math';
import Matrix3 from 'Cesium/Core/Matrix3';
import Matrix4 from 'Cesium/Core/Matrix4';
import Quaternion from 'Cesium/Core/Quaternion';
import MaterialProperty from 'Cesium/DataSources/MaterialProperty';
import Property from 'Cesium/DataSources/Property';
import BoundingSphere from 'Cesium/Core/BoundingSphere';
import combine from 'Cesium/Core/combine';
import ComponentDatatype from 'Cesium/Core/ComponentDatatype';
import PrimitiveType from 'Cesium/Core/PrimitiveType';
import Buffer from 'Cesium/Renderer/Buffer';
import BufferUsage from 'Cesium/Renderer/BufferUsage';
import DrawCommand from 'Cesium/Renderer/DrawCommand';
import Pass from 'Cesium/Renderer/Pass';
import RenderState from 'Cesium/Renderer/RenderState';
import ShaderProgram from 'Cesium/Renderer/ShaderProgram';
import ShaderSource from 'Cesium/Renderer/ShaderSource';
import VertexArray from 'Cesium/Renderer/VertexArray';
import BlendingState from 'Cesium/Scene/BlendingState';
import CullFace from 'Cesium/Scene/CullFace';
import Material from 'Cesium/Scene/Material';
import SceneMode from 'Cesium/Scene/SceneMode';
import clone from 'Cesium/Core/clone';

/**
 * An optionally time-dynamic cone.
 *
 * @alias ConicSensorGraphics
 * @constructor
 */
const ConicSensorGraphics = function(options) {
	this._minimumClockAngle = undefined;
	this._minimumClockAngleSubscription = undefined;
	this._maximumClockAngle = undefined;
	this._maximumClockAngleSubscription = undefined;
	this._innerHalfAngle = undefined;
	this._innerHalfAngleSubscription = undefined;
	this._outerHalfAngle = undefined;
	this._outerHalfAngleSubscription = undefined;
	this._lateralSurfaceMaterial = undefined;
	this._lateralSurfaceMaterialSubscription = undefined;
	this._intersectionColor = undefined;
	this._intersectionColorSubscription = undefined;
	this._intersectionWidth = undefined;
	this._intersectionWidthSubscription = undefined;
	this._showIntersection = undefined;
	this._showIntersectionSubscription = undefined;
	this._radius = undefined;
	this._radiusSubscription = undefined;
	this._show = undefined;
	this._showSubscription = undefined;
	this._definitionChanged = new Event();

	this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
};

Object.defineProperties(ConicSensorGraphics.prototype, {
	/**
	 * Gets the event that is raised whenever a new property is assigned.
	 * @memberof ConicSensorGraphics.prototype
	 *
	 * @type {Event}
	 * @readonly
	 */
	definitionChanged: {
		get: function() {
			return this._definitionChanged;
		}
	},

	/**
	 * Gets or sets the numeric {@link Property} specifying the the cone's minimum clock angle.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	minimumClockAngle: createPropertyDescriptor('minimumClockAngle'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the the cone's maximum clock angle.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	maximumClockAngle: createPropertyDescriptor('maximumClockAngle'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the the cone's inner half-angle.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	innerHalfAngle: createPropertyDescriptor('innerHalfAngle'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the the cone's outer half-angle.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	outerHalfAngle: createPropertyDescriptor('outerHalfAngle'),

	/**
	 * Gets or sets the {@link MaterialProperty} specifying the the cone's appearance.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {MaterialProperty}
	 */
	lateralSurfaceMaterial: createMaterialPropertyDescriptor('lateralSurfaceMaterial'),

	/**
	 * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the cone and other central bodies.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionColor: createPropertyDescriptor('intersectionColor'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the cone and other central bodies.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionWidth: createPropertyDescriptor('intersectionWidth'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the cone and other central bodies.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	showIntersection: createPropertyDescriptor('showIntersection'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the radius of the cone's projection.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	radius: createPropertyDescriptor('radius'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the cone.
	 * @memberof ConicSensorGraphics.prototype
	 * @type {Property}
	 */
	show: createPropertyDescriptor('show')
});

/**
 * Duplicates a ConicSensorGraphics instance.
 *
 * @param {ConicSensorGraphics} [result] The object onto which to store the result.
 * @returns {ConicSensorGraphics} The modified result parameter or a new instance if one was not provided.
 */
ConicSensorGraphics.prototype.clone = function(result) {
	if (!defined(result)) {
		result = new ConicSensorGraphics();
	}
	result.show = this.show;
	result.innerHalfAngle = this.innerHalfAngle;
	result.outerHalfAngle = this.outerHalfAngle;
	result.minimumClockAngle = this.minimumClockAngle;
	result.maximumClockAngle = this.maximumClockAngle;
	result.radius = this.radius;
	result.showIntersection = this.showIntersection;
	result.intersectionColor = this.intersectionColor;
	result.intersectionWidth = this.intersectionWidth;
	result.lateralSurfaceMaterial = this.lateralSurfaceMaterial;
	return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {ConicSensorGraphics} source The object to be merged into this object.
 */
ConicSensorGraphics.prototype.merge = function(source) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(source)) {
		throw new DeveloperError('source is required.');
	}
	// >>includeEnd('debug');

	this.show = defaultValue(this.show, source.show);
	this.innerHalfAngle = defaultValue(this.innerHalfAngle, source.innerHalfAngle);
	this.outerHalfAngle = defaultValue(this.outerHalfAngle, source.outerHalfAngle);
	this.minimumClockAngle = defaultValue(this.minimumClockAngle, source.minimumClockAngle);
	this.maximumClockAngle = defaultValue(this.maximumClockAngle, source.maximumClockAngle);
	this.radius = defaultValue(this.radius, source.radius);
	this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
	this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
	this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
	this.lateralSurfaceMaterial = defaultValue(this.lateralSurfaceMaterial, source.lateralSurfaceMaterial);
};

var SensorVolume = "uniform vec4 u_intersectionColor;uniform float u_intersectionWidth;bool inSensorShadow(vec3 coneVertexWC,vec3 pointWC){vec3 D=czm_ellipsoidInverseRadii;vec3 q=D*coneVertexWC;float qMagnitudeSquared=dot(q,q);float test=qMagnitudeSquared-1.0;vec3 temp=(D*pointWC)-q;float d=dot(temp,q);return (d<-test)&&((d/length(temp))<-sqrt(test));}vec4 getIntersectionColor(){return u_intersectionColor;}float getIntersectionWidth(){return u_intersectionWidth;}vec2 sensor2dTextureCoordinates(float sensorRadius,vec3 pointMC){float t=pointMC.z/sensorRadius;float s=1.0+(atan(pointMC.y,pointMC.x)/czm_twoPi);s=s-floor(s);return vec2(s,t);}";

var CustomSensorVolumeFS = "#ifdef GL_OES_standard_derivatives\n#extension GL_OES_standard_derivatives : enable\n#endif\nuniform bool u_showIntersection;uniform bool u_showThroughEllipsoid;uniform float u_sensorRadius;uniform float u_normalDirection;varying vec3 v_positionWC;varying vec3 v_positionEC;varying vec3 v_normalEC;vec4 getColor(float sensorRadius,vec3 pointEC){czm_materialInput materialInput;vec3 pointMC=(czm_inverseModelView*vec4(pointEC,1.0)).xyz;materialInput.st=sensor2dTextureCoordinates(sensorRadius,pointMC);materialInput.str=pointMC/sensorRadius;vec3 positionToEyeEC=-v_positionEC;materialInput.positionToEyeEC=positionToEyeEC;vec3 normalEC=normalize(v_normalEC);materialInput.normalEC=u_normalDirection*normalEC;czm_material material=czm_getMaterial(materialInput);return mix(czm_phong(normalize(positionToEyeEC),material,czm_lightDirectionEC),vec4(material.diffuse,material.alpha),0.4);}bool isOnBoundary(float value,float epsilon){float width=getIntersectionWidth();float tolerance=width*epsilon;\n#ifdef GL_OES_standard_derivatives\nfloat delta=max(abs(dFdx(value)),abs(dFdy(value)));float pixels=width*delta;float temp=abs(value);return ((temp<tolerance)&&(temp<pixels))||(((delta<(10.0*tolerance))&&((temp-delta)<tolerance))&&(temp<pixels));\n#else\nreturn abs(value)<tolerance;\n#endif\n}vec4 shade(bool isOnBoundary){if(u_showIntersection&&isOnBoundary){return getIntersectionColor();}return getColor(u_sensorRadius,v_positionEC);}float ellipsoidSurfaceFunction(vec3 point){vec3 scaled=czm_ellipsoidInverseRadii*point;return dot(scaled,scaled)-1.0;}void main(){vec3 sensorVertexWC=(czm_model[3]).xyz;vec3 sensorVertexEC=(czm_modelView[3]).xyz;float ellipsoidValue=ellipsoidSurfaceFunction(v_positionWC);if(!u_showThroughEllipsoid){if(ellipsoidValue<0.0){discard;}if(inSensorShadow(sensorVertexWC,v_positionWC)){discard;}}if(distance(v_positionEC,sensorVertexEC)>u_sensorRadius){discard;}bool isOnEllipsoid=isOnBoundary(ellipsoidValue,czm_epsilon3);gl_FragColor=shade(isOnEllipsoid);}";

var CustomSensorVolumeVS = "attribute vec4 position;attribute vec3 normal;varying vec3 v_positionWC;varying vec3 v_positionEC;varying vec3 v_normalEC;void main(){gl_Position=czm_modelViewProjection*position;v_positionWC=(czm_model*position).xyz;v_positionEC=(czm_modelView*position).xyz;v_normalEC=czm_normal*normal;}";

const attributeLocations = {
	position: 0,
	normal: 1
};

const FAR = 5906376272000.0;  // distance from the Sun to Pluto in meters.

/**
 * DOC_TBA
 *
 * @alias CustomSensorVolume
 * @constructor
 */
const CustomSensorVolume = function(options) {
	options = defaultValue(options, defaultValue.EMPTY_OBJECT);

	this._pickId = undefined;
	this._pickPrimitive = defaultValue(options._pickPrimitive, this);

	this._frontFaceColorCommand = new DrawCommand();
	this._backFaceColorCommand = new DrawCommand();
	this._pickCommand = new DrawCommand();

	this._boundingSphere = new BoundingSphere();
	this._boundingSphereWC = new BoundingSphere();

	this._frontFaceColorCommand.primitiveType = PrimitiveType.TRIANGLES;
	this._frontFaceColorCommand.boundingVolume = this._boundingSphereWC;
	this._frontFaceColorCommand.owner = this;

	this._backFaceColorCommand.primitiveType = this._frontFaceColorCommand.primitiveType;
	this._backFaceColorCommand.boundingVolume = this._frontFaceColorCommand.boundingVolume;
	this._backFaceColorCommand.owner = this;

	this._pickCommand.primitiveType = this._frontFaceColorCommand.primitiveType;
	this._pickCommand.boundingVolume = this._frontFaceColorCommand.boundingVolume;
	this._pickCommand.owner = this;

	/**
	 * <code>true</code> if this sensor will be shown; otherwise, <code>false</code>
	 *
	 * @type {Boolean}
	 * @default true
	 */
	this.show = defaultValue(options.show, true);

	/**
	 * When <code>true</code>, a polyline is shown where the sensor outline intersections the globe.
	 *
	 * @type {Boolean}
	 *
	 * @default true
	 *
	 * @see CustomSensorVolume#intersectionColor
	 */
	this.showIntersection = defaultValue(options.showIntersection, true);

	/**
	 * <p>
	 * Determines if a sensor intersecting the ellipsoid is drawn through the ellipsoid and potentially out
	 * to the other side, or if the part of the sensor intersecting the ellipsoid stops at the ellipsoid.
	 * </p>
	 *
	 * @type {Boolean}
	 * @default false
	 */
	this.showThroughEllipsoid = defaultValue(options.showThroughEllipsoid, false);
	this._showThroughEllipsoid = this.showThroughEllipsoid;

	/**
	 * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
	 * coordinates, the sensor's principal direction is along the positive z-axis.  The clock angle, sometimes
	 * called azimuth, is the angle in the sensor's X-Y plane measured from the positive X-axis toward the positive
	 * Y-axis.  The cone angle, sometimes called elevation, is the angle out of the X-Y plane along the positive Z-axis.
	 * <br /><br />
	 * <div align='center'>
	 * <img src='images/CustomSensorVolume.setModelMatrix.png' /><br />
	 * Model coordinate system for a custom sensor
	 * </div>
	 *
	 * @type {Matrix4}
	 * @default {@link Matrix4.IDENTITY}
	 *
	 * @example
	 * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
	 * // The sensor's opens upward, along the surface normal.
	 * var center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
	 * sensor.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
	 */
	this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
	this._modelMatrix = new Matrix4();

	/**
	 * DOC_TBA
	 *
	 * @type {Number}
	 * @default {@link Number.POSITIVE_INFINITY}
	 */
	this.radius = defaultValue(options.radius, Number.POSITIVE_INFINITY);

	this._directions = undefined;
	this._directionsDirty = false;
	this.directions = defined(options.directions) ? options.directions : [];

	/**
	 * The surface appearance of the sensor.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
	 * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}.
	 * <p>
	 * The default material is <code>Material.ColorType</code>.
	 * </p>
	 *
	 * @type {Material}
	 * @default Material.fromType(Material.ColorType)
	 *
	 * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
	 *
	 * @example
	 * // 1. Change the color of the default material to yellow
	 * sensor.lateralSurfaceMaterial.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
	 *
	 * // 2. Change material to horizontal stripes
	 * sensor.lateralSurfaceMaterial = Cesium.Material.fromType(Material.StripeType);
	 */
	this.lateralSurfaceMaterial = defined(options.lateralSurfaceMaterial) ? options.lateralSurfaceMaterial : Material.fromType(Material.ColorType);
	this._lateralSurfaceMaterial = undefined;
	this._translucent = undefined;

	/**
	 * The color of the polyline where the sensor outline intersects the globe.  The default is {@link Color.WHITE}.
	 *
	 * @type {Color}
	 * @default {@link Color.WHITE}
	 *
	 * @see CustomSensorVolume#showIntersection
	 */
	this.intersectionColor = Color.clone(defaultValue(options.intersectionColor, Color.WHITE));

	/**
	 * The approximate pixel width of the polyline where the sensor outline intersects the globe.  The default is 5.0.
	 *
	 * @type {Number}
	 * @default 5.0
	 *
	 * @see CustomSensorVolume#showIntersection
	 */
	this.intersectionWidth = defaultValue(options.intersectionWidth, 5.0);

	/**
	 * User-defined object returned when the sensors is picked.
	 *
	 * @type Object
	 *
	 * @default undefined
	 *
	 * @see Scene#pick
	 */
	this.id = options.id;
	this._id = undefined;

	var that = this;

	/* eslint-disable camelcase */
	this._uniforms = {
		u_showThroughEllipsoid: function() {
			return that.showThroughEllipsoid;
		},
		u_showIntersection: function() {
			return that.showIntersection;
		},
		u_sensorRadius: function() {
			return isFinite(that.radius) ? that.radius : FAR;
		},
		u_intersectionColor: function() {
			return that.intersectionColor;
		},
		u_intersectionWidth: function() {
			return that.intersectionWidth;
		},
		u_normalDirection: function() {
			return 1.0;
		}
	};
	/* eslint-enable camelcase */

	this._mode = SceneMode.SCENE3D;
};

Object.defineProperties(CustomSensorVolume.prototype, {
	directions: {
		get: function() {
			return this._directions;
		},
		set: function(value) {
			this._directions = value;
			this._directionsDirty = true;
		}
	}
});

const n0Scratch = new Cartesian3();
const n1Scratch = new Cartesian3();
const n2Scratch = new Cartesian3();
function computePositions(customSensorVolume) {
	var directions = customSensorVolume._directions;
	var length = directions.length;
	var positions = new Float32Array(3 * length);
	var r = isFinite(customSensorVolume.radius) ? customSensorVolume.radius : FAR;

	var boundingVolumePositions = [Cartesian3.ZERO];

	for (var i = length - 2, j = length - 1, k = 0; k < length; i = j++, j = k++) {
		// PERFORMANCE_IDEA:  We can avoid redundant operations for adjacent edges.
		var n0 = Cartesian3.fromSpherical(directions[i], n0Scratch);
		var n1 = Cartesian3.fromSpherical(directions[j], n1Scratch);
		var n2 = Cartesian3.fromSpherical(directions[k], n2Scratch);

		// Extend position so the volume encompasses the sensor's radius.
		var theta = Math.max(Cartesian3.angleBetween(n0, n1), Cartesian3.angleBetween(n1, n2));
		var distance = r / Math.cos(theta * 0.5);
		var p = Cartesian3.multiplyByScalar(n1, distance, new Cartesian3());

		positions[(j * 3)] = p.x;
		positions[(j * 3) + 1] = p.y;
		positions[(j * 3) + 2] = p.z;

		boundingVolumePositions.push(p);
	}

	BoundingSphere.fromPoints(boundingVolumePositions, customSensorVolume._boundingSphere);

	return positions;
}

const nScratch = new Cartesian3();
function createVertexArray(customSensorVolume, context) {
	var positions = computePositions(customSensorVolume);

	var length = customSensorVolume._directions.length;
	var vertices = new Float32Array(2 * 3 * 3 * length);

	var k = 0;
	for (var i = length - 1, j = 0; j < length; i = j++) {
		var p0 = new Cartesian3(positions[(i * 3)], positions[(i * 3) + 1], positions[(i * 3) + 2]);
		var p1 = new Cartesian3(positions[(j * 3)], positions[(j * 3) + 1], positions[(j * 3) + 2]);
		var n = Cartesian3.normalize(Cartesian3.cross(p1, p0, nScratch), nScratch); // Per-face normals

		vertices[k++] = 0.0; // Sensor vertex
		vertices[k++] = 0.0;
		vertices[k++] = 0.0;
		vertices[k++] = n.x;
		vertices[k++] = n.y;
		vertices[k++] = n.z;

		vertices[k++] = p1.x;
		vertices[k++] = p1.y;
		vertices[k++] = p1.z;
		vertices[k++] = n.x;
		vertices[k++] = n.y;
		vertices[k++] = n.z;

		vertices[k++] = p0.x;
		vertices[k++] = p0.y;
		vertices[k++] = p0.z;
		vertices[k++] = n.x;
		vertices[k++] = n.y;
		vertices[k++] = n.z;
	}

	var vertexBuffer = Buffer.createVertexBuffer({
		context: context,
		typedArray: new Float32Array(vertices),
		usage: BufferUsage.STATIC_DRAW
	});

	var stride = 2 * 3 * Float32Array.BYTES_PER_ELEMENT;

	var attributes = [{
		index: attributeLocations.position,
		vertexBuffer: vertexBuffer,
		componentsPerAttribute: 3,
		componentDatatype: ComponentDatatype.FLOAT,
		offsetInBytes: 0,
		strideInBytes: stride
	}, {
		index: attributeLocations.normal,
		vertexBuffer: vertexBuffer,
		componentsPerAttribute: 3,
		componentDatatype: ComponentDatatype.FLOAT,
		offsetInBytes: 3 * Float32Array.BYTES_PER_ELEMENT,
		strideInBytes: stride
	}];

	return new VertexArray({
		context: context,
		attributes: attributes
	});
}

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} this.radius must be greater than or equal to zero.
 * @exception {DeveloperError} this.lateralSurfaceMaterial must be defined.
 */
// eslint-disable-next-line complexity
CustomSensorVolume.prototype.update = function(frameState) {
	this._mode = frameState.mode;
	if (!this.show || this._mode !== SceneMode.SCENE3D) {
		return;
	}

	var context = frameState.context;
	var commandList = frameState.commandList;

	// >>includeStart('debug', pragmas.debug);
	if (this.radius < 0.0) {
		throw new DeveloperError('this.radius must be greater than or equal to zero.');
	}
	if (!defined(this.lateralSurfaceMaterial)) {
		throw new DeveloperError('this.lateralSurfaceMaterial must be defined.');
	}
	// >>includeEnd('debug');

	var translucent = this.lateralSurfaceMaterial.isTranslucent();

	// Initial render state creation
	if ((this._showThroughEllipsoid !== this.showThroughEllipsoid) ||
		(!defined(this._frontFaceColorCommand.renderState)) ||
		(this._translucent !== translucent)
	) {
		this._showThroughEllipsoid = this.showThroughEllipsoid;
		this._translucent = translucent;

		var rs;

		if (translucent) {
			rs = RenderState.fromCache({
				depthTest: {
					// This would be better served by depth testing with a depth buffer that does not
					// include the ellipsoid depth - or a g-buffer containing an ellipsoid mask
					// so we can selectively depth test.
					enabled: !this.showThroughEllipsoid
				},
				depthMask: false,
				blending: BlendingState.ALPHA_BLEND,
				cull: {
					enabled: true,
					face: CullFace.BACK
				}
			});

			this._frontFaceColorCommand.renderState = rs;
			this._frontFaceColorCommand.pass = Pass.TRANSLUCENT;

			rs = RenderState.fromCache({
				depthTest: {
					enabled: !this.showThroughEllipsoid
				},
				depthMask: false,
				blending: BlendingState.ALPHA_BLEND,
				cull: {
					enabled: true,
					face: CullFace.FRONT
				}
			});

			this._backFaceColorCommand.renderState = rs;
			this._backFaceColorCommand.pass = Pass.TRANSLUCENT;

			rs = RenderState.fromCache({
				depthTest: {
					enabled: !this.showThroughEllipsoid
				},
				depthMask: false,
				blending: BlendingState.ALPHA_BLEND
			});
			this._pickCommand.renderState = rs;
		} else {
			rs = RenderState.fromCache({
				depthTest: {
					enabled: true
				},
				depthMask: true
			});
			this._frontFaceColorCommand.renderState = rs;
			this._frontFaceColorCommand.pass = Pass.OPAQUE;

			rs = RenderState.fromCache({
				depthTest: {
					enabled: true
				},
				depthMask: true
			});
			this._pickCommand.renderState = rs;
		}
	}

	// Recreate vertex buffer when directions change
	var directionsChanged = this._directionsDirty;
	if (directionsChanged) {
		this._directionsDirty = false;
		this._va = this._va && this._va.destroy();

		var directions = this._directions;
		if (directions && (directions.length >= 3)) {
			this._frontFaceColorCommand.vertexArray = createVertexArray(this, context);
			this._backFaceColorCommand.vertexArray = this._frontFaceColorCommand.vertexArray;
			this._pickCommand.vertexArray = this._frontFaceColorCommand.vertexArray;
		}
	}

	if (!defined(this._frontFaceColorCommand.vertexArray)) {
		return;
	}

	var pass = frameState.passes;

	var modelMatrixChanged = !Matrix4.equals(this.modelMatrix, this._modelMatrix);
	if (modelMatrixChanged) {
		Matrix4.clone(this.modelMatrix, this._modelMatrix);
	}

	if (directionsChanged || modelMatrixChanged) {
		BoundingSphere.transform(this._boundingSphere, this.modelMatrix, this._boundingSphereWC);
	}

	this._frontFaceColorCommand.modelMatrix = this.modelMatrix;
	this._backFaceColorCommand.modelMatrix = this._frontFaceColorCommand.modelMatrix;
	this._pickCommand.modelMatrix = this._frontFaceColorCommand.modelMatrix;

	var materialChanged = this._lateralSurfaceMaterial !== this.lateralSurfaceMaterial;
	this._lateralSurfaceMaterial = this.lateralSurfaceMaterial;
	this._lateralSurfaceMaterial.update(context);

	if (pass.render) {
		var frontFaceColorCommand = this._frontFaceColorCommand;
		var backFaceColorCommand = this._backFaceColorCommand;

		// Recompile shader when material changes
		if (materialChanged || !defined(frontFaceColorCommand.shaderProgram)) {
			var fsSource = new ShaderSource({
				sources: [SensorVolume, this._lateralSurfaceMaterial.shaderSource, CustomSensorVolumeFS]
			});

			frontFaceColorCommand.shaderProgram = ShaderProgram.replaceCache({
				context: context,
				shaderProgram: frontFaceColorCommand.shaderProgram,
				vertexShaderSource: CustomSensorVolumeVS,
				fragmentShaderSource: fsSource,
				attributeLocations: attributeLocations
			});

			frontFaceColorCommand.uniformMap = combine(this._uniforms, this._lateralSurfaceMaterial._uniforms);

			backFaceColorCommand.shaderProgram = frontFaceColorCommand.shaderProgram;
			backFaceColorCommand.uniformMap = combine(this._uniforms, this._lateralSurfaceMaterial._uniforms);
			// eslint-disable-next-line camelcase
			backFaceColorCommand.uniformMap.u_normalDirection = function() {
				return -1.0;
			};
		}

		if (translucent) {
			commandList.push(this._backFaceColorCommand, this._frontFaceColorCommand);
		} else {
			commandList.push(this._frontFaceColorCommand);
		}
	}

	if (pass.pick) {
		var pickCommand = this._pickCommand;

		if (!defined(this._pickId) || (this._id !== this.id)) {
			this._id = this.id;
			this._pickId = this._pickId && this._pickId.destroy();
			this._pickId = context.createPickId({
				primitive: this._pickPrimitive,
				id: this.id
			});
		}

		// Recompile shader when material changes
		if (materialChanged || !defined(pickCommand.shaderProgram)) {
			var pickFS = new ShaderSource({
				sources: [SensorVolume, this._lateralSurfaceMaterial.shaderSource, CustomSensorVolumeFS],
				pickColorQualifier: 'uniform'
			});

			pickCommand.shaderProgram = ShaderProgram.replaceCache({
				context: context,
				shaderProgram: pickCommand.shaderProgram,
				vertexShaderSource: CustomSensorVolumeVS,
				fragmentShaderSource: pickFS,
				attributeLocations: attributeLocations
			});

			var that = this;
			var uniforms = {
				// eslint-disable-next-line camelcase
				czm_pickColor: function() {
					return that._pickId.color;
				}
			};
			pickCommand.uniformMap = combine(combine(this._uniforms, this._lateralSurfaceMaterial._uniforms), uniforms);
		}

		pickCommand.pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;
		commandList.push(pickCommand);
	}
};

/**
 * DOC_TBA
 */
CustomSensorVolume.prototype.isDestroyed = function() {
	return false;
};

/**
 * DOC_TBA
 */
CustomSensorVolume.prototype.destroy = function() {
	this._frontFaceColorCommand.vertexArray = this._frontFaceColorCommand.vertexArray && this._frontFaceColorCommand.vertexArray.destroy();
	this._frontFaceColorCommand.shaderProgram = this._frontFaceColorCommand.shaderProgram && this._frontFaceColorCommand.shaderProgram.destroy();
	this._pickCommand.shaderProgram = this._pickCommand.shaderProgram && this._pickCommand.shaderProgram.destroy();
	this._pickId = this._pickId && this._pickId.destroy();
	return destroyObject(this);
};

function removePrimitive(entity, hash, primitives) {
	var data = hash[entity.id];
	if (defined(data)) {
		var primitive = data.primitive;
		primitives.remove(primitive);
		if (!primitive.isDestroyed()) {
			primitive.destroy();
		}
		delete hash[entity.id];
	}
}

const defaultIntersectionColor$2 = Color.WHITE;
const defaultIntersectionWidth$2 = 1.0;
const defaultRadius$2 = Number.POSITIVE_INFINITY;

const matrix3Scratch$2 = new Matrix3();
const cachedPosition$2 = new Cartesian3();
const cachedOrientation$2 = new Quaternion();

function assignSpherical$1(index, array, clock, cone) {
	var spherical = array[index];
	if (!defined(spherical)) {
		spherical = new Spherical();
		array[index] = spherical;
	}
	spherical.clock = clock;
	spherical.cone = cone;
	spherical.magnitude = 1.0;
}

// eslint-disable-next-line max-params
function computeDirections(primitive, minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle) {
	var directions = primitive.directions;
	var angle;
	var i = 0;
	var angleStep = CesiumMath.toRadians(2.0);
	if (minimumClockAngle === 0.0 && maximumClockAngle === CesiumMath.TWO_PI) {
		// No clock angle limits, so this is just a circle.
		// There might be a hole but we're ignoring it for now.
		for (angle = 0.0; angle < CesiumMath.TWO_PI; angle += angleStep) {
			assignSpherical$1(i++, directions, angle, outerHalfAngle);
		}
	} else {
		// There are clock angle limits.
		for (angle = minimumClockAngle; angle < maximumClockAngle; angle += angleStep) {
			assignSpherical$1(i++, directions, angle, outerHalfAngle);
		}
		assignSpherical$1(i++, directions, maximumClockAngle, outerHalfAngle);
		if (innerHalfAngle) {
			for (angle = maximumClockAngle; angle > minimumClockAngle; angle -= angleStep) {
				assignSpherical$1(i++, directions, angle, innerHalfAngle);
			}
			assignSpherical$1(i++, directions, minimumClockAngle, innerHalfAngle);
		} else {
			assignSpherical$1(i++, directions, maximumClockAngle, 0.0);
		}
	}
	directions.length = i;
	primitive.directions = directions;
}

/**
 * A {@link Visualizer} which maps {@link Entity#conicSensor} to a {@link ConicSensor}.
 * @alias ConicSensorVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
const ConicSensorVisualizer = function(scene, entityCollection) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(scene)) {
		throw new DeveloperError('scene is required.');
	}
	if (!defined(entityCollection)) {
		throw new DeveloperError('entityCollection is required.');
	}
	// >>includeEnd('debug');

	entityCollection.collectionChanged.addEventListener(ConicSensorVisualizer.prototype._onCollectionChanged, this);

	this._scene = scene;
	this._primitives = scene.primitives;
	this._entityCollection = entityCollection;
	this._hash = {};
	this._entitiesToVisualize = new AssociativeArray();

	this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
};

/**
 * Updates the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {Boolean} This function always returns true.
 */
ConicSensorVisualizer.prototype.update = function(time) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(time)) {
		throw new DeveloperError('time is required.');
	}
	// >>includeEnd('debug');

	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;

	for (var i = 0, len = entities.length; i < len; i++) {
		var entity = entities[i];
		var conicSensorGraphics = entity._conicSensor;

		var position;
		var orientation;
		var data = hash[entity.id];
		var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(conicSensorGraphics._show, time, true);

		if (show) {
			position = Property.getValueOrUndefined(entity._position, time, cachedPosition$2);
			orientation = Property.getValueOrUndefined(entity._orientation, time, cachedOrientation$2);
			show = defined(position) && defined(orientation);
		}

		if (!show) {
			// don't bother creating or updating anything else
			if (defined(data)) {
				data.primitive.show = false;
			}
			continue;
		}

		var primitive = defined(data) ? data.primitive : undefined;
		if (!defined(primitive)) {
			primitive = new CustomSensorVolume();
			primitive.id = entity;
			primitives.add(primitive);

			data = {
				primitive: primitive,
				position: undefined,
				orientation: undefined,
				minimumClockAngle: undefined,
				maximumClockAngle: undefined,
				innerHalfAngle: undefined,
				outerHalfAngle: undefined
			};
			hash[entity.id] = data;
		}

		if (!Cartesian3.equals(position, data.position) || !Quaternion.equals(orientation, data.orientation)) {
			Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch$2), position, primitive.modelMatrix);
			data.position = Cartesian3.clone(position, data.position);
			data.orientation = Quaternion.clone(orientation, data.orientation);
		}

		primitive.show = true;
		var minimumClockAngle = Property.getValueOrDefault(conicSensorGraphics._minimumClockAngle, time, 0);
		var maximumClockAngle = Property.getValueOrDefault(conicSensorGraphics._maximumClockAngle, time, CesiumMath.TWO_PI);
		var innerHalfAngle = Property.getValueOrDefault(conicSensorGraphics._innerHalfAngle, time, 0);
		var outerHalfAngle = Property.getValueOrDefault(conicSensorGraphics._outerHalfAngle, time, Math.PI);

		if (minimumClockAngle !== data.minimumClockAngle ||
			maximumClockAngle !== data.maximumClockAngle ||
			innerHalfAngle !== data.innerHalfAngle ||
			outerHalfAngle !== data.outerHalfAngle
		) {
			computeDirections(primitive, minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle);
			data.innerHalfAngle = innerHalfAngle;
			data.maximumClockAngle = maximumClockAngle;
			data.outerHalfAngle = outerHalfAngle;
			data.minimumClockAngle = minimumClockAngle;
		}

		primitive.radius = Property.getValueOrDefault(conicSensorGraphics._radius, time, defaultRadius$2);
		primitive.lateralSurfaceMaterial = MaterialProperty.getValue(time, conicSensorGraphics._lateralSurfaceMaterial, primitive.lateralSurfaceMaterial);
		primitive.intersectionColor = Property.getValueOrClonedDefault(conicSensorGraphics._intersectionColor, time, defaultIntersectionColor$2, primitive.intersectionColor);
		primitive.intersectionWidth = Property.getValueOrDefault(conicSensorGraphics._intersectionWidth, time, defaultIntersectionWidth$2);
	}
	return true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
ConicSensorVisualizer.prototype.isDestroyed = function() {
	return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
ConicSensorVisualizer.prototype.destroy = function() {
	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;
	for (var i = entities.length - 1; i > -1; i--) {
		removePrimitive(entities[i], hash, primitives);
	}
	return destroyObject(this);
};

/**
 * @private
 */
ConicSensorVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
	var i;
	var entity;
	var entities = this._entitiesToVisualize;
	var hash = this._hash;
	var primitives = this._primitives;

	for (i = added.length - 1; i > -1; i--) {
		entity = added[i];
		if (defined(entity._conicSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		}
	}

	for (i = changed.length - 1; i > -1; i--) {
		entity = changed[i];
		if (defined(entity._conicSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		} else {
			removePrimitive(entity, hash, primitives);
			entities.remove(entity.id);
		}
	}

	for (i = removed.length - 1; i > -1; i--) {
		entity = removed[i];
		removePrimitive(entity, hash, primitives);
		entities.remove(entity.id);
	}
};

/**
 * An optionally time-dynamic custom patterned sensor.
 *
 * @alias CustomPatternSensorGraphics
 * @constructor
 */
const CustomPatternSensorGraphics = function(options) {
	this._directions = undefined;
	this._directionsSubscription = undefined;

	this._lateralSurfaceMaterial = undefined;
	this._lateralSurfaceMaterialSubscription = undefined;

	this._intersectionColor = undefined;
	this._intersectionColorSubscription = undefined;
	this._intersectionWidth = undefined;
	this._intersectionWidthSubscription = undefined;
	this._showIntersection = undefined;
	this._showIntersectionSubscription = undefined;
	this._radius = undefined;
	this._radiusSubscription = undefined;
	this._show = undefined;
	this._showSubscription = undefined;
	this._definitionChanged = new Event();

	this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
};

Object.defineProperties(CustomPatternSensorGraphics.prototype, {
	/**
	 * Gets the event that is raised whenever a new property is assigned.
	 * @memberof CustomPatternSensorGraphics.prototype
	 *
	 * @type {Event}
	 * @readonly
	 */
	definitionChanged: {
		get: function() {
			return this._definitionChanged;
		}
	},

	/**
	 * A {@link Property} which returns an array of {@link Spherical} instances representing the sensor's projection.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	directions: createPropertyDescriptor('directions'),

	/**
	 * Gets or sets the {@link MaterialProperty} specifying the the sensor's appearance.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {MaterialProperty}
	 */
	lateralSurfaceMaterial: createMaterialPropertyDescriptor('lateralSurfaceMaterial'),

	/**
	 * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the sensor and other central bodies.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionColor: createPropertyDescriptor('intersectionColor'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the sensor and other central bodies.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionWidth: createPropertyDescriptor('intersectionWidth'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the sensor and other central bodies.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	showIntersection: createPropertyDescriptor('showIntersection'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the radius of the sensor's projection.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	radius: createPropertyDescriptor('radius'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the sensor.
	 * @memberof CustomPatternSensorGraphics.prototype
	 * @type {Property}
	 */
	show: createPropertyDescriptor('show')
});

/**
 * Duplicates a CustomPatternSensorGraphics instance.
 *
 * @param {CustomPatternSensorGraphics} [result] The object onto which to store the result.
 * @returns {CustomPatternSensorGraphics} The modified result parameter or a new instance if one was not provided.
 */
CustomPatternSensorGraphics.prototype.clone = function(result) {
	if (!defined(result)) {
		result = new CustomPatternSensorGraphics();
	}
	result.directions = this.directions;
	result.radius = this.radius;
	result.show = this.show;
	result.showIntersection = this.showIntersection;
	result.intersectionColor = this.intersectionColor;
	result.intersectionWidth = this.intersectionWidth;
	result.lateralSurfaceMaterial = this.lateralSurfaceMaterial;
	return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {CustomPatternSensorGraphics} source The object to be merged into this object.
 */
CustomPatternSensorGraphics.prototype.merge = function(source) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(source)) {
		throw new DeveloperError('source is required.');
	}
	// >>includeEnd('debug');

	this.directions = defaultValue(this.directions, source.directions);
	this.radius = defaultValue(this.radius, source.radius);
	this.show = defaultValue(this.show, source.show);
	this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
	this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
	this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
	this.lateralSurfaceMaterial = defaultValue(this.lateralSurfaceMaterial, source.lateralSurfaceMaterial);
};

const defaultIntersectionColor$1 = Color.WHITE;
const defaultIntersectionWidth$1 = 1.0;
const defaultRadius$1 = Number.POSITIVE_INFINITY;

const matrix3Scratch$1 = new Matrix3();
const cachedPosition$1 = new Cartesian3();
const cachedOrientation$1 = new Quaternion();

/**
 * A {@link Visualizer} which maps {@link Entity#customPatternSensor} to a {@link CustomPatternSensor}.
 * @alias CustomPatternSensorVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
const CustomPatternSensorVisualizer = function(scene, entityCollection) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(scene)) {
		throw new DeveloperError('scene is required.');
	}
	if (!defined(entityCollection)) {
		throw new DeveloperError('entityCollection is required.');
	}
	// >>includeEnd('debug');

	entityCollection.collectionChanged.addEventListener(CustomPatternSensorVisualizer.prototype._onCollectionChanged, this);

	this._scene = scene;
	this._primitives = scene.primitives;
	this._entityCollection = entityCollection;
	this._hash = {};
	this._entitiesToVisualize = new AssociativeArray();

	this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
};

/**
 * Updates the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {Boolean} This function always returns true.
 */
CustomPatternSensorVisualizer.prototype.update = function(time) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(time)) {
		throw new DeveloperError('time is required.');
	}
	// >>includeEnd('debug');

	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;

	for (var i = 0, len = entities.length; i < len; i++) {
		var entity = entities[i];
		var customPatternSensorGraphics = entity._customPatternSensor;

		var position;
		var orientation;
		var directions;
		var data = hash[entity.id];
		var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(customPatternSensorGraphics._show, time, true);

		if (show) {
			position = Property.getValueOrUndefined(entity._position, time, cachedPosition$1);
			orientation = Property.getValueOrUndefined(entity._orientation, time, cachedOrientation$1);
			directions = Property.getValueOrUndefined(customPatternSensorGraphics._directions, time);
			show = defined(position) && defined(orientation) && defined(directions);
		}

		if (!show) {
			// don't bother creating or updating anything else
			if (defined(data)) {
				data.primitive.show = false;
			}
			continue;
		}

		var primitive = defined(data) ? data.primitive : undefined;
		if (!defined(primitive)) {
			primitive = new CustomSensorVolume();
			primitive.id = entity;
			primitives.add(primitive);

			data = {
				primitive: primitive,
				position: undefined,
				orientation: undefined
			};
			hash[entity.id] = data;
		}

		if (!Cartesian3.equals(position, data.position) || !Quaternion.equals(orientation, data.orientation)) {
			Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch$1), position, primitive.modelMatrix);
			data.position = Cartesian3.clone(position, data.position);
			data.orientation = Quaternion.clone(orientation, data.orientation);
		}

		primitive.show = true;
		primitive.directions = directions;
		primitive.radius = Property.getValueOrDefault(customPatternSensorGraphics._radius, time, defaultRadius$1);
		primitive.lateralSurfaceMaterial = MaterialProperty.getValue(time, customPatternSensorGraphics._lateralSurfaceMaterial, primitive.lateralSurfaceMaterial);
		primitive.intersectionColor = Property.getValueOrClonedDefault(customPatternSensorGraphics._intersectionColor, time, defaultIntersectionColor$1, primitive.intersectionColor);
		primitive.intersectionWidth = Property.getValueOrDefault(customPatternSensorGraphics._intersectionWidth, time, defaultIntersectionWidth$1);
	}
	return true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
CustomPatternSensorVisualizer.prototype.isDestroyed = function() {
	return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
CustomPatternSensorVisualizer.prototype.destroy = function() {
	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;
	for (var i = entities.length - 1; i > -1; i--) {
		removePrimitive(entities[i], hash, primitives);
	}
	return destroyObject(this);
};

/**
 * @private
 */
CustomPatternSensorVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
	var i;
	var entity;
	var entities = this._entitiesToVisualize;
	var hash = this._hash;
	var primitives = this._primitives;

	for (i = added.length - 1; i > -1; i--) {
		entity = added[i];
		if (defined(entity._customPatternSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		}
	}

	for (i = changed.length - 1; i > -1; i--) {
		entity = changed[i];
		if (defined(entity._customPatternSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		} else {
			removePrimitive(entity, hash, primitives);
			entities.remove(entity.id);
		}
	}

	for (i = removed.length - 1; i > -1; i--) {
		entity = removed[i];
		removePrimitive(entity, hash, primitives);
		entities.remove(entity.id);
	}
};

/**
 * An optionally time-dynamic pyramid.
 *
 * @alias RectangularSensorGraphics
 * @constructor
 */
const RectangularSensorGraphics = function() {
	this._xHalfAngle = undefined;
	this._xHalfAngleSubscription = undefined;
	this._yHalfAngle = undefined;
	this._yHalfAngleSubscription = undefined;

	this._lateralSurfaceMaterial = undefined;
	this._lateralSurfaceMaterialSubscription = undefined;

	this._intersectionColor = undefined;
	this._intersectionColorSubscription = undefined;
	this._intersectionWidth = undefined;
	this._intersectionWidthSubscription = undefined;
	this._showIntersection = undefined;
	this._showIntersectionSubscription = undefined;
	this._radius = undefined;
	this._radiusSubscription = undefined;
	this._show = undefined;
	this._showSubscription = undefined;
	this._definitionChanged = new Event();
};

Object.defineProperties(RectangularSensorGraphics.prototype, {
	/**
	 * Gets the event that is raised whenever a new property is assigned.
	 * @memberof RectangularSensorGraphics.prototype
	 *
	 * @type {Event}
	 * @readonly
	 */
	definitionChanged: {
		get: function() {
			return this._definitionChanged;
		}
	},

	/**
	 * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	xHalfAngle: createPropertyDescriptor('xHalfAngle'),

	/**
	 * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	yHalfAngle: createPropertyDescriptor('yHalfAngle'),

	/**
	 * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {MaterialProperty}
	 */
	lateralSurfaceMaterial: createPropertyDescriptor('lateralSurfaceMaterial'),

	/**
	 * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionColor: createPropertyDescriptor('intersectionColor'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	intersectionWidth: createPropertyDescriptor('intersectionWidth'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	showIntersection: createPropertyDescriptor('showIntersection'),

	/**
	 * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	radius: createPropertyDescriptor('radius'),

	/**
	 * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
	 * @memberof RectangularSensorGraphics.prototype
	 * @type {Property}
	 */
	show: createPropertyDescriptor('show')
});

/**
 * Duplicates a RectangularSensorGraphics instance.
 *
 * @param {RectangularSensorGraphics} [result] The object onto which to store the result.
 * @returns {RectangularSensorGraphics} The modified result parameter or a new instance if one was not provided.
 */
RectangularSensorGraphics.prototype.clone = function(result) {
	if (!defined(result)) {
		result = new RectangularSensorGraphics();
	}
	result.xHalfAngle = this.xHalfAngle;
	result.yHalfAngle = this.yHalfAngle;
	result.radius = this.radius;
	result.show = this.show;
	result.showIntersection = this.showIntersection;
	result.intersectionColor = this.intersectionColor;
	result.intersectionWidth = this.intersectionWidth;
	result.lateralSurfaceMaterial = this.lateralSurfaceMaterial;
	return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {RectangularSensorGraphics} source The object to be merged into this object.
 */
RectangularSensorGraphics.prototype.merge = function(source) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(source)) {
		throw new DeveloperError('source is required.');
	}
	// >>includeEnd('debug');

	this.xHalfAngle = defaultValue(this.xHalfAngle, source.xHalfAngle);
	this.yHalfAngle = defaultValue(this.yHalfAngle, source.yHalfAngle);
	this.radius = defaultValue(this.radius, source.radius);
	this.show = defaultValue(this.show, source.show);
	this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
	this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
	this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
	this.lateralSurfaceMaterial = defaultValue(this.lateralSurfaceMaterial, source.lateralSurfaceMaterial);
};

function assignSpherical(index, array, clock, cone) {
	var spherical = array[index];
	if (!defined(spherical)) {
		spherical = new Spherical();
		array[index] = spherical;
	}
	spherical.clock = clock;
	spherical.cone = cone;
	spherical.magnitude = 1.0;
}

function updateDirections(rectangularSensor) {
	var directions = rectangularSensor._customSensor.directions;

	// At 90 degrees the sensor is completely open, and tan() goes to infinity.
	var tanX = Math.tan(Math.min(rectangularSensor._xHalfAngle, CesiumMath.toRadians(89.0)));
	var tanY = Math.tan(Math.min(rectangularSensor._yHalfAngle, CesiumMath.toRadians(89.0)));
	var theta = Math.atan(tanX / tanY);
	var cone = Math.atan(Math.sqrt((tanX * tanX) + (tanY * tanY)));

	assignSpherical(0, directions, theta, cone);
	assignSpherical(1, directions, CesiumMath.toRadians(180.0) - theta, cone);
	assignSpherical(2, directions, CesiumMath.toRadians(180.0) + theta, cone);
	assignSpherical(3, directions, -theta, cone);

	directions.length = 4;
	rectangularSensor._customSensor.directions = directions;
}

const RectangularPyramidSensorVolume = function(options) {
	options = defaultValue(options, defaultValue.EMPTY_OBJECT);

	var customSensorOptions = clone(options);
	customSensorOptions._pickPrimitive = defaultValue(options._pickPrimitive, this);
	customSensorOptions.directions = undefined;
	this._customSensor = new CustomSensorVolume(customSensorOptions);

	this._xHalfAngle = defaultValue(options.xHalfAngle, CesiumMath.PI_OVER_TWO);
	this._yHalfAngle = defaultValue(options.yHalfAngle, CesiumMath.PI_OVER_TWO);

	updateDirections(this);
};

Object.defineProperties(RectangularPyramidSensorVolume.prototype, {
	xHalfAngle: {
		get: function() {
			return this._xHalfAngle;
		},
		set: function(value) {
			// >>includeStart('debug', pragmas.debug)
			if (value > CesiumMath.PI_OVER_TWO) {
				throw new DeveloperError('xHalfAngle must be less than or equal to 90 degrees.');
			}
			// >>includeEnd('debug');

			if (this._xHalfAngle !== value) {
				this._xHalfAngle = value;
				updateDirections(this);
			}
		}
	},
	yHalfAngle: {
		get: function() {
			return this._yHalfAngle;
		},
		set: function(value) {
			// >>includeStart('debug', pragmas.debug)
			if (value > CesiumMath.PI_OVER_TWO) {
				throw new DeveloperError('yHalfAngle must be less than or equal to 90 degrees.');
			}
			// >>includeEnd('debug');

			if (this._yHalfAngle !== value) {
				this._yHalfAngle = value;
				updateDirections(this);
			}
		}
	},
	show: {
		get: function() {
			return this._customSensor.show;
		},
		set: function(value) {
			this._customSensor.show = value;
		}
	},
	showIntersection: {
		get: function() {
			return this._customSensor.showIntersection;
		},
		set: function(value) {
			this._customSensor.showIntersection = value;
		}
	},
	showThroughEllipsoid: {
		get: function() {
			return this._customSensor.showThroughEllipsoid;
		},
		set: function(value) {
			this._customSensor.showThroughEllipsoid = value;
		}
	},
	modelMatrix: {
		get: function() {
			return this._customSensor.modelMatrix;
		},
		set: function(value) {
			this._customSensor.modelMatrix = value;
		}
	},
	radius: {
		get: function() {
			return this._customSensor.radius;
		},
		set: function(value) {
			this._customSensor.radius = value;
		}
	},
	lateralSurfaceMaterial: {
		get: function() {
			return this._customSensor.lateralSurfaceMaterial;
		},
		set: function(value) {
			this._customSensor.lateralSurfaceMaterial = value;
		}
	},
	intersectionColor: {
		get: function() {
			return this._customSensor.intersectionColor;
		},
		set: function(value) {
			this._customSensor.intersectionColor = value;
		}
	},
	intersectionWidth: {
		get: function() {
			return this._customSensor.intersectionWidth;
		},
		set: function(value) {
			this._customSensor.intersectionWidth = value;
		}
	},
	id: {
		get: function() {
			return this._customSensor.id;
		},
		set: function(value) {
			this._customSensor.id = value;
		}
	}
});

RectangularPyramidSensorVolume.prototype.update = function(frameState) {
	this._customSensor.update(frameState);
};

RectangularPyramidSensorVolume.prototype.isDestroyed = function() {
	return false;
};

RectangularPyramidSensorVolume.prototype.destroy = function() {
	this._customSensor = this._customSensor && this._customSensor.destroy();
	return destroyObject(this);
};

const defaultIntersectionColor = Color.WHITE;
const defaultIntersectionWidth = 1.0;
const defaultRadius = Number.POSITIVE_INFINITY;

const matrix3Scratch = new Matrix3();
const cachedPosition = new Cartesian3();
const cachedOrientation = new Quaternion();

/**
 * A {@link Visualizer} which maps {@link Entity#rectangularSensor} to a {@link RectangularSensor}.
 * @alias RectangularSensorVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
const RectangularSensorVisualizer = function(scene, entityCollection) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(scene)) {
		throw new DeveloperError('scene is required.');
	}
	if (!defined(entityCollection)) {
		throw new DeveloperError('entityCollection is required.');
	}
	// >>includeEnd('debug');

	entityCollection.collectionChanged.addEventListener(RectangularSensorVisualizer.prototype._onCollectionChanged, this);

	this._scene = scene;
	this._primitives = scene.primitives;
	this._entityCollection = entityCollection;
	this._hash = {};
	this._entitiesToVisualize = new AssociativeArray();

	this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
};

/**
 * Updates the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {Boolean} This function always returns true.
 */
RectangularSensorVisualizer.prototype.update = function(time) {
	// >>includeStart('debug', pragmas.debug);
	if (!defined(time)) {
		throw new DeveloperError('time is required.');
	}
	// >>includeEnd('debug');

	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;

	for (var i = 0, len = entities.length; i < len; i++) {
		var entity = entities[i];
		var rectangularSensorGraphics = entity._rectangularSensor;

		var position;
		var orientation;
		var data = hash[entity.id];
		var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(rectangularSensorGraphics._show, time, true);

		if (show) {
			position = Property.getValueOrUndefined(entity._position, time, cachedPosition);
			orientation = Property.getValueOrUndefined(entity._orientation, time, cachedOrientation);
			show = defined(position) && defined(orientation);
		}

		if (!show) {
			// don't bother creating or updating anything else
			if (defined(data)) {
				data.primitive.show = false;
			}
			continue;
		}

		var primitive = defined(data) ? data.primitive : undefined;
		if (!defined(primitive)) {
			primitive = new RectangularPyramidSensorVolume();
			primitive.id = entity;
			primitives.add(primitive);

			data = {
				primitive: primitive,
				position: undefined,
				orientation: undefined
			};
			hash[entity.id] = data;
		}

		if (!Cartesian3.equals(position, data.position) || !Quaternion.equals(orientation, data.orientation)) {
			Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, primitive.modelMatrix);
			data.position = Cartesian3.clone(position, data.position);
			data.orientation = Quaternion.clone(orientation, data.orientation);
		}

		primitive.show = true;
		primitive.xHalfAngle = Property.getValueOrDefault(rectangularSensorGraphics._xHalfAngle, time, CesiumMath.PI_OVER_TWO);
		primitive.yHalfAngle = Property.getValueOrDefault(rectangularSensorGraphics._yHalfAngle, time, CesiumMath.PI_OVER_TWO);
		primitive.radius = Property.getValueOrDefault(rectangularSensorGraphics._radius, time, defaultRadius);
		primitive.lateralSurfaceMaterial = MaterialProperty.getValue(time, rectangularSensorGraphics._lateralSurfaceMaterial, primitive.lateralSurfaceMaterial);
		primitive.intersectionColor = Property.getValueOrClonedDefault(rectangularSensorGraphics._intersectionColor, time, defaultIntersectionColor, primitive.intersectionColor);
		primitive.intersectionWidth = Property.getValueOrDefault(rectangularSensorGraphics._intersectionWidth, time, defaultIntersectionWidth);
	}
	return true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
RectangularSensorVisualizer.prototype.isDestroyed = function() {
	return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
RectangularSensorVisualizer.prototype.destroy = function() {
	var entities = this._entitiesToVisualize.values;
	var hash = this._hash;
	var primitives = this._primitives;
	for (var i = entities.length - 1; i > -1; i--) {
		removePrimitive(entities[i], hash, primitives);
	}
	return destroyObject(this);
};

/**
 * @private
 */
RectangularSensorVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
	var i;
	var entity;
	var entities = this._entitiesToVisualize;
	var hash = this._hash;
	var primitives = this._primitives;

	for (i = added.length - 1; i > -1; i--) {
		entity = added[i];
		if (defined(entity._rectangularSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		}
	}

	for (i = changed.length - 1; i > -1; i--) {
		entity = changed[i];
		if (defined(entity._rectangularSensor) && defined(entity._position) && defined(entity._orientation)) {
			entities.set(entity.id, entity);
		} else {
			removePrimitive(entity, hash, primitives);
			entities.remove(entity.id);
		}
	}

	for (i = removed.length - 1; i > -1; i--) {
		entity = removed[i];
		removePrimitive(entity, hash, primitives);
		entities.remove(entity.id);
	}
};

var processPacketData = CzmlDataSource.processPacketData;
var processMaterialPacketData = CzmlDataSource.processMaterialPacketData;

// eslint-disable-next-line max-params
function processDirectionData(customPatternSensor, directions, interval, sourceUri, entityCollection) {
	var i;
	var len;
	var values = [];
	var unitSphericals = directions.unitSpherical;
	var sphericals = directions.spherical;
	var unitCartesians = directions.unitCartesian;
	var cartesians = directions.cartesian;

	if (defined(unitSphericals)) {
		for (i = 0, len = unitSphericals.length; i < len; i += 2) {
			values.push(new Spherical(unitSphericals[i], unitSphericals[i + 1]));
		}
		directions.array = values;
	} else if (defined(sphericals)) {
		for (i = 0, len = sphericals.length; i < len; i += 3) {
			values.push(new Spherical(sphericals[i], sphericals[i + 1], sphericals[i + 2]));
		}
		directions.array = values;
	} else if (defined(unitCartesians)) {
		for (i = 0, len = unitCartesians.length; i < len; i += 3) {
			var tmp = Spherical.fromCartesian3(new Cartesian3(unitCartesians[i], unitCartesians[i + 1], unitCartesians[i + 2]));
			Spherical.normalize(tmp, tmp);
			values.push(tmp);
		}
		directions.array = values;
	} else if (defined(cartesians)) {
		for (i = 0, len = cartesians.length; i < len; i += 3) {
			values.push(Spherical.fromCartesian3(new Cartesian3(cartesians[i], cartesians[i + 1], cartesians[i + 2])));
		}
		directions.array = values;
	}
	processPacketData(Array, customPatternSensor, 'directions', directions, interval, sourceUri, entityCollection);
}

// eslint-disable-next-line max-params
function processCommonSensorProperties(sensor, sensorData, interval, sourceUri, entityCollection) {
	processPacketData(Boolean, sensor, 'show', sensorData.show, interval, sourceUri, entityCollection);
	processPacketData(Number, sensor, 'radius', sensorData.radius, interval, sourceUri, entityCollection);
	processPacketData(Boolean, sensor, 'showIntersection', sensorData.showIntersection, interval, sourceUri, entityCollection);
	processPacketData(Color, sensor, 'intersectionColor', sensorData.intersectionColor, interval, sourceUri, entityCollection);
	processPacketData(Number, sensor, 'intersectionWidth', sensorData.intersectionWidth, interval, sourceUri, entityCollection);
	processMaterialPacketData(sensor, 'lateralSurfaceMaterial', sensorData.lateralSurfaceMaterial, interval, sourceUri, entityCollection);
}

var iso8601Scratch = {
	iso8601: undefined
};

function processConicSensor(entity, packet, entityCollection, sourceUri) {
	var conicSensorData = packet.agi_conicSensor;
	if (!defined(conicSensorData)) {
		return;
	}

	var interval;
	var intervalString = conicSensorData.interval;
	if (defined(intervalString)) {
		iso8601Scratch.iso8601 = intervalString;
		interval = TimeInterval.fromIso8601(iso8601Scratch);
	}

	var conicSensor = entity.conicSensor;
	if (!defined(conicSensor)) {
		entity.addProperty('conicSensor');
		conicSensor = new ConicSensorGraphics();
		entity.conicSensor = conicSensor;
	}

	processCommonSensorProperties(conicSensor, conicSensorData, interval, sourceUri, entityCollection);
	processPacketData(Number, conicSensor, 'innerHalfAngle', conicSensorData.innerHalfAngle, interval, sourceUri, entityCollection);
	processPacketData(Number, conicSensor, 'outerHalfAngle', conicSensorData.outerHalfAngle, interval, sourceUri, entityCollection);
	processPacketData(Number, conicSensor, 'minimumClockAngle', conicSensorData.minimumClockAngle, interval, sourceUri, entityCollection);
	processPacketData(Number, conicSensor, 'maximumClockAngle', conicSensorData.maximumClockAngle, interval, sourceUri, entityCollection);
}

function processCustomPatternSensor(entity, packet, entityCollection, sourceUri) {
	var customPatternSensorData = packet.agi_customPatternSensor;
	if (!defined(customPatternSensorData)) {
		return;
	}

	var interval;
	var intervalString = customPatternSensorData.interval;
	if (defined(intervalString)) {
		iso8601Scratch.iso8601 = intervalString;
		interval = TimeInterval.fromIso8601(iso8601Scratch);
	}

	var customPatternSensor = entity.customPatternSensor;
	if (!defined(customPatternSensor)) {
		entity.addProperty('customPatternSensor');
		customPatternSensor = new CustomPatternSensorGraphics();
		entity.customPatternSensor = customPatternSensor;
	}

	processCommonSensorProperties(customPatternSensor, customPatternSensorData, interval, sourceUri, entityCollection);

	// The directions property is a special case value that can be an array of unitSpherical or unit Cartesians.
	// We pre-process this into Spherical instances and then process it like any other array.
	var directions = customPatternSensorData.directions;
	if (defined(directions)) {
		if (Array.isArray(directions)) {
			var length = directions.length;
			for (var i = 0; i < length; i++) {
				processDirectionData(customPatternSensor, directions[i], interval, sourceUri, entityCollection);
			}
		} else {
			processDirectionData(customPatternSensor, directions, interval, sourceUri, entityCollection);
		}
	}
}

function processRectangularSensor(entity, packet, entityCollection, sourceUri) {
	var rectangularSensorData = packet.agi_rectangularSensor;
	if (!defined(rectangularSensorData)) {
		return;
	}

	var interval;
	var intervalString = rectangularSensorData.interval;
	if (defined(intervalString)) {
		iso8601Scratch.iso8601 = intervalString;
		interval = TimeInterval.fromIso8601(iso8601Scratch);
	}

	var rectangularSensor = entity.rectangularSensor;
	if (!defined(rectangularSensor)) {
		entity.addProperty('rectangularSensor');
		rectangularSensor = new RectangularSensorGraphics();
		entity.rectangularSensor = rectangularSensor;
	}

	processCommonSensorProperties(rectangularSensor, rectangularSensorData, interval, sourceUri, entityCollection);
	processPacketData(Number, rectangularSensor, 'xHalfAngle', rectangularSensorData.xHalfAngle, interval, sourceUri, entityCollection);
	processPacketData(Number, rectangularSensor, 'yHalfAngle', rectangularSensorData.yHalfAngle, interval, sourceUri, entityCollection);
}

var initialized = false;

function initialize() {
	if (initialized) {
		return;
	}

	CzmlDataSource.updaters.push(processConicSensor, processCustomPatternSensor, processRectangularSensor);

	var originalDefaultVisualizersCallback = DataSourceDisplay.defaultVisualizersCallback;
	DataSourceDisplay.defaultVisualizersCallback = function(scene, entityCluster, dataSource) {
		var entities = dataSource.entities;
		var array = originalDefaultVisualizersCallback(scene, entityCluster, dataSource);
		return array.concat([
			new ConicSensorVisualizer(scene, entities),
			new CustomPatternSensorVisualizer(scene, entities),
			new RectangularSensorVisualizer(scene, entities)
		]);
	};

	initialized = true;
}

initialize();

var cesiumSensorVolumes = {
	ConicSensorGraphics,
	ConicSensorVisualizer,
	CustomPatternSensorGraphics,
	CustomPatternSensorVisualizer,
	CustomSensorVolume,
	RectangularPyramidSensorVolume,
	RectangularSensorGraphics,
	RectangularSensorVisualizer
};

export { cesiumSensorVolumes as default };
