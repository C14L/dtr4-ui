(function(){

    // 

    angular.module( 'dtr4' ).factory( 'FindCity', FindCity );

    FindCity.$inject = [ '$http' ];

    function FindCity( $http ){

        var _this = this;
        this.getPosition = getPosition;

        ///////////////////////////////////////////////////

        function getPosition(){
            // See http://diveintohtml5.info/geolocation.html

            return new Promise( function( resolve, reject ){
                try {
                    navigator.geolocation.getCurrentPosition( function( loc, timestamp ){
                        // With (loc.coords.latitude, loc.coords.longitude, 
                        // and loc.coords.accuracy) look up the nearest city
                        // in Geonames database.
                        var url = '/api/v1/city-by-latlng.json';
                        var params = {
                            'params': {
                                'latitude': loc.coords.latitude,
                                'longitude': loc.coords.longitude,
                                'accuracy': loc.coords.accuracy,
                            },
                        };

                        $http.get( url, params ).success(
                            function( data ){ resolve(data); },
                            function( err ){ reject(err); }
                        );
                    });
                }
                catch(err) {
                    reject(err);
                }
            });
        }

        return _this;
    }
})();