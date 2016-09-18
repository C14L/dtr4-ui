(function(){ 'use strict';

    angular.module( 'dtr4' ).controller( 'SettingsPhotosController', SettingsPhotosController );

    SettingsPhotosController.$inject = [ '$scope', '$http', 'Profile', 'upload', '$timeout', 'appBarTitle' ];

    function SettingsPhotosController( $scope, $http, Profile, upload, $timeout, appBarTitle ){
        // Using template: tpl/settings-photos.html
        appBarTitle.primary = $scope.tr( 'edit' );
        appBarTitle.secondary = $scope.tr( 'photos' );
        $scope.currSel = 'photos';
        $scope.maxPics = window.PROFILE_MAX_PICS;

        $scope.resetVals = function( ){
            $scope.showImageButton = true;
            $scope.showImageUploading = false;
            $scope.showImageSuccess = false;
            $scope.showImageError = false;
        }
        $scope.onUpload = function( files ){
            // TODO: add the csrfmiddlewaretoken here.
            $scope.showImageButton = false;
            $scope.showImageUploading = true;
        }
        $scope.onSuccess = function( response ){
            var data = response['data'];
            $scope.authuser['pics'].unshift( data.pic );
            $scope.authuser['pics_url'].unshift( get_pic_urls( data.pic ) );
            if( ! $scope.authuser['pic'] ){
                $scope.authuser['pic'] = data.pic;
                $scope.authuser['pic_url'] = get_pic_urls( data.pic );
            }
            $scope.showImageSuccess = true;
        }
        $scope.onError = function(response){  
            $scope.showImageError = true;
        }
        $scope.onComplete = function(response){
            $scope.showImageUploading = false;
            $timeout( $scope.resetVals, 1000 );
        }
        $scope.resetVals();

        /*
        $scope.doUpload = function( ){
            upload({
                url: '/upload',
                method: 'POST',
                data: {
                    'csrfmiddlewaretoken': get_cookie('csrftoken'),
                    'aFile': $scope.myFile, // a jqLite type="file" element, upload() will extract all the files from the input and put them into the FormData object before sending.
                },
            }).then( 
                function (response) {
                    console.log(response.data); // will output whatever you choose to return from the server on a successful upload
                }, 
                function (response) {
                    console.error(response); //  Will return if status code is above 200 and lower than 300, same as $http
                }
            );
        };
        */

        $scope.deletePic = function( ){
            var pic = this['url'];
            log('--- $scope.deletePic ---')
            var url = '/api/v1/authuser/pics/' + pic['id'] + '.json';
            // remember the current state of the pics lists
            var pics_url_bak = $scope.authuser['pics_url']
            var pics_bak = $scope.authuser['pics']
            // find the array index of the item to remove
            var pics_url_idx = get_index( $scope.authuser['pics_url'], 'id', pic['id'] );
            var pics_idx = get_index( $scope.authuser['pics'], 'id', pic['id'] );
            // remove element from arrays
            $scope.authuser['pics_url'].splice(pics_url_idx, 1);
            $scope.authuser['pics'].splice(pics_idx, 1);
            // send request
            $http.delete( url ).success( function( data ){
                Profile.clearFromBuffer( $scope.authuser.username );
            } ).error( function( err ){
                // u-oh! restore the previous state of the pics lists
                $scope.authuser['pics_url'] = pics_url_bak;
                $scope.authuser['pics'] = pics_bak;
            } );
        }

        $scope.setProfilePic = function( ){
            log('--- SettingsPhotosController.$scope.setProfilePic -- Change profile pic...');
            var pic = this['url'];
            var data = { "pic": pic['id'] }
            var bak = $scope.authuser['pic']; // in case we need to restore on network failure
            $scope.authuser['pic_url'] = this['url'];
            log('--- SettingsPhotosController.$scope.setProfilePic -- change locally, now sending to server...');
            $http.post( '/api/v1/authuser.json', data ).success( function( ){
                log('--- SettingsPhotosController.$scope.setProfilePic -- Pic changed on server.');
                Profile.clearFromBuffer( $scope.authuser.username );
            } ).error( function( ){
                log('Something went wrong while authuser profile pic change')
                $scope.authuser['pic_url'] = bak;
            } );
        }
    }
})();
