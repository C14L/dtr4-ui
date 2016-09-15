// Show the profile of the username in the URL path. 

angular.module( 'profileController', [ 'ngSanitize' ] ).controller(
  
  'ProfileController', 
    
         [ '$scope', '$location', '$http', '$routeParams', 'Profile', 'Search', 'appBarTitle', 'Lists', 'Inbox',
  function( $scope,  $location,    $http,   $routeParams,  Profile,    Search,   appBarTitle,   Lists,   Inbox
  
) {

  appBarTitle.primary = $scope.tr('profile');
  appBarTitle.secondary = '';

  // check if authuser has missing pnasl data and
  // send them to the basic settings page if not.
  $scope.authuserPromise.then(
      function( ) {
          if ( $scope.authuser.pnasl_ok===false ) 
              $location.path('/settings/profile');
      } );

  // load the user profie
  $scope.profileuserPromise = Profile.getByUsername( $routeParams.username ).then(
      function( data ){
          $scope.profileuser = data;
          appBarTitle.secondary = data.username;
          if ( $scope.profileuser['style'] ) 
              $scope.profileuser['style_active'] = true;
      }, 
      function( err ){
          $scope.profileuser = { 'doesNotExist': true };
      }
  );

  // load some random user links
  //var n = Math.floor( ( window.innerWidth - 40 ) / 56 );
  // number of links to fit into screen size
  Search.getRandomResults( 18 ).then( 
      function( data ){
          $scope.userlist = data;
      }
  );

  // Let authuser set a flag on profileuser.
  $scope.addFlag = function( flag_name ){
      // ignore if flag is alread set, to remove use explicit
      // removeFlag() method.
      if( !$scope.profileuser['flags'][flag_name] ){ 
          //log( 'Adding flag "' + flag_name + '".' );
          $scope.profileuser['flags'][flag_name] = new Date( ).toISOString( ).replace( 'T', ' ' );
          var url = '/api/v1/flag/' + flag_name + '/' + $scope.profileuser.username + '.json';
          $http.post( url ).success( function( data ){
              // if a user was blocked, force buffered lists to reaload
              if( flag_name == 'block' ){ 
                  Lists.clearBuffer( );
                  Inbox.clearBox( 'inbox' );
                  Inbox.clearBox( 'unread' );
              }
          }).error( function( err ){
              delete( $scope.profileuser['flags'][flag_name] );
          });
      };
  };

  $scope.deleteFlag = function( flag_name ){
      log( 'Deleting flag "' + flag_name + '".');
      var bak = $scope.profileuser['flags'][flag_name]; // remember state in case of network failure.
      $scope.profileuser['flags'][flag_name] = false;
      var url = '/api/v1/flag/' + flag_name + '/' + $scope.profileuser.username + '.json';
      $http.delete( url ).success( function( data ){
          // if a user was un-blocked, force buffered lists to reaload
          if( flag_name == 'block' ){
              Lists.clearBuffer( );
              Inbox.clearBox( 'inbox' );
              Inbox.clearBox( 'unread' );
          }
      }).error( function( err ){
          $scope.profileuser['flags'][flag_name] = bak; // restore state on error.
      });
  };

  // launch the picture viewer when any pic is clicked.
  $scope.open_picviewer = function(initial_pic){
      var pics_list = [];
      var thumbs_list = [];

      for (var i=0; i<$scope.profileuser['pics_url'].length; i++){
          thumbs_list[i] = $scope.profileuser['pics_url'][i]['small'];
          pics_list[i] = $scope.profileuser['pics_url'][i]['large'];
      }

      window.picviewer(pics_list, thumbs_list, initial_pic);
  };

  // moderator: delete profileuser
  $scope.deleteUser = function( ){
      if( $scope.authuser['is_staff'] || $scope.authuser['id']==$scope.profileuser['id'] ){
          if ( confirm( $scope.tr('Delete user account?') ) ){
              var url = '/api/v1/profile/'+$scope.profileuser['username']+'.json';
              $http.delete( url ).success( function( data ){
                  Profile.clearFromBuffer( $scope.profileuser['username'] );
                  alert( $scope.tr('Account deleted!') );
              } ).error( function( err ){
                  alert( $scope.tr('ERROR: Account not deleted!') );
              } );
          }
      } else {
          alert( $scope.tr('You can only delete your own profile.') );
      }
  };

}]);

