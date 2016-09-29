(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsDesignController', SettingsDesignController ); 

    SettingsDesignController.$inject = [ '$rootScope', '$scope', '$http', '$timeout', 
                                         'Profile', 'appBarTitle', 'SettingsProfile', 'Translate' ];

    function SettingsDesignController( $rootScope, $scope, $http, $timeout, 
                                       Profile, appBarTitle, SettingsProfile, Translate ){
        $scope.tr = Translate.tr;
        $scope.currSel = 'design';
        $scope.isSubmitSuccess = false;
        $scope.isSubmitError = false;
        $scope.isSubmitting = false;
        $scope.submitForm = submitForm;
        activate();

        ///////////////////////////////////////////////////

        function activate(){
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'design' );

        }

        function submitForm( ){
            $scope.isSubmitting = true;
            SettingsProfile.submitDesignForm().then( function(){ 
                $scope.isSubmitting = false;
                $scope.isSubmitSuccess = true;
                $timeout(function(){ $scope.isSubmitSuccess = false; }, 500);
                $rootScope.authuser['style'] = $scope.authuser['style'];
            }).catch( function(){
                $scope.isSubmitting = false;
                $scope.isSubmitError = true;
                $timeout(function(){ $scope.isSubmitError = false; }, 2000);
            });
        }
    }
})();
