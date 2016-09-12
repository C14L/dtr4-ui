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

// --- find users based on search selections -----------------------------------

dtrServices.factory( 'Search', 
    [ '$q', '$http', 'Authuser', 'search_defaults', 'search_options', 
        function SearchFactory( $q, $http, Authuser, search_defaults, search_options ){

            var results_buffer = []; // keep here the last search results
            var params_buffer = {}; // keep here the last used search params
            initParams( );

            function getPage( ){
                // return the current page number from the params buffer
                return params_buffer['page'];
            };

            function setPage( page ){
                params_buffer['page'] = page;
            };

            function getNextPage( ){
                return getCurrentPage( ) + 1;
            };

            function getPreviousPage( ){
                return getCurrentPage( ) - 1;
            };

            function initParams( ){
                // on factory initialization, set default values; either found
                // in localStorage, or hardcoded.
                clearResults( );
                params_buffer = getLocalStorageObject( 'params_buffer' ) || search_defaults;
                setPage( 1 ); // always start with page 1, don't store page vals.
            };

            function setParams( params ){
                // gets an Object of search params and stores it in both the
                // params_buffer and localStorage. This also clears the results
                // buffer, because the search params changed.

                // check if relevant params have changed
                var eq = true;
                var rp = [ 'minage', 'maxage', 'city', 'country', 'dist', 'gender' ];
                for( var i=0; i<rp.length; i++)
                    log( 'CHECKING: "'+params[ rp[i] ]+'" == "'+params_buffer[ rp[i] ]+'" ??' );
                    if( params[ rp[i] ] === params_buffer[ rp[i] ] ){
                        // yey, equal
                    } else {
                        eq = false; 
                    }

                setLocalStorageObject( 'params_buffer', params );

                if( eq ){
                    log( 'equal!' );
                    log('--- SearchFactory.setParams(): params did not change!');
                } else {
                    log( 'NOT equal!' ); 
                    log( '--- SearchFactory.setParams(): params changed, clear results_buffer and overwrite params_buffer in localStorage.' )
                    if( !params['page_size'] ) params['page_size'] = search_defaults['page_size'];
                    clearResults( );
                    params_buffer = params;
                    log('--- SearchFactory.setParams(): done! params now:'); log( params );
                }
            };

            function getParams( ){
                return params_buffer;
            };

            function clearResults( ){
                results_buffer = [];
            };

            function fetchResults(  ){
                // TODO: should check the results_buffer and return buffered 
                // data if possible
                //
                // Fetch new search results from server and return a Promise.
                log( '--- SearchFactory.fetchResults() ---' );
                var deferred = $q.defer();
                var url = '/api/v1/search.json';
                var params = { 'params': getParams( ) };

                log( '--- SearchFactory.fetchResults() --- url, params:' ); log( url ); log( params );
                $http.get( url, params ).success(function(data){
                    if( data.length > 0 ){
                        log( '--- SearchFactory.fetchResults() --- received a list of '+data.length+' items.' );
                        data.forEach( function( row, i ){
                            data[i] = complete_user_pnasl( data[i] );
                        });
                    }

                    deferred.resolve( data );
                });

                return deferred.promise;
            };

            function getResults( page ){
                // Check if there are valid results in the results buffer and
                // use them to resolve the Promise. If not, call fetchResults
                // to get a fresh set of results from the server and use them
                // to resolve the Promise.
                var deferred = $q.defer();
                log( '--- SearchFactory.getResults(): called, and results_buffer has "'+results_buffer.length+'" items.')

                setPage( page );
                var expected_length = page * params_buffer['page_size'];

                log( '--- SearchFactory.getResults(): after setPage call, results_buffer has "'+results_buffer.length+'" items.')
                if( results_buffer.length >= expected_length ){
                    log( '--- SearchFactory.getResults(): Found a results_buffer with "'+results_buffer.length+'" items, return that.')
                    deferred.resolve( results_buffer )
                } else {
                    log( '--- SearchFactory.getResults(): No items in results_buffer, fetch fresh ones from server...')
                    fetchResults( ).then(
                        function( data ){
                            log( '--- SearchFactory.getResults(): Success, yo! Got "'+data.length+'" fresh items! Append them.')
                            for( var i=0; i<data.length; i++ ) results_buffer.push( data[i] );
                            log( '--- SearchFactory.getResults(): Now, results_buffer has "'+results_buffer.length+'" items.')

                            deferred.resolve( data );
                        },
                        function( err ){
                            deferred.reject( err );
                        }
                    );
                }

                return deferred.promise;
            };

            function getOptions( ){
                return search_options;
            }

            function getRandomResults( len ){
                var deferred = $q.defer();

                var shuffle = function( arr, len ){
                    // TODO: shuffle the array before slice'ing.
                    return arr.slice( 0, len );
                }

                if( results_buffer.length > 0 ){
                    deferred.resolve( shuffle( results_buffer, len ) );
                } else {
                    fetchResults( ).then( function( data ){
                        log( 'TODO: SearchFactory.getRandomResults() does not really return random results yet! ');
                        deferred.resolve( shuffle( data, len ) );
                    });
                }

                return deferred.promise;
            }

            this.getPage = getPage;
            this.setPage = setPage;
            this.getResults = getResults;
            this.clearResults = clearResults;
            this.getParams = getParams;
            this.setParams = setParams;
            this.getOptions = getOptions;
            this.getRandomResults = getRandomResults;
            return this;
        }
    ]
);

