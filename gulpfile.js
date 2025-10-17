'use strict';

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var through = require('through2');
var del = require('del');
var xo = require('gulp-xo');

var rollup = require('rollup');
var { string } = require('rollup-plugin-string');
var terser = require('@rollup/plugin-terser');
var glslStripComments = require('glsl-strip-comments');

var browserSync = require('browser-sync').create();

var reload = browserSync.reload;

function runLint(src) {
	return gulp.src(src)
		.pipe(xo());
}
function lint() {
	return runLint(['lib/**/*.js', 'gulp/**/*.js', 'gulpfile.js']);
}
exports.lint = lint;

function clean() {
	return del(['coverage', '.tmp', 'dist']);
}
exports.clean = clean;

function preprocessShaders() {
	return gulp.src('lib/**/*.glsl')
		.pipe(through.obj(function(file, _, cb) {
			if (file.isBuffer()) {
				const output = glslStripComments(file.contents.toString(), { version: '300 es' });
				file.contents = Buffer.from(output);
			}
			cb(null, file);
		}))
		.pipe(gulp.dest('.tmp'));
}

function preprocessJs() {
	return gulp.src(['lib/**/*.js'])
		.pipe(gulp.dest('.tmp'));
}

function getCopyrightHeaders() {
	return fs.readFileSync('lib/copyright-header.js').toString();
}

async function buildEs() {
	const bundle = await rollup.rollup({
		input: '.tmp/cesium-sensor-volumes.js',
		plugins: [
			string({
				include: '**/*.glsl'
			})
		],
		external: id => id === 'cesium' || /Cesium/.test(id)
	});

	await bundle.write({
		file: 'dist/cesium-sensor-volumes.es.js',
		format: 'es',
		banner: getCopyrightHeaders()
	});
	await bundle.write({
		file: 'dist/cesium-sensor-volumes.es.min.js',
		format: 'es',
		plugins: [terser({
			format: {
				comments: function(node, comment) {
					if (comment.type === 'comment2') {
						return /Copyright/i.test(comment.value);
					}
				}
			}
		})],
		banner: getCopyrightHeaders()
	});
}

function createEngineBuilds() {
	return gulp.src(['dist/cesium-sensor-volumes.es.js', 'dist/cesium-sensor-volumes.es.min.js'])
		.pipe(through.obj(function(file, _, cb) {
			if (file.isBuffer()) {
				var content = file.contents.toString();
				// Replace 'cesium' imports with '@cesium/engine'
				content = content.replace(/from ['"]cesium['"]/g, "from '@cesium/engine'");
				content = content.replace(/from"cesium"/g, 'from"@cesium/engine"');
				file.contents = Buffer.from(content);
			}
			// Rename the file to add .engine
			var basename = file.basename.replace('.es.js', '.engine.es.js').replace('.es.min.js', '.engine.es.min.js');
			file.basename = basename;
			cb(null, file);
		}))
		.pipe(gulp.dest('dist'));
}

exports.buildEs = gulp.series(clean, gulp.parallel(preprocessShaders, preprocessJs), buildEs);

function generateShims() {
	// Search for Cesium modules and add shim modules that pull from the Cesium global
	return gulp.src(['./dist/cesium-sensor-volumes.es.js'])
		.pipe(through.obj(function(file, _, cb) {
			if (file.isBuffer()) {
				// Handle destructured imports from 'cesium'
				var cesiumDestructuredRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]cesium['"];?/g;
				var content = file.contents.toString();

				// Replace destructured imports with Cesium global references
				const output = content.replace(cesiumDestructuredRegex, (match, imports) => {
					// Parse the imports, handling aliases like "Math as CesiumMath"
					const importList = imports.split(',').map(imp => {
						const trimmed = imp.trim();
						if (trimmed.includes(' as ')) {
							const [cesiumName, localName] = trimmed.split(' as ').map(s => s.trim());
							return `const ${localName} = Cesium.${cesiumName};`;
						} else {
							return `const ${trimmed} = Cesium.${trimmed};`;
						}
					});
					return importList.join('\n');
				});
				file.contents = Buffer.from(output);
			}
			cb(null, file);
		}))
		.pipe(gulp.dest('.tmp/shimmed'));
}

async function buildUmd() {
	const bundle = await rollup.rollup({
		input: '.tmp/shimmed/cesium-sensor-volumes.es.js'
	});
	await bundle.write({
		file: 'dist/cesium-sensor-volumes.js',
		name: 'CesiumSensorVolumes',
		format: 'umd'
	});
	await bundle.write({
		file: 'dist/cesium-sensor-volumes.min.js',
		name: 'CesiumSensorVolumes',
		plugins: [terser({
			format: {
				comments: function(node, comment) {
					if (comment.type === 'comment2') {
						return /Copyright/i.test(comment.value);
					}
				}
			}
		})],
		format: 'umd'
	});
}
exports.build = gulp.series(exports.buildEs, createEngineBuilds, generateShims, buildUmd);

exports.buildReload = gulp.series(exports.build, reload);

function run(cb) {
	browserSync.init({
		server: '.'
	}, cb);
}

function watch(cb) {
	gulp.watch(['examples/**/*.html', 'examples/**/*.czml'], reload);
	gulp.watch(['lib/**/*.glsl'], exports.buildReload);
	gulp.watch(['lib/**/*.js'], exports.buildReload);
	cb();
}
exports.serve = gulp.series(exports.build, run, watch);

function lintTest() {
	return runLint(['test/**/*.js']);
}

function test(done, options) {
	var Server = require('karma').Server;

	var server = new Server(Object.assign({
		configFile: path.join(__dirname, '/test/karma.conf.js'),
		singleRun: true
	}, options), done);

	server.start();
}
exports.test = gulp.series(lintTest, test);

function testCI(done) {
	test(done, {
		browsers: ['Electron'],
		client: {
			args: [true]
		}
	});
}
exports.testCI = gulp.series(lintTest, testCI);
exports.ci = gulp.series(lint, testCI, exports.build);