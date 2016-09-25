(function(){ 'use strict';

    // Let the user update their detailed profile data.

    angular.module( 'dtr4' ).controller( 'SettingsDetailsController', SettingsDetailsController );

    SettingsDetailsController.$inject = [ '$scope', '$http', '$timeout', 'SettingsProfile',
                                          'Cities', 'Profile', 'appBarTitle', 'SharedFunctions' ];
    
    function SettingsDetailsController( $scope, $http, $timeout, SettingsProfile,
                                        Cities, Profile, appBarTitle, SharedFunctions ){
    
        $scope.translations = SharedFunctions.translations;
        $scope.currSel = 'details';
        $scope.submitForm = submitForm;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'profile details' );
        }

        function submitForm( ){
            // submit profile data, same as in "SettingsProfileController".
            if( ! $scope.settingsDetailsForm.$dirty ){ return }
            $scope.isSubmitting = true;
            $scope.authuserPromise.then( function(){
                SettingsProfile.submitForm( $scope.settingsDetailsForm ).then( function( data ){
                    // remove old vals from Profile buffer
                    Profile.clearFromBuffer( $scope.authuser.username );
                    // set form and fields to "not dirty"
                    $scope.settingsDetailsForm.$setPristine( );
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                })
                .catch( function( err ){
                    alert( 'There was an error, please try again. Are you online?' );
                    $scope.isSubmitting = false;
                });
            });
        }
    }
})();
