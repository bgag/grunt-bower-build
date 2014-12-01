'use strict';

var
  _ = require('underscore'),
  fs = require('fs'),
  path = require('path');


module.exports = function (grunt) {
  //TODO: add option for uglifyjs
  //TODO: add option for clean-css

  var defaultOptions = {
    dest: '.build',
    destCss: 'css',
    destJs: 'js',
    destFont: 'fonts',
    concatFiles: false
  };

  var mkdir = function (path) {
    var
      dirs = path.split('/'),
      prevDir = dirs.splice(0,1)+'/';

    while (dirs.length > 0) {
      var curDir = prevDir + dirs.splice(0,1);

      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }

      prevDir = curDir + '/';
    }
  };

  var copy = function (source, target) {
    mkdir(path.dirname(target));

    fs.writeFileSync(target, fs.readFileSync(source));
  };

  grunt.registerMultiTask('bower-build', 'Build bower dependencies', function () {
    var
      cssCode = '',
      jsCode = '',
      htmlImportCss = '',
      htmlImportJs = '',
      cssMatcher = /\.css$/,
      jsMatcher = /\.js$/,
      fontMatcher = /\.(eot|otf|svg|ttf|woff)$/,
      options = _.extend(defaultOptions, this.data),
      dependencies = require('wiredep')(),
      done = {};

    // fix/extend pathes
    var initPathes = function () {
      var prependBowerPath = function (source) {
        return path.join(process.cwd(), 'bower_components', packageName, source);
      };

      var updateOther = function (other) {
        var newOther = {};

        for (var source in other) {
          newOther[prependBowerPath(source)] = path.join(options.dest, other[source]);
        }

        return newOther;
      };

      for (var packageName in options.manual) {
        dependencies.packages[packageName] = {
          main: options.manual[packageName].main.map(prependBowerPath),
          other: updateOther(options.manual[packageName].other)
        };
      }
    };

    // create destination folders
    var initFolders = function () {
      mkdir(path.join(options.dest, options.destCss));
      mkdir(path.join(options.dest, options.destJs));
    };

    // write CSS file to destination and add it to the HTML import list
    var addCssFile = function (name, code) {
      var file = path.join(options.destCss, name + '.css');

      // ignore empty files
      if (code === '') {
        return;
      }

      htmlImportCss += '<link rel="stylesheet" href="/' + file + '" />\n';

      fs.writeFileSync(path.join(options.dest, file), code);
    };

    // write JS file to destination and add it to the HTML import list
    var addJsFile = function (name, code) {
      var file = path.join(options.destJs, name + '.js');

      // ignore empty files
      if (code === '') {
        return;
      }

      htmlImportJs += '<script src="/' + file + '"></script>\n';

      fs.writeFileSync(path.join(options.dest, file), code);
    };

    // process a single package
    var processPackage = function (name, pack) {
      // ignore already processed packages
      if (name in done) {
        return;
      }

      // first processs dependencies
      if ('dependencies' in pack) {
        Object.keys(pack.dependencies).forEach(function (dependency) {
          processPackage(dependency, dependencies.packages[dependency]);
        });
      }

      // process file defined in main
      pack.main.forEach(function (source) {
        if (cssMatcher.test(source)) {
          cssCode += fs.readFileSync(source).toString();
        } else if (jsMatcher.test(source)) {
          jsCode += fs.readFileSync(source).toString();
        } else if (fontMatcher.test(source)) {
          copy(source, path.join(options.dest, options.destFont, path.basename(source)));
        } else {
          grunt.log.writeln('unkown file type: ' + source);
        }
      });

      // copy file defined in other
      for(var source in pack.other) {
        copy(source, pack.other[source]);
      }

      // clear code if multiple files are written
      if (!options.concatFiles) {
        addCssFile(name, cssCode);
        addJsFile(name, jsCode);

        cssCode = '';
        jsCode = '';
      }

      done[name] = true;
    };

    // process all packages
    var processPackages = function () {
      for (var packageName in dependencies.packages) {
        processPackage(packageName, dependencies.packages[packageName]);
      }

      // write concatenated files
      if (options.concatFiles) {
        addCssFile(options.name, cssCode);
        addJsFile(options.name, jsCode);
      }

      // write CSS HTML import file
      if ('htmlImportCss' in options) {
        mkdir(path.dirname(options.htmlImportCss));
        fs.writeFile(options.htmlImportCss, htmlImportCss);
      }

      // write JS HTML import file
      if ('htmlImportJs' in options) {
        mkdir(path.dirname(options.htmlImportJs));
        fs.writeFile(options.htmlImportJs, htmlImportJs);
      }
    };

    initPathes();
    initFolders();
    processPackages();
  });
};
