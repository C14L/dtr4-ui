(function(){ 'use strict';

    // Show the searchbar form and search results matching the form values.

    angular.module( 'dtr4' ).controller( 'SearchController', SearchController );

    SearchController.$inject = [ '$scope', '$window', '$timeout', 
                                 'Authuser', 'Cities', 'Search', 'appBarTitle', 'SharedFunctions', 'Translate' ];

    function SearchController( $scope, $window, $timeout,
                               Authuser, Cities, Search, appBarTitle, SharedFunctions, Translate ) {

        $scope.tr = Translate.tr;
        $scope.userlist = [];
        $scope.statusMsg = '';
        $scope.isLoadingMore = false;
        $scope.search = { 'options': Search.getOptions(), 'selected': Search.getParams() };

        $scope.updateCrc = updateCrc;
        $scope.updateCities = updateCities;
        $scope.getParamsFromSearchForm = getParamsFromSearchForm;
        $scope.newSearch = newSearch;
        $scope.moreSearch = moreSearch;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            appBarTitle.primary = $scope.tr('search');
            appBarTitle.secondary = '';

            loadCountries();
            loadChoicerTranslations();
            loadInitialSearchResults();

            // show or hide the geolocation selector in the search bar on click
            // TODO: Angularify this!
            angular.element(document.querySelector('.search-form .city')).on('click', function(e){
                angular.element(document.querySelector('.search-form .city-opts')).toggleClass('hidden');
            });

            function onScrollEventHandler( ev ){
                var y = $window.pageYOffset;
                var wh = $window.innerHeight;
                var bh = $window.document.body.clientHeight;
                var distFromBottom = bh - wh - y;
                if (distFromBottom < 50) moreSearch();  // load more if close to end
                Search.setScrollY( y );  // remember position
            }

            // scrolling to near the end of page, triggers load more items
            $window.addEventListener( 'scroll', onScrollEventHandler );

            $scope.$on( '$destroy', function(){
                $window.removeEventListener( 'scroll', onScrollEventHandler );
            });
        }

        function loadChoicerTranslations(){
            SharedFunctions.translationsPromise.then(function(){
                // Only need this one in this view.
                $scope.gender_plural_choice = SharedFunctions.translations['GENDER_PLURAL_CHOICE'];
            });
        }

        // load initial userlist
        function loadInitialSearchResults(){
            $scope.isLoadingMore = true;
            Search.getResults( true ).then( function( data ) {
                $scope.isLoadingMore = false;
                $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
                $scope.userlist = data;
                $timeout( function(){
                    var x = $window.pageXOffset;
                    var y = Search.getScrollY();
                    $window.scroll(x, y);
                }, 100);
            }).catch( function(){
                $scope.isLoadingMore = false;
            });
        }

        // add the city options for country_id and select the selected city, if any.
        // ...and a list of (localized) country options from the server
        function loadCountries(){
            $scope.countriesPromise.then( function( ){
                $scope.search['options']['country'] = $scope.countries;
                $scope.updateCities( $scope.search['selected']['country'], $scope.search['selected']['city'] );
            } );
        }

        // load city options for given country and set city, if selected.
        function updateCrc( city ){
            var idx = get_index( $scope.search['options']['city'], 0, city );
            $scope.search.crc = $scope.search['options']['city'][idx][1];
        }

        function updateCities( country, city ){
            Cities.inCountry( country ).then( function( data ){
                $scope.search['options']['city'] = data;
                $scope.search['selected']['city'] = city;
                $scope.updateCrc( city );
            });
        }

        function getParamsFromSearchForm(){
            var params = {};
            params['minage'] = $scope.search['selected']['minage'] || 18;
            params['maxage'] = $scope.search['selected']['maxage'] || 99;
            params['gender'] = !!$scope.search['selected']['gender'] ? $scope.search['selected']['gender'] : 4;
            params['dist'] = !!$scope.search['selected']['dist'] ? $scope.search['selected']['dist'] : 50;
            params['city'] = !!$scope.search['selected']['city'] ? $scope.search['selected']['city'] : 0;
            params['country'] = !!$scope.search['selected']['country'] ? $scope.search['selected']['country'] : 0;
            return params;
        }

        // Remove old results and load new results, starting from page 1
        function newSearch() {
            angular.element(document.querySelector('.search-form .city-opts')).addClass('hidden');
            $scope.userlist = [];
            Search.clearResults( );
            $scope.isLoadingMore = true;

            Search.setParams( $scope.getParamsFromSearchForm() );
            Search.getResults().then( function( data ) {
                $scope.isLoadingMore = false;
                $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
                $scope.userlist = data;
            }).catch( function(){
                $scope.isLoadingMore = false;
            });
        }

        // Append one more page of search results to the list of users.
        function moreSearch(){
            angular.element(document.querySelector('.search-form .city-opts')).addClass('hidden');
            $scope.isLoadingMore = true;
            Search.getResults().then( function( data ){
                $scope.isLoadingMore = false;
                $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
                $scope.userlist = data;
            }).catch( function(){
                $scope.isLoadingMore = false;
            });
        }
    }
})();
