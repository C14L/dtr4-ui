// --- get data on authenticated user ------------------------------------------

angular.module( 'authuserService', [ ] ).factory(
  
  'Authuser', 

         [ '$q', '$http', 'Profile', 
  function( $q,   $http,   Profile
  
) {

  var deferred = $q.defer();
  // fetch via ProfileFactory. the backend will know that its the
  // authuser's own profile, and return addition data for it.
 
  Profile.getByUsername( null ).then(
      function( data ){
          // Check if basic PNASL fields are filled in.
          data['pnasl_ok'] = (!!data['pic'] && !!data['dob'] && 
                              !!data['gender'] && !!data['crc']);
          log( 'AuthuserFactory: User data loaded and fixed:' ); log( data )
          deferred.resolve( data );
      }, function( data ){
          log('--- AuthuserFactory: Received an error.');
          deferred.reject( 'Could not load Authuser data. Maybe not signed in?' );
      }
  );
 
  return deferred.promise;

}]);
