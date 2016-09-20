(function(){

    angular.module( 'dtr4' ).factory( 'SettingsProfile', SettingsProfileService );

    SettingsProfileService.$inject = [ '$http', 'Authuser' ];

    function SettingsProfileService( $http, Authuser ){
        var _this = this;
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

        return _this;
    }
})();