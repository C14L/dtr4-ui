//
// Controller methods for "dtr4" app.
//

var app = angular.module( 'dtrControllers', [ 'ngSanitize' ] );

// -----------------------------------------------------------------------------

// Show the searchbar form and search results matching the form values.
app.controller( 'AuthuserInfoController', 
    [ '$scope', 
        function( $scope ){
            log('-- AuthuserInfoController ----------');
        }
    ]
);

// -----------------------------------------------------------------------------

app.controller( 'IndicatorController',
    [ '$scope', '$location', 'Inbox', 'Lists', 'Talk', '$interval', 'appBarTitle',
        function( $scope, $location, Inbox, Lists, Talk, $interval, appBarTitle ){
            $scope.inboxUnreadCounter = 0;
            $scope.talkItemCounter = 0;
            $scope.matchItemCounter = 0;
            $scope.likeMeItemCounter = 0;
            $scope.viewedMeItemCounter = 0;

            // --- set appbar title --------------------------------------------

            $scope.appBarTitle = appBarTitle;

            // --- Inbox -------------------------------------------------------

            $scope.inboxCheckUnread = function( ){
                //log( '--- InboxCountNewController.$scope.checkInboxRegularly: checking for unread inbox msgs...' );
                Inbox.getCountUnread( $scope.authuser.username ).then( function( data ){ 
                    //log( '--- InboxCountNewController.$scope.checkInboxRegularly: found '+data+' unread messages.' );
                    $scope.inboxUnreadCounter = data;
                }, function( err ){
                    // on error, stop checking for messages
                    $interval.cancel( $scope.inboxCheckUnreadIntervalPromise ); // cancel old interval.
                } );
            }

            // once authuser is available, check "unread" inbox msgs regularly.
            $scope.authuserPromise.then( function(){
                log( '--- IndicatorController: setting inboxCheckUnread interval...' );
                $scope.inboxCheckUnreadIntervalPromise = $interval( $scope.inboxCheckUnread, window.CHECK_NEW_INBOX_INTERVAL );
                $scope.inboxCheckUnread();
            } );

            // --- Talk --------------------------------------------------------
         
            $scope.talkCheckNew = function( ){
                Talk.getPosts( 'all' ).then( function( data ){
                    $scope.talkItemCounter = Talk.countNewPosts( );
                }, function( err ){
                    $interval.cancel( $scope.talkCheckNewIntervalPromise ); // on error, stop checking
                } );
            }

            $scope.talkResetItemCounter = function( ){
                // if the user clicks the "talk" icon, reset the talkItemCounter,
                // because we are displaying all new posts.
                Talk.resetNewPostsTimestamp( );
                $scope.talkItemCounter = 0;
            }

            // once authuser is available, check for unread inbox messages
            // regularly.
            //Talk.resetNewPostsTimestamp( );
            $scope.authuserPromise.then( function(){
                $scope.talkCheckNewIntervalPromise = $interval( $scope.talkCheckNew, window.CHECK_NEW_TALK_INTERVAL );
                $scope.talkCheckNew();
            } );

            // --- Lists -------------------------------------------------------

            $scope.listsGetViewedMe = function( ){
                var listname = 'viewed_me';
                Lists.getList( listname ).then( function( data ){
                    $scope.viewedMeItemCounter = Lists.countNew( listname );
                } );
            }

            $scope.listsGetViewedMe( );
            $scope.listsCheckViewedMeIntervalPromise = $interval( $scope.listsGetViewedMe, window.CHECK_NEW_LISTS_INTERVAL );
            //$scope.$on( '$destroy', function( ){
            //    if( $scope.listsCheckViewedMeIntervalPromise ) 
            //        $interval.cancel( $scope.listsCheckViewedMeIntervalPromise );
            //});

        }
    ]
);

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------



// --- settings ----------------------------------------------------------------

