(function(){

    angular.module( 'dtr4' ).factory( 'ProfileFlag', ProfileFlagService );

    ProfileFlagService.$inject = [ '$q', '$http', 'Lists', 'Inbox' ];

    function ProfileFlagService( $q, $http, Lists, Inbox ){

        return {
            addFlag: addFlag,
            deleteFlag: deleteFlag,
        }

        ///////////////////////////////////////////////////

        function addFlag( flag_name, username ){
            return _setFlag( flag_name, username, 'post' )
        }

        function deleteFlag( flag_name, username ) {
            return _setFlag( flag_name, username, 'delete' )
        }

        function _setFlag( flag_name, username, action ){
            var _http_func = ( action == 'delete' ) ? $http.delete : $http.post;
            var url = '/api/v1/flag/' + flag_name + '/' + username + '.json';
            var deferred = $q.defer();

            _http_func( url ).success( function( data ){
                // if a user was blocked, force buffered lists to reaload
                if ( flag_name == 'block' ){
                    Lists.clearBuffer();
                    Inbox.clearBox( 'inbox' );
                    Inbox.clearBox( 'unread' );
                }
                deferred.resolve();
            })
            .error( function( err ){
                deferred.reject();
            });

            return deferred.promise
        }

        
    }
})();