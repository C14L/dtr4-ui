(function(){ 'use strict';

    // Show the user profile's messages between profileuser and authuser.

    angular.module( 'dtr4' ).controller( 'ProfileMsgsController', ProfileMsgsController );

    ProfileMsgsController.$inject = [ '$scope', '$http', '$interval', '$q', '$routeParams', 
                                      'Inbox', 'SharedFunctions' ];

    function ProfileMsgsController( $scope, $http, $interval, $q, $routeParams, 
                                    Inbox, SharedFunctions ) {

        var url = '/api/v1/msgs/' + $routeParams.username + '.json';
        var params = {};
        $scope.msgs = [];
        $scope.isSendingNewMsg = false;

        var addToMsgs = function( data ){
            // adds a list off messages to the $scope.msgs buffer, removes
            // duplicates, and sorts by "created", newest first.
            if ( !data || data.length<1 ) return;

            for( var i=0; i<data.length; i++ ){
                data[i]['created_delta'] = SharedFunctions.get_time_delta( data[i]['created'] );
                if( data[i]['from_user'] == $scope.profileuser['id'] ) 
                    data[i]['pic_url'] = $scope.profileuser['pic_url'];
                if( data[i]['from_user'] == $scope.authuser['id'] ) 
                    data[i]['pic_url'] = $scope.authuser['pic_url'];
            }

            $scope.msgs = combine_unique_by_id( data, $scope.msgs );

            $scope.msgs.sort( function( a, b ){
                if( a['created'] > b['created'] ) return -1;
                if( a['created'] < b['created'] ) return 1;
                return 0;
            } );
        }

        $scope.getMsgs = function(){
            log( '$scope.getMsgs(): checking for new messages...' );
            params['after'] = get_latest_created( $scope.msgs );
            log( '$scope.getMsgs(): params[after] == '+params['after'] );

            $scope.statusMsg = '';
            $http.get( url, { 'params': params } ).success( function ( data ){

                if( data.length > 0 ){ 
                    // wait for both user's data promises to resolve
                    $q.all( [$scope.profileuserPromise, $scope.authuserPromise] ).then(
                        function( ){ addToMsgs( data ) });
                }

            }).error( function( err ){
                // on error, stop checking for msgs and require the user to
                // click a button to start msg checking again.
                $interval.cancel( $scope.checkMsgIntervalPromise )
                $scope.statusMsg = 'offline';
            });
        };

        $scope.sendMsg = function(){
            log( 'ProfileMsgsController.sendMsg() called.' );

            // stop checking for new messages, we will get them back with the POST anyway.
            $interval.cancel( $scope.checkMsgIntervalPromise )

            var latest = get_latest_created( $scope.msgs );
            var data = { 'text': $scope.msgtext, 'after': latest };

            $scope.isSendingNewMsg = true;
            $scope.statusMsg = '';
            $scope.msgtext = '';
            
            $http.post( url, data ).success( function ( data ){
                $scope.isSendingNewMsg = false;
                addToMsgs( data );
                document.querySelector('.profile.messages textarea').focus();
                // startup message checking again.
                $scope.checkMsgIntervalPromise = $interval( $scope.getMsgs, window.CHECK_NEW_MSGS_INTERVAL );
            }).error( function( err ){
                $scope.isSendingNewMsg = false;
                $scope.statusMsg = 'send-error';
            });
        };

        $scope.checkMsgRegularly = function( ){
            $scope.getMsgs(); // initial call, and then every x seconds:
            $scope.checkMsgIntervalPromise = $interval( $scope.getMsgs, window.CHECK_NEW_MSGS_INTERVAL );
        }

        $scope.checkMsgRegularly();
        $scope.$on( '$destroy', function( ){ // Remove the "check message" interval.
            if( $scope.checkMsgIntervalPromise ){
                $interval.cancel( $scope.checkMsgIntervalPromise );
            }
        });

        // fix the Inbox buffers. set any messages received from this user
        // to is_read in "inbox" and remove them from "unread", because we
        // are looking at them right now
        Inbox.setBufferIsReadForUsername( $routeParams.username );
    }
})();
