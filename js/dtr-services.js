//
// Factory services for "dtr4" app.
//

var dtrServices = angular.module( 'dtrServices', [ ] );

// --- load full list of countries ---------------------------------------------

dtrServices.factory( 'Countries', 
    [ '$q', '$http', 
        function CountriesFactory( $q, $http ){
            // Returns the list of all countries as [country_id, country_name] 
            // pairs. Buffer the list in localStorage.
            log('-- CountriesFactory ----------');
            var deferred = $q.defer();
            var li = getLocalStorageObject( 'dtr4.Countries.all' );
            
            if( li && li.length > 0 ){
                log('--- CountriesFactory: loaded '+li.length+' countries from localStorage.');
                deferred.resolve(li);
            } else {
                log('--- CountriesFactory: Loading from remote server...')
                $http.get( '/api/v1/all-countries.json' ).success( function( data ){
                    log('--- CountriesFactory: Loaded from remote server, setting localStorage cache.');
                    setLocalStorageObject( 'dtr4.Countries.all', data );
                    deferred.resolve( data );
                    log('--- CountriesFactory: Data loaded and cached.');
                } ).error( function( err ){
                    log('--- CountriesFactory: ERROR while loading data from remote server.');
                    deferred.reject( 'Could not load countries list.' );
                } );
            }

            return deferred.promise;
        }
    ]
);

// --- load list of cities for one country -------------------------------------

dtrServices.factory( 'Cities', 
    [ '$q', '$http', 
        function CitiesFactory( $q, $http ){
            // Returns a list of cities as [city_id, city_name] pairs for one country.
            // Buffer city names for up to 10 countries in localStorage.
            log( '-- CitiesFactory ----------' );
            var url = '/api/v1/cities-in-country.json';
            var params = { 'q': null };

            this.inCountry = function( country ){
                //if( typeof country != 'number' ) country = country[0]; // only use the id
                if( !angular.isNumber( country )) 
                    log( 'ERROR --- CitiesFactory.inCountry(): given country ID is not a number!' );

                var deferred = $q.defer();
                var local_storage_key = 'dtr4.Cities.' + country;
                var li = getLocalStorageObject( local_storage_key );

                if( li && li.length > 0 ){
                    log('--- CitiesFactory: Loaded '+li.length+' cities for country "' + country + '" from localStorage.')
                    deferred.resolve(li);
                } else {
                    params['q'] = country;
                    $http.get( url, { 'params': params } ).success( function( data ){
                        log('--- CitiesFactory: Loaded '+data.length+' cities for country "' + country + '" from remote server.')
                        setLocalStorageObject( local_storage_key, data );
                        deferred.resolve( data );
                    } ).error( function( err ){
                        deferred.reject( '--- CitiesFactory: Could not load cties list for country "' + country + '".' );
                    } );
                }
                
                return deferred.promise;
            };

            return this;
        }
    ]
);

// --- get data on authenticated user ------------------------------------------

dtrServices.factory( 'Authuser', 
    [ '$q', '$http', 'Profile', 
        function AuthuserFactory( $q, $http, Profile ){
            log('-- AuthuserFactory ----------');
            var deferred = $q.defer();
            // fetch via ProfileFactory. the backend will know that its the
            // authuser's own profile, and return addition data for it.
            Profile.getByUsername( null ).then(
                function( data ){
                    // Check if basic PNASL fields are filled in.
                    data['pnasl_ok'] = (!!data['pic'] && !!data['dob'] && 
                                        !!data['gender'] && !!data['crc']);
                    log( 'AuthuserFactory: User data loaded and fixed:' ); log( data )
                    deferred.resolve( data );
                }, function( data ){
                    log('--- AuthuserFactory: Received an error.');
                    deferred.reject( 'Could not load Authuser data. Maybe not signed in?' );
                }
            );
            return deferred.promise;
        }
    ]
);

// --- get a user profile ------------------------------------------------------

