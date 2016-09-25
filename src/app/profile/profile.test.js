(function(){ 'use strict';

    describe('Profile', function(){
        var $controller;

        beforeEach( module( 'dtr4' ) );

        beforeEach( inject( function( _$controller_ ) {
           // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
        }));

        describe('controller', function(){
            var $scope, controller;

            beforeEach(function() {
                $scope = {};
                controller = $controller('ProfileMsgsController', { $scope: $scope });
            });

            it('should pass', function( ) {
                expect(1).toBe(1);
            });
        });
    });
})();
