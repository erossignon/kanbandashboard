client/src contains javascript file that will be browserify

    client/src/XXXXXXX.js => browserify => public/javascript/XXXXXXX.bundle.js

client/jade contains jade file that will be transformed to html

    client/views/XXXXXXX.jade => browserify => public/views/XXXXXXX.html


Note
      https://github.com/amiorin/grunt-watchify
      npm install grunt-watchify --save-dev
      http://benclinkinbeard.com/posts/external-bundles-for-faster-browserify-builds/
      http://www.forbeslindesay.co.uk/post/46324645400/standalone-browserify-builds