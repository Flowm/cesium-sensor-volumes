'use strict';

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var through = require('through2');
var del = require('del');
var xo = require('gulp-xo');
var glsl = require('gulp-glsl');

var rollup = require('rollup');
var { string } = require('rollup-plugin-string');
var terser = require('@rollup/plugin-terser');

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
		.pipe(glsl({ format: 'raw', ext: '.glsl' }))
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
		external: id => /Cesium/.test(id)
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
exports.buildEs = gulp.series(clean, gulp.parallel(preprocessShaders, preprocessJs), buildEs);

function generateShims() {
	// Search for Cesium modules and add shim modules that pull from the Cesium global
	return gulp.src(['./dist/cesium-sensor-volumes.es.js'])
		.pipe(through.obj(function(file, _, cb) {
			if (file.isBuffer()) {
				var cesiumRequireRegex = /import (\w*) from 'Cesium\/\w*\/(\w*)'/;
				const output = file.contents.toString().split('\n').map(line => {
					const match = cesiumRequireRegex.exec(line);
					if (match) {
						return `const ${match[1]} = Cesium['${match[2]}'];`;
					}
					return line;
				});
				file.contents = Buffer.from(output.join('\n'));
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
exports.build = gulp.series(exports.buildEs, generateShims, buildUmd);

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
