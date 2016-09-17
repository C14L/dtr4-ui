(function(){ 'use strict';

    // --- lists of users ----------------------------------------------------------

    angular.module( 'dtr4' ).controller( 'ListsController', ListsController );
  
    ListsController.$inject = [ '$scope', '$routeParams', 'Lists', 'appBarTitle' ];

    function ListsController( $scope, $routeParams, Lists, appBarTitle ) {

        var listnames = {
            'matches': $scope.tr( 'matches' ),
            'likes': $scope.tr( 'interest sent' ),
            'like_me': $scope.tr( 'interested in you' ),
            'viewed_me': $scope.tr( 'viewed your profile' ),
            'friends': $scope.tr( 'friends' ),
            'friend_recv': $scope.tr( 'answer friend invites' ),
            'friend_sent': $scope.tr( 'friend requests sent' ),
            'favorites': $scope.tr( 'your favorites' ),
            'blocked': $scope.tr( 'blocked' ),
        };

        $scope.listname = $routeParams.listname.toLowerCase();
        $scope.statusMsg = '';
        $scope.showList( );

        appBarTitle.primary = $scope.tr('lists');
        appBarTitle.secondary = listnames[$scope.listname];

        $scope.showList = function( ){
            $scope.userlist = Lists.getListQuickie( $scope.listname );
            $scope.statusMsg = ( $scope.userlist.length < 1 ) ? 'loading' : '';
            Lists.resetCountTimestamp( $scope.listname );

            // will only load and run the callback if the buffer is old
            Lists.getList( $scope.listname ).then(
                function( data ) {
                    $scope.userlist = data;
                    $scope.statusMsg = ( $scope.userlist.length < 1 ) ? 'empty' : '';
                },
                function( err ){
                    $scope.statusMsg = 'offline';
                }
            );
        };
    }
})();
