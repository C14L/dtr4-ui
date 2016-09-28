(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'TalkController', TalkController);

    TalkController.$inject = [ '$scope', '$http', '$interval', '$sce', '$sanitize', 
                               '$routeParams', 'Talk', 'appBarTitle' ];

    function TalkController( $scope, $http, $interval, $sce, $sanitize, 
                             $routeParams, Talk, appBarTitle ) {

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

        $scope.delPost = delPost;
        $scope.addPost = addPost;
        $scope.getOlderPosts = getOlderPosts;
        $scope.getPosts = getPosts;
        $scope.getPostsByHashtag = getPostsByHashtag;
        $scope.getPostsByUsername = getPostsByUsername;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            appBarTitle.primary = $scope.tr( 'talk' );
            appBarTitle.secondary = '';

            setInitValsForActiveSection();
            $scope.posttext = $scope.init_posttext;
            getPosts();
            setGetPostInterval();

            // sidebar: get the most popular usernames and hashtags for the sidebar
            $scope.popularUsernames = ['...','...','...','...','...'];
            $scope.popularHashtags = ['...','...','...','...','...'];
            Talk.getUsernamesList().then( function( data ){ $scope.popularUsernames = data });
            Talk.getHashtagsList().then( function( data ){ $scope.popularHashtags = data });
        }

        // Initialize and cancel interval that checks for new posts regularly.
        function setGetPostInterval(){
            $scope.checkTalkIntervalPromise = $interval( $scope.getPosts, 10000 ); // 10s
            $scope.$on( '$destroy', function(){
                if ( $scope.checkTalkIntervalPromise ) $interval.cancel( $scope.checkTalkIntervalPromise );
            });
        }

        // set some initial values, depending what we are looking at
        function setInitValsForActiveSection(){
            if ( $scope.username ){
                appBarTitle.secondary = '@' + $scope.username;
                $scope.init_posttext = ' @' + $scope.username + ' ';
                $scope.posts = [];
                //...
            } else if ( $scope.hashtag ){
                appBarTitle.secondary = '#' + $scope.hashtag;
                $scope.init_posttext = ' #' + $scope.hashtag + ' ';
                $scope.posts = [];
                //...
            } else {
                Talk.resetNewPostsTimestamp( );
                getGroup( 'all' );
                $scope.init_posttext = '';
            }
        }

        // set some initial stuff on view load
        function getGroup(){
            $scope.posts = [];
            $scope.getPosts( );
            appBarTitle.secondary = $scope.groupNames[$scope.group];
        }

        // delete a post the authuser owns
        function delPost( post_id ){
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
        function addPost(){ 
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
        function getOlderPosts() {
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
        function getPosts(){
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
        function getPostsByHashtag( before ){
            if( !$scope.hashtag ) return; // ignore if no hashtag set

            $scope.isLoadingMore = true;
            $scope.group = '';

            Talk.getPostsByHashtag( $scope.hashtag, !!before ).then(
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
        function getPostsByUsername( before ){
            if( !$scope.username ) return; // ignore if no hashtag set

            $scope.isLoadingMore = true;
            $scope.group = '';

            Talk.getPostsByUsername( $scope.username, !!before ).then(
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
    }
})();
