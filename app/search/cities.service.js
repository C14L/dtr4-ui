(function(){ 'use strict';

    // load list of cities for one country

    angular.module( 'dtr4' ).factory( 'Cities', CitiesService );

    CitiesService.$inject = [ '$q', '$http' ];

    function CitiesService( $q, $http ){
        // Returns a list of cities as [city_id, city_name] pairs for one country.
        // Buffer city names for up to 10 countries in localStorage.
        var url = '/api/v1/cities-in-country.json';
        var params = { 'q': null };

        this.inCountry = function( country ){
            //if( typeof country != 'number' ) country = country[0]; // only use the id
            if( !angular.isNumber( country )) {
                log( 'ERROR --- CitiesFactory.inCountry(): given country ID is not a number!' );
            }

            var deferred = $q.defer();
            var local_storage_key = 'dtr4.Cities.' + country;
            var li = getLocalStorageObject( local_storage_key );

            if( li && li.length > 0 ){
                deferred.resolve(li);
            } else {
                params['q'] = country;
                $http.get( url, { 'params': params } ).success( function( data ){
                    setLocalStorageObject( local_storage_key, data );
                    deferred.resolve( data );
                }).error( function( err ){
                    deferred.reject( 'Could not load cties list for country "' + country + '".' );
                });
            }
            
            return deferred.promise;
        };

        return this;
    }
})();