app.controller( 'SettingsProfileController', 
    [ '$rootScope', '$scope', '$http', '$timeout', 'Cities', 'Profile', 'upload', 'appBarTitle',
        function( $rootScope, $scope, $http, $timeout, Cities, Profile, upload, appBarTitle ){
            /**
             * Only PNASL data. The user has to fill out all the fields
             * to be able to use the site.
             */

             function setPnaslOk(){
                // After every user update of the PNASL data, check if
                // is all filled in, and set pnasl_ok accordingly.
                $rootScope.authuser.pnasl_ok = ( 
                                !!$rootScope.authuser['pic'] &&
                                !!$rootScope.authuser['dob'] &&
                                !!$rootScope.authuser['gender'] &&
                                !!$rootScope.authuser['crc']);
            }

            // Using template: tpl/settings-profile.html
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'profile basics' );
            $scope.currSel = 'profile';
            $scope.maxPics = window.PROFILE_MAX_PICS;
            $scope.showLatLng = ("geolocation" in navigator); // hide button if not supported
            $scope.crcByLatLngLoading = false;
            $scope.crcByLatLng = '';

            $scope.authuserPromise.then( function( ){ // make sure authuser data is there
                
                $scope.submitForm = function( ){
                    // submit profile data, same as in "SettingsDetailsController".
                    var data = {};
                    var url = '/api/v1/authuser.json';

                    angular.forEach( $scope.settingsProfileForm, function( v, k ){
                        if( k && (k[0] != '$') && v.$dirty ){
                            if (k == 'dob') {
                                data[k] = $scope.authuser[k].toISOString().substr(0, 10); // YYYY-MM-DD only.
                            } else {
                                data[k] = $scope.authuser[k];
                            }
                        }
                    } );
                    // TODO: Check if "dob" field has a valid format. 
                    // Expected: "YYYY-MM-DD". Then convert to JS date.
                    if( $scope.settingsProfileForm.$dirty ){
                        $scope.isSubmitting = true;
                        $http.post( url, data ).success( function( data ){
                            // Copy the new settings over the the global authuser.
                            $rootScope.authuser = $scope.authuser;
                            setPnaslOk();
                            // remove old vals from Profile buffer
                            Profile.clearFromBuffer( $scope.authuser.username );
                            // set form and fields to "not dirty"
                            $scope.settingsProfileForm.$setPristine( );
                            $scope.isSubmitting = false;
                            $scope.isSubmitSuccess = true;
                            $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                        } ).error( function( err ){
                            alert( $scope.tr('There was an error, please try again. Are you online?') );
                            $scope.isSubmitting = false;
                        } );
                    }
                }

                $scope.findCityByLatLng = function( ){
                    // See http://diveintohtml5.info/geolocation.html
                    try {
                        $scope.crcByLatLngLoading = true;
                        navigator.geolocation.getCurrentPosition(
                            function( loc, timestamp ){
                                // With (loc.coords.latitude, loc.coords.longitude, 
                                // and loc.coords.accuracy) look up the nearest city
                                // in Geonames database.
                                var url = '/api/v1/city-by-latlng.json';
                                var params = { 'params': {
                                    'latitude': loc.coords.latitude,
                                    'longitude': loc.coords.longitude,
                                    'accuracy': loc.coords.accuracy } };
                                $http.get( url, params ).success( function( data ){
                                    // set authuser data
                                    $scope.authuser['city'] = data['id'];
                                    $scope.authuser['country'] = data['country'];
                                    $scope.authuser['crc'] = data['crc'];
                                    $scope.authuser['lat'] = loc.coords.latitude; //data['lat'];
                                    $scope.authuser['lng'] = loc.coords.longitude; //data['lng'];
                                    $scope.update_cities( data['country'], data['id'] );
                                    // have to set the form "dirty" manually
                                    $scope.settingsProfileForm['city'].$dirty = true;
                                    $scope.settingsProfileForm['country'].$dirty = true;
                                    $scope.settingsProfileForm['lat'].$dirty = true;
                                    $scope.settingsProfileForm['lng'].$dirty = true;
                                    $scope.settingsProfileForm.$setDirty( );
                                    // pretty display
                                    $scope.crcByLatLngLoading = false;
                                    $scope.crcByLatLng = data['crc'];
                                } ).error( function( err ){
                                    $scope.crcByLatLngLoading = false;
                                    $scope.crcByLatLng = $scope.tr('error: could not find location');
                                } );
                            }, function( err ){
                                $scope.crcByLatLngLoading = false;
                                $scope.crcByLatLng = $scope.tr('error: could not find location');
                            }
                        );
                    } catch( e ){
                        $scope.crcByLatLngLoading = false;
                        $scope.crcByLatLng = $scope.tr('error: could not find location');
                    }
                }
                $scope.update_cities = function( country, city ){
                    // load city options for given country and set city, if selected.
                    if( !country ) return;
                    Cities.inCountry( country ).then( function( data ){
                        $scope.cities = data;
                    });
                };

                // pic upload stuff
                $scope.resetVals = function( ){
                    $scope.showImageButton = true;
                    $scope.showImageUploading = false;
                    $scope.showImageSuccess = false;
                    $scope.showImageError = false;
                }
                $scope.onUpload = function( files ){
                    // TODO: add the csrfmiddlewaretoken here.
                    $scope.showImageButton = false;
                    $scope.showImageUploading = true;
                }
                $scope.onSuccess = function( response ){
                    var data = response['data'];
                    $scope.authuser['pics'].unshift( data.pic );
                    $scope.authuser['pics_url'].unshift( get_pic_urls( data.pic ) );
                    if( ! $scope.authuser['pic'] ){
                        $scope.authuser['pic'] = data.pic;
                        $scope.authuser['pic_url'] = get_pic_urls( data.pic );
                    }
                    $scope.showImageSuccess = true;
                }
                $scope.onError = function(response){  
                    $scope.showImageError = true;
                }
                $scope.onComplete = function(response){
                    $scope.showImageUploading = false;
                    $timeout( $scope.resetVals, 1000 );
                    setPnaslOk();
                }
                $scope.deletePic = function( ){
                    var pic = this['url'];
                    log('--- $scope.deletePic ---')
                    var url = '/api/v1/authuser/pics/' + pic['id'] + '.json';
                    // remember the current state of the pics lists
                    var pics_url_bak = $scope.authuser['pics_url']
                    var pics_bak = $scope.authuser['pics']
                    // find the array index of the item to remove
                    var pics_url_idx = get_index( $scope.authuser['pics_url'], 'id', pic['id'] );
                    var pics_idx = get_index( $scope.authuser['pics'], 'id', pic['id'] );
                    // remove element from arrays
                    $scope.authuser['pics_url'].splice(pics_url_idx, 1);
                    $scope.authuser['pics'].splice(pics_idx, 1);
                    // send request
                    $http.delete( url ).success( function( data ){
                        Profile.clearFromBuffer( $scope.authuser.username );
                    } ).error( function( err ){
                        // u-oh! restore the previous state of the pics lists
                        $scope.authuser['pics_url'] = pics_url_bak;
                        $scope.authuser['pics'] = pics_bak;
                    } );
                }
                $scope.setProfilePic = function( ){
                    log('--- SettingsPhotosController.$scope.setProfilePic -- Change profile pic...');
                    var pic = this['url'];
                    var data = { "pic": pic['id'] }
                    var bak = $scope.authuser['pic']; // in case we need to restore on network failure
                    $scope.authuser['pic_url'] = this['url'];
                    log('--- SettingsPhotosController.$scope.setProfilePic -- change locally, now sending to server...');
                    $http.post( '/api/v1/authuser.json', data ).success( function( ){
                        log('--- SettingsPhotosController.$scope.setProfilePic -- Pic changed on server.');
                        Profile.clearFromBuffer( $scope.authuser.username );
                    } ).error( function( ){
                        log('Something went wrong while authuser profile pic change')
                        $scope.authuser['pic_url'] = bak;
                    } );
                }
                $scope.resetVals();

                // onLoad, set the correct country+city.
                $scope.update_cities( $scope.authuser.country, $scope.authuser.city );
            } );
        }
    ]
);

app.controller( 'SettingsDetailsController', 
    [ '$scope', '$http', '$timeout', 'Cities', 'Profile', 'appBarTitle',
        function( $scope, $http, $timeout, Cities, Profile, appBarTitle ){
            /**
             * Let the user update their detailed profile data.
             */
            // Using template: tpl/settings-details.html
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'profile details' );
            $scope.currSel = 'details';
            $scope.authuserPromise.then( function( ){ // wait for authuser data
                $scope.submitForm = function( ){
                    // submit profile data, same as in "SettingsProfileController".
                    var data = {};
                    var url = '/api/v1/authuser.json';
 
                    angular.forEach( $scope.settingsDetailsForm, function( v, k ){
                        if( k && (k[0] != '$') && v.$dirty ){
                            data[k] = $scope.authuser[k];
                            // Can't use "0" in the ng form for "no value", so 
                            // have to set it here manually. This enables the
                            // user to reset a field to "no value".
                            if ( data[k] == null ) data[k] = "0";
                            log( "Dirty value: " + k + " == '" + data[k] + "'");
                        } else {
                            log( "Not dirty: " + k );
                        }
                    } );
                    if( $scope.settingsDetailsForm.$dirty ){
                        $scope.isSubmitting = true;
                        $http.post( url, data ).success( function( data ){
                            // remove old vals from Profile buffer
                            Profile.clearFromBuffer( $scope.authuser.username );
                            // set form and fields to "not dirty"
                            $scope.settingsDetailsForm.$setPristine( );
                            $scope.isSubmitting = false;
                            $scope.isSubmitSuccess = true;
                            $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                        } ).error( function( err ){
                            alert( 'There was an error, please try again. Are you online?' );
                            $scope.isSubmitting = false;
                        } );
                    }
                }
            } );
        }
    ]
);

