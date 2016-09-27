
var cssnano = require('gulp-cssnano');
var del = require('del');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var runSequence = require('run-sequence');
var uglify = require('gulp-uglify');
var useref = require('gulp-useref');
var watch = require('gulp-watch');

gulp.task('clean:dist', function(){
    return del.sync('dist');
});

gulp.task('collect_assets', function(){
    return gulp.src('src/app/index.html')
        .pipe(useref())
        .pipe(gulpIf('*.js', uglify()))
        .pipe(gulpIf('*.css', cssnano()))
        .pipe(gulp.dest('dist/app'));
});

gulp.task('copy_tpls', function(){
    const files = [
        'src/app/**/*.html', 
        'src/app/**/*.json', 
    ];
    return gulp.src(files).pipe(gulp.dest('dist/app'));
});

gulp.task('copy_font', function(){
    files = [
        'src/app/utils/themify-icons/fonts/themify.ttf',
        'src/app/utils/themify-icons/fonts/themify.woff',
    ];
    return gulp.src(files).pipe(gulp.dest('dist/app/fonts'))
});

gulp.task('default', function(callback){
    runSequence('clean:dist', 'copy_font', 'copy_tpls', 'collect_assets', callback);
});

// gulp.task('default2', function(callback) {
//     return watch('src/app/**/*.[html|js|css]', function(){
//         runSequence('copy_tpls', 'collect_assets', callback);
//     });
// });
