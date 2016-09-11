
var dtrFilters = angular.module( 'dtrFilters', [ ] );

// Return the text of the profile option the user selected in the set display
// language.
//
// Example (in a template contect):
// {{ profileuser.religion | choicetext:'RELIGION_CHOICE' }}
//
/*
dtrFilters.filter( 'choicetext', function( ){
    return function( input ){
        log( 'filter(choicetext): called with input "' + input + '".' );
        return 'something';
    }
} );
*/
//
// Adapted from:
// https://gist.github.com/cmmartin/341b017194bac09ffa1a
//
// REQUIRES:
// moment.js - https://github.com/moment/momentjs.com
// 
// USAGE:
// {{ someDate | moment: [any moment function] : [param1] : [param2] : [param n] 
//
// EXAMPLES:
// {{ someDate | moment: 'format': 'MMM DD, YYYY' }}
// {{ someDate | moment: 'fromNow' }}
//
// To call multiple moment functions, you can chain them.
// For example, this converts to UTC and then formats...
// {{ someDate | moment: 'utc' | moment: 'format': 'MMM DD, YYYY' }}
/*
dtrFilters.filter( 'moment', function( ) {
    return function( input, momentFn ){
        var args = Array.prototype.slice.call( arguments, 2 );
        var momentObj = moment(input);

        return momentObj[momentFn].apply(momentObj, args);
    };
});
*/