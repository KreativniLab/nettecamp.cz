
module.exports = (grunt) ->

  grunt.initConfig

    useminPrepare:
      html: ['app/modules/FrontModule/templates/@layout.latte']
      options:
        dest: './'

    netteBasePath:
      task:
        basePath: 'www'
        options:
          removeFromPath: ['app/modules/FrontModule/templates/']

    nittro:
      options:
        vendor:
          js: []
          css: []
        base:
          core: true
          datetime: true
          neon: true
          di: true
          ajax: true
          forms: true
          page: true
          flashes: true
          routing: false
        extras:
          checklist: false,
          dialogs: false,
          confirm: false,
          dropzone: false,
          paginator: false,
          keymap: false,
          storage: false
        libraries:
          js: [
            "www/js/ScrollHelper.js"
          ]
          css: []
        bootstrap:
          params: null,
          extensions: null,
          services:
            scrollHelper: "App.ScrollHelper()!"
          factories: null
        stack: true
      js:
        dest: "www/js/nittro-full.js"
      css:
        dest: "www/css/nittro/nittro-full.less"


    stylus:
      compile:
        options:
          paths: ['www/css/site']
          compress: false
          linenos: true
        files:
          'www/css/site/main.css': 'www/css/site/main.styl'

    sass:
      dist:
        options:
          includePaths: ['www/css/foundation']
          sourceMap: true

        files:
          'www/css/foundation/foundation.css': ['www/css/foundation/foundation.scss']
          'www/css/foundation/normalize.css': 'www/css/foundation/normalize.scss'

    less:
      development:
        options:
          paths: ['assets/css']
        files:
          'www/css/nittro/nittro-full.css': 'www/css/nittro/nittro-full.less'

    watch:
      styles:
        files: 'www/css/**/*.styl'
        tasks: ['stylus', 'postcss:dev']
        options:
          interrupt: true

      sass:
        files: ['www/css/foundation/**/*.scss']
        tasks: ['sass']

    postcss:
      options:
        map: true,
        processors: [
          require('autoprefixer')({browsers: ['last 3 version']})
        ]

      dist:
        src: 'www/css/site/site.min.css'

      dev:
        src: 'www/css/site/main.css'

    uglify:
      options:
        mangle: false





  # These plugins provide necessary tasks.
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-stylus'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-cssmin'
  grunt.loadNpmTasks 'grunt-usemin'
  grunt.loadNpmTasks 'grunt-nette-basepath'
  grunt.loadNpmTasks 'grunt-postcss'
  grunt.loadNpmTasks 'grunt-nittro'
  grunt.loadNpmTasks 'grunt-contrib-less'
#  grunt.loadNpmTasks 'grunt-sass'

  # Default task.
  grunt.registerTask 'default', [
#    'sass'
    'stylus'
    'less'
    'nittro'
    'useminPrepare'
    'netteBasePath'
    'concat'
    'uglify'
    'postcss'
    'cssmin'
  ]

