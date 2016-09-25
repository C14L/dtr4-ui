(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsPasswordController', SettingsPasswordController );

    SettingsPasswordController.$inject = [ '$scope', '$http', '$timeout', 'appBarTitle' ];

    function SettingsPasswordController( $scope, $http, $timeout, appBarTitle ){
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'email+password' );
        $scope.currSel = 'password';
    }
})();
