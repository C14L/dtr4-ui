
angular.module( 'talkService', [ ] ).factory( 
  
  'Talk',

         [ '$q', '$http', '$sce', '$sanitize',
  function( $q,   $http,   $sce,   $sanitize
  
) {

  // buffer streams "all" (all posts), "matches" (posts only from
  // authuser's matches), "friends" (posts by authuser's friends),
  // and "own" (only posts written by or mentioning authuser).
  var buffers = { 'all':[], 'matches':[], 'friends':[], 'own':[] };
  var hashtag_buffer = []; // only buffer one
  var hashtag_curr = ''; // hashtag currently in buffer
  var hashtag_is_loading = false;
  var username_buffer = []; // only buffer one
  var username_curr = ''; // username currently in buffer
  var username_is_loading = false;

  // buffer here a list of recently used hashtags. TODO: use it for 
  // autocomplete when the user writes a hashtag in a message, to 
  // reduce typos.
  var hashtags = [];
  var hashtags_timestamp = 0;

  // buffer here a list of recently used usernames. TODO: use it for 
  // autocomplete when the user writes a username in a message, to 
  // reduce typos.
  var usernames = [];
  var usernames_timestamp = 0;

  // this holds the timestamp to count "new" posts. any post loaded
  // after this counts as a "new" post for countNewPosts(). use the
  // resetNewPostsTimestamp() method to set it to "now".
  var count_posts_timestamp = getLocalStorageObject('count_posts_timestamp') || '';

  // this is true while the Factory is busy loading data from the 
  // server. use this to avoid making several requests 
  // simoultaneously.
  var is_loading = false;

  // -----------------------------------------------------------------

  // sets the new posts timestamp to "now", so only posts fetched 
  // after now will count as "new".
  function resetNewPostsTimestamp( ){
    count_posts_timestamp = new Date( ).toISOString( );
    setLocalStorageObject('count_posts_timestamp', count_posts_timestamp);
  }

  // counts the number of posts in buffers['all'] that were "created"
  // after "count_posts_timestamp".
  function countNewPosts( ){
    log( '--- TalkFactory.countNewPosts() called, count for the past "'+get_time_delta_seconds(count_posts_timestamp)+'" seconds ('+count_posts_timestamp+').');
    log( buffers['all'] );

    // find all newer posts and count them
    var counter = 0;

    for ( var i=0; i<buffers['all'].length; i++ ){
      if ( buffers['all'][i]['created'] > count_posts_timestamp ) counter++;
    }

    log( '--- TalkFactory.countNewPosts() counted "'+counter+'" new items in the past "'+get_time_delta_seconds(count_posts_timestamp)+'" seconds .');

    return counter;
  }

  // returns all posts in the buffer. this is usually enough for "all"
  // group, because its loaded continuously from the appbar Indicator.
  // calling it for any other "group", it should be followed by a call 
  // to getPosts(), to load from server newer posts not yet in buffer.
  function getQuickie( group ){
    log( '--- TalkFactory.getQuickie() for group "'+group+'".');
    if ( !group ) group = 'all';
    return buffers[group];
  }

  // returns a promise to deliver *new* posts for that group.
  function getPosts( group ){
    log( '--- TalkFactory.getPosts() for group "'+group+'".');
    var after = ( buffers[group].length > 0 ) ? buffers[group][0]['created'] : '';
    return fetchPosts( { 'after': after, 'group': group } );
  }

  // returns a promise to deliver *older* posts for that group.
  function getOlderPosts( group ){
    log( '--- TalkFactory.getOlderPosts() for group "'+group+'".');
    var before = ( buffers[group].length > 0 ) ? buffers[group][( buffers[group].length - 1 )]['created'] : '';
    return fetchPosts( { 'before': before, 'group': group } );
  }

  function getPostsByHashtag( hashtag, before ){
    log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") starting...');

    // load current, after, or before
    if ( hashtag_is_loading ) return;
    hashtag_is_loading = true;

    var deferred = $q.defer();
    var url = '/api/v1/talk/topic/'+hashtag+'.json';
    var opts = {  }

    // delete buffer for different hashtag
    if ( hashtag_curr != hashtag ) {
        hashtag_buffer = [];
        hashtag_curr = hashtag;
    }

    // if no buffer allways load recent
    if ( hashtag_buffer.length > 0 ) {
      // check for request to load older posts
      if( before ) opts['before'] = hashtag_buffer[hashtag_buffer.length-1]['created'];
      // check for filled buffer, then fetch only younger (after) posts
      else opts['after'] = hashtag_buffer[0]['created'];
    }

    log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") load from "'+url+'" with params: '); log(opts);

    $http.get( url, { 'params': opts } )
    .success( function( data ) {
        // complete post data
        for ( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );
        // add to buffer
        hashtag_buffer = combine_unique_by_id( data, hashtag_buffer );
        // sort buffer by created time
        hashtag_buffer.sort( sort_by_created_filter );
        // resolve promise
        deferred.resolve( hashtag_buffer );
    })
    .error( function( err ) {
      deferred.reject( err );
    })
    .finally( function( data ) {
      hashtag_is_loading = false;
    });

    log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") ...done!');

    return deferred.promise;
  }

  function getPostsByUsername( username ){
      log( '--- TalkFactory.getPostsByUsername("'+username+'") starting...');

      var deferred = $q.defer();
      var url = '/api/v1/talk/people/'+username+'.json';
      var opts = {  }

      if ( username_curr != username ) username_buffer = [];

      if ( username_buffer.length > 0 ){
          if ( before ) opts['before'] = username_buffer[username_buffer.length-1]['created'];
          else opts['after'] = username_buffer[0]['created'];
      }

      $http.get( url, { 'params': opts } )
      .success( function( data ) {
        for( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );

        username_buffer = combine_unique_by_id( data, username_buffer );
        username_buffer.sort( sort_by_created_filter );
        deferred.resolve( username_buffer );
      })
      .error( function( err ) {
        deferred.reject( err );
      });

      log( '--- TalkFactory.getPostsByUsername("'+username+'") ...done!');

      return deferred.promise;
  }

  // this fetches new posts from the server, if any, and stores them
  // in the appropriate posts buffer array. returns nothing. this 
  // should be called before using the getPosts() method for all 
  // groups except "all", because "all" is called regularly as an 
  // "$interval" by the TalkCountNewController() controller.
  function fetchPosts( opts ){
      log('--- TalkFactory.fetchPosts() called.');
      var deferred = $q.defer();

      // interface: { before, after, timestamp, topic, username, group }
      //
      // ALWAYS:
      // - before: if true, load only older posts.
      // - after: if true, load only younger posts.
      //
      // EITHER OF THESE:
      // - group: "all", "matches", "friends", "own" (default: all)
      // - hashtag: if present, load only posts containing hashtag.
      // - username: if present, load only posts containing username.

      var opts = opts || { 'group': 'all', 'after': '' };
      var group = (opts['group'] || 'all').toLowerCase();
      var url = '/api/v1/talk/list.json';

      is_loading = true;

      $http.get( url, { 'params': opts } )
      .success( function( data ) {
        fixAndAddToBuffer( data, group );
        deferred.resolve( buffers[group] );
      })
      .error( function( err ) { 
        deferred.reject( err );
      })
      .finally( function( data ) {
        is_loading = false;
      });

      return deferred.promise;
  }

  // add some more data to each post in data array, remove dupes, and
  // sort by "created", and then add the array to the appropriate
  // "buffers" group. return null
  function fixAndAddToBuffer( data, group ) {
    for( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );

    buffers[group] = combine_unique_by_id( data, buffers[group] );
    buffers[group].sort( sort_by_created_filter );
  }

  // add some more data to each post, derived from existing data
  function completePost( data ) {
    data['user'] = complete_user_pnasl( data['user'] );
    data['created_delta'] = get_time_delta( data['created'] );
    data['html'] = $sce.trustAsHtml( makeHtmlText( data['text'] ) );

    return data;
  }

  // add a new post. get back the newly added post, including its ID
  // so it can be added to the top of the posts list. do not add it to
  // the posts buffer here! PROBLEM: what if i am currently 
  // looking at a @username or #hashtag filtered posts list? or if
  // there are more posts to load before the currently last and this
  // post. it would mess up the "last post" timestamp if it was added
  // to the buffer. better just reload it with the next regular buffer
  // refresh and the duplicate gets automatically removed anyway.
  function addPost( text, group ){
    log('--- TalkFactory.addPost() called.');

    var deferred = $q.defer();
    var url = '/api/v1/talk/list.json';
    var data = { 'text': text };

    $http.post( url, data )
    .success( function( data ) {
      // data should be the data dict of the new post! resolve it
      // so that the controller can just add it to the top of the
      // rendered posts list.
      data = completePost( data );
      deferred.resolve( data );
    })
    .error( function( err ) {
      deferred.reject( err );
    });

    return deferred.promise;
  }

  function delPost( post_id ){
    // delete a post the authuser owns
    var deferred = $q.defer();
    var url = '/api/v1/talk/post/' + post_id + '.json';

    $http.delete( url )
    .success( function( data ) {
      // remove the post from all buffers
      angular.forEach( ['all', 'matches', 'friends', 'own'], function( group, i ) {
        var idx = get_index( buffers[group], 'id', post_id );
        if ( idx !== null ) buffers[group].splice( idx, 1 );
      });

      // do not return anything, just resolve or reject
      deferred.resolve( null );
    })
    .error( function( err ) {
      log( 'TalkFatory.delPost(): ERROR: ' + err );
      deferred.reject( );
    });

    return deferred.promise;
  }


  function makeHtmlText( text ){
    // returns the text but with hashtags and usernames linked and
    // any other html escaped
    //text = $sanitize( text );

    text = textfilter( text );

    return text; // all html escaped, except linked hashtags and usernames
  }

  // -----------------------------------------------------------------

  function getHashtagsList( ){
    // loads and buffers a list of popular or recent hashtags
    var deferred = $q.defer();

    if ( !hashtags_timestamp || get_time_delta_seconds( hashtags_timestamp ) > 60*20 ) {
      $http.get('/api/v1/talk/popular-tags.json')
      .success( function( data ) {
        hashtags_timestamp = new Date( ).toISOString( );
        hashtags = data;
        deferred.resolve( hashtags );
      });
    } else {
      deferred.resolve( hashtags );
    }

    return deferred.promise;
  }

  function getUsernamesList( ){
    // loads and buffers a list of popular or recent hashtags
    var deferred = $q.defer();

    if( !usernames_timestamp || get_time_delta_seconds( usernames_timestamp ) > 60*20 ){
      $http.get('/api/v1/talk/popular-users.json').success( function( data ){
        usernames_timestamp = new Date( ).toISOString( );
        usernames = data;
        deferred.resolve( usernames );
      });
    } else {
      deferred.resolve( usernames );
    }

    return deferred.promise;
  }

  // -----------------------------------------------------------------

  this.getQuickie = getQuickie;
  this.getPosts = getPosts;
  this.getOlderPosts = getOlderPosts;
  this.getPostsByUsername = getPostsByUsername;
  this.getPostsByHashtag = getPostsByHashtag;
  this.addPost = addPost;
  this.delPost = delPost;
  this.getHashtagsList = getHashtagsList;
  this.getUsernamesList = getUsernamesList;
  this.completePost = completePost;
  this.countNewPosts = countNewPosts;
  this.resetNewPostsTimestamp = resetNewPostsTimestamp;
  this.makeHtmlText = makeHtmlText;
  return this;

}]);
