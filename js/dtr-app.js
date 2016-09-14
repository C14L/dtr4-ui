//
// 
//

window.LOG = true;
window.BASE_URL = '/app/';
window.MEDIA_URL = '/pics/';
window.STATIC_URL = '/static/';
window.CSRF_COOKIE_NAME = 'csrftoken';

// --increased vals 20160707
window.CHECK_NEW_MSGS_INTERVAL  =  20 * 1000; // msgs on a user profile
window.CHECK_NEW_LISTS_INTERVAL = 600 * 1000; // changes to "matches" list
window.CHECK_NEW_INBOX_INTERVAL = 120 * 1000; // background new inbox msgs:
window.CHECK_NEW_TALK_INTERVAL  = 300 * 1000; // background newtalk posts:

window.CHECK_NEW_INBOX_LIMIT = 5000; // minimum msecs to pass before re-checking inbox. ???Used???

window.TALK_POST_MAX_LENGTH = 500;
window.TALK_RE_HASHTAG = /(\s|^)\#(\w{2,50})(?=\W|$)/gi;
window.TALK_RE_USERNAME = /(\s|^)\@(\w{2,30})(?=\W|$)/gi;

window.PROFILE_MAX_PICS = 100; // max 100 pics per profile

window.ONLINE_SECONDS_SINCE_LAST_ACTIVE = 60 * 3 // Show user as "online" if they were active within this time
window.IDLE_SECONDS_SINCE_LAST_ACTIVE = 60 * 10 // Show user as "idle" if they were active within this time

// --- create app --------------------------------------------------------------
//
// lr.upload -- https://github.com/leon/angular-upload
// pasvaz.bindonce -- https://github.com/Pasvaz/bindonce
//
var app = angular.module('dtr4', [
    'ngRoute', 'dtrControllers', 'dtrDirectives', 
    'dtrServices', 'dtrFilters', 'lr.upload', 
    'pasvaz.bindonce', 

    'searchController', 'searchService',
    'talkController', 'talkService',
]);

// --- global ng contants ------------------------------------------------------

