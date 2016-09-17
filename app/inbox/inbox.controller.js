(function(){ 'use strict';

    // inbox messages

    angular.module( 'dtr4' ).controller( 'InboxController', InboxController );

    InboxController.$inject = [ '$scope', '$location', 'Inbox', 'appBarTitle', 'Lists' ];

    function InboxController( $scope, $location, Inbox, appBarTitle, Lists ) {
  
        appBarTitle.primary = 'inbox';
        appBarTitle.secondary = '';

        // This will depend on whether we look at "inbox", "unread", "sent"
        // messages. 
        var inboxname = {
            "unread": $scope.tr('unread'), 
            "inbox": $scope.tr('inbox'), 
            "sent": $scope.tr('sent'),
        };

        $scope.currBox = $location.path().split('/').reverse()[0].toLowerCase();
        $scope.msgs = Inbox.getQuickie( $scope.currBox );
        $scope.isLoading = true;
        $scope.isLoadingMore = false;
        $scope.authuserPromise.then( function(){ $scope.loadBox( ); } );

        // load the current box set in $scope.currBox
        $scope.loadBox = function( ) {
            appBarTitle.secondary = inboxname[$scope.currBox];

            Inbox.getBox( $scope.currBox, $scope.authuser.username ).then( function( data ) {
            $scope.msgs = data;
            $scope.isLoading = false;
            });
        }

        // loads older messages for the currBox.
        $scope.loadBefore = function( ) {
            $scope.isLoadingMore = true;
            Inbox.getBox( $scope.currBox, $scope.authuser.username, 'before' ).then( function( data ) {
            $scope.msgs = data;
            $scope.isLoadingMore = false;
            });
        }

        // POST request to server to mark all messages authuser has
        // received as "is_read=True".
        $scope.setAllRead = function( ) {
            Inbox.setAllRead( ).then( function( ) {
            $scope.msgs = Inbox.getQuickie( $scope.currBox );
            });
        }

        $scope.setReplied = function( id ){
            Inbox.setReplied( id ).then( function( ) {
            // TODO: later
            });
        }

        // don't re-render all, to avoid flickering. just find the
        // message in the view buffers and change the is_read flag.
        $scope.setRead = function( id ){
            var idx = get_index( $scope.msgs, 'id', id );
            var bak = $scope.msgs[idx]['is_read'];

            $scope.msgs[idx]['is_read'] = true;

            Inbox.setRead( id ).then(
            function( data ){
                // if the current view is "unread" then remove it too.
                if ( $scope.currBox == 'unread' ) $scope.msgs.splice( idx, 1 );
            },
            function( err ){
                $scope.msgs[idx]['is_read'] = bak; // revert on error
            }
            );
        }

        $scope.setUnread = function( id ) {
            // the current view must be "inbox" bcause the msg would not 
            // be on "unread" yet.
            // don't re-render inbox, to avoid flickering. just find the
            // message in the view buffer and change the is_read flag.
            var idx = get_index( $scope.msgs, 'id', id );
            var bak = $scope.msgs[idx]['is_read'];

            $scope.msgs[idx]['is_read'] = false;

            Inbox.setUnread( id ).then( function( data ){
            // do not reload "unread" yet, in case the user sets some
            // more messages to "unread" quickly. don't reload every 
            // time. the indicator in the appbar will reload "unread"
            // soon anyway, that should suffice.
            });
        }

        $scope.blockUser = function( username ) {
            if ( confirm( $scope.tr("Block this user from contacting you?") ) == true ) {
            Inbox.blockUser( username ).then( function( ) {
                // this will remove all msgs revceived from user. that is 
                // done in the Factory on the buffer. so we should refresh 
                // the view with a current copy of the buffer.
                $scope.msgs = Inbox.getQuickie( $scope.currBox );
                Inbox.clearBox( $scope.currBox );
                Lists.clearBuffer();
                $scope.loadBox( );
            });
            }
        }
    }
})();
