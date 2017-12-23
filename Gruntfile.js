'use strict';

var proxyMiddleware = require('http-proxy-middleware');

var oDataProxy;

module.exports = function(grunt) {

	grunt.initConfig({
		connect: {
			options: {
				port: 3000,
				hostname: '*',
				middleware: function(connect, options, middlewares) {
					var oDataMiddleWare = function(req, res, next) {
						if (!oDataProxy) {
							oDataProxy = proxyMiddleware(["/couchDB"], {
								target: "http://localhost:5984",
								secure: false,
								changeOrigin: true,
								pathRewrite: {'^/couchDB':'/'},
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
			dist: {}
		},

		openui5_connect: {
			src: {
				options: {
					appresources: 'webapp'
				}
			}
		}
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-openui5');

	// Server task
	grunt.registerTask('serve', function(target) {
		grunt.task.run('openui5_connect:' + (target || 'src') + ':keepalive');
	});

	// Default task
	grunt.registerTask('default', ['serve']);
};
