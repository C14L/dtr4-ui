(function(){ 'use strict';

    // Find users based on search selections.

    angular.module( 'dtr4' ).factory( 'Search', SearchService );

    SearchService.$inject = [ '$q', '$http', 'Authuser', 
                              'search_defaults', 'search_options', 'SharedFunctions' ];

    function SearchService( $q, $http, Authuser,
                            search_defaults, search_options, SharedFunctions ){

        var _search_results;
        var _search_params;
        var _is_loading = false;  // Only load one set at a time.
        var _scroll_y = 0;  // remember the scrolled y offset.

        activate();

        return {
            getResults: getResults,
            clearResults: clearResults,
            getParams: getParams,
            setParams: setParams,
            getOptions: getOptions,
            getRandomResults: getRandomResults,
            setScrollY: setScrollY,
            getScrollY: getScrollY,
        };

        ///////////////////////////////////////////////////

        function activate(){
            initParams( );
        }

        function initParams( ){
            _search_params = getLocalStorageObject( '_search_params' ) || search_defaults;
            clearResults( );
        };

        function setScrollY( y ){
            _scroll_y = y;
        }

        function getScrollY(){
            return _scroll_y;
        }

        function clearResults( ){
            _search_results = [];
            _setPage( 0 );
        };

        function _setPage( page ){
            _search_params['page'] = page;
        };

        function _getPage( ){
            return _search_params['page'];
        };

        function _getNextPage( ){
            return _getPage( ) + 1;
        };

        function _getPrevPage( ){
            return _getPage( ) - 1;
        };

        function setParams( params ){
            // console.log('top of setParams() - params --> ', params.city);
            // console.log('top of setParams() - _search_params --> ', _search_params.city);
            //
            // gets an Object of search params and stores it in both the
            // _search_params and localStorage. This also clears the results
            // buffer, because the search params changed.

            // check if relevant params changed
            //
            // FIXME: When a new value is chosen in the search form, the `_search_params`
            // property here in the service is already "magically" set to the newly 
            // selected value when we get here. No idea why, because this method should 
            // be the only place that changes the `_search_params` property in any way.
            //
            // WORKAROUND: Don't check if `_search_params` and `params` are different. Just
            // assume that `params` is different from `_search_params` and refresh the 
            // stored search params in localStorage and do a new search.
            //
            // var eq = true;
            var rp = [ 'minage', 'maxage', 'city', 'country', 'dist', 'gender' ];
            // for ( var i=0; i<rp.length; i++) {
            //   if ( params[ rp[i] ] !== _search_params[ rp[i] ] ) eq = false;
            // }

            // if ( eq ) {
            //   log('--- SearchFactory.setParams(): params did not change!');
            // } else {
            //   log( '--- SearchFactory.setParams(): params CHANGED, set _search_params in localStorage.' );

            if( !params['page_size'] ) params['page_size'] = search_defaults['page_size'];
            clearResults( );

            for ( var i=0; i<rp.length; i++) {
                var k = rp[i];
                _search_params[k] = params[k];
            }

            setLocalStorageObject( '_search_params', params );

            //}
            // console.log('end of setParams() - params --> ', params.city);
            // console.log('end of setParams() - _search_params --> ', _search_params.city);
        };

        function getParams( ){
            return _search_params;
        };

        // Fetch next search results page from server and return a Promise.
        function fetchResults(){
            var deferred = $q.defer();
            var url = '/api/v1/search.json';
            var params = { 'params': getParams( ) };

            $http.get( url, params ).success( function( data ){
                if ( data.length > 0 ){
                    // Complete each results item with some extra data.
                    data.forEach( function( row, i ){
                        data[i] = SharedFunctions.complete_user_pnasl( data[i] );
                    });
                }
                deferred.resolve( data );
            })
            .error( function(){
                deferred.reject();
            });

            return deferred.promise;
        };

        function getResults( fromCacheOnly ){
            if ( _is_loading ) {
                return $q.reject( 'already loading' );  // Block when already loading.
            }

            var deferred = $q.defer();

            // Cache empty? Then try to load fresh ones always.
            if ( _search_results.length == 0 ) fromCacheOnly = false;

            // Set lock.
            _is_loading = true;

            if ( fromCacheOnly ) {
                // The caller only asked for cached results.
                _is_loading = false;
                deferred.resolve( _search_results );
            } else {
                // Get the "next page" and append to the already cached results.
                _setPage( _getNextPage() );
                fetchResults().then( function( data ) {
                    _is_loading = false;
                    // Append each result otem to results cache.
                    for ( var i=0; i<data.length; i++ ) _search_results.push( data[i] );
                    // Resolve with the entire results cache.
                    deferred.resolve( _search_results );
                })
                .catch( function( err ) {
                    _is_loading = false;
                    deferred.reject( err );
                });
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

            if( _search_results.length > 0 ){
                deferred.resolve( shuffle( _search_results, len ) );
            } else {
                fetchResults( ).then( function( data ){
                    log( 'TODO: SearchFactory.getRandomResults() does not really return random results yet! ');
                    deferred.resolve( shuffle( data, len ) );
                });
            }

            return deferred.promise;
        }
    }
})();