app.controller( 'SettingsPhotosController', 
    [ '$scope', '$http', 'Profile', 'upload', '$timeout', 'appBarTitle',
        function( $scope, $http, Profile, upload, $timeout, appBarTitle ){
            // Using template: tpl/settings-photos.html
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'photos' );
            $scope.currSel = 'photos';
            $scope.maxPics = window.PROFILE_MAX_PICS;

            $scope.resetVals = function( ){
                $scope.showImageButton = true;
                $scope.showImageUploading = false;
                $scope.showImageSuccess = false;
                $scope.showImageError = false;
            }
            $scope.onUpload = function( files ){
                // TODO: add the csrfmiddlewaretoken here.
                $scope.showImageButton = false;
                $scope.showImageUploading = true;
            }
            $scope.onSuccess = function( response ){
                var data = response['data'];
                $scope.authuser['pics'].unshift( data.pic );
                $scope.authuser['pics_url'].unshift( get_pic_urls( data.pic ) );
                if( ! $scope.authuser['pic'] ){
                    $scope.authuser['pic'] = data.pic;
                    $scope.authuser['pic_url'] = get_pic_urls( data.pic );
                }
                $scope.showImageSuccess = true;
            }
            $scope.onError = function(response){  
                $scope.showImageError = true;
            }
            $scope.onComplete = function(response){
                $scope.showImageUploading = false;
                $timeout( $scope.resetVals, 1000 );
            }
            $scope.resetVals();

            /*
            $scope.doUpload = function( ){
                upload({
                    url: '/upload',
                    method: 'POST',
                    data: {
                        'csrfmiddlewaretoken': get_cookie('csrftoken'),
                        'aFile': $scope.myFile, // a jqLite type="file" element, upload() will extract all the files from the input and put them into the FormData object before sending.
                    },
                }).then( 
                    function (response) {
                        console.log(response.data); // will output whatever you choose to return from the server on a successful upload
                    }, 
                    function (response) {
                        console.error(response); //  Will return if status code is above 200 and lower than 300, same as $http
                    }
                );
            };
            */

            $scope.deletePic = function( ){
                var pic = this['url'];
                log('--- $scope.deletePic ---')
                var url = '/api/v1/authuser/pics/' + pic['id'] + '.json';
                // remember the current state of the pics lists
                var pics_url_bak = $scope.authuser['pics_url']
                var pics_bak = $scope.authuser['pics']
                // find the array index of the item to remove
                var pics_url_idx = get_index( $scope.authuser['pics_url'], 'id', pic['id'] );
                var pics_idx = get_index( $scope.authuser['pics'], 'id', pic['id'] );
                // remove element from arrays
                $scope.authuser['pics_url'].splice(pics_url_idx, 1);
                $scope.authuser['pics'].splice(pics_idx, 1);
                // send request
                $http.delete( url ).success( function( data ){
                    Profile.clearFromBuffer( $scope.authuser.username );
                } ).error( function( err ){
                    // u-oh! restore the previous state of the pics lists
                    $scope.authuser['pics_url'] = pics_url_bak;
                    $scope.authuser['pics'] = pics_bak;
                } );
            }

            $scope.setProfilePic = function( ){
                log('--- SettingsPhotosController.$scope.setProfilePic -- Change profile pic...');
                var pic = this['url'];
                var data = { "pic": pic['id'] }
                var bak = $scope.authuser['pic']; // in case we need to restore on network failure
                $scope.authuser['pic_url'] = this['url'];
                log('--- SettingsPhotosController.$scope.setProfilePic -- change locally, now sending to server...');
                $http.post( '/api/v1/authuser.json', data ).success( function( ){
                    log('--- SettingsPhotosController.$scope.setProfilePic -- Pic changed on server.');
                    Profile.clearFromBuffer( $scope.authuser.username );
                } ).error( function( ){
                    log('Something went wrong while authuser profile pic change')
                    $scope.authuser['pic_url'] = bak;
                } );
            }
        }
    ]
);

