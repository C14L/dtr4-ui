(function(){ 'use strict';

    // Show the user profile's messages between profileuser and authuser.

    angular.module( 'dtr4' ).controller( 'ProfileMsgsController', ProfileMsgsController );

    ProfileMsgsController.$inject = [ '$scope', '$interval', '$q', '$routeParams', 
                                      'ProfileMsgs', 'Inbox', 'CHECK_NEW_MSGS_INTERVAL', 'Translate' ];

    function ProfileMsgsController( $scope, $interval, $q, $routeParams, 
                                    ProfileMsgs, Inbox, CHECK_NEW_MSGS_INTERVAL, Translate ) {

        $scope.tr = Translate.tr;
        $scope.msgs = [];
        $scope.isSendingNewMsg = false;

        $scope.getMsgs = getMsgs;
        $scope.sendMsg = sendMsg;
        $scope.checkMsgRegularly = checkMsgRegularly;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            checkMsgRegularly();
            // fix the Inbox buffers. set any messages received from this user
            // to is_read in "inbox" and remove them from "unread", because we
            // are looking at them right now
            Inbox.setBufferIsReadForUsername( $routeParams.username );

            // Begin listening to the "usermsg.receive" event, if we are using Channels.
            $scope.$on('usermsg.receive', function(event, data){
                $scope.msgs = ProfileMsgs.addToMsgs( data, $scope.msgs, $scope.authuser, $scope.profileuser );
                $scope.$digest();
            });
        }

        function getMsgs(){
            var after = get_latest_created( $scope.msgs );
            $scope.statusMsg = '';

            ProfileMsgs.getMsgs( $routeParams.username, after ).then( function( data ){
                if ( data.length > 0 ){ 
                    // wait for both user's data promises to resolve
                    var promises = [$scope.profileuserPromise, $scope.authuserPromise];
                    $q.all( promises ).then( function( ){
                        $scope.msgs = ProfileMsgs.addToMsgs( data, $scope.msgs, $scope.authuser, $scope.profileuser );
                    });
                }
            })
            .catch( function( err ){
                // on error, stop checking for msgs and require the user to
                // click a button to start msg checking again.
                stopCheckMsgInterval();
                $scope.statusMsg = 'offline';
            });
        }

        function sendMsg(){
            var after = get_latest_created( $scope.msgs );
            var msgtext = $scope.msgtext;

            // stop checking for new messages, we will get them back with the POST anyway.
            $scope.isSendingNewMsg = true;
            $scope.statusMsg = '';
            $scope.msgtext = '';

            stopCheckMsgInterval();

            ProfileMsgs.sendMsg( $routeParams.username, after, msgtext ).then( function( data ){
                $scope.isSendingNewMsg = false;
                $scope.msgs = ProfileMsgs.addToMsgs( data, $scope.msgs, $scope.authuser, $scope.profileuser );                
                startCheckMsgInterval();
                document.querySelector('.profile.messages textarea').focus();
            })
            .catch( function( err ){
                $scope.isSendingNewMsg = false;
                $scope.statusMsg = 'send-error';
            });
        }

        function checkMsgRegularly(){
            $scope.getMsgs(); // initial call, and then every x seconds:
            startCheckMsgInterval();
        }

        function startCheckMsgInterval(){
            if ( ! $scope.USE_CHANNELS){ // Only if we don't' use WebSockets.
                $scope.checkMsgIntervalPromise = $interval( $scope.getMsgs, CHECK_NEW_MSGS_INTERVAL );
            }
        }

        function stopCheckMsgInterval(){
            if ( ! $scope.USE_CHANNELS){ // Only if we don't' use WebSockets.
                $interval.cancel( $scope.checkMsgIntervalPromise );
            }
        }
    }
})();
