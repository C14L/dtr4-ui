(function() { 'use strict';

    angular
        .module( 'dtr4' )
        .factory( 'Translate', TranslateService );

    TranslateService.$inject = [];

    function TranslateService() {
        return {
            tr: tr,
        };
        
        ////////////////

        function tr( str, arr ) {
            // return a translation string from TR_LANGUAGE. If str is not found in 
            // TR_LANGUAGE, then return str with {n} values replaced accordingly.
            // 
            // str: String to be translated. can include {0}, {1}, ... {n} placeholders
            //      to be substituted by the relative value in the arr Array.
            // arr: optional Array with values that are inserted into the str String at
            //      the position of {n} = arr[n]. If {n} is not found, ignore arr[n], 
            //      and if arr[n] is not found in str, then ignore it, too.
            var msgstr = str; // default to original str.

            if ( ! TR_LANGUAGE ){
                console.log('TRANSLATION FILE MISSING!');
                // Continue, will use the strings contained in the app.
            }

            // find translation
            if ( typeof(TR_LANGUAGE) == 'object' ){
                for( var i = 0; i < TR_LANGUAGE.length; i++ ){
                    // found translation!
                    if( TR_LANGUAGE[i] && TR_LANGUAGE[i]['msgid'] == str ){
                        msgstr = TR_LANGUAGE[i]['msgstr'];
                        break;
                    }
                }
            }

            // replace untranslatable values
            if ( arr && arr[0] ){
                for( var i = 0; i < arr.length; i++ ){
                    // since javascript doesn't have global replace for String, do split and join
                    if( typeof(arr[i]) == 'string' || typeof(arr[i]) == 'number' ){
                        msgstr = msgstr.split( '{'+i+'}' ).join( arr[i] );
                    }
                }
            }

            return msgstr;            
        }
    }
})();

