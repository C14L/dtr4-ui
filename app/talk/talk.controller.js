
angular.module( 'talkController', [ 'ngSanitize' ] ).controller(

  'TalkController', 
  
         [ '$scope', '$http', '$interval', '$sce', '$sanitize', '$routeParams', 'Talk', 'appBarTitle',
  function( $scope,   $http,   $interval,   $sce,   $sanitize,   $routeParams,   Talk,   appBarTitle

) {

  appBarTitle.primary = $scope.tr( 'talk' );
  appBarTitle.secondary = '';

  $scope.isLoadingMore = true;
  $scope.statusMsg = '';
  $scope.posttext = '';
  $scope.init_posttext = '';
  $scope.posts = []; // posts to display

  // user may be looking at a @username or #hashtag stream. or not.
  $scope.hashtag = $routeParams.hashtag ? $routeParams.hashtag : '';
  $scope.username = $routeParams.username ? $routeParams.username : '';
  $scope.group = $routeParams.group ? $routeParams.group : 'all'; // one of 'all', 'matches', 'friends', 'own'
  $scope.groupNames = {
    'all': $scope.tr('by all'), 
    'matches': $scope.tr('by matches'),
    'friends': $scope.tr('by friends'), 
    'own': $scope.tr('about me'),
  };

  // -----------------------------------------------------------------

  // delete a post the authuser owns
  $scope.delPost = function( post_id ){
    var url = '/api/v1/talk/post/' + post_id + '.json';
    var idx = get_index( $scope.posts, 'id', post_id );

    $scope.posts[idx]['hidden'] = true;

    Talk.delPost( post_id ).then(
      function( data ) { 
        //pass
      },
      function( err ) {
        $scope.posts[idx]['hidden'] = false;
      }
    );
  }

  // add a new post
  $scope.addPost = function(){ 
    // add a post and update the posts list, including the new post.
    $scope.statusMsg = 'submitting';

    Talk.addPost( $scope.posttext, $scope.group ).then(
      function( post ) {
        $scope.posts.unshift( post ); // the new post, all and with ID.
        $scope.posttext = $scope.init_posttext; // maybe add a defaut hashtag or username
        $scope.posterror = ''; // remove any errors
        $scope.statusMsg = ''; // of loading messages
        document.querySelector('form.addpost textarea').focus();
      }, 
      function( err ) {
        $scope.statusMsg = '';
        $scope.posterror = 'error :(';
        log( 'ERROR --> TalkController.$scope.addPost(): ' + err );
      }
    );
  }

  // use all currently set filters (group, hashtag, username) and get
  // posts older (before) than the ones currently shown / buffered for
  // the actuve group filter.
  $scope.getOlderPosts = function( ) {
    $scope.isLoadingMore = true;

    if( $scope.username ) {
      $scope.getPostsByUsername( 'before' );
      return;
    }
    if( $scope.hashtag ) {
      $scope.getPostsByHashtag( 'before' );
      return;
    }

    Talk.getOlderPosts( $scope.group ).then( 
      function( data ) {
        $scope.posts = data;
        $scope.isLoadingMore = false;
      },
      function( err ) {
        $scope.statusMsg = 'loading-error';
        $scope.isLoadingMore = false;
      }
    );
  }

  // look for more posts and load them into the ui
  $scope.getPosts = function( ){
    $scope.isLoadingMore = true;

    if( $scope.username ){
      $scope.getPostsByUsername( );
      return;
    }
    if( $scope.hashtag ){
      $scope.getPostsByHashtag( );
      return;
    }

    $scope.posts = Talk.getQuickie( $scope.group );
    Talk.resetNewPostsTimestamp( ); // reset new post timestamp
    Talk.getPosts( $scope.group ).then(
      function( data ){
        $scope.posts = data;
        $scope.isLoadingMore = false;
      },
      function( err ){
        $scope.statusMsg = 'loading-error';
        $scope.isLoadingMore = false;
      }
    );
  }

  // load posts for the hashtag in "$scope.hashtag". 
  // no buffering. no group'ing. no nothing.
  $scope.getPostsByHashtag = function( before ){
    log( '--- TalkController.$scope.getPostsByHashtag(): called with before=="'+!!before+'".');
    if( !$scope.hashtag ) return; // ignore if no hashtag set

    $scope.isLoadingMore = true;
    $scope.group = '';
    log( '--- TalkController.$scope.getPostsByHashtag(): loading...');

    Talk.getPostsByHashtag( $scope.hashtag, !!before ).then(
      function( data ){
        log( '--- TalkController.$scope.getPostsByHashtag(): resolved...');
        $scope.posts = data;
        $scope.isLoadingMore = false;
      },
      function( err ){
        log( '--- TalkController.$scope.getPostsByHashtag(): error...');
        $scope.statusMsg = 'loading-error';
        $scope.isLoadingMore = false;
      }
    );
  }

  // load posts for the hashtag in "$scope.hashtag". 
  // no buffering. no group'ing. no nothing.
  $scope.getPostsByUsername = function( before ){
    log( '--- TalkController.$scope.getPostsByUsername(): called...');
    if( !$scope.username ) return; // ignore if no hashtag set

    $scope.isLoadingMore = true;
    $scope.group = '';
    log( '--- TalkController.$scope.getPostsByUsername(): loading...');

    Talk.getPostsByUsername( $scope.username, !!before ).then(
      function( data ){
        log( '--- TalkController.$scope.getPostsByUsername(): resolved...');
        $scope.posts = data;
        $scope.isLoadingMore = false;
      },
      function( err ){
        log( '--- TalkController.$scope.getPostsByUsername(): error...');
        $scope.statusMsg = 'loading-error';
        $scope.isLoadingMore = false;
      }
    );
  }

  // set some initial stuff on view load
  $scope.getGroup = function( ){
    $scope.posts = [];
    $scope.getPosts( );
    appBarTitle.secondary = $scope.groupNames[$scope.group];
  }

  // set some initial values, depending what we are looking at
  if( $scope.username ){
    appBarTitle.secondary = '@' + $scope.username;
    $scope.init_posttext = ' @' + $scope.username + ' ';
    $scope.posts = [];
    //...
  } else

  if( $scope.hashtag ){
    appBarTitle.secondary = '#' + $scope.hashtag;
    $scope.init_posttext = ' #' + $scope.hashtag + ' ';
    $scope.posts = [];
    //...
  } else {
    Talk.resetNewPostsTimestamp( );
    $scope.getGroup( 'all' );
    $scope.init_posttext = '';
  }

  $scope.posttext = $scope.init_posttext;
  $scope.getPosts( );
  $scope.checkTalkIntervalPromise = $interval( $scope.getPosts, 10000 ); // 10s

  $scope.$on( '$destroy', function( ){
      if( $scope.checkTalkIntervalPromise ) $interval.cancel( $scope.checkTalkIntervalPromise );
  });

  // --- sidebar -----------------------------------------------------

  // get the most popular usernames and hashtags for the sidebar
  $scope.popularUsernames = ['...','...','...','...','...'];
  $scope.popularHashtags = ['...','...','...','...','...'];
  Talk.getUsernamesList().then( function( data ){ $scope.popularUsernames = data });
  Talk.getHashtagsList().then( function( data ){ $scope.popularHashtags = data });

}]);
