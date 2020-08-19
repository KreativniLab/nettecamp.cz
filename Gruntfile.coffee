
module.exports = (grunt) ->

  grunt.initConfig

    useminPrepare:
      html: ['app/modules/FrontModule/templates/@layout.latte']
      options:
        dest: './'

    netteBasePath:
      task:
        basePath: 'public'
        options:
          removeFromPath: ['app\\modules\\FrontModule\\templates\\']
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
            'public/js/nittro/NetteBasicFormToggle.js',
          ]
          css: []
        bootstrap:
          params: null,
          extensions: null,
          services:
            netteBasicFormToggle: 'App.NetteBasicFormToggle()!'

          factories: null
        stack: true
      js:
        dest: "public/js/nittro/nittro-build.js"
      css:
        dest: "public/css/nittro/nittro-build.less"


    sass:
      options:
        includePaths: [
          'node_modules/foundation-sites/scss'
          'node_modules/motion-ui/src'
        ]
        sourceMap: true
      dist:
        files:
          'public/css/site/main.css': 'public/css/site/main.sass'


    less:
      development:
        options:
          paths: ['public/css/nittro']
        files:
          'public/css/nittro/nittro-build.css': 'public/css/nittro/nittro-build.less'

    watch:
      sass:
        files: ['public/css/site/**/*.sass']
        tasks: ['sass', 'postcss:dev']

    postcss:
      options:
        map: true,
        processors: [
          require('autoprefixer')({browsers: ['last 3 version']})
        ]

      dist:
        src: 'public/css/site/site.min.css'

      dev:
        src: 'public/css/site/main.css'

    uglify:
      options:
        mangle: false



  # These plugins provide necessary tasks.
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-cssmin'
  grunt.loadNpmTasks 'grunt-usemin'
  grunt.loadNpmTasks 'grunt-nette-basepath'
  grunt.loadNpmTasks 'grunt-postcss'
  grunt.loadNpmTasks 'grunt-sass'
  grunt.loadNpmTasks 'grunt-nittro'
  grunt.loadNpmTasks 'grunt-contrib-less'

  # Default task.
  grunt.registerTask 'default', [
    'nittro'
    'less'
    'sass'
    'useminPrepare'
    'netteBasePath'
    'concat'
    'uglify'
    'cssmin'
    'postcss'
  ]

