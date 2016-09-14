
// Show the searchbar form and search results matching the form values.

angular.module( 'searchController', [ 'ngSanitize' ] ).controller(
  
  'SearchController', 
  
          [ '$scope', 'Authuser', 'Cities', 'Search', 'appBarTitle',
  function( $scope,    Authuser,   Cities,   Search,   appBarTitle 

) {

  appBarTitle.primary = $scope.tr('search');
  appBarTitle.secondary = '';

  $scope.userlist = [];
  $scope.statusMsg = '';
  $scope.search = { 'options': Search.getOptions( ), 'selected': Search.getParams( ) };
  $scope.isLoadingMore = false;

  // load city options for given country and set city, if selected.
  $scope.updateCrc = function( city ){
    var idx = get_index( $scope.search['options']['city'], 0, city );
    $scope.search.crc = $scope.search['options']['city'][idx][1];
  };
  $scope.updateCities = function( country, city ){
    Cities.inCountry( country ).then( function( data ){
      $scope.search['options']['city'] = data;
      $scope.search['selected']['city'] = city;
      $scope.updateCrc( city );
    });
  };

  $scope.getParamsFromSearchForm = function( ){
    var params = {};
    params['minage'] = $scope.search['selected']['minage'] || 18;
    params['maxage'] = $scope.search['selected']['maxage'] || 99;
    params['gender'] = !!$scope.search['selected']['gender'] ? $scope.search['selected']['gender'] : 4;
    params['dist'] = !!$scope.search['selected']['dist'] ? $scope.search['selected']['dist'] : 50;
    params['city'] = !!$scope.search['selected']['city'] ? $scope.search['selected']['city'] : 0;
    params['country'] = !!$scope.search['selected']['country'] ? $scope.search['selected']['country'] : 0;
    return params;
  }

  $scope.newSearch = function() {
    angular.element(document.querySelector('.search-form .city-opts')).addClass('hidden');
    $scope.userlist = [];
    Search.clearResults( );
    
    $scope.isLoadingMore = true;
    var params = $scope.getParamsFromSearchForm( );
    log(params);
    Search.setParams( params );
    Search.getResults( ).then( function( data ) {
      $scope.isLoadingMore = false;
      $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
      $scope.userlist = data;
    });
  }

  $scope.moreSearch = function( ){
    // Append one more page of search results to the list of users.
    angular.element(document.querySelector('.search-form .city-opts')).addClass('hidden');

    $scope.isLoadingMore = true;
    Search.getResults( ).then( function( data ) {
      $scope.isLoadingMore = false;
      $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
      $scope.userlist = data;
    });
  };

  // show or hide the geolocation selector in the search bar on click
  angular.element(document.querySelector('.search-form .city')).on('click', function(e){
      angular.element(document.querySelector('.search-form .city-opts')).toggleClass('hidden');
  });

  // add the city options for country_id and select the selected city, if any.
  // ...and a list of (localized) country options from the server
  $scope.countriesPromise.then( function( ){
      $scope.search['options']['country'] = $scope.countries;
      $scope.updateCities( $scope.search['selected']['country'], $scope.search['selected']['city'] );
  } );

  // fetch initial userlist
  $scope.isLoadingMore = true;
  Search.getResults( true ).then( function( data ) {
    $scope.isLoadingMore = false;
    $scope.statusMsg = ( data.length < 1 ) ? 'empty' : '';
    $scope.userlist = data;
  });

}]);
