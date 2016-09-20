(function(){ 'use strict';

    // get a user profile
  
    angular.module( 'dtr4' ).factory('Profile', ProfileService);

    ProfileService.$inject = ['$q', '$http', '$sce', 'SharedFunctions', '$window'];

    function ProfileService( $q, $http, $sce, SharedFunctions, $window) {

        this.completeProfile = completeProfile;
        this.getByUsername = getByUsername;
        this.clearFromBuffer = clearFromBuffer;

        ///////////////////////////////////////////////////

        var profileBuffer = {}; // keep the last 20 or so profiles here.

        function clearFromBuffer( username ){
            delete profileBuffer[username];
            return this;
        }

        function completeProfile( data ){
            // data mey be either an Array of Objects, or just a single 
            // Object. make it work in both cases.
            if ( angular.isArray( data ) ){
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
            // TODO: move this to "SharedFunctions.complete_user_pnasl()"
            //       and rename that function into "complete_user_data()"
            //       in shared-functions.py.
            //
            if ( data['dob'] ) {
                data['dob'] = new Date( data['dob'] );
            }

            data['pic_url'] = SharedFunctions.get_pic_urls( data['pic'] ); // main profile pic
            data['pics_url'] = SharedFunctions.get_pics_urls( data['pics'] );
            
            // time deltas with days, hours, mins, etc.
            data['last_active_delta'] = ( data['last_active'] ) ? SharedFunctions.get_time_delta( data['last_active'] ) : '';
            data['created_delta'] = ( data['created'] ) ? SharedFunctions.get_time_delta( data['created'] ) : '';
            data['last_viewed_delta'] = ( data['last_viewed'] ) ? SharedFunctions.get_time_delta( data['last_viewed'] ) : '';
            
            // convert markdown to html
            var ks = ['aboutme','aboutbooks','aboutmovies','aboutmusic','aboutarts',
                    'abouttravel','aboutfood','aboutquotes','aboutsports'];
            angular.forEach(ks, function( k, i ){
            //data[k + '_html'] = ( data[k] ) ? $sce.trustAsHtml( markdown.toHTML( data[k] ) ) : '';
            data[k + '_html'] = ( data[k] ) ? $sce.trustAsHtml( textfilter( data[k] ) ) : '';
            });
            
            // time deltas in seconds to see if user was active recently
            data['is_online'] = ( SharedFunctions.get_time_delta_seconds( data['last_active'] ) < $window.ONLINE_SECONDS_SINCE_LAST_ACTIVE );
            data['is_idle'] = ( !data['is_online'] && ( SharedFunctions.get_time_delta_seconds( data['last_active'] ) < $window.IDLE_SECONDS_SINCE_LAST_ACTIVE ) );
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
                data[k + '_choice'] = ( data[k] ) ? SharedFunctions.get_choice_tr( k + '_choice', data[k] ) : '';
            });

            // some special cases of additional choice fields
            data['gender_short'] = ( data['gender'] ) ? SharedFunctions.get_choice_tr( 'gender_short', data['gender'] ) : '';
            data['gender_choice_symbol'] = ( data['gender'] ) ? SharedFunctions.get_choice_tr( 'gender_choice_symbol', data['gender'] ) : '';
            data['gender_choice_hisher'] = ( data['gender'] ) ? SharedFunctions.get_choice_tr( 'gender_choice_hisher', data['gender'] ) : '';
            data['gender_choice_heshe'] = ( data['gender'] ) ? SharedFunctions.get_choice_tr( 'gender_choice_heshe', data['gender'] ) : '';
            data['gender_plural_choice'] = ( data['gender'] ) ? SharedFunctions.get_choice_tr( 'gender_plural_choice', data['gender'] ) : '';
            data['city_name'] = data['crc'] ? data['crc'].split( ',' )[0] : '';
            data['western_zodiac_symbol'] = ( data['western_zodiac'] ) ? SharedFunctions.get_choice_tr( 'western_zodiac_symbols', data['western_zodiac'] ) : '';
            data['eastern_zodiac_symbol'] = ( data['eastern_zodiac'] ) ? SharedFunctions.get_choice_tr( 'eastern_zodiac_symbols', data['eastern_zodiac'] ) : '';

            // attach basic stuff for friends
            if( data['friends'].length > 0 )
            for( var i=0; i<data['friends'].length; i++ )
                data['friends'][i] = SharedFunctions.complete_user_pnasl( data['friends'][i] );

            return data;
        }

        function getByUsername( username ){
            var deferred = $q.defer();
            var url = ( !!username ) ? '/api/v1/profile/'+username+'.json' : '/api/v1/authuser.json';

            if ( username && profileBuffer[username] ){
                deferred.resolve( profileBuffer[username] );
            } else {

                $http.get( url )
                .success( function( data, status ){

                    if ( status == 200 && data['id'] ){

                        data = completeProfile( data );
                        profileBuffer[ data['username'] ] = data;
                        deferred.resolve( data );

                    } else {
                        deferred.reject( 'Could not load user profile.' );
                    }

                })
                .error( function( err ){
                    deferred.reject( 'Could not load user profile.' );
                });
            }

            return deferred.promise
        }

        return this;
    }
})();
