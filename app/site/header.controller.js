(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'HeaderController', HeaderController );

    HeaderController.$inject = [ '$scope', '$location', 'Inbox', 'Lists', 'Talk', '$interval', 'appBarTitle' ];

    function HeaderController( $scope, $location, Inbox, Lists, Talk, $interval, appBarTitle ){

        $scope.inboxUnreadCounter = 0;
        $scope.talkItemCounter = 0;
        $scope.matchItemCounter = 0;
        $scope.likeMeItemCounter = 0;
        $scope.viewedMeItemCounter = 0;

        $scope.inboxCheckUnread = inboxCheckUnread;
        $scope.talkCheckNew = talkCheckNew;
        $scope.talkResetItemCounter = talkResetItemCounter;
        $scope.listsGetViewedMe = listsGetViewedMe;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            $scope.appBarTitle = appBarTitle;
            listsGetViewedMe();

            // once authuser is available, check "unread" inbox msgs regularly.
            $scope.authuserPromise.then( function(){
                $scope.inboxCheckUnreadIntervalPromise = $interval( 
                    $scope.inboxCheckUnread, window.CHECK_NEW_INBOX_INTERVAL );
                $scope.inboxCheckUnread();
            });

            // once authuser is available, check for unread inbox messages regularly.
            //Talk.resetNewPostsTimestamp( );
            $scope.authuserPromise.then( function(){
                $scope.talkCheckNewIntervalPromise = $interval( $scope.talkCheckNew, window.CHECK_NEW_TALK_INTERVAL );
                $scope.talkCheckNew();
            });

            $scope.listsCheckViewedMeIntervalPromise = $interval( 
                $scope.listsGetViewedMe, window.CHECK_NEW_LISTS_INTERVAL );
        }

        // Inbox
        function inboxCheckUnread(){
            Inbox.getCountUnread( $scope.authuser.username ).then( function( data ){ 
                $scope.inboxUnreadCounter = data;
            }, function( err ){
                // on error, stop checking for messages; cancel old interval.
                $interval.cancel( $scope.inboxCheckUnreadIntervalPromise ); 
            } );
        }

        // Talk
        function talkCheckNew(){
            Talk.getPosts( 'all' ).then( function( data ){
                $scope.talkItemCounter = Talk.countNewPosts( );
            }, function( err ){
                $interval.cancel( $scope.talkCheckNewIntervalPromise ); // on error, stop checking
            } );
        }

        function talkResetItemCounter(){
            // if the user clicks the "talk" icon, reset the talkItemCounter,
            // because we are displaying all new posts.
            Talk.resetNewPostsTimestamp( );
            $scope.talkItemCounter = 0;
        }

        // Lists
        function listsGetViewedMe(){
            var listname = 'viewed_me';
            Lists.getList( listname ).then( function( data ){
                $scope.viewedMeItemCounter = Lists.countNew( listname );
            } );
        }
    }
})();
