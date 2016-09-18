(function(){ 'use strict';

    angular.module( 'dtr4' ).directive( 'usercardItem', UsercardItem );

    UsercardItem.$inject = [];

    // TODO: maybe create a common "user card" tag. 
 
    function UsercardItem() {
        return {
            'restrict': 'E',
            'template': '<div class="usercard-item"></div>',
            'scope': { },
        }
    }
})();
