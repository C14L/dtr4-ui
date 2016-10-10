
window.LOG = true;
window.CSRF_COOKIE_NAME = 'csrftoken';

(function(){ 'use strict';

    // --- create app --------------------------------------------------------------
    //
    // lr.upload -- https://github.com/leon/angular-upload
    // pasvaz.bindonce -- https://github.com/Pasvaz/bindonce
    //
    var app = angular.module('dtr4', [ 'ngRoute', 'ngSanitize', 'lr.upload', 'pasvaz.bindonce' ]);

    // --- global ng contants ------------------------------------------------------

    app.constant('BASE_URL', '/app/');
    app.constant('STATIC_URL', '/app/');
    app.constant('MEDIA_URL', '/pics/');

    app.constant('CHECK_NEW_MSGS_INTERVAL', 20 * 1000); // msgs on a user profile
    app.constant('CHECK_NEW_LISTS_INTERVAL', 600 * 1000); // changes to "matches" list
    app.constant('CHECK_NEW_INBOX_INTERVAL', 120 * 1000); // background new inbox msgs:
    app.constant('CHECK_NEW_TALK_INTERVAL', 300 * 1000); // background newtalk posts:

    app.constant('ONLINE_SECONDS_SINCE_LAST_ACTIVE', 60 * 3); // Show user as "online" if they were active within this time
    app.constant('IDLE_SECONDS_SINCE_LAST_ACTIVE', 60 * 10); // Show user as "idle" if they were active within this time
    app.constant('PROFILE_MAX_PICS', 100); // max 100 pics per profile

    // app.constant('TALK_POST_MAX_LENGTH', 500);
    // app.constant('TALK_RE_HASHTAG', /(\s|^)\#(\w{2,50})(?=\W|$)/gi);
    // app.constant('TALK_RE_USERNAME', /(\s|^)\@(\w{2,30})(?=\W|$)/gi);
    // app.constant('CHECK_NEW_INBOX_LIMIT', 5000); // minimum msecs to pass before re-checking inbox. ???Used???

    app.constant( 'talk_post_max_length', 500 ); //var MAX_POST_LENGTH = 500;
    app.constant( 'talk_hashtag_re', new RegExp( /([\s^])\#(\w{2,50})(?=[\W$])/gi ) );
    app.constant( 'talk_username_re', new RegExp( /([\s^])\@(\w{2,30})(?=[\W$])/gi ) );

    app.constant( 'search_defaults', {
        'minage': 18, 'maxage': 99, 'count': 50, 'gender': 4, 
        'country': 3996063, 'city': 3521081, 'dist': 100, 
        'page': 1, 'page_size': 20, } );

    app.constant( 'search_options', {
        'dist': [ [5, '5 km'], [20, '20 km'], [50, '50 km'], [100, '100 km'], [200, '200 km'], [500, '500 km'], ],
        'gender': []
    });

    // --- run ---------------------------------------------------------------------

    app.run([ 'BASE_URL', 'MEDIA_URL', 'STATIC_URL', 
              '$rootScope', '$window', '$location', '$http', 
              'Authuser', 'Countries', 'Talk', appRun ]);

    function appRun( BASE_URL, MEDIA_URL, STATIC_URL, 
                     $rootScope, $window, $location, $http, Authuser, Countries, Talk ){

        $http.defaults.headers.post['X-CSRFToken'] = get_cookie('csrftoken');
        $http.defaults.headers.put['X-CSRFToken'] = get_cookie('csrftoken');
        $http.defaults.headers.delete = { 'X-CSRFToken': get_cookie('csrftoken') };

        $rootScope.URLS = {
            'BASE': BASE_URL,
            'MEDIA':MEDIA_URL,
            'STATIC': STATIC_URL,
        };

        // Set Authuser data on $rootScope
        $rootScope.authuserPromise = Authuser.then(
            function( data ){ $rootScope.authuser = data; },
            function( err ){ window.location = '/accounts/logout/'; }
        );

        // Set Countries data on $rootScope
        $rootScope.countriesPromise = Countries.then( function( data ){ $rootScope.countries = data });

        // Push URL changes to Google Analytics
        $rootScope.$on('$routeChangeSuccess', function(event) {
            $window.ga('send', 'pageview', { page: $location.path() });
        });
    }

    // --- run ---------------------------------------------------------------------

    app.run([ '$rootScope', '$window', connectWebSocketEvents ]);

    function connectWebSocketEvents($rootScope, $window){
        var ws_prot = 'ws' + ($window.location.protocol === 'https:' ? 's' : '') + '://';
        var ws_url = ws_prot + $window.location.host + '/api/v1/ws';
        var socket = new WebSocket( ws_url );
        socket.onopen = _onOpen;
        socket.onmessage = _onMessage;

        function _onOpen(event){
            $rootScope.USE_CHANNELS = true;
        }

        function _onMessage(event){
            // Unpack the message and emit the appropriate event on rootScope.
            var data = JSON.parse(event.data);
            if (data['action'] == 'usermsg.receive'){
                $rootScope.$broadcast(data['action'], data['msg_list']);
            }
        }

    }

    // --- global values -----------------------------------------------------------

    app.value( 'appBarTitle', { 'primary': 'El Ligue', 'secondary': '', 'href': '/' } );

    // --- app and routes configuration --------------------------------------------

    app.config(['$locationProvider', function($locationProvider) {
        $locationProvider.html5Mode(true);
    }]);

    app.config(['$routeProvider', function($routeProvider) {
        $routeProvider

        .when( '/search', {
            controller: 'SearchController', // search form and results list.
            templateUrl: 'search/search.html'
        })
        .when( '/pics', { // list of all recent user uploaded pics for mods to check.
            controller: 'PicturesController',
            templateUrl: 'search/pictures.html',
        })

        .when( '/people/:username', { // profile of user usernamne, editable it authuser's own profile.
            controller: 'ProfileController', // includes a list of search matching users at the top.
            templateUrl: 'profile/profile.html'
        })
        .when( '/profile/:username', { // profile of user usernamne, editable it authuser's own profile.
            controller: 'ProfileController', // includes a list of search matching users at the top.
            templateUrl: 'profile/profile.html'
        })

        .when( '/settings/profile', { // form to update pnasl data (Pic Name Age Sex Location)
            controller: 'SettingsProfileController',
            templateUrl: 'settings/settings-profile.html'
        })
        .when( '/settings/details', { // form to update further profile details.
            controller: 'SettingsDetailsController',
            templateUrl: 'settings/settings-details.html'
        })
        .when( '/settings/design', { // edit CSS style for profile page
            controller: 'SettingsDesignController',
            templateUrl: 'settings/settings-design.html'
        })
        .when( '/settings/password', { // only links to server-rendered pages to update password and emails.
            controller: 'SettingsPasswordController',
            templateUrl: 'settings/settings-password.html'
        })
        
        .when( '/talk/topic/:hashtag', { // all talk messages that mention the #hashtag.
            controller: 'TalkController',
            templateUrl: 'talk/talk.html'
        })
        .when( '/talk/people/:username', { // all talk messages than mention a user or are sent by the user.
            controller: 'TalkController',
            templateUrl: 'talk/talk.html'
        })
        .when( '/talk/:group', { // all talk messages, newest first.
            controller: 'TalkController',
            templateUrl: 'talk/talk.html'
        })
        .when( '/talk', {
            redirectTo: '/talk/all'
        })

        .when( '/inbox', {       // all received messages, newest first. 
            controller: 'InboxController', // mark messages that are 'unread' and 'replied'.
            templateUrl: 'inbox/inbox.html'
        })
        .when( '/inbox/unread', { // only unread messages.
            controller: 'InboxController',
            templateUrl: 'inbox/inbox.html'
        })
        .when( '/inbox/unreplied', { // only messages the authuser has not yet repied to.
            controller: 'InboxController',
            templateUrl: 'inbox/inbox.html'
        })
        .when( '/inbox/sent', { // all messages sent by authuser, newest first.
            controller: 'InboxController',
            templateUrl: 'inbox/inbox.html'
        })

        .when( '/lists/:listname', { // list of users who visited authuser's profile page.
            controller: 'ListsController',
            templateUrl: 'lists/lists.html',
        })

        .otherwise({
            redirectTo: '/search',
        });
    }]);
})();