app.controller( 'SettingsDesignController', 
    [ '$rootScope', '$scope', '$http', '$timeout', 'Profile', 'appBarTitle',
        function SettingsDesignController( $rootScope, $scope, $http, $timeout, Profile, appBarTitle ){
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'design' );
            $scope.currSel = 'design';
            $scope.isSubmitSuccess = false;
            $scope.isSubmitError = false;
            $scope.isSubmitting = false;
            var url = '/api/v1/authuser.json';
            $scope.submitForm = function( ){
                // save changes in authuser.style to the backend.
                log( '--- SettingsDesignController.$scope.submitForm() --- called...');
                $scope.isSubmitting = true;
                var data = { 'style': $scope.authuser['style'] };
                $http.post( url, data ).success( function( data ){
                    log( '--- SettingsDesignController.$scope.submitForm() --- success!');
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout(function(){ $scope.isSubmitSuccess = false; }, 500);
                    // remove old vals from Profile buffer
                    Profile.clearFromBuffer( $scope.authuser.username );
                    $rootScope.authuser['style'] = $scope.authuser['style'];
                } ).error( function( err ){
                    log( '--- SettingsDesignController.$scope.submitForm() --- error :(');
                    $scope.isSubmitting = false;
                    $scope.isSubmitError = true;
                    $timeout(function(){ $scope.isSubmitError = false; }, 2000);
                } );
            }
        }
    ]
);

app.controller( 'SettingsAccountController', 
    [ '$scope', 'appBarTitle',
        function( $scope, appBarTitle ){
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'account' );
            $scope.currSel = 'account';

            // TODO: connect to backend
        }
    ]
);