dtrServices.factory( 'Profile', 
    [ '$q', '$http', '$sce', 
        function ProfileFactory( $q, $http, $sce ){
            log('--- ProfileFactory -------------------');

            var profileBuffer = {}; // keep the last 20 or so profiles here.

            function clearFromBuffer( username ){
                delete profileBuffer[username];
                return this;
            }

            function completeProfile( data ){
                // data mey be either an Array of Objects, or just a single 
                // Object. make it work in both cases.
                if( angular.isArray( data ) ){
                    angular.forEach( data, function( row, i ){
                        data[i] = completeProfileHelper( data[i] );
                    });
                } else {
                    data = completeProfileHelper( data );
                }

                return data;
            }

            function completeProfileHelper( data ){
                // receives a user profile or partial profile and completes it
                // with as much as possible from the data that is there. adding
                //
                // * "_html" fileds for markdown text fields
                // * "_choice" fields for index numbers of choice options
                // * "_delta" fields for timestamp fields
                // * "_url" fields for pic id fields.
                //
                // TODO: move all this into function "complete_user_pnasl()"
                //       and rename that function into "complete_user_data()"
                //       in utils.py, to be more DRY.
                //
                if(data['dob']) {
                    data['dob'] = new Date(data['dob']);
                }

                data['pic_url'] = get_pic_urls( data['pic'] ); // main profile pic
                data['pics_url'] = get_pics_urls( data['pics'] );
                
                // time deltas with days, hours, mins, etc.
                data['last_active_delta'] = ( data['last_active'] ) ? get_time_delta( data['last_active'] ) : '';
                data['created_delta'] = ( data['created'] ) ? get_time_delta( data['created'] ) : '';
                data['last_viewed_delta'] = ( data['last_viewed'] ) ? get_time_delta( data['last_viewed'] ) : '';
                
                // convert markdown to html
                var ks = ['aboutme','aboutbooks','aboutmovies','aboutmusic','aboutarts',
                          'abouttravel','aboutfood','aboutquotes','aboutsports'];
                angular.forEach(ks, function( k, i ){
                    //data[k + '_html'] = ( data[k] ) ? $sce.trustAsHtml( markdown.toHTML( data[k] ) ) : '';
                    data[k + '_html'] = ( data[k] ) ? $sce.trustAsHtml( textfilter( data[k] ) ) : '';
                });
                
                // time deltas in seconds to see if user was active recently
                data['is_online'] = ( get_time_delta_seconds( data['last_active'] ) < ONLINE_SECONDS_SINCE_LAST_ACTIVE );
                data['is_idle'] = ( !data['is_online'] && ( get_time_delta_seconds( data['last_active'] ) < IDLE_SECONDS_SINCE_LAST_ACTIVE ) );
                data['is_offline'] = ( !data['is_online'] && !data['is_idle'] );

                /* "flags": {
                "friend": "2014-12-24T10:41:23.731944+00:00",
                "friend_received": "2014-12-24T10:47:27.129025+00:00",
                "viewed": "2014-12-31T06:58:50.551787+00:00",
                "like": "2014-12-24T07:47:42.066021+00:00",
                "viewed_received": "2014-12-29T14:26:41.837251+00:00",
                "like_received": "2014-12-25T13:04:33.406741+00:00"
                }, */
            
                // translate existing choice fields
                ks = [  "gender", "lookingfor", 
                        "height", "weight", "eyecolor", "haircolor", 
                        "relationship_status", "has_children", "want_children", 
                        "would_relocate", "smoke", "pot", "drink",
                        "longest_relationship", "education", "diet", "sports",
                        "religion", "religiosity", "spirituality", 
                        "jobfield", "income", 
                        "western_zodiac", "eastern_zodiac" ];
                angular.forEach( ks, function( k, i ){
                    data[k + '_choice'] = ( data[k] ) ? get_choice_tr( k + '_choice', data[k] ) : '';
                } );

                // some special cases of additional choice fields
                data['gender_short'] = ( data['gender'] ) ? get_choice_tr( 'gender_short', data['gender'] ) : '';
                data['gender_choice_symbol'] = ( data['gender'] ) ? get_choice_tr( 'gender_choice_symbol', data['gender'] ) : '';
                data['gender_choice_hisher'] = ( data['gender'] ) ? get_choice_tr( 'gender_choice_hisher', data['gender'] ) : '';
                data['gender_choice_heshe'] = ( data['gender'] ) ? get_choice_tr( 'gender_choice_heshe', data['gender'] ) : '';
                data['gender_plural_choice'] = ( data['gender'] ) ? get_choice_tr( 'gender_plural_choice', data['gender'] ) : '';
                data['city_name'] = data['crc'] ? data['crc'].split( ',' )[0] : '';
                data['western_zodiac_symbol'] = ( data['western_zodiac'] ) ? get_choice_tr( 'western_zodiac_symbols', data['western_zodiac'] ) : '';
                data['eastern_zodiac_symbol'] = ( data['eastern_zodiac'] ) ? get_choice_tr( 'eastern_zodiac_symbols', data['eastern_zodiac'] ) : '';

                // attach basic stuff for friends
                if( data['friends'].length > 0 )
                    for( var i=0; i<data['friends'].length; i++ )
                        data['friends'][i] = complete_user_pnasl( data['friends'][i] );

                return data;
            }

            function getByUsername( username ){
                var deferred = $q.defer();
                var url = ( !!username ) ? '/api/v1/profile/'+username+'.json' : '/api/v1/authuser.json';

                if( username && profileBuffer[username] ){
                    deferred.resolve( profileBuffer[username] );
                } else {
                    $http.get( url ).success( function( data, status ){

                        if( status == 200 && data['id'] ){
                            data = completeProfile( data );
                            profileBuffer[ data['username'] ] = data;
                            deferred.resolve( data );
                        } else {
                            deferred.reject( 'Could not load user profile.' );
                        }
                    } ).error( function( err ){
                        deferred.reject( 'Could not load user profile.' );
                    } );
                }

                return deferred.promise
            }

            this.completeProfile = completeProfile;
            this.getByUsername = getByUsername;
            this.clearFromBuffer = clearFromBuffer;
            return this;
        }
    ]
);

