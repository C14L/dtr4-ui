(function(){

    angular.module( 'dtr4' ).factory( 'SettingsProfile', SettingsProfileService );

    SettingsProfileService.$inject = [ '$http', '$q', 'Authuser', 'Profile' ];

    function SettingsProfileService( $http, $q, Authuser, Profile ){
        var _this = this;
        _this.deletePic = deletePic;
        _this.setProfilePic = setProfilePic;
        _this.submitForm = submitForm;
        _this.submitDesignForm = submitDesignForm;

        ///////////////////////////////////////////////////

        var authuser; 
        Authuser.then( function( data ){ authuser = data; });

        function submitDesignForm(){
            var deferred = $q.defer();
            var data = { 'style': authuser['style'] };
            var url = '/api/v1/authuser.json';
    
            $http.post( url, data ).success( function( data ){
                Profile.clearFromBuffer( authuser.username );
                deferred.resolve();
            }).error( function( err ){
                deferred.reject();
            });

            return deferred.promise;
        }

        function submitForm( settingsForm ){
            // submit profile data, same as in "SettingsDetailsController".
            var data = {};
            var url = '/api/v1/authuser.json';
            var deferred = $q.defer();

            angular.forEach( settingsForm, function( v, k ){
                if ( k && (k[0] != '$') && v.$dirty ){
                    if (k == 'dob') {
                        data[k] = authuser[k].toISOString().substr(0, 10); // YYYY-MM-DD only.
                    } else {
                        data[k] = authuser[k];
                    }
                }
            });

            $http.post( url, data ).success( function( data ){
                deferred.resolve( data );
            }).error( function( err ){
                deferred.reject( err );
            });

            return deferred.promise;
        }

        function deletePic( pic ){
            var url = '/api/v1/authuser/pics/' + pic['id'] + '.json';
            var deferred = $q.defer();
 
            // remember the current state of the pics lists
            var pics_url_bak = authuser['pics_url'];
            var pics_bak = authuser['pics'];

            // find the array index of the item to remove
            var pics_url_idx = get_index( authuser['pics_url'], 'id', pic['id'] );
            var pics_idx = get_index( authuser['pics'], 'id', pic['id'] );

            // remove element from arrays
            authuser['pics_url'].splice(pics_url_idx, 1);
            authuser['pics'].splice(pics_idx, 1);

            // send request
            $http.delete( url ).success( function( data ){
                Profile.clearFromBuffer( authuser.username );
                deferred.resolve();
            }).error( function( err ){
                // u-oh! restore the previous state of the pics lists
                authuser['pics_url'] = pics_url_bak;
                authuser['pics'] = pics_bak;
                deferred.reject();
            });

            return deferred.promise;
        }

        function setProfilePic( pic ){
            var data = { "pic": pic['id'] };
            var deferred = $q.defer();

            $http.post( '/api/v1/authuser.json', data ).success( function(){
                Profile.clearFromBuffer( authuser.username );
                deferred.resolve();
            })
            .catch( function(){
                deferred.reject();
            });

            return deferred.promise;
        }

        return _this;
    }
})();