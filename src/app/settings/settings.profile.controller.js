(function(){ 'use strict';

    // Only PNASL data. The user has to fill out all the fields
    // to be able to use the site.

    angular.module( 'dtr4' ).controller( 'SettingsProfileController', SettingsProfileController ); 
    
    SettingsProfileController.$inject = [ '$rootScope', '$scope', '$http', '$timeout', 
                                          'Cities', 'Profile', 'upload', 'appBarTitle', 
                                          'SharedFunctions', 'FindCity', 'SettingsProfile', 
                                          'PROFILE_MAX_PICS' ];

    function SettingsProfileController( $rootScope, $scope, $http, $timeout, 
                                        Cities, Profile, upload, appBarTitle, 
                                        SharedFunctions, FindCity, SettingsProfile,
                                        PROFILE_MAX_PICS ){

        $scope.translations = SharedFunctions.translations;
        $scope.showLatLng = ("geolocation" in navigator); // hide button if not supported
        $scope.currSel = 'profile';
        $scope.maxPics = PROFILE_MAX_PICS;
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
            if( ! $scope.settingsProfileForm.$dirty ){ return }
            $scope.isSubmitting = true;
            $scope.authuserPromise.then( function(){
                SettingsProfile.submitForm( $scope.settingsProfileForm ).then( function( data ){
                    // Copy the new settings over the the global authuser.
                    $rootScope.authuser = $scope.authuser;
                    setPnaslOk();
                    // remove old vals from Profile buffer
                    Profile.clearFromBuffer( $scope.authuser.username );
                    // set form and fields to "not dirty"
                    $scope.settingsProfileForm.$setPristine();
                    $scope.isSubmitting = false;
                    $scope.isSubmitSuccess = true;
                    $timeout( function(){ $scope.isSubmitSuccess = false }, 1000 );
                })
                .catch( function( err ){
                    alert( $scope.tr('There was an error, please try again. Are you online?') );
                    $scope.isSubmitting = false;
                });
            });
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
            SettingsProfile.deletePic( this['url'] );
        }

        function setProfilePic(url){
            var bak = $scope.authuser['pic']; // in case we need to restore on network failure
            $scope.authuser['pic_url'] = this['url'];
            SettingsProfile.setProfilePic( this['url'] ).catch( function(){
                $scope.authuser['pic_url'] = bak;
                // TODO: Display toast with error message.
            });
        }
    }
})();
