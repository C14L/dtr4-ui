(function(){ 'use strict';

    // Only PNASL data. The user has to fill out all the fields
    // to be able to use the site.

    angular.module( 'dtr4' ).controller( 'SettingsProfileController', SettingsProfileController ); 
    
    SettingsProfileController.$inject = [ '$rootScope', '$scope', '$http', '$timeout', 
                                          'Cities', 'Profile', 'upload', 'appBarTitle', 
                                          'SharedFunctions', 'FindCity' ];

    function SettingsProfileController( $rootScope, $scope, $http, $timeout, 
                                        Cities, Profile, upload, appBarTitle, 
                                        SharedFunctions, FindCity ){

        $scope.translations = SharedFunctions.translations;
        $scope.showLatLng = ("geolocation" in navigator); // hide button if not supported
        $scope.currSel = 'profile';
        $scope.maxPics = window.PROFILE_MAX_PICS;
        $scope.crcByLatLngLoading = false;
        $scope.crcByLatLng = '';

        $scope.submitForm = submitForm;
        $scope.findCityByLatLng = findCityByLatLng;
        $scope.update_cities = update_cities;
        $scope.resetVals = resetVals;
        $scope.onUpload = onUpload;
        $scope.onSuccess = onSuccess;
        $scope.onError = onError;
        $scope.onComplete = onComplete;
        $scope.deletePic = deletePic;
        $scope.setProfilePic = setProfilePic;

        activate();

        ///////////////////////////////////////////////////

        function activate() {
            appBarTitle.primary = $scope.tr( 'edit' );
            appBarTitle.secondary = $scope.tr( 'profile basics' );
            $scope.authuserPromise.then( function(){
                $scope.resetVals();
                $scope.update_cities( $scope.authuser.country, $scope.authuser.city ); // init correct city
            });
        }

        function setPnaslOk(){
            // After every user update of the PNASL data, check if
            // is all filled in, and set pnasl_ok accordingly.
            $rootScope.authuser.pnasl_ok = ( 
                            !!$rootScope.authuser['pic'] &&
                            !!$rootScope.authuser['dob'] &&
                            !!$rootScope.authuser['gender'] &&
                            !!$rootScope.authuser['crc']);
        }

        function submitForm(){
            // submit profile data, same as in "SettingsDetailsController".
            var data = {};
            var url = '/api/v1/authuser.json';

            angular.forEach( $scope.settingsProfileForm, function( v, k ){
                if( k && (k[0] != '$') && v.$dirty ){
                    if (k == 'dob') {
                        data[k] = $scope.authuser[k].toISOString().substr(0, 10); // YYYY-MM-DD only.
                    } else {
                        data[k] = $scope.authuser[k];
                    }
                }
            } );
            // TODO: Check if "dob" field has a valid format. 
            // Expected: "YYYY-MM-DD". Then convert to JS date.
            if( $scope.settingsProfileForm.$dirty ){
                $scope.isSubmitting = true;
                $http.post( url, data ).success( function( data ){
                    // Copy the new settings over the the global authuser.
                    $rootScope.authuser = $scope.authuser;
                    setPnaslOk();
                    // remove old vals from Profile buffer
                    Profile.clearFromBuffer( $scope.authuser.username );
                    // set form and fields to "not dirty"
                    $scope.settingsProfileForm.$setPristine( );
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                } ).error( function( err ){
                    alert( $scope.tr('There was an error, please try again. Are you online?') );
                    $scope.isSubmitting = false;
                } );
            }
        }

        function findCityByLatLng(){
            $scope.crcByLatLngLoading = true;

            FindCity.getPosition().then( function( data ){
                // set authuser data
                $scope.authuser['city'] = data['id'];
                $scope.authuser['country'] = data['country'];
                $scope.authuser['crc'] = data['crc'];
                $scope.authuser['lat'] = data['lat'];
                $scope.authuser['lng'] = data['lng']; 
                $scope.update_cities( data['country'], data['id'] );
                // have to set the form "dirty" manually
                $scope.settingsProfileForm['city'].$dirty = true;
                $scope.settingsProfileForm['country'].$dirty = true;
                $scope.settingsProfileForm['lat'].$dirty = true;
                $scope.settingsProfileForm['lng'].$dirty = true;
                $scope.settingsProfileForm.$setDirty( );
                // pretty display
                $scope.crcByLatLngLoading = false;
                $scope.crcByLatLng = data['crc'];
            })
            .catch( function( err ){
                $scope.crcByLatLngLoading = false;
                $scope.crcByLatLng = $scope.tr('error: could not find location');
            });
        }

        function update_cities( country, city ){
            // load city options for given country and set city, if selected.
            if( !country ) return;
            Cities.inCountry( country ).then( function( data ){
                $scope.cities = data;
            });
        }

        // pic upload stuff
        function resetVals(){
            $scope.showImageButton = true;
            $scope.showImageUploading = false;
            $scope.showImageSuccess = false;
            $scope.showImageError = false;
        }

        function onUpload( files ){
            // TODO: add the csrfmiddlewaretoken here.
            $scope.showImageButton = false;
            $scope.showImageUploading = true;
        }

        function onSuccess( response ){
            var data = response['data'];
            $scope.authuser['pics'].unshift( data.pic );
            $scope.authuser['pics_url'].unshift( SharedFunctions.get_pic_urls( data.pic ) );
            if( ! $scope.authuser['pic'] ){
                $scope.authuser['pic'] = data.pic;
                $scope.authuser['pic_url'] = SharedFunctions.get_pic_urls( data.pic );
            }
            $scope.showImageSuccess = true;
        }

        function onError(response){  
            $scope.showImageError = true;
        }

        function onComplete(response){
            $scope.showImageUploading = false;
            $timeout( $scope.resetVals, 1000 );
            setPnaslOk();
        }

        function deletePic(){
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

        function setProfilePic(){
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
