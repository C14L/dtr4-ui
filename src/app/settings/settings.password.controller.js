(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsPasswordController', SettingsPasswordController );

    SettingsPasswordController.$inject = [ '$scope', '$http', '$timeout', 'appBarTitle', 'Translate' ];

    function SettingsPasswordController( $scope, $http, $timeout, appBarTitle, Translate ){
        $scope.tr = Translate.tr;
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'email+password' );
        $scope.currSel = 'password';
    }
})();
