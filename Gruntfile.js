function f(a) {
    console.log("etienne");
    console.log(a);
    return a;
}
module.exports = function(grunt) {

   grunt.initConfig({
       pkg: grunt.file.readJSON('package.json'),

       /**
        * convert .jade file into static html files
        */
       jade: {
           for_glory: {
                   options: {
                       pretty: true
                   },
                   files: f(grunt.file.expandMapping("views/*.jade", "", {cwd: "client/jade", ext: ".html" }))
           },
           for_translation: {
                   options: {
                       pretty: true ,
                       data: { debug: true }
                   },
                   files: [{ dest: 'tmp/jade.html' , src: ['client/**/*.jade']}]
           }
       },

       /**
        *  extract the po/template.pot file  which is used for translations
        *  with po edit
        *
        */
       nggettext_extract: {
           pot: {
               files: {
                   'po/template.pot': [
                       'views/*.html'
                   ]
               }
           }
       },

       watch: {

           javascrript_to_browserify:{
               files: "./client/**/*.js",
               tasks: ['browserify' ]
           },

           jade_to_htmlize:{
               files: "./client/**/*.jade",
               tasks: ['jade' ]
           }
       },

       nggettext_compile: {
           all: {
               files: {
                   'public/javascript/translations.js': ['po/*.po']
               }
           }
       },
       browserify: {
           options: {
               browserifyOptions: {
                   debug: true,
                //xx   bundleExternal: true
               }
           },
           files: {
               src:  './client/src/requirement_matrix.js',
               dest: './public/javascript/requirement_matrix.bundle.js'
           }
       },
       _browserify: {
           // ----------------------------------

           applications: {
               options: {
                   debug: true,
                   bundleExternal: true,

               },
               compile: {
                   files: [
                       {
                           src:  './client/src/requirement_matrix.js',
                           dest: './public/javascript/requirement_matrix.bundle.js'
                       },
                       {
                           src: './client/src/dashboard2.js',
                           dest: './public/javascript/dashboard2.bundle.js'
                       },
                       {
                           src: './client/src/use_cases2.js',
                           dest: './public/javascript/use_cases2.bundle.js'
                       }
                   ]
               }

           }
       }

    });

    //xx grunt.loadNpmTasks('grunt-watchify');

    grunt.loadNpmTasks('grunt-angular-gettext');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('default', ['browserify', 'jade','nggettext_extract']);

    grunt.registerTask('compile',['nggettext_compile']);


    grunt.event.on('watch', function(action, filepath, target) {
        grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    });
};

// dontkry.com/posts/code/angular-browserify-grunt.html