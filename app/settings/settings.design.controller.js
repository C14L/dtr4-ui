(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsDesignController', SettingsDesignController ); 

    SettingsDesignController.$inject = [ '$rootScope', '$scope', '$http', '$timeout', 'Profile', 'appBarTitle' ];

    function SettingsDesignController( $rootScope, $scope, $http, $timeout, Profile, appBarTitle ){
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'design' );
        $scope.currSel = 'design';
        $scope.isSubmitSuccess = false;
        $scope.isSubmitError = false;
        $scope.isSubmitting = false;
        var url = '/api/v1/authuser.json';
        $scope.submitForm = function( ){
            // save changes in authuser.style to the backend.
            log( '--- SettingsDesignController.$scope.submitForm() --- called...');
            $scope.isSubmitting = true;
            var data = { 'style': $scope.authuser['style'] };
            $http.post( url, data ).success( function( data ){
                log( '--- SettingsDesignController.$scope.submitForm() --- success!');
                $scope.isSubmitting = false;
                $scope.isSubmitSuccess = true;
                $timeout(function(){ $scope.isSubmitSuccess = false; }, 500);
                // remove old vals from Profile buffer
                Profile.clearFromBuffer( $scope.authuser.username );
                $rootScope.authuser['style'] = $scope.authuser['style'];
            } ).error( function( err ){
                log( '--- SettingsDesignController.$scope.submitForm() --- error :(');
                $scope.isSubmitting = false;
                $scope.isSubmitError = true;
                $timeout(function(){ $scope.isSubmitError = false; }, 2000);
            } );
        }
    }
})();
