
var del = require('del');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var uglify = require('gulp-uglify');
var useref = require('gulp-useref');
var runSequence = require('run-sequence');

gulp.task('clean:dist', function(){
    return del.sync('dist');
});

gulp.task('copymodules', function(){
    const li = [
        "node_modules/angular/angular.min.js*",
        "node_modules/angular-route/angular-route.min.js*",
        "node_modules/angular-resource/angular-resource.min.js*",
        "node_modules/angular-sanitize/angular-sanitize.min.js*",
        "node_modules/angular-upload/angular-upload.min.js*",
        "node_modules/angular-bindonce/bindonce.min.js*",
    ];
    return gulp.src(li).pipe(gulp.dest('dist/app/vendor'));
});

gulp.task('collect', function(){
    return gulp.src('src/app/index.html')
        .pipe(useref())
        //.pipe(gulpIf('*.js', uglify()))
        .pipe(gulp.dest('dist/app'));
});

gulp.task('copyall', function(){
    return gulp.src('src/app/**/*')
        .pipe(gulp.dest('dist/app'));
});

gulp.task('default', function(callback){
    runSequence('clean:dist', 'copymodules', 'copyall', 'collect', callback);
});
