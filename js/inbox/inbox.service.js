
// manage the different message boxes (inbox, unread, unreplied, sent), buffer
// them when possible, and load new messages, adding them to the buffer, ordered
// by timestamp and removng any douplicates.

angular.module( 'inboxService', [ ] ).factory( 
    
  'Inbox', 
  
         [ '$q', '$http', 'Authuser', 
  function( $q,   $http,   Authuser
  
){

  var buffers = {
    'inbox': [], 'sent': [], 'unread': [], 'unreplied': [],
  };

  var urls = {
    'inbox':'/api/v1/inbox/recv.json', 
    'sent':'/api/v1/inbox/sent.json', 
    'unread':'/api/v1/inbox/unread.json', 
    'unreplied':'/api/v1/inbox/unreplied.json',
  };

  // quickly return whatever is in the buffer. these should be called
  // first by the Controller, to quickly show something to the user
  // is there were already messages loaded. after calling this, the 
  // Controller should call the corresponding method get* method to
  // fetch new messages from the server an integrate them into the
  // messages list. Also, use "track by" in the template to avoid a 
  // complete re-render every time new messages are added!
  function getQuickie( boxname ){ 
    return buffers[boxname]; 
  }
  
  // force fresh load from server, clear a box before calling getBox()
  function clearBox( boxname ){
    buffers[boxname] = [];
  }

  // called when a user's profile is looked at. all messages sent by
  // profileuser will be set to "is_read" on the server automatically,
  // but may still be in the local buffers. remove them from "unread",
  // and set them to "is_read" in "inbox". that's all.
  function setBufferIsReadForUsername( username ){
    var tmp_buffer = [];

    // set is_read in "inbox"
    for ( var i=0; i<buffers['inbox'].length; i++ )
      if ( username == buffers['inbox'][i]['other_user']['username'] )
        buffers['inbox'][i]['is_read'] = true;

    // remove from "unread"
    for ( var i=0; i<buffers['unread'].length; i++ )
      if ( username != buffers['unread'][i]['other_user']['username'] )
        tmp_buffer.push( buffers['unread'][i] );

    buffers['unread'] = tmp_buffer;
  }


  // sets a "block" flag on the user "id" from authuser on the server.
  // on success, remove all that user's messages from the inbox and
  // unread buffers.
  function blockUser( username ){
    var deferred = $q.defer();
    var url = '/api/v1/flag/block/' + username + '.json';
    var data = {};
    var bnlist = ['inbox', 'unread', 'unreplied']

    log( '--- InboxFactory.blockUser('+username+') --- seding request...' );
    $http.post( url, data ).success( function( data ){
      log( '--- InboxFactory.blockUser('+username+') --- success! all done, resolve.' );

      // remove user's messages from all boxes
      for( var j=0; j<bnlist.length; j++ ){
        var bn = bnlist[j];
        var tmp_buffer = [];

        log( '--- InboxFactory.blockUser('+username+') --- looking in buffer "'+bn+'" with "'+buffers[bn].length+'" items.' );

        for ( var i=0; i<buffers[bn].length; i++){
          log( '--- InboxFactory.blockUser('+username+') --- looking at message "'+buffers[bn][i]['id']+'"...' );

          if ( buffers[bn][i]['from_user']['username'] != username ) {
            tmp_buffer.push( buffers[bn][i] );
          }
          else {
            log( '--- InboxFactory.blockUser('+username+') --- FOUND ONE!! remove from buffer "'+bn+'" message "'+buffers[bn][i]['id']+'".' );
          }
        }

        buffers[bn] = tmp_buffer;

        log( '--- InboxFactory.blockUser('+username+') --- finished buffer "'+bn+'", now has "'+buffers[bn].length+'" items left:' );
      }

      // done, resolve promise
      deferred.resolve( null );
    })
    .error( function( err ) {
      deferred.reject( err );
    });

    return deferred.promise;
  }

  // the the message "id" as "is_read" on the server and in the inbox
  // buffer, and removes it from the unread buffer.
  function setRead( id ) {
    var deferred = $q.defer();
    var url = '/api/v1/inbox/msg/'+id+'.json';
    var data = { 'is_read': '1' };

    $http.post( url, data ).success( function( data ) {
      // clean up the buffers: remove from "unread"
      var idx = get_index( buffers['unread'], 'id', id );
      if ( idx !== null ) buffers['unread'].splice( idx, 1 );
      
      // ...and set as "is_read" in "inbox"
      var idx = get_index( buffers['inbox'], 'id', id );
      buffers['inbox'][idx]['is_read'] = true;
      
      deferred.resolve( );
    })
    .error( function( err ) {
      deferred.reject( err );
    })

    return deferred.promise;
  }

  // the the message "id" as "is_read" on the server and in the inbox
  // buffer, and removes it from the unread buffer.
  function setUnread( id ){
    var deferred = $q.defer();
    var url = '/api/v1/inbox/msg/'+id+'.json';
    var data = { 'is_read': '0' };

    $http.post( url, data ).success( function( data ){
      // clean up only the "inbox" buffer
      var idx = get_index( buffers['inbox'], 'id', id );
      buffers['inbox'][idx]['is_read'] = false;
      // and add that one msg to "unread"
      buffers['unread'] = combine_unique_by_id( [buffers['inbox'][idx]], buffers['unread'] );
      // all done
      deferred.resolve( );
    })
    .error( function( err ){
      deferred.reject( err );
    });

      return deferred.promise;
  }

  // TODO: the the message "id" as "is_replied" on the server and in 
  // the inbox and unread buffers.
  function setReplied( id ) {
    var deferred = $q.defer();
    var url = '/api/v1/inbox/msg/'+id+'.json';
    var data = { 'is_replied': '1' };

    log( '--- InboxFactory.setReplied('+id+') --- NOT IMPLEMENTED ' );

    return deferred.promise;
  }

  // Set all msgs to "is_read" on the server and in the "inbox" buffer
  // and empty the "unread" buffer.
  function setAllRead( ){
    var deferred = $q.defer();
    var url = '/api/v1/inbox/allread.json';
    var data = {};

    $http.post( url, data ).success( function( data ) {
        buffers['unread'] = [];
        for ( var i=0; i<buffers['inbox'].length; i++ ) {
          buffers['inbox'][i]['is_read'] = true;
        }
        deferred.resolve( data );
    })
    .error( function( err ){
      deferred.reject( err );
    });

    return deferred.promise;
  }

  function getCountUnread( username ) {
    // return a promise and resolve with the number of "unread" 
    // messages. on network error, reject the promise.
    var deferred = $q.defer();

    getBox( 'unread', username ).then( function( data ) {
      if( !data ){
        log( '--- InboxFactory.getCountUnread(): no data array returned from server.' );
        deferred.reject( 'no data array returned from server.' );
      } else
      if ( data.length < 1 ){
        log( '--- InboxFactory.getCountUnread(): empty data array returned from server.' );
        deferred.resolve( 0 );
      } else {
        // count "unread" flags and resolve with the number.
        // the loaded messages are all buffered 
        var count = 0; 
        for ( var i=0; i<data.length; i++ ) {
          if ( !data[i].is_read ) count++;
        }

        log( '--- InboxFactory.getCountUnread(): data array with '+count+' unread messages returned from server.' );

        deferred.resolve( count );
      }
    });

    return deferred.promise;
  }

  // Generic method to get a promise on a message box. it completes 
  // the data, buffers its content, remove duplicates, and sort it
  // newest first. then resolves the promise.
  function getBox( boxname, username, type ) { 
    // get new stuff from server and sort it into the buffer, removing dupes.
    log( '--- InboxFactory.getBox('+boxname+') --- with buffers["'+boxname+'"] length: "'+buffers[boxname].length+'" -- for suthuser username: "'+username+'".' );

    var deferred = $q.defer();
    var params = { 'params': { 'before':'', 'after':'' } };

    // get older messages or current ones?
    if( type == 'before' ) {
      // fetch old messages from before the oldest buffered msg
      var last = buffers[boxname].length - 1;
      params['params']['before'] = buffers[boxname][last]['created'];
      log( '--- InboxFactory.getBox('+boxname+') --- get BEFORE: "'+params['params']['before']+'".' );
    } else {
      // if there are msgs in the buffer already, only get newer
      // messages. if buffer is empty, get a default number of the
      // newest msgs.
      if ( buffers[boxname].length > 0 ){
        params['params']['after'] = buffers[boxname][0]['created'];
        log( '--- InboxFactory.getBox('+boxname+') --- get AFTER: "'+params['params']['after']+'".' );
      } else {
        log( '--- InboxFactory.getBox('+boxname+') --- get FRESH.' );
      }
    }

    log( '--- InboxFactory.getBox('+boxname+') --- sending request to server with params:' ); log( params );

    $http.get( urls[boxname], params ).success( function ( data ) {
      log( '--- InboxFactory.getBox('+boxname+') --- got new data from server: "'+data.length+'" items.' );

      if ( data ){
        for ( var i=0; i<data.length; i++ ){
          data[i]['created_delta'] = get_time_delta( data[i]['created'] );
          var tmp = ( username == data[i]['to_user']['username'] ) ? 'from_user' : 'to_user';
          data[i]['other_user'] = complete_user_pnasl( data[i][tmp] );
        }

        // remove dupes and sort by "created" timestamp.
        buffers[boxname] = combine_unique_by_id( data, buffers[boxname] );
        buffers[boxname].sort( sort_by_created_filter );
      }

      log( '--- InboxFactory.getBox('+boxname+') --- new buffers["'+boxname+'"] length is: '+buffers[boxname].length );
      log( buffers[boxname] );

      return deferred.resolve( buffers[boxname] );
    });

    return deferred.promise;
  }

  this.setRead = setRead;
  this.setUnread = setUnread;
  this.setAllRead = setAllRead;
  this.setReplied = setReplied;
  this.blockUser = blockUser;
  this.getCountUnread = getCountUnread;
  this.getQuickie = getQuickie;
  this.getBox = getBox;
  this.clearBox = clearBox;
  this.setBufferIsReadForUsername = setBufferIsReadForUsername;
  return this;

}]);
