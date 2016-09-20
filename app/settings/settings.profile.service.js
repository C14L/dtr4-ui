(function(){

    angular.module( 'dtr4' ).factory( 'SettingsProfile', SettingsProfileService );

    SettingsProfileService.$inject = [ '$http', 'Authuser', 'Profile' ];

    function SettingsProfileService( $http, Authuser, Profile ){
        var _this = this;
        _this.deletePic = deletePic;
        _this.setProfilePic = setProfilePic;
        _this.submitForm = submitForm;

        ///////////////////////////////////////////////////

        var authuser; 
        Authuser.then( function( data ){ authuser = data; });

        function submitForm( settingsForm ){
            // submit profile data, same as in "SettingsDetailsController".
            var data = {};
            var url = '/api/v1/authuser.json';

            angular.forEach( settingsForm, function( v, k ){
                if ( k && (k[0] != '$') && v.$dirty ){
                    if (k == 'dob') {
                        data[k] = authuser[k].toISOString().substr(0, 10); // YYYY-MM-DD only.
                    } else {
                        data[k] = authuser[k];
                    }
                }
            });

            return new Promise( function( resolve, reject ){
                $http.post( url, data ).success( function( data ){
                    resolve( data );
                }).error( function( err ){
                    alert( $scope.tr('There was an error, please try again. Are you online?') );
                    $scope.isSubmitting = false;
                });
            });
        }

        function deletePic( pic ){
            var url = '/api/v1/authuser/pics/' + pic['id'] + '.json';
 
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
            return new Promise( function( resolve, reject ){
                $http.delete( url ).success( function( data ){
                    Profile.clearFromBuffer( authuser.username );
                    resolve();
                }).error( function( err ){
                    // u-oh! restore the previous state of the pics lists
                    authuser['pics_url'] = pics_url_bak;
                    authuser['pics'] = pics_bak;
                    reject();
                });
            });
        }

        function setProfilePic( pic ){
            var data = { "pic": pic['id'] };

            return new Promise( function( resolve, reject ){
                $http.post( '/api/v1/authuser.json', data ).success( function(){
                    Profile.clearFromBuffer( authuser.username );
                    resolve();
                })
                .catch( function(){
                    reject();
                });
            });
        }

        return _this;
    }
})();