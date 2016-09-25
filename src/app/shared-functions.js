(function(){ 'use strict';

    // Helper functions that can be used by all parts.

    angular.module('dtr4').factory('SharedFunctions', SharedFunctions);

    SharedFunctions.$inject = [ 'ONLINE_SECONDS_SINCE_LAST_ACTIVE', 'IDLE_SECONDS_SINCE_LAST_ACTIVE', 
                                'BASE_URL', 'MEDIA_URL' ];

    function SharedFunctions( ONLINE_SECONDS_SINCE_LAST_ACTIVE, IDLE_SECONDS_SINCE_LAST_ACTIVE, 
                              BASE_URL, MEDIA_URL ) {

        var _this = this;
        _this.translations = {};
        _this.translationsPromise;
        _this.get_choice_tr = get_choice_tr;
        _this.complete_user_pnasl = complete_user_pnasl;
        _this.get_pics_urls = get_pics_urls;
        _this.get_pic_urls = get_pic_urls;
        _this.get_pic_url = get_pic_url;
        _this.get_profile_url = get_profile_url;
        _this.get_city_name_from_crc = get_city_name_from_crc;
        _this.get_country_name_from_crc = get_country_name_from_crc;
        _this.get_time_delta_seconds = get_time_delta_seconds;
        _this.get_time_delta = get_time_delta;

        activate();

        ///////////////////////////////////////////////////

        function activate() {
            loadChoiceTranslations();
        }

        function loadChoiceTranslations() {
            // Get translations data into ng $rootScope, used for example in
            // settings-proile.html template. //window.TR_CHOICES
            _this.translationsPromise = fetch('/static/app/lang/tr-choices-es.json')
            .then( function( res ) { return res.json() })
            .then( function( res ) { _this.translations = res });
        }

        function get_choice_tr( key, sel ){
            key = key.toUpperCase();
            try {
                for ( var i = 0; i < _this.translations[key].length; i++ ){
                    if( _this.translations[key][i][0] == sel ){
                        return _this.translations[key][i][1];
                    }
                }
            } catch( e ){ } // pass
            return '';
        }

        function complete_user_pnasl( pnasl ){
            // completes a the basic "pnasl" data on one user
            if( pnasl['username'] ) pnasl['profile_url'] = get_profile_url( pnasl['username'] );
            if( pnasl['pic'] ) pnasl['pic_url'] = get_pic_urls( pnasl['pic'] );
            if( pnasl['crc'] ){
                pnasl['city_name'] = pnasl['crc'].split( ',' )[0];
            }
            if( pnasl['gender'] ){
                pnasl['gender_choice'] = get_choice_tr( 'gender_choice', pnasl['gender'] );
                pnasl['gender_short'] = get_choice_tr( 'gender_short', pnasl['gender'] );
                pnasl['gender_choice_symbol'] = get_choice_tr( 'gender_choice_symbol', pnasl['gender'] );
            }
            if( pnasl['last_active'] ){
                var delta_secs = get_time_delta_seconds( pnasl['last_active'] );
                pnasl['last_active_delta'] = get_time_delta( pnasl['last_active'] );
                pnasl['is_online'] = delta_secs < ONLINE_SECONDS_SINCE_LAST_ACTIVE;
                pnasl['is_idle'] = !pnasl['is_online'] && delta_secs < IDLE_SECONDS_SINCE_LAST_ACTIVE;
                pnasl['is_offline'] = !pnasl['is_online'] && !pnasl['is_idle'];
            }
            return pnasl;
        }

        function get_pics_urls(pic_id_list){
            // Returns all URLs for a list of pics at once.
            var urls = [];
            for(var i=0; i<pic_id_list.length; i++) urls[i] = get_pic_urls(pic_id_list[i]);
            return urls;
        }

        function get_pic_urls(pic_id){
            // Returns an dict of pic URLs: { 'id': ID, small': URL, 'medium': URL, 'large': URL }
            // If pic_id was invalid, then URL is a placeholder image URL.
            var placeholder = '/static/placeholder.jpg';
            var pics_per_subdir = 10000;
            var sizes = [ "small", "medium", "large" ];
            var szdirs = [ "s", "m", "x" ];
            var urls = { "id": pic_id };

            if(!pic_id || pic_id != parseInt(pic_id) || pic_id < 1)
                return { "id": pic_id, "small": placeholder, "medium": placeholder, "large": placeholder };

            for(var i=0; i<sizes.length; i++){
                var size = sizes[i];
                var szdir = szdirs[i];
                var subdir = Math.floor(pic_id / pics_per_subdir);
                urls[size] = MEDIA_URL + szdir + '/' + subdir + '/' + pic_id + '.jpg';
            };

            return urls;
        }

        function get_pic_url(pic_id, size){
            // Return the URL path to a user uploaded picture.
            // If "pic_id" is an Array of picture IDs, then returns a corresponding 
            // Array of picture URLs in the given "size".
            var placeholder = '/static/placeholder.jpg';
            var pics_per_subdir = 10000;
            var sizes = ["small","medium","large"];
            var szdirs = ["s","m","x"];
            var i = sizes.indexOf(size)
            if(!pic_id || pic_id != parseInt(pic_id) || pic_id < 1) return placeholder;
            var szdir = szdirs[i]

            var getUrl = function(n){
                var subdir = Math.floor(n / pics_per_subdir);
                return MEDIA_URL + szdir + '/' + subdir + '/' + n + '.jpg';
            }

            if (typeof(pic_id) == 'object') {
                var urls = [];
                for (i = 0; i < pic_id.length; i++) urls[i] = getUrl(pic_id[i]);
            } else {
                urls = getUrl(pic_id);
            }

            return urls;
        }

        function get_profile_url(username){
            return  BASE_URL + 'profile/' + username;
        }

        function get_city_name_from_crc(crc){
            if (crc == '') return '';
            return crc.split(', ')[0];
        }

        function get_country_name_from_crc(crc){
            if (crc == '') return '';
            return crc.split(', ')[-1];
        }

        function get_time_delta_seconds(ts){
            var now = new Date().getTime() / 1000;
            var ts_time = new Date( ts ).getTime() / 1000;
            return Math.floor( now - ts_time );
        }

        function get_time_delta(ts){
            var unit = 'seconds ago';
            var dif = get_time_delta_seconds(ts);

            if (dif > 59) { dif /= 60; unit = 'minutes ago';
                if (dif > 59) { dif /= 60; unit = 'hours ago';
                    if (dif > 23) { dif /= 24; unit = 'days ago';
                        if (dif > 29) { dif /= 30; unit = 'months ago';
                            if (dif > 11) { dif /= 12; unit = 'years ago'; 
            } } } } }
            
            if (dif < 0) dif = 0;
            
            return Math.floor(dif) + ' ' + unit;
        }


        return _this;
    }
})();
