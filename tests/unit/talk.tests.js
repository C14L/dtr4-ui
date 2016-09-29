(function(){ 'use strict';

    describe('Talk', function(){

        beforeEach( module( 'dtr4' ) );

        var $controller, rootscope;

        beforeEach( inject( function( _$controller_ ){
            $controller = _$controller_;
        }));

        describe('Controller', function(){

            it('should always pass', function() {
                expect(1).toBe(1);
            });

            it('should have properties defined on the scope', function(){
                var $scope = {};
                var controller = $controller('TalkController', { $scope: $scope });

                expect($scope.isLoadingMore).toBeDefined();
                expect($scope.statusMsg).toBeDefined();
            });

            // describe('$scope.groupNames', function() {
            //     it('all, matches, friends, own', inject( function( $rootScope ) {
            //         var $scope = {};
            //         var controller = $controller( 'TalkController', { $scope: $scope } );

            //         expect( typeof($scope.groupNames) ).toEqual( 'object' );
            //     }));
            // });


        });

    });

})();