app.controller( 'SettingsPasswordController', 
    [ '$scope', '$http', '$timeout', 'appBarTitle',
        function( $scope, $http, $timeout, appBarTitle ){
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'email+password' );
            $scope.currSel = 'password';

/* --> Use allauth/dj built-in accounts manager instead.
            $scope.isSubmitSuccess = false;
            $scope.isSubmitting = false;
            $scope.submitError = false;
            $scope.old_password = '';
            $scope.new_password_1 = '';
            $scope.new_password_2 = '';
            var url = '/api/v1/authuser.json';

            $scope.submitPasswordForm = function( ){
                log( '--- SettingsPasswordController.$scope.submitPasswordForm() --- called...');
                $scope.isSubmitting = true;
                $scope.submitError = false;
                var data = { 
                    'old_password': $scope.old_password,
                    'new_password_1': $scope.new_password_1, 
                    'new_password_2': $scope.new_password_2 
                };
                $http.post( url, data ).success( function( data, status, headers, config ){
                    log( '--- SettingsPasswordController.$scope.submitPasswordForm() --- success!');
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout(function(){ $scope.isSubmitSuccess = false; }, 500);
                } ).error( function( data, status, headers, config ){
                    log( '--- SettingsPasswordController.$scope.submitPasswordForm() --- error :(');
                    $scope.isSubmitting = false;
                    $scope.submitError = data;
                } );
            }

            $scope.submitEmailForm = function( ){
                log( '--- SettingsPasswordController.$scope.submitEmailForm() --- called...');
                $scope.isSubmitting = true;
                $scope.submitError = false;
                var data = {
                    'old_password': $scope.old_password,
                    'email': $scope.authuser.email,
                };
                $http.post( url, data ).success( function( data, status, headers, config ){
                    log( '--- SettingsPasswordController.$scope.submitEmailForm() --- success!');
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout(function(){ $scope.isSubmitSuccess = false; }, 500);
                } ).error( function( data, status, headers, config ){
                    log( '--- SettingsPasswordController.$scope.submitEmailForm() --- error :(');
                    $scope.isSubmitting = false;
                    $scope.submitError = data;
                } );
            }
*/

        }
    ]
);

// --- list or recent pics for mods -------------------------------------------

app.controller( 'PicturesController', 
    [ '$scope', '$http', 'appBarTitle',
        function( $scope, $http, appBarTitle ){
            appBarTitle.primary = $scope.tr( 'pictures' );
            appBarTitle.secondary = '';

            $scope.picslist = [];
            $scope.statusMsg = '';

            $scope.loadMore = function( ){
                var url = '/api/v1/pics/all.json';
                var params = {'params': { 'below_id': 0 } };
                $scope.statusMsg = 'loading';

                if( $scope.picslist.length > 0 )
                    params['params']['below_id'] = $scope.picslist[$scope.picslist.length-1]['id'];

                $http.get( url, params ).success( function( data ){
                    for( var i=0; i<data.length; i++ ){
                        data[i]['urls'] = get_pic_urls( data[i]['id'] );
                        // split date and time to fit it onto the pics.
                        var tmp = data[i]['created'].split( 'T' );
                        data[i]['created_date'] = tmp[0];
                        data[i]['created_time'] = tmp[1];
                        // append ("push") to $scope.picslist
                        $scope.picslist.push( data[i] );
                    }
                    $scope.statusMsg = '';
                } ).error( function( err ){
                    $scope.statusMsg = 'error';
                } );
            }

            $scope.deletePicture = function( id ){
                var url = '/api/v1/authuser/pics/' + id + '.json';
                $http.delete( url ).success( function( data ){
                    var idx = get_index( $scope.picslist, 'id', id );
                    $scope.picslist[idx]['is_deleted'] = true;
                } ).error( function( err ){

                } );
            }

            // start loading pics
            $scope.loadMore();
        }
    ]
);

// --- footer functions -------------------------------------------------------

app.controller( 'FooterController', 
    [ '$scope', '$window', 'appBarTitle',
        function( $scope, $window, appBarTitle ){
            appBarTitle.primary = '';
            appBarTitle.secondary = '';
            $scope.statusMsg = '';

            // Change the display language: set lg cookie, then reload.
            $scope.setLanguage = function( lg ){
                log('SET LANGUAGE: "' + lg + '"');
                set_cookie('lg', lg);
                $window.location.reload();
            }
        }
    ]
);