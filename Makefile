tarball:
	tar --exclude=.git -chvzf release.tgz redmine*.js app.js Gruntfile.js Makefile package.json po README.md test views translation.json  node_modules public bower.json bower_components
