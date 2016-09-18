(function(){ 'use strict';

    // list or recent pics for mods

    angular.module( 'dtr4' ).controller( 'PicturesController', PicturesController );

    PicturesController.$inject = [ '$scope', '$http', 'appBarTitle', 'SharedFunctions' ];

    function PicturesController( $scope, $http, appBarTitle, SharedFunctions ){

        $scope.picslist = [];
        $scope.statusMsg = '';
        $scope.loadMore = loadMore;
        $scope.deletePicture = deletePicture;

        activate();

        ///////////////////////////////////////////////////

        function activate(){
            appBarTitle.primary = $scope.tr( 'pictures' );
            appBarTitle.secondary = '';

            loadMore();
        }

        function loadMore(){
            var url = '/api/v1/pics/all.json';
            var params = {'params': { 'below_id': 0 } };
            $scope.statusMsg = 'loading';

            if( $scope.picslist.length > 0 )
                params['params']['below_id'] = $scope.picslist[$scope.picslist.length-1]['id'];

            $http.get( url, params ).success( function( data ){
                for( var i=0; i<data.length; i++ ){
                    data[i]['urls'] = SharedFunctions.get_pic_urls( data[i]['id'] );
                    // split date and time to fit it onto the pics.
                    var tmp = data[i]['created'].split( 'T' );
                    data[i]['created_date'] = tmp[0];
                    data[i]['created_time'] = tmp[1];
                    // append ("push") to $scope.picslist
                    $scope.picslist.push( data[i] );
                }
                $scope.statusMsg = '';
            } ).error( function( err ){
                $scope.statusMsg = 'error';
            } );
        }

        function deletePicture( id ){
            var url = '/api/v1/authuser/pics/' + id + '.json';

            $http.delete( url ).success( function( data ){
                var idx = get_index( $scope.picslist, 'id', id );
                $scope.picslist[idx]['is_deleted'] = true;
            });
        }
    }
})();
