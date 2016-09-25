
function urlencode(str){
    return encodeURIComponent(str);
}

function urldecode(str){
    return decodeURIComponent( ( str+'' ).replace( /\+/g, '%20' ) );
}

function set_cookie(name, value, days){
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    // Replace any ";" in value with something else
    value = ('' + value).replace(/;/g, ',');
    document.cookie = urlencode(name) + "=" + urlencode(value) + expires + "; path=/";
}

function get_cookie(name){
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0)
            return urldecode(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function delete_cookie(name){
    setCookie(name, "", -1);
}

function get_csrf_token(){
    return get_cookie(window.CSRF_COOKIE_NAME);
}

function getLocalStorageObject(key){
    // Gets a string from localStorage, parses it as JSON, and returns the 
    // resulting object. If the sting is not JSON, throws an error. If the 
    // key does not exist in localStorage, returns null.
    var val = localStorage.getItem(key);
    return (val) ? JSON.parse(val) : null;
}

function setLocalStorageObject(key, val){
    // Gets a key name and a JSON object. Saves the object to localStorage after
    // converting it to a JSON string.
    return localStorage.setItem( key, JSON.stringify( val ) );
}

function log( msg ){
    if( window.LOG == true ){
        try { console.log( msg ) } catch( e ){ }
    }
}


// used for confirmed flags, mainly "match" and "friends" mutual flags.
function sort_by_confirmed_filter( a, b ){
    if( a['confirmed'] > b['confirmed'] ) return -1;
    if( a['confirmed'] < b['confirmed'] ) return 1;
    return 0;
}

function sort_by_created_filter( a, b ){
    if( a['created'] > b['created'] ) return -1;
    if( a['created'] < b['created'] ) return 1;
    return 0;
}

function get_index( arr, key, val ){
    // for lists of dicts. finds the dict that has a key with value val, and 
    // returns the dict's index value within the arr list.
    //
    // Example:
    // li = [{ 'id':5,'foo':'bar' },{ 'id':8,'baz':'zab' },{ 'id':2, 'di':'da'}]
    // get_index( li, 'baz', 'zab' )
    // --> 1
    // get_index( li, 'foo', 'bar' )
    // --> 0

    for( var i = 0; i < arr.length; i++ ){
        if( arr[i][key] == val ) return i;
    }
    return null;
}

// Returns the index of the item "sel" in Array "arr", that has the format of
// [ [id, val], [id, val], ..., [id, val] ] where "sel" is one of the "id"s.
// Return (-1) if the "sel" doesn't match any of the "id"s.
function helper_get_data_item_index(arr, sel){
    for(var i=0; i<arr.length; i++) if(arr[i][0]==sel) return i;
    return (-1);
};

function helper_get_data_item(arr, sel){
    return arr[ helper_get_data_item_index(arr, sel) ];
};

function get_latest_created( list ){
    // return the latest "created" value in all items of the list
    var latest = '';

    for( var i = 0; i < list.length; i++ ){
        if( latest < list[i]['created'] ) latest = list[i]['created'];
    }

    return latest;
}

function get_earliest_created( list ){
    // return the oldest "created" value in all items of the list
    var earliest = list[0]['created'];

    for( var i = 0; i < list.length; i++ ){
        if( earliest > list[i]['created'] ) earliest = list[i]['created'];
    }

    return earliest;
}

function combine_unique_by_id( arr1, arr2 ){
    // takes two lists of Objects (dicts) and combines them, returns an array.
    // both lists' objects need to have an "id" field as primary identifier.
    // any objects with duplicate "id" numbers are not added to the resulting
    // array.

    // some shortcuts
    if ( (!arr1 || arr1.length<1) && (!arr2 || arr2.length<1) ) return [];
    if ( !arr1 || arr1.length<1 ) return unique_by_id( arr2 );
    if ( !arr2 || arr2.length<1 ) return unique_by_id( arr1 );

    // there are really two arrays with items each. make sure both have all
    // unique items themselves.
    arr1 = unique_by_id( arr1 );
    arr2 = unique_by_id( arr2 );

    // loop and add elements from arr2 to arr1. skip if a duplicate is found.
    for( var i2=0; i2<arr2.length; i2++ ){
        var found = false;
        for( var i1=0; i1<arr1.length; i1++ ){
            if( arr1[i1]['id'] == arr2[i2]['id'] ){ found = true; break; }
        }
        if( !found ) arr1.push( arr2[i2] );
    }

    return arr1;
}

function unique_by_id( arr ){
    // gets a list of dicts, and each item is identified by an "id" field.
    // returs a list of items wth unique "id" values.
    var ret = [];
    if( !arr || arr.length<2 ) return arr;

    for( var i=0; i<arr.length; i++ ){
        var found = false;
        for( var j=0; j<ret.length; j++ ){
            if( arr[i]['id'] == ret[j]['id'] ){ found = true; break; }
        }
        if( !found ) ret.push( arr[i] );
    }

    return ret;
}

