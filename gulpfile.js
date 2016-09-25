var gulp = require('gulp');
var useref = require('gulp-useref');
var del = require('del');
var runSequence = require('run-sequence');

gulp.task('clean:dist', function(){
    return del.sync('dist');
});

gulp.task('collect', function(){
    return gulp.src('app/index.html')
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('default', function(callback){
    runSequence('clean:dist', 'collect', callback);
});
