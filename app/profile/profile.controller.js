(function(){ 'use strict';

    // Show the profile of the username in the URL path. 

    angular.module( 'dtr4' ).controller( 'ProfileController', ProfileController );

    ProfileController.$inject = [ '$scope', '$location', '$http', '$routeParams', 
                                  'Profile', 'Search', 'appBarTitle', 'Lists', 'Inbox' ];
  
    function ProfileController( $scope, $location, $http, $routeParams,  
                                Profile, Search, appBarTitle, Lists, Inbox ) {

        $scope.deleteUser = deleteUser;
        $scope.open_picviewer = open_picviewer;
        $scope.deleteFlag = deleteFlag;
        $scope.addFlag = addFlag;

        activate();

        ///////////////////////////////////////////////////

        function activate() {
            appBarTitle.primary = $scope.tr('profile');
            appBarTitle.secondary = '';

            assertPnaslOkay();
            loadUserProfile();
            getSomeRandomUsers();
        }

        // check if authuser has complete pnasl data
        function assertPnaslOkay() {
            $scope.authuserPromise.then( function() {
                // pnasl incomplete, redirect to the basic settings page
                if ( $scope.authuser.pnasl_ok === false ) $location.path('/settings/profile');
            });
        }

        // load the user profie
        function loadUserProfile() {
            $scope.profileuserPromise = Profile
            .getByUsername( $routeParams.username )
            .then(resolve, reject);

            function resolve( data ) {
                $scope.profileuser = data;
                appBarTitle.secondary = data.username;

                if ( $scope.profileuser['style'] )
                    $scope.profileuser['style_active'] = true;
            }

            function reject( err ){
                $scope.profileuser = { 'doesNotExist': true };
            }
        }

        function getSomeRandomUsers( count ) {
            // load some random user links
            // var n = Math.floor( ( window.innerWidth - 40 ) / 56 );
            // number of links to fit into screen size
            count = count || 18;
            Search.getRandomResults( count ).then( function( data ){
                $scope.userlist = data;
            });
        }

        // Let authuser set a flag on profileuser.
        function addFlag( flag_name ){
            // ignore if flag is alread set, to remove use explicit
            // removeFlag() method.

            if ( !$scope.profileuser['flags'][flag_name] ){
                //log( 'Adding flag "' + flag_name + '".' );
                $scope.profileuser['flags'][flag_name] = new Date( ).toISOString( ).replace( 'T', ' ' );
                var url = '/api/v1/flag/' + flag_name + '/' + $scope.profileuser.username + '.json';

                $http.post( url )
                .success( function( data ){
                    // if a user was blocked, force buffered lists to reaload
                    if( flag_name == 'block' ){ 
                        Lists.clearBuffer( );
                        Inbox.clearBox( 'inbox' );
                        Inbox.clearBox( 'unread' );
                    }
                })
                .error( function( err ){
                    delete( $scope.profileuser['flags'][flag_name] );
                });
            };
        }

        function deleteFlag( flag_name ) {
            log( 'Deleting flag "' + flag_name + '".');

            var bak = $scope.profileuser['flags'][flag_name]; // remember state in case of network failure.
            var url = '/api/v1/flag/' + flag_name + '/' + $scope.profileuser.username + '.json';

            $scope.profileuser['flags'][flag_name] = false;

            $http.delete( url )
            .success( function( data ){
                // if a user was un-blocked, force buffered lists to reaload
                if ( flag_name == 'block' ){
                    Lists.clearBuffer( );
                    Inbox.clearBox( 'inbox' );
                    Inbox.clearBox( 'unread' );
                }
            })
            .error( function( err ){
                $scope.profileuser['flags'][flag_name] = bak; // restore state on error.
            });
        }

        // launch the picture viewer when any pic is clicked.
        function open_picviewer( initial_pic ) {
            var pics_list = [];
            var thumbs_list = [];

            for (var i=0; i<$scope.profileuser['pics_url'].length; i++){
                thumbs_list[i] = $scope.profileuser['pics_url'][i]['small'];
                pics_list[i] = $scope.profileuser['pics_url'][i]['large'];
            }

            window.picviewer(pics_list, thumbs_list, initial_pic);
        }

        // moderator: delete profileuser
        function deleteUser() {
            if( $scope.authuser['is_staff'] || $scope.authuser['id']==$scope.profileuser['id'] ){
                if ( confirm( $scope.tr('Delete user account?') ) ){
                    var url = '/api/v1/profile/'+$scope.profileuser['username']+'.json';

                    $http.delete( url )
                    .success( function( data ){
                        Profile.clearFromBuffer( $scope.profileuser['username'] );
                        alert( $scope.tr('Account deleted!') );
                    })
                    .error( function( err ){
                        alert( $scope.tr('ERROR: Account not deleted!') );
                    });
                }
            } else {
                alert( $scope.tr('You can only delete your own profile.') );
            }
        }
    }
})();