// --- find users based on search selections -----------------------------------
//
// manage the different message boxes (inbox, unread, unreplied, sent), buffer
// them when possible, and load new messages, adding them to the buffer, ordered
// by timestamp and removng any douplicates.
//
dtrServices.factory( 'Inbox', 
    [ '$q', '$http', 'Authuser', 
        function InboxFactory( $q, $http, Authuser ){
            var buffers = {'inbox':[], 'sent':[], 'unread':[], 'unreplied':[]};
            var urls = {'inbox':'/api/v1/inbox/recv.json', 
                        'sent':'/api/v1/inbox/sent.json', 
                        'unread':'/api/v1/inbox/unread.json', 
                        'unreplied':'/api/v1/inbox/unreplied.json'};

            // quickly return whatever is in the buffer. these should be called
            // first by the Controller, to quickly show something to the user
            // is there were already messages loaded. after calling this, the 
            // Controller should call the corresponding method get* method to
            // fetch new messages from the server an integrate them into the
            // messages list. Also, use "track by" in the template to avoid a 
            // complete re-render every time new messages are added!
            function getQuickie( boxname ){ 
                return buffers[boxname]; 
            }
            
            // force fresh load from server, clear a box before calling getBox()
            function clearBox( boxname ){
                buffers[boxname] = [];
            }

            // called when a user's profile is looked at. all messages sent by
            // profileuser will be set to "is_read" on the server automatically,
            // but may still be in the local buffers. remove them from "unread",
            // and set them to "is_read" in "inbox". that's all.
            function setBufferIsReadForUsername( username ){
                var tmp_buffer = [];

                // set is_read in "inbox"
                for( var i=0; i<buffers['inbox'].length; i++ )
                    if( username == buffers['inbox'][i]['other_user']['username'] )
                        buffers['inbox'][i]['is_read'] = true;

                // remove from "unread"
                for( var i=0; i<buffers['unread'].length; i++ )
                    if( username != buffers['unread'][i]['other_user']['username'] )
                        tmp_buffer.push( buffers['unread'][i] );

                buffers['unread'] = tmp_buffer;
            }


            // sets a "block" flag on the user "id" from authuser on the server.
            // on success, remove all that user's messages from the inbox and
            // unread buffers.
            function blockUser( username ){
                var deferred = $q.defer();
                var url = '/api/v1/flag/block/' + username + '.json';
                var data = {};
                var bnlist = ['inbox', 'unread', 'unreplied']

                log( '--- InboxFactory.blockUser('+username+') --- seding request...' );
                $http.post( url, data ).success( function( data ){
                    log( '--- InboxFactory.blockUser('+username+') --- success! all done, resolve.' );

                    // remove user's messages from all boxes
                    for( var j=0; j<bnlist.length; j++ ){
                        var bn = bnlist[j];
                        var tmp_buffer = [];
                        log( '--- InboxFactory.blockUser('+username+') --- looking in buffer "'+bn+'" with "'+buffers[bn].length+'" items.' );
                        for( var i=0; i<buffers[bn].length; i++){
                            log( '--- InboxFactory.blockUser('+username+') --- looking at message "'+buffers[bn][i]['id']+'"...' );
                            if( buffers[bn][i]['from_user']['username'] != username ){ tmp_buffer.push( buffers[bn][i] ); }
                            else log( '--- InboxFactory.blockUser('+username+') --- FOUND ONE!! remove from buffer "'+bn+'" message "'+buffers[bn][i]['id']+'".' );
                        }
                        buffers[bn] = tmp_buffer;
                        log( '--- InboxFactory.blockUser('+username+') --- finished buffer "'+bn+'", now has "'+buffers[bn].length+'" items left:' );
                    }

                    // done, resolve promise
                    deferred.resolve( null );
                }).error( function( err ){
                    deferred.reject( err );
                });

                return deferred.promise;
            }

            // the the message "id" as "is_read" on the server and in the inbox
            // buffer, and removes it from the unread buffer.
            function setRead( id ){
                var deferred = $q.defer();
                var url = '/api/v1/inbox/msg/'+id+'.json';
                var data = { 'is_read': '1' };

                $http.post( url, data ).success( function( data ){
                    // clean up the buffers: remove from "unread"
                    var idx = get_index( buffers['unread'], 'id', id );
                    if( idx !== null ) buffers['unread'].splice( idx, 1 );
                    // ...and set as "is_read" in "inbox"
                    var idx = get_index( buffers['inbox'], 'id', id );
                    buffers['inbox'][idx]['is_read'] = true;
                    deferred.resolve( );
                } ).error( function( err ){
                    deferred.reject( err );
                })

                return deferred.promise;
            }

            // the the message "id" as "is_read" on the server and in the inbox
            // buffer, and removes it from the unread buffer.
            function setUnread( id ){
                var deferred = $q.defer();
                var url = '/api/v1/inbox/msg/'+id+'.json';
                var data = { 'is_read': '0' };

                $http.post( url, data ).success( function( data ){
                    // clean up only the "inbox" buffer
                    var idx = get_index( buffers['inbox'], 'id', id );
                    buffers['inbox'][idx]['is_read'] = false;
                    // and add that one msg to "unread"
                    buffers['unread'] = combine_unique_by_id( [buffers['inbox'][idx]], buffers['unread'] );
                    // all done
                    deferred.resolve( );
                } ).error( function( err ){
                    deferred.reject( err );
                })

                return deferred.promise;
            }

            // TODO: the the message "id" as "is_replied" on the server and in 
            // the inbox and unread buffers.
            function setReplied( id ){
                var deferred = $q.defer();
                var url = '/api/v1/inbox/msg/'+id+'.json';
                var data = { 'is_replied': '1' };
                log( '--- InboxFactory.setReplied('+id+') --- NOT IMPLEMENTED ' );
                return deferred.promise;
            }

            // Set all msgs to "is_read" on the server and in the "inbox" buffer
            // and empty the "unread" buffer.
            function setAllRead( ){
                var deferred = $q.defer();
                var url = '/api/v1/inbox/allread.json';
                var data = {};

                $http.post( url, data ).success( function( data ){
                    buffers['unread'] = [];
                    for( var i=0; i<buffers['inbox'].length; i++ ){
                        buffers['inbox'][i]['is_read'] = true;
                    }
                    deferred.resolve( data );
                }).error( function( err ){
                    deferred.reject( err );
                });

                return deferred.promise;
            }

            function getCountUnread( username ){
                // return a promise and resolve with the number of "unread" 
                // messages. on network error, reject the promise.
                var deferred = $q.defer();

                getBox( 'unread', username ).then( function( data ){
                    if( !data ){
                        log( '--- InboxFactory.getCountUnread(): no data array returned from server.' );
                        deferred.reject( 'no data array returned from server.' );
                    } else
                    if ( data.length < 1 ){
                        log( '--- InboxFactory.getCountUnread(): empty data array returned from server.' );
                        deferred.resolve( 0 );
                    } else {
                        // count "unread" flags and resolve with the number.
                        // the loaded messages are all buffered 
                        var count = 0; 
                        for( var i=0; i<data.length; i++ ) if( !data[i].is_read ) count++;
                        log( '--- InboxFactory.getCountUnread(): data array with '+count+' unread messages returned from server.' );
                        deferred.resolve( count );
                    }
                } );

                return deferred.promise;
            }

            // Generic method to get a promise on a message box. it completes 
            // the data, buffers its content, remove duplicates, and sort it
            // newest first. then resolves the promise.
            function getBox( boxname, username, type ){ // get new stuff from server and sort it into the buffer, removing dupes.
                log( '--- InboxFactory.getBox('+boxname+') --- with buffers["'+boxname+'"] length: "'+buffers[boxname].length+'" -- for suthuser username: "'+username+'".' );
                var deferred = $q.defer();
                var params = { 'params': { 'before':'', 'after':'' } };

                // get older messages or current ones?
                if( type == 'before' ){
                    // fetch old messages from before the oldest buffered msg
                    var last = buffers[boxname].length - 1;
                    params['params']['before'] = buffers[boxname][last]['created'];
                    log( '--- InboxFactory.getBox('+boxname+') --- get BEFORE: "'+params['params']['before']+'".' );
                } else {
                    // if there are msgs in the buffer already, only get newer
                    // messages. if buffer is empty, get a default number of the
                    // newest msgs.
                    if( buffers[boxname].length > 0 ){
                        params['params']['after'] = buffers[boxname][0]['created'];
                        log( '--- InboxFactory.getBox('+boxname+') --- get AFTER: "'+params['params']['after']+'".' );
                    } else {
                        log( '--- InboxFactory.getBox('+boxname+') --- get FRESH.' );
                    }
                }

                log( '--- InboxFactory.getBox('+boxname+') --- sending request to server with params:' ); log( params );
                $http.get( urls[boxname], params ).success( function ( data ){
                    log( '--- InboxFactory.getBox('+boxname+') --- got new data from server: "'+data.length+'" items.' );

                    if( data ){
                        for( var i=0; i<data.length; i++ ){
                            data[i]['created_delta'] = get_time_delta( data[i]['created'] );
                            var tmp = ( username == data[i]['to_user']['username'] ) ? 'from_user' : 'to_user';
                            data[i]['other_user'] = complete_user_pnasl( data[i][tmp] );
                        }

                        // remove dupes and sort by "created" timestamp.
                        buffers[boxname] = combine_unique_by_id( data, buffers[boxname] );
                        buffers[boxname].sort( sort_by_created_filter );
                    }

                    log( '--- InboxFactory.getBox('+boxname+') --- new buffers["'+boxname+'"] length is: '+buffers[boxname].length );
                    log( buffers[boxname] );
                    return deferred.resolve( buffers[boxname] );
                } );

                return deferred.promise;
            }

            this.setRead = setRead;
            this.setUnread = setUnread;
            this.setAllRead = setAllRead;
            this.setReplied = setReplied;
            this.blockUser = blockUser;
            this.getCountUnread = getCountUnread;
            this.getQuickie = getQuickie;
            this.getBox = getBox;
            this.clearBox = clearBox;
            this.setBufferIsReadForUsername = setBufferIsReadForUsername;
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

// --- Talk --------------------------------------------------------------------

dtrServices.factory( 'Talk',
    [ '$q', '$http', '$sce', '$sanitize',
        function TalkFactory( $q, $http, $sce, $sanitize ){
            // buffer streams "all" (all posts), "matches" (posts only from
            // authuser's matches), "friends" (posts by authuser's friends),
            // and "own" (only posts written by or mentioning authuser).
            var buffers = { 'all':[], 'matches':[], 'friends':[], 'own':[] };
            var hashtag_buffer = []; // only buffer one
            var hashtag_curr = ''; // hashtag currently in buffer
            var hashtag_is_loading = false;
            var username_buffer = []; // only buffer one
            var username_curr = ''; // username currently in buffer
            var username_is_loading = false;

            // buffer here a list of recently used hashtags. TODO: use it for 
            // autocomplete when the user writes a hashtag in a message, to 
            // reduce typos.
            var hashtags = [];
            var hashtags_timestamp = 0;

            // buffer here a list of recently used usernames. TODO: use it for 
            // autocomplete when the user writes a username in a message, to 
            // reduce typos.
            var usernames = [];
            var usernames_timestamp = 0;

            // this holds the timestamp to count "new" posts. any post loaded
            // after this counts as a "new" post for countNewPosts(). use the
            // resetNewPostsTimestamp() method to set it to "now".
            var count_posts_timestamp = getLocalStorageObject('count_posts_timestamp') || '';

            // this is true while the Factory is busy loading data from the 
            // server. use this to avoid making several requests 
            // simoultaneously.
            var is_loading = false;

            // -----------------------------------------------------------------

            // sets the new posts timestamp to "now", so only posts fetched 
            // after now will count as "new".
            function resetNewPostsTimestamp( ){
                count_posts_timestamp = new Date( ).toISOString( );
                setLocalStorageObject('count_posts_timestamp', count_posts_timestamp);
            }

            // counts the number of posts in buffers['all'] that were "created"
            // after "count_posts_timestamp".
            function countNewPosts( ){
                log( '--- TalkFactory.countNewPosts() called, count for the past "'+get_time_delta_seconds(count_posts_timestamp)+'" seconds ('+count_posts_timestamp+').');
                log( buffers['all'] );

                // find all newer posts and count them
                var counter = 0;
                for( var i=0; i<buffers['all'].length; i++ ){
                    if( buffers['all'][i]['created'] > count_posts_timestamp ){
                        counter++;
                    }
                }
                log( '--- TalkFactory.countNewPosts() counted "'+counter+'" new items in the past "'+get_time_delta_seconds(count_posts_timestamp)+'" seconds .');
                return counter;
            }

            // returns all posts in the buffer. this is usually enough for "all"
            // group, because its loaded continuously from the appbar Indicator.
            // calling it for any other "group", it should be followed by a call 
            // to getPosts(), to load from server newer posts not yet in buffer.
            function getQuickie( group ){
                log( '--- TalkFactory.getQuickie() for group "'+group+'".');
                if( !group ) group = 'all';
                return buffers[group];
            }

            // returns a promise to deliver *new* posts for that group.
            function getPosts( group ){
                log( '--- TalkFactory.getPosts() for group "'+group+'".');
                var after = ( buffers[group].length > 0 ) ? buffers[group][0]['created'] : '';
                return fetchPosts( { 'after': after, 'group': group } );
            }

            // returns a promise to deliver *older* posts for that group.
            function getOlderPosts( group ){
                log( '--- TalkFactory.getOlderPosts() for group "'+group+'".');
                var before = ( buffers[group].length > 0 ) ? buffers[group][( buffers[group].length - 1 )]['created'] : '';
                return fetchPosts( { 'before': before, 'group': group } );
            }

            function getPostsByHashtag( hashtag, before ){
                log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") starting...');
                // load current, after, or before
                if( hashtag_is_loading ) return;
                hashtag_is_loading = true;

                var deferred = $q.defer();
                var url = '/api/v1/talk/topic/'+hashtag+'.json';
                var opts = {  }

                // delete buffer for different hashtag
                if( hashtag_curr != hashtag )
                {
                    hashtag_buffer = [];
                    hashtag_curr = hashtag;
                }

                // if no buffer allways load recent
                if( hashtag_buffer.length > 0 )
                {
                    // check for request to load older posts
                    if( before ) opts['before'] = hashtag_buffer[hashtag_buffer.length-1]['created'];
                    // check for filled buffer, then fetch only younger (after) posts
                    else opts['after'] = hashtag_buffer[0]['created'];
                }

                log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") load from "'+url+'" with params: '); log(opts);
                $http.get( url, { 'params': opts } ).success( function( data ){
                    // complete post data
                    for( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );
                    // add to buffer
                    hashtag_buffer = combine_unique_by_id( data, hashtag_buffer );
                    // sort buffer by created time
                    hashtag_buffer.sort( sort_by_created_filter );
                    // resolve promise
                    deferred.resolve( hashtag_buffer );
                } ).error( function( err ){ 
                    deferred.reject( err );
                } ).finally( function( data ){
                    hashtag_is_loading = false;
                } );

                log( '--- TalkFactory.getPostsByHashtag("'+hashtag+'") ...done!');
                return deferred.promise;
            }

            function getPostsByUsername( username ){
                log( '--- TalkFactory.getPostsByUsername("'+username+'") starting...');
                var deferred = $q.defer();
                var url = '/api/v1/talk/people/'+username+'.json';
                var opts = {  }
                if( username_curr != username ) username_buffer = [];
                if( username_buffer.length > 0 ){
                    if( before ) opts['before'] = username_buffer[username_buffer.length-1]['created'];
                    else opts['after'] = username_buffer[0]['created'];
                }
                $http.get( url, { 'params': opts } ).success( function( data ){
                    for( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );
                    username_buffer = combine_unique_by_id( data, username_buffer );
                    username_buffer.sort( sort_by_created_filter );
                    deferred.resolve( username_buffer );
                } ).error( function( err ){ 
                    deferred.reject( err );
                } );

                log( '--- TalkFactory.getPostsByUsername("'+username+'") ...done!');
                return deferred.promise;
            }

            // this fetches new posts from the server, if any, and stores them
            // in the appropriate posts buffer array. returns nothing. this 
            // should be called before using the getPosts() method for all 
            // groups except "all", because "all" is called regularly as an 
            // "$interval" by the TalkCountNewController() controller.
            function fetchPosts( opts ){
                log('--- TalkFactory.fetchPosts() called.');
                var deferred = $q.defer();

                // interface: { before, after, timestamp, topic, username, group }
                //
                // ALWAYS:
                // - before: if true, load only older posts.
                // - after: if true, load only younger posts.
                //
                // EITHER OF THESE:
                // - group: "all", "matches", "friends", "own" (default: all)
                // - hashtag: if present, load only posts containing hashtag.
                // - username: if present, load only posts containing username.

                var opts = opts || { 'group': 'all', 'after': '' };
                var group = (opts['group'] || 'all').toLowerCase();
                var url = '/api/v1/talk/list.json';

                is_loading = true;
                $http.get( url, { 'params': opts } ).success( function( data ){
                    fixAndAddToBuffer( data, group );
                    log( '--- TalkFactory.fetchPosts() --- buffer["'+group+'"] filled. Resolve...' )
                    log( buffers[group] );
                    deferred.resolve( buffers[group] );
                } ).error( function( err ){ 
                    deferred.reject( err );
                } ).finally( function( data ){
                    is_loading = false;
                } );

                return deferred.promise;
            }

            // add some more data to each post in data array, remove dupes, and
            // sort by "created", and then add the array to the appropriate
            // "buffers" group. return null
            function fixAndAddToBuffer( data, group ){
                for( var i=0; i<data.length; i++ ) data[i] = completePost( data[i] );
                buffers[group] = combine_unique_by_id( data, buffers[group] );
                buffers[group].sort( sort_by_created_filter );
            }

            // add some more data to each post, derived from existing data
            function completePost( data ){
                data['user'] = complete_user_pnasl( data['user'] );
                data['created_delta'] = get_time_delta( data['created'] );
                data['html'] = $sce.trustAsHtml( makeHtmlText( data['text'] ) );
                return data;
            }

            // add a new post. get back the newly added post, including its ID
            // so it can be added to the top of the posts list. do not add it to
            // the posts buffer here! PROBLEM: what if i am currently 
            // looking at a @username or #hashtag filtered posts list? or if
            // there are more posts to load before the currently last and this
            // post. it would mess up the "last post" timestamp if it was added
            // to the buffer. better just reload it with the next regular buffer
            // refresh and the duplicate gets automatically removed anyway.
            function addPost( text, group ){
                log('--- TalkFactory.addPost() called.');
                var deferred = $q.defer();
                var url = '/api/v1/talk/list.json';
                var data = { 'text': text };
                $http.post( url, data ).success( function( data ){
                    // data should be the data dict of the new post! resolve it
                    // so that the controller can just add it to the top of the
                    // rendered posts list.
                    data = completePost( data );
                    deferred.resolve( data );
                } ).error( function( err ){ 
                    deferred.reject( err );
                } );

                return deferred.promise;
            }

            function delPost( post_id ){
                // delete a post the authuser owns
                var deferred = $q.defer();
                var url = '/api/v1/talk/post/' + post_id + '.json';

                $http.delete( url ).success( function( data ){
                    // remove the post from all buffers
                    angular.forEach( ['all','matches','friends','own'], function( group, i ){
                        var idx = get_index( buffers[group], 'id', post_id );
                        if( idx !== null ) buffers[group].splice( idx, 1 );
                    });
                    // do not return anything, just resolve or reject
                    deferred.resolve( null );
                }).error( function( err ){ 
                    log( 'TalkFatory.delPost(): ERROR: ' + err );
                    deferred.reject( );
                });

                return deferred.promise;
            }


            function makeHtmlText( text ){
                // returns the text but with hashtags and usernames linked and
                // any other html escaped

                //text = $sanitize( text );

                text = textfilter( text );

                return text; // all html escaped, except linked hashtags and usernames
            }

            // -----------------------------------------------------------------

            function getHashtagsList( ){
                // loads and buffers a list of popular or recent hashtags
                var deferred = $q.defer();

                if( !hashtags_timestamp || get_time_delta_seconds( hashtags_timestamp ) > 60*20 ){
                    $http.get('/api/v1/talk/popular-tags.json').success( function( data ){
                        hashtags_timestamp = new Date( ).toISOString( );
                        hashtags = data;
                        deferred.resolve( hashtags );
                    });
                } else {
                    deferred.resolve( hashtags );
                }

                return deferred.promise;
            }

            function getUsernamesList( ){
                // loads and buffers a list of popular or recent hashtags
                var deferred = $q.defer();

                if( !usernames_timestamp || get_time_delta_seconds( usernames_timestamp ) > 60*20 ){
                    $http.get('/api/v1/talk/popular-users.json').success( function( data ){
                        usernames_timestamp = new Date( ).toISOString( );
                        usernames = data;
                        deferred.resolve( usernames );
                    });
                } else {
                    deferred.resolve( usernames );
                }

                return deferred.promise;
            }

            // -----------------------------------------------------------------

            this.getQuickie = getQuickie;
            this.getPosts = getPosts;
            this.getOlderPosts = getOlderPosts;
            this.getPostsByUsername = getPostsByUsername;
            this.getPostsByHashtag = getPostsByHashtag;
            this.addPost = addPost;
            this.delPost = delPost;
            this.getHashtagsList = getHashtagsList;
            this.getUsernamesList = getUsernamesList;
            this.completePost = completePost;
            this.countNewPosts = countNewPosts;
            this.resetNewPostsTimestamp = resetNewPostsTimestamp;
            this.makeHtmlText = makeHtmlText;
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
