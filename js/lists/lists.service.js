
// --- user lists --------------------------------------------------------------
//
// returns lists of users based on their relation to authuser.

angular.module( 'listsService', [ ] ).factory(
  
  'Lists', 

         [ '$q', '$http',
  function( $q,   $http
  
) {

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

  // -----------------------------------------------------------------

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
    return get_time_delta_seconds( fetch_timestamps[listname] );
  }

  // counts the number of items in a buffer that were "created"
  // after the buffer's "count_timestamps".
  function countNew( listname ){
    log( '--- ListsFactory.countNew() called for buffer "' + listname + '": count for the past "' + getBufferAge( listname ) + '" seconds (' + count_timestamps[listname] + ').'); log( buffers[listname] );

    // empty buffer, nothing to count
    if ( buffers[listname].length < 1 ){
      log( '--- ListsFactory.countNew(): empty buffer! Return 0.');
      return 0;
    }

    // find all newer items and count them
    var counter = 0;
    for ( var i=0; i<buffers[listname].length; i++ ){
      if ( buffers[listname][i]['created'] > count_timestamps[listname] ){
        counter++;
      }
    }

    log( '--- ListsFactory.countNew() counted "' + counter + '" new items in the past "' + getBufferAge( listname ) + '" seconds .');

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

    log( '--- ListsFactory.getList() --- yo! fresh data it is! GET request for list "'+listname+'" to "'+url+'" with params:' ); log( params );

    $http.get( url, { 'params': params } )
    .success( function( data ){
      log( '--- ListsFactory.getList() --- request to "' + url + '" received data:' ); log( data );

      // top up with some data fields
      data.forEach( function( row, i ){ row = complete_user_pnasl( row ); });

      // combine with buffer
      buffers[listname] = combine_unique_by_id( data, buffers[listname] );

      // sort by newest first
      if( listname == 'matches' || listname == 'friends' ){
        log( '--- ListsFactory.getList() ---  sort_by_confirmed_filter' );
        buffers[listname].sort( sort_by_confirmed_filter );
      } else {
        log( '--- ListsFactory.getList() ---  sort_by_created_filter' );
        buffers[listname].sort( sort_by_created_filter );
      }

      // remember time of fetching data
      resetFetchTimestamp( listname );
      // resolve promise
      deferred.resolve( buffers[listname] );
    })
    .error( function( err ){
      log( '--- ListsFactory.getList() --- an error occurred GETing list data:' ); log( err );

      deferred.reject( err );
    });

    return deferred.promise;
  }

  this.clearBuffer = clearBuffer;
  this.countNew = countNew;
  this.getList = getList;
  this.getListQuickie = getListQuickie;
  this.resetCountTimestamp = resetCountTimestamp;
  return this;

}]);
