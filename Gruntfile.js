'use strict';

var proxyMiddleware = require('http-proxy-middleware');

var oDataProxy;
module.exports = function (grunt) {
	grunt.initConfig({
		connect: {
			options: {
				port: 3000,
				hostname: '*',
				middleware: function (connect, options, middlewares) {
					var oDataMiddleWare = function (req, res, next) {
						if (!oDataProxy) {
							oDataProxy = proxyMiddleware(["/couchDB"], {
								target: "http://localhost:5984",
								secure: false,
								changeOrigin: true,
								pathRewrite: {'^/couchDB': '/'},
								logLevel: 'debug'
							});
						}

						return oDataProxy.call(this, req, res, next);
					};

					middlewares.unshift(oDataMiddleWare);

					return middlewares;
				}
			},
			src: {},
			dist: {
				options: {
					port: 80,
					useAvailablePort: true
				}
			}
		},

		openui5_connect: {
			src: {
				options: {
					appresources: 'webapp'
				}
			},
			dist: {
				options: {
					appresources: 'dist'
				}
			}
		},

		openui5_preload: {
			component: {
				options: {
					resources: {
						cwd: 'webapp',
						prefix: 'glw',
						src: [
							'**/*.js',
							'**/*.fragment.html',
							'**/*.fragment.json',
							'**/*.fragment.xml',
							'**/*.view.html',
							'**/*.view.json',
							'**/*.view.xml',
							'**/*.properties',
							'manifest.json',
							'!test/**',
							'!resources/**'
						]
					},
					dest: 'dist'
				},
				components: true
			}
		},

		clean: {
			dist: 'dist'
		},

		copy: {
			dist: {
				files: [{
					expand: true,
					cwd: 'webapp',
					src: [
						'**',
						'!test/**'
					],
					dest: 'dist'
				}]
			}
		}
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-openui5');

	// Server task
	grunt.registerTask('serve', function (target) {
		grunt.task.run('openui5_connect:' + (target || 'src') + ':keepalive');
	});

	// Build task
	grunt.registerTask('build', ['clean:dist', 'openui5_preload', 'copy']);

	// Default task
	grunt.registerTask('default', ['serve']);
};
