(function(){ 'use strict';

  describe('Profile', function(){
    var $controller;

    beforeEach( module( 'dtr4' ) );

    beforeEach( inject( function( _$controller_ ) {
      // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));

    describe('controller', function(){
      it('should have set properties on the scope', function( ) {
        var $scope = {};
        var controller = $controller('ProfileController', { $scope: $scope });

        expect(1).toBe(1);

      });
    });
  });
})();