// --- user lists --------------------------------------------------------------
//
// returns lists of users based on their relation to authuser.
// 
// 
//
dtrServices.factory( 'Lists', 
    [ '$q', '$http',
        function ListsFactory( $q, $http ){

            // buffer all the lists here
            var buffers = { 'matches':[], 'like_me':[], 'likes':[], 
                            'viewed_me':[], 'favorites':[], 'blocked':[] };

            // remember the last time the user viewed the list, and start 
            // counting "new" items from there.
            var count_timestamps = { 'matches':'', 'like_me':'', 'viewed_me':'' };

            // for each buffered list, remember the last time we fetched items
            // from the server.
            var fetch_timestamps = { 'matches':'', 'like_me':'', 'likes':'', 
                                'viewed_me':'', 'favorites':'', 'blocked':'' };

            // -----------------------------------------------------------------

            // clear a buffer, or all buffers if no buffername is provided.
            function clearBuffer( buffername ){
                if( buffername ){
                    buffers[buffername] = [];
                } else {
                    buffers = { 'matches':[], 'like_me':[], 'likes':[], 
                                'viewed_me':[], 'favorites':[], 'blocked':[] };
                }
            }

            // sets the counter timestamp to "now" for one list, so only items
            // of that list fetched after now will count as "new".
            function resetCountTimestamp( listname ){
                count_timestamps[listname] = new Date( ).toISOString( );
            }

            // same for the fetch timstamps.
            function resetFetchTimestamp( listname ){
                fetch_timestamps[listname] = new Date( ).toISOString( );
            }
            
            // return the age of a buffer in seconds.
            function getBufferAge( listname ){
                if( !fetch_timestamps[listname] ) return 9999999999; //just something big.
                return get_time_delta_seconds( fetch_timestamps[listname] );
            }

            // counts the number of items in a buffer that were "created"
            // after the buffer's "count_timestamps".
            function countNew( listname ){
                log( '--- ListsFactory.countNew() called for buffer "' + listname + '": count for the past "' + getBufferAge( listname ) + '" seconds (' + count_timestamps[listname] + ').'); log( buffers[listname] );

                // empty buffer, nothing to count
                if( buffers[listname].length < 1 ){
                    log( '--- ListsFactory.countNew(): empty buffer! Return 0.');
                    return 0;
                }

                // find all newer items and count them
                var counter = 0;
                for( var i=0; i<buffers[listname].length; i++ ){
                    if( buffers[listname][i]['created'] > count_timestamps[listname] ){
                        counter++;
                    }
                }

                log( '--- ListsFactory.countNew() counted "' + counter + '" new items in the past "' + getBufferAge( listname ) + '" seconds .');
                return counter;
            }

            // returns whatever is in the buffer for that list. should be 
            // called first to get something to the user quickly, then call
            // getList() to complete the list with new items.
            function getListQuickie( listname ){
                return !!buffers[listname] ? buffers[listname] : [];
            }

            function getList( listname ){
                var url = '/api/v1/lists/' + listname + '.json';
                var deferred = $q.defer( );
                var params = { after: fetch_timestamps[listname], before:'' };

                log( '--- ListsFactory.getList() --- yo! fresh data it is! GET request for list "'+listname+'" to "'+url+'" with params:' ); log( params );

                $http.get( url, { 'params': params } ).success( function( data ){
                    log( '--- ListsFactory.getList() --- request to "' + url + '" received data:' ); log( data );

                    // top up with some data fields
                    data.forEach( function( row, i ){ row = complete_user_pnasl( row ); });

                    // combine with buffer
                    buffers[listname] = combine_unique_by_id( data, buffers[listname] );

                    // sort by newest first
                    if( listname == 'matches' || listname == 'friends' ){
                        log( '--- ListsFactory.getList() ---  sort_by_confirmed_filter' );
                        buffers[listname].sort( sort_by_confirmed_filter );
                    } else {
                        log( '--- ListsFactory.getList() ---  sort_by_created_filter' );
                        buffers[listname].sort( sort_by_created_filter );
                    }

                    // remember time of fetching data
                    resetFetchTimestamp( listname );

                    // resolve promise
                    deferred.resolve( buffers[listname] );

                }).error( function( err ){
                    log( '--- ListsFactory.getList() --- an error occurred GETing list data:' ); log( err );
                    deferred.reject( err );
                });

                return deferred.promise;
            }

            this.clearBuffer = clearBuffer;
            this.countNew = countNew;
            this.getList = getList;
            this.getListQuickie = getListQuickie;
            this.resetCountTimestamp = resetCountTimestamp;
            return this;
        }
    ]
);

// --- get all translation strings ---------------------------------------------
//
//dtrServices.factory( 'Translations', [ '$rootScope', '$q', '$http', function TranslationsFactory( $rootScope, $q, $http ){
//
// REMOVED! load all translation strings as a .js file defining a global variable with all translations.
// so that loading of the translations .js blocks, to make sure we have all translation strings here
// before the script starts to render stuff.

// --- helpers -----------------------------------------------------------------
//
// moved to own /static/utils.js file.
