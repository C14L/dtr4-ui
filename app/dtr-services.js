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
