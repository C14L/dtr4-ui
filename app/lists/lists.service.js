(function(){ 'use strict';

    // --- user lists --------------------------------------------------------------
    //
    // returns lists of users based on their relation to authuser.

    angular.module( 'dtr4' ).factory( 'Lists', ListsService );

    ListsService.$inject = [ '$q', '$http', 'SharedFunctions' ];
    
    function ListsService( $q, $http, SharedFunctions ) {

        var _this = this;
        _this.clearBuffer = clearBuffer;
        _this.countNew = countNew;
        _this.getList = getList;
        _this.getListQuickie = getListQuickie;
        _this.resetCountTimestamp = resetCountTimestamp;

        ///////////////////////////////////////////////////

        // buffer all the lists here
        var buffers = {
            'matches': [], 'like_me': [], 'likes': [], 
            'viewed_me': [], 'favorites': [], 'blocked': [],
        };

        // remember the last time the user viewed the list, and start 
        // counting "new" items from there.
        var count_timestamps = {
            'matches': '', 'like_me': '', 'viewed_me': '',
        };

        // for each buffered list, remember the last time we fetched items
        // from the server.
        var fetch_timestamps = {
            'matches': '', 'like_me': '', 'likes': '', 
            'viewed_me': '', 'favorites': '', 'blocked': '',
        };

        // clear a buffer, or all buffers if no buffername is provided.
        function clearBuffer( buffername ){
            if ( buffername ){
                buffers[buffername] = [];
            } else {
                buffers = {
                    'matches': [], 'like_me': [], 'likes': [], 
                    'viewed_me': [], 'favorites': [], 'blocked': [],
                };
            }
        }

        // sets the counter timestamp to "now" for one list, so only items
        // of that list fetched after now will count as "new".
        function resetCountTimestamp( listname ){
            count_timestamps[listname] = new Date( ).toISOString( );
        }

        // same for the fetch timstamps.
        function resetFetchTimestamp( listname ){
            fetch_timestamps[listname] = new Date( ).toISOString( );
        }

        // return the age of a buffer in seconds.
        function getBufferAge( listname ){
            if ( !fetch_timestamps[listname] ) return 9999999999; //just something big.
            return SharedFunctions.get_time_delta_seconds( fetch_timestamps[listname] );
        }

        // counts the number of items in a buffer that were "created"
        // after the buffer's "count_timestamps".
        function countNew( listname ){
            // empty buffer, nothing to count
            if ( buffers[listname].length < 1 ){
                return 0;
            }

            // find all newer items and count them
            var counter = 0;
            for ( var i=0; i<buffers[listname].length; i++ ){
                if ( buffers[listname][i]['created'] > count_timestamps[listname] ){
                    counter++;
                }
            }

            return counter;
        }

        // returns whatever is in the buffer for that list. should be 
        // called first to get something to the user quickly, then call
        // getList() to complete the list with new items.
        function getListQuickie( listname ) {
            return !!buffers[listname] ? buffers[listname] : [];
        }

        function getList( listname ){
            var url = '/api/v1/lists/' + listname + '.json';
            var deferred = $q.defer( );
            var params = { after: fetch_timestamps[listname], before:'' };

            $http.get( url, { 'params': params } ).success( function( data ){

                // top up with some data fields
                data.forEach( function( row, i ){ row = SharedFunctions.complete_user_pnasl( row ); });

                // combine with buffer
                buffers[listname] = combine_unique_by_id( data, buffers[listname] );

                // sort by newest first
                if( listname == 'matches' || listname == 'friends' ){
                    buffers[listname].sort( sort_by_confirmed_filter );
                } else {
                    buffers[listname].sort( sort_by_created_filter );
                }

                // remember time of fetching data
                resetFetchTimestamp( listname );
                // resolve promise
                deferred.resolve( buffers[listname] );
            })
            .error( function( err ){
                deferred.reject( err );
            });

            return deferred.promise;
        }

        return _this;
    }
})();
