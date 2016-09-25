(function(){

    angular.module( 'dtr4' ).factory( 'ProfileMsgs', ProfileMsgsService );

    ProfileMsgsService.$inject = [ '$q', '$http', 'SharedFunctions' ];

    function ProfileMsgsService( $q, $http, SharedFunctions ){

        return {
            getMsgs: getMsgs,
            sendMsg: sendMsg,
            addToMsgs: addToMsgs,
        };

        function getMsgs( username, after ){
            var url = '/api/v1/msgs/' + username + '.json';
            var params = { after: after };
            var deferred = $q.defer();

            $http.get( url, { 'params': params } ).success( function ( data ){
                deferred.resolve( data );
            }).error( function( err ){
                deferred.reject();
            });

            return deferred.promise;
        };

        function sendMsg( username, after, text ){
            var url = '/api/v1/msgs/' + username + '.json';
            var data = { 'text': text, 'after': after };
            var deferred = $q.defer();

            $http.post( url, data ).success( function ( data ){
                deferred.resolve( data );
            }).error( function( err ){
                deferred.reject( err );
            });

            return deferred.promise;
        }

        function addToMsgs( data, msgs, authuser, profileuser ){
            // adds a list off messages to the $scope.msgs buffer, removes
            // duplicates, and sorts by "created", newest first.
            if ( !data || data.length<1 ) return;

            for( var i=0; i<data.length; i++ ){
                data[i]['created_delta'] = SharedFunctions.get_time_delta( data[i]['created'] );
                if ( data[i]['from_user'] == profileuser['id'] ) data[i]['pic_url'] = profileuser['pic_url'];
                if ( data[i]['from_user'] == authuser['id'] ) data[i]['pic_url'] = authuser['pic_url'];
            }

            msgs = combine_unique_by_id( data, msgs );

            msgs.sort( function( a, b ){
                if( a['created'] > b['created'] ) return -1;
                if( a['created'] < b['created'] ) return 1;
                return 0;
            });

            return msgs;
        }

    }
})();
