/*!
 * Grunt file
 *
 * For local development, this runs unit tests in Headless Chrome only by default.
 * To also run in Firefox, run `grunt karma`.
 *
 * To also test the automated Sauce Labs setup (as we do in Jenkins), set
 * the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables (either one-time
 * via export, or from your bashrc). Then, run 'grunt ci'.
 * Sign up for free at https://saucelabs.com/signup/plan/free.
 */

/* eslint-env node, es6 */
module.exports = function ( grunt ) {
	var customLaunchers = require( './tests/karma.browsers.js' ),
		concatFiles = [
			'src/intro.js.txt',
			'src/core.js',
			'src/util.js',
			'src/EventEmitter.js',
			'src/EmitterList.js',
			'src/SortedEmitterList.js',
			'src/Registry.js',
			'src/Factory.js',
			'src/export.js',
			'src/outro.js.txt'
		];

	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-karma' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		clean: {
			dist: [ 'dist', 'coverage' ]
		},
		concat: {
			oojs: {
				options: {
					banner: grunt.file.read( 'src/banner.txt' )
				},
				dest: 'dist/oojs.js',
				src: concatFiles
			},
			test: {
				options: {
					banner: grunt.file.read( 'src/banner.txt' ),
					sourceMap: true
				},
				dest: 'dist/oojs.js',
				src: concatFiles
			},
			jquery: {
				options: {
					banner: grunt.file.read( 'src/banner.jquery.txt' )
				},
				dest: 'dist/oojs.jquery.js',
				src: [
					'src/intro.js.txt',
					'src/core.js',
					'src/util/jquery.js',
					'src/EventEmitter.js',
					'src/EmitterList.js',
					'src/SortedEmitterList.js',
					'src/Registry.js',
					'src/Factory.js',
					'src/export.js',
					'src/outro.js.txt'
				]
			}
		},
		uglify: {
			options: {
				banner: '/*! OOjs v<%= pkg.version %> | https://oojs.mit-license.org */',
				sourceMap: true,
				sourceMapIncludeSources: true,
				report: 'gzip'
			},
			js: {
				expand: true,
				src: 'dist/*.js',
				ext: '.min.js',
				extDot: 'last'
			}
		},
		karma: {
			options: {
				frameworks: [ 'qunit' ],
				files: [
					'dist/oojs.js',
					'tests/testrunner.js',
					'tests/unit/*.js'
				],
				reporters: [ 'dots' ],
				singleRun: true,
				autoWatch: false,
				customLaunchers: customLaunchers,
				sauceLabs: {
					username: process.env.SAUCE_USERNAME || 'oojs',
					accessKey: process.env.SAUCE_ACCESS_KEY || '0e464279-3f2a-4ca0-9eb4-db220410bef0',
					recordScreenshots: false
				},
				concurrency: 3,
				captureTimeout: 90000
			},
			saucelabs: {
				browsers: [
					// Latest versions of major browsers
					'slChrome',
					'slFirefox',
					'slEdge',
					// Latest versions of complicated browsers
					'slSafari',
					'slIE',
					// Earliest-supported versions of complicated browsers
					'slSafari9',
					'slIE10'
				]
			},
			// Primary unit test run (includes code coverage)
			main: {
				browsers: [ 'ChromeCustom' ],
				preprocessors: {
					'dist/*.js': [ 'coverage' ]
				},
				reporters: [ 'dots', 'coverage', 'karma-remap-istanbul' ],
				coverageReporter: {
					// https://github.com/karma-runner/karma-coverage/blob/v1.1.1/docs/configuration.md#check
					type: 'in-memory',
					check: { global: {
						functions: 100,
						statements: 99,
						branches: 99,
						lines: 99
					} }
				},
				remapIstanbulReporter: {
					reports: {
						'text-summary': null,
						html: 'coverage/',
						lcovonly: 'coverage/lcov.info',
						clover: 'coverage/clover.xml'
					}
				}
			},
			jquery: {
				browsers: [ 'ChromeCustom' ],
				options: {
					files: [
						'node_modules/jquery/dist/jquery.js',
						'dist/oojs.jquery.js',
						'tests/testrunner.js',
						'tests/unit/*.js'
					]
				}
			},
			firefox: {
				browsers: [ 'FirefoxHeadless' ]
			}
		}
	} );

	grunt.registerTask( 'git-build', function () {
		var done = this.async();
		require( 'child_process' ).exec( 'git rev-parse HEAD', function ( err, stout, stderr ) {
			if ( !stout || err || stderr ) {
				grunt.log.err( err || stderr );
				done( false );
				return;
			}
			grunt.config.set( 'pkg.version', grunt.config( 'pkg.version' ) + '-pre (' + stout.slice( 0, 10 ) + ')' );
			grunt.verbose.writeln( 'Added git HEAD to pgk.version' );
			done();
		} );
	} );

	grunt.registerTask( 'build', [ 'clean', 'concat:oojs', 'concat:jquery', 'uglify' ] );
	grunt.registerTask( '_test', [ 'git-build', 'clean', 'concat:test', 'concat:jquery', 'karma:main', 'karma:jquery' ] );
	grunt.registerTask( 'ci', [ '_test', 'karma:firefox', 'karma:saucelabs' ] );

	if ( process.env.ZUUL_PIPELINE === 'gate-and-submit' ) {
		// During the merge pipeline, also include the cross-platform
		// tests via SauceLabs
		grunt.registerTask( 'test', 'ci' );
	} else {
		grunt.registerTask( 'test', '_test' );
	}

	grunt.registerTask( 'default', 'test' );
};