app.constant( 'talk_post_max_length', 500 ); //var MAX_POST_LENGTH = 500;
app.constant( 'talk_hashtag_re', new RegExp( /([\s^])\#(\w{2,50})(?=[\W$])/gi ) );
app.constant( 'talk_username_re', new RegExp( /([\s^])\@(\w{2,30})(?=[\W$])/gi ) );

app.constant( 'search_defaults', {
        'minage': 18, 'maxage': 99, 'count': 50, 'gender': 4, 
        'country': 3996063, 'city': 3521081, 'dist': 100, 
        'page': 1, 'page_size': 20, } );

app.constant( 'search_options', {
        'dist': [ [5, '5 km'], [20, '20 km'], [50, '50 km'], [100, '100 km'], [200, '200 km'], [500, '500 km'], ],
        'gender': window.TR_CHOICES['GENDER_PLURAL_CHOICE'], // import in index.html
    } );

// --- run ---------------------------------------------------------------------

app.run(
    [ '$rootScope', '$window', '$location', '$http', 'Authuser', 'Countries', 'Talk',
        function( $rootScope, $window, $location, $http, Authuser, Countries, Talk ){
            $http.defaults.headers.post['X-CSRFToken'] = get_cookie('csrftoken');
            $http.defaults.headers.put['X-CSRFToken'] = get_cookie('csrftoken');
            $http.defaults.headers.delete = { 'X-CSRFToken': get_cookie('csrftoken') };

            $rootScope.URLS = {
                'BASE': window.BASE_URL,
                'MEDIA': window.MEDIA_URL,
                'STATIC': window.STATIC_URL,
            };

            // Set Authuser data on $rootScope
            $rootScope.authuserPromise = Authuser.then(
                function( data ){ $rootScope.authuser = data; },
                function( err ){ window.location = '/accounts/logout/'; }
            );

            // Set Countries data on $rootScope
            $rootScope.countriesPromise = Countries.then(
                function( data ){ $rootScope.countries = data }
            );

            // Get translations data into ng $rootScope, used for example in
            // settings-proile.html template.
            $rootScope.translations = window.TR_CHOICES;

            $rootScope.tr = function( str, arr ){
                // return a translation string from TR_LANGUAGE. If str is not found in 
                // TR_LANGUAGE, then return str with {n} values replaced accordingly.
                // 
                // str: String to be translated. can include {0}, {1}, ... {n} placeholders
                //      to be substituted by the relative value in the arr Array.
                // arr: optional Array with values that are inserted into the str String at
                //      the position of {n} = arr[n]. If {n} is not found, ignore arr[n], 
                //      and if arr[n] is not found in str, then ignore it, too.
                var msgstr = str; // default to original str.

                // find translation
                if( typeof(TR_LANGUAGE) == 'object' ){
                    for( var i=0; i<TR_LANGUAGE.length; i++ ){
                        // found translation!
                        if( TR_LANGUAGE[i] && TR_LANGUAGE[i]['msgid'] == str ){
                            msgstr = TR_LANGUAGE[i]['msgstr'];
                            break;
                } } }

                // replace untranslatable values
                if( arr && arr[0] ){
                    for( var i=0; i<arr.length; i++ ){
                        // since javascript doesn't have global replace for String, do split and join
                        if( typeof(arr[i]) == 'string' || typeof(arr[i]) == 'number' ){
                            msgstr = msgstr.split( '{'+i+'}' ).join( arr[i] );
                } } }

                return msgstr;
            };

            // Push URL changes to Google Analytics
            $rootScope.$on('$routeChangeSuccess', function(event) {
                $window.ga('send', 'pageview', { page: $location.path() });
            });
        }
    ]
);

// --- global values -----------------------------------------------------------

app.value( 'appBarTitle', { 'primary': 'El Ligue', 'secondary': '', 'href': '/' } );

// --- app and routes configuration --------------------------------------------

app.config(function($routeProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    $routeProvider
    .when( '/search', {
        controller: 'SearchController', // search form and results list.
        templateUrl: '/static/tpl/search.html'
    })

    .when( '/people/:username', { // profile of user usernamne, editable it authuser's own profile.
        controller: 'ProfileController', // includes a list of search matching users at the top.
        templateUrl: '/static/tpl/profile.html'
    })
    .when( '/profile/:username', { // profile of user usernamne, editable it authuser's own profile.
        controller: 'ProfileController', // includes a list of search matching users at the top.
        templateUrl: '/static/tpl/profile.html'
    })

    .when( '/settings/profile', { // form to update pnasl data (Pic Name Age Sex Location)
        controller: 'SettingsProfileController',
        templateUrl: '/static/tpl/settings-profile.html'
    })
    .when( '/settings/details', { // form to update further profile details.
        controller: 'SettingsDetailsController',
        templateUrl: '/static/tpl/settings-details.html'
    })
    .when( '/settings/photos', { // form to upload, delete, and set main pics.
        controller: 'SettingsPhotosController',
        templateUrl: '/static/tpl/settings-photos.html'
    })
    .when( '/settings/design', { // edit CSS style for profile page
        controller: 'SettingsDesignController',
        templateUrl: '/static/tpl/settings-design.html'
    })
    .when( '/settings/account', { // form with account settings (receive emails, hide account, etc.)
        controller: 'SettingsAccountController',
        templateUrl: '/static/tpl/settings-account.html'
    })
    .when( '/settings/password', { // only links to server-rendered pages to update password and emails.
        controller: 'SettingsPasswordController',
        templateUrl: '/static/tpl/settings-password.html'
    })
    
    .when( '/talk/topic/:hashtag', { // all talk messages that mention the #hashtag.
        controller: 'TalkController',
        templateUrl: '/static/tpl/talk.html'
    })
    .when( '/talk/people/:username', { // all talk messages than mention a user or are sent by the user.
        controller: 'TalkController',
        templateUrl: '/static/tpl/talk.html'
    })
    .when( '/talk/:group', { // all talk messages, newest first.
        controller: 'TalkController',
        templateUrl: '/static/tpl/talk.html'
    })
    .when( '/talk', {
        redirectTo: '/talk/all'
    })

    .when( '/inbox', {       // all received messages, newest first. 
        controller: 'InboxController', // mark messages that are 'unread' and 'replied'.
        templateUrl: '/static/tpl/inbox.html'
    })
    .when( '/inbox/unread', { // only unread messages.
        controller: 'InboxController',
        templateUrl: '/static/tpl/inbox.html'
    })
    .when( '/inbox/unreplied', { // only messages the authuser has not yet repied to.
        controller: 'InboxController',
        templateUrl: '/static/tpl/inbox.html'
    })
    .when( '/inbox/sent', { // all messages sent by authuser, newest first.
        controller: 'InboxController',
        templateUrl: '/static/tpl/inbox.html'
    })

    .when( '/lists/:listname', { // list of users who visited authuser's profile page.
        controller: 'ListsController',
        templateUrl: '/static/tpl/lists.html',
    })

    .when( '/pics', { // list of all recent user uploaded pics for mods to check.
        controller: 'PicturesController',
        templateUrl: '/static/tpl/pictures.html',
    })

    .otherwise({
        redirectTo: '/search',
    });
});
