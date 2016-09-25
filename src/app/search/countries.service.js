(function(){ 'use strict';

    // load full list of countries

    angular.module( 'dtr4' ).factory( 'Countries', CountriesService );

    CountriesService.$inject = [ '$q', '$http' ];

    function CountriesService( $q, $http ){
        // Returns the list of all countries as [country_id, country_name] 
        // pairs. Buffer the list in localStorage.
        var deferred = $q.defer();
        var li = getLocalStorageObject( 'dtr4.Countries.all' );
        
        if ( li && li.length > 0 ){
            deferred.resolve(li);
        } else {
            $http.get( '/api/v1/all-countries.json' ).success( function( data ){
                setLocalStorageObject( 'dtr4.Countries.all', data );
                deferred.resolve( data );
            } ).error( function( err ){
                deferred.reject( 'Could not load countries list.' );
            } );
        }

        return deferred.promise;
    }
})();
