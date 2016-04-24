'use strict';

var fs = require('fs');
var path = require('path');

var es = require('event-stream');
var globby = require('globby');
var gulp = require('gulp');
var assign = require('lodash.assign');

// load plugins
var browserSync = require('browser-sync').create();
var concat = require('gulp-concat');
var del = require('del');
var gulpif = require('gulp-if');
var order = require('gulp-order');
var requirejsOptimize = require('gulp-requirejs-optimize');
var runSequence = require('run-sequence');
var size = require('gulp-size');
var uglify = require('gulp-uglify');
var xo = require('gulp-xo');
var reload = browserSync.reload;

var generateShims = require('./gulp/generate-shims');
var processShaders = require('./gulp/process-shaders');

var runLint = function(src) {
	return gulp.src(src)
		.pipe(xo());
};

gulp.task('lint', function() {
	return runLint(['Source/**/*.js', 'gulpfile.js']);
});

gulp.task('shaders', function() {
	return gulp.src('Source/**/*.glsl')
		.pipe(processShaders())
		.pipe(gulp.dest('.tmp/shaders'));
});

gulp.task('create-main-js', function() {
	return gulp.src(['Source/**/*.js'])
		.pipe(gulpif('!main.js', generateShims()))
		.pipe(order([
			'!main.js',
			'main.js'
		]))
		.pipe(concat('main.js'))
		.pipe(gulp.dest('.tmp'));
});

function getCopyrightHeaders() {
	var copyrightHeader = fs.readFileSync('Source/copyrightHeader.js').toString();
	var shaderCopyrightHeader = fs.readFileSync('.tmp/shaders/shaderCopyrightHeader.js').toString();

	return copyrightHeader + '\n' + shaderCopyrightHeader;
}

function optimize(options) {
	var source = path.join(options.baseUrl, options.include) + '.js';
	return gulp.src(source)
		.pipe(requirejsOptimize(options));
}

gulp.task('scripts', ['create-main-js', 'shaders'], function() {
	var copyright = getCopyrightHeaders();

	var requirejsOptions = {
		name: '../node_modules/almond/almond',

		wrap: {
			start: copyright + '(function() {',
			end: '})();'
		},

		useStrict: true,
		optimize: 'none',

		inlineText: true,
		stubModules: ['text'],

		skipModuleInsertion: true,

		baseUrl: 'Source',

		include: '../.tmp/main',
		paths: {
			text: '../node_modules/requirejs-text/text'
		}
	};

	var unminified = optimize(assign({}, requirejsOptions, {
		out: 'CesiumSensors.js'
	}));

	var minifiedOptions = assign({}, requirejsOptions, {
		out: 'CesiumSensors.min.js'
	});

	// Use minified versions of shaders
	globby.sync(['Source/**/*.glsl']).forEach(function(shader) {
		shader = shader.replace(/\\/g, '/').replace(/\.glsl$/, '');
		minifiedOptions.paths[shader] = path.join('.tmp/shaders', shader);
	});

	var minified = optimize(minifiedOptions).pipe(uglify());

	return es.merge(unminified, minified)
		.pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('test-lint', function() {
	return runLint(['Specs/**/*.js']);
});

gulp.task('test', ['test-lint'], function(done) {
	var Server = require('karma').Server;

	var server = new Server({
		configFile: path.join(__dirname, '/Specs/karma.conf.js'),
		singleRun: true
	}, done);

	server.start();
});

gulp.task('serve', function(done) {
	runSequence('build', 'run', 'watch', done);
});

gulp.task('run', function(done) {
	browserSync.init({
		server: '.'
	}, done);
});

gulp.task('watch', function() {
	gulp.watch(['Examples/**/*.html', 'Examples/**/*.czml'], reload);
	gulp.watch(['Source/**/*.glsl'], ['build-reload']);
	gulp.watch(['Source/**/*.js'], ['build-reload']);
});

gulp.task('build-reload', ['build'], reload);

gulp.task('build', ['lint', 'scripts'], function() {
	return gulp.src('dist/**/*')
		.pipe(size({ title: 'build', gzip: true }));
});

gulp.task('ci', function(done) {
	runSequence('lint', 'test', 'build', done);
});

gulp.task('default', function(done) {
	runSequence('clean', 'build', done);
});