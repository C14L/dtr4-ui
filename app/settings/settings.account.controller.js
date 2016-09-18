(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsAccountController',  SettingsAccountController );

    SettingsAccountController.$inject = [ '$scope', 'appBarTitle' ];

    function SettingsAccountController( $scope, appBarTitle ){
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'account' );
        $scope.currSel = 'account';

        // TODO: connect to backend
    }
})();
