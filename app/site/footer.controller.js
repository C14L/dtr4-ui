(function(){ 'use strict';

    // footer functions

    angular.module( 'dtr4' ).controller( 'FooterController', FooterController );
    
    FooterController.$inject = [ '$scope', '$window', 'appBarTitle' ];

    function FooterController( $scope, $window, appBarTitle ){
        appBarTitle.primary = '';
        appBarTitle.secondary = '';
        $scope.statusMsg = '';

        // Change the display language: set lg cookie, then reload.
        $scope.setLanguage = function( lg ){
            log('SET LANGUAGE: "' + lg + '"');
            set_cookie('lg', lg);
            $window.location.reload();
        }
    }
})();
