(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsDetailsController', SettingsDetailsController );

    SettingsDetailsController.$inject = [ '$scope', '$http', '$timeout', 'Cities', 'Profile', 'appBarTitle' ];
    
    function SettingsDetailsController( $scope, $http, $timeout, Cities, Profile, appBarTitle ){
        /**
         * Let the user update their detailed profile data.
         */
    
        // Using template: tpl/settings-details.html
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'profile details' );
        $scope.currSel = 'details';
        $scope.authuserPromise.then( function( ){ // wait for authuser data
            $scope.submitForm = function( ){
                // submit profile data, same as in "SettingsProfileController".
                var data = {};
                var url = '/api/v1/authuser.json';

                angular.forEach( $scope.settingsDetailsForm, function( v, k ){
                    if( k && (k[0] != '$') && v.$dirty ){
                        data[k] = $scope.authuser[k];
                        // Can't use "0" in the ng form for "no value", so 
                        // have to set it here manually. This enables the
                        // user to reset a field to "no value".
                        if ( data[k] == null ) data[k] = "0";
                        log( "Dirty value: " + k + " == '" + data[k] + "'");
                    } else {
                        log( "Not dirty: " + k );
                    }
                } );
                if( $scope.settingsDetailsForm.$dirty ){
                    $scope.isSubmitting = true;
                    $http.post( url, data ).success( function( data ){
                        // remove old vals from Profile buffer
                        Profile.clearFromBuffer( $scope.authuser.username );
                        // set form and fields to "not dirty"
                        $scope.settingsDetailsForm.$setPristine( );
                        $scope.isSubmitting = false;
                        $scope.isSubmitSuccess = true;
                        $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                    } ).error( function( err ){
                        alert( 'There was an error, please try again. Are you online?' );
                        $scope.isSubmitting = false;
                    } );
                }
            }
        } );
    }
})();
