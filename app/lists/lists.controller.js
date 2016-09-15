
// --- lists of users ----------------------------------------------------------

angular.module( 'listsController', [ 'ngSanitize' ] ).controller(
  
  'ListsController', 
  
         [ '$scope', '$routeParams', 'Lists', 'appBarTitle',
  function( $scope,   $routeParams,   Lists,   appBarTitle
  
){

  listnames = {
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
  appBarTitle.primary = $scope.tr('lists');
  appBarTitle.secondary = listnames[$scope.listname];

  $scope.showList = function( ){
    log( '--- ListsController.showList(): reset counter timestamp and render buffer content. ')
 
    $scope.userlist = Lists.getListQuickie( $scope.listname );
    $scope.statusMsg = ( $scope.userlist.length < 1 ) ? 'loading' : '';
    Lists.resetCountTimestamp( $scope.listname );
 
    log( '--- ListsController.showList(): timestamp and coutner reset, fetch new items...')

    // will only load and run the callback if the buffer is old
    log( '--- ListsController.showList(): calling getList Factory... ')
    Lists.getList( $scope.listname ).then(
      function( data ) {
        $scope.userlist = data;
        $scope.statusMsg = ( $scope.userlist.length < 1 ) ? 'empty' : '';
 
        log( '--- ListsController.showList(): Factory REPLIED: LIST POPULATED!' );
        log( $scope.statusMsg );
        log( $scope.userlist );
      },
      function( err ){
        $scope.statusMsg = 'offline';
 
        log( '--- ListsController.showList(): Factory REPLIED: LIST NOT RECEIVED, ONLY AN ERROR!!!');
      }
    );

    log( '--- ListsController.showList(): Factory called async, getting reply later.')
  };

  $scope.statusMsg = '';
  $scope.showList( );

}]);
