
/*

It should do the stuff client side and apply some *very* **basic** markdown, but
mainly it should auto convert links to youtube videos or imgur pictures into
clickable inline content, everytime a text (Profile texts, Talk post) is 
rendered.

That's all.

*/

// define regexps outside the function, so they are only compiles once

RE_HASHTAG = [ 
        new RegExp( '(\\\s|^)\\\#(\\\w{2,50})(?=\\\W|$)', 'gi' ),
        '$1<a class="hashtag" href="/app/talk/topic/$2">#$2</a>',
    ];

RE_USERNAME = [
        new RegExp( '(\\\s|^)\\\@(\\\w{2,30})(?=\\\W|$)', 'gi' ),
        '$1<span class="username-talk-link"><a class="username" href="/app/people/$2">@$2</a><span class="icon-box"><a href="/app/talk/people/$2" class="usertalk ti-announcement"></a><a href="/app/people/$2" class="userprofile ti-user"></a></span></span>',
    ];
RE_HREF_WWW = [ // www.example.com/any/where?da=duh
        new RegExp( '(\\\s|^)(www\.[a-zA-Z0-9-\.]+(?:/\\\w+)?)(\\\s|$)', 'gi' ),
        ' $1http://$2$3 ',
    ];
RE_MARKDOWN_STYLE_LINK = [ // [some text to become linked](http://example.com/link.html)
        new RegExp( '\\\[([^\\\]]+)\\\]\\\((https?://[^\\\)]+)\\\)', 'gi' ),
        '<a href="$2" rel="nofollow">$1</a>',
    ];


// Youtube embedding: http://www.youtube.com/watch?v=CFerHmcjNcc&feature=youtu.be
// http://www.youtube.com/watch?v=-tJYN-eG1zk&feature=bf_next&list=MLGxdCwVVULXeY3WC3FHdvLJCD2wPy0lIL&index=3
RE_YOUTUBE_COM_VIDEO = [
        new RegExp( "(\\\s|\\\n|^)https?://www\\\.youtube\\\.com/watch\\\?v=([a-zA-Z0-9_-]+)[^\\\s\\\n$]*", 'gi' ),
        '$1<iframe class="embedded video youtube" src="//www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe>',
    ];
// Youtube shortlinks: http://youtu.be/MloBWyjwsgY
RE_YOUTU_BE_VIDEO = [
        new RegExp( '(\\\s|\\\n|^)https?://youtu\\\.be/([a-zA-Z0-9_-]+)[^\\\s]*(\\\s|\\\n|$)', 'gi' ),
        '$1<iframe class="embedded video youtube" src="//www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe>$3',
    ];

// Imgur image links: http://i.imgur.com/MloBWyjwsgY.(jpg|gif)
// Load the thumbnail image by adding a "b" at the end of the image name,
// e.g. http://i.imgur.com/xZkwUmP.jpg --> http://i.imgur.com/xZkwUmPb.jpg
// and use a ".jpg" extension for thumbs always.
RE_IMGUR_IMAGE_LINK = [
        new RegExp( "https?://(?:i\\\.)?imgur\\\.com/([a-zA-Z0-9_-]+)[slb]?(?:\\\.jpg|\\\.gif|\\\.png)/?", 'gi' ),
        ' <a href="http://i.imgur.com/\$1.jpg"><img class="embedded image imgur" src="http://i.imgur.com/$1b.jpg" alt=""></a> ',
    ];

// Imgur subreddit image links: http://imgur.com/r/wtf/rXbFJD3
RE_IMGUR_SUBREDDIT_LINK = [
        new RegExp( "https?://imgur\\\.com/r/[a-zA-Z0-9_-]+/([a-zA-Z0-9_-]+)/?", 'gi' ),
        ' <a href="http://i.imgur.com/$1.jpg"><img class="embedded image imgur" src="http://i.imgur.com/$1b.jpg" alt=""></a> ',
    ];

// photobucket.com : they do some weird anti-embedd redir voodoo, so just ignore them.
// tinypic.com : they do some weird anti-embedd redir voodoo, so just ignore them.
// blogspot.com : http://1.bp.blogspot.com/_idTv-GGWH0M/TJ4HPdvTwyI/AAAAAAAABAs/GgO5nPdeH38/s1600/rosa-azul.jpg

// Generic image file link for any other pics
RE_IMAGE_FILE_LINK = [
        new RegExp( "(\\\s|^)(https?://[a-z0-9\.-]+/[^\\\s\\\"'>]+\.)(jpe?g|gif|png|bmp)(?:\\\s|$)", 'gi' ),
        '$1<a href="$2$3"><img class="embedded image others" src="$2$3" alt=""></a> ',
    ];

// All other links, just make them clickable. They have to start at the 
// beginning of the string or with a whitespace, to avoid re-linking stuff in
// <a href="http://...">http://... tags that is already linked.
// https://example.com/some/thing.html?else=here
RE_HREF_HTTP = [
        new RegExp( '(\\\s|^)(https?://\\\S+)(\\\s|$)', 'gi' ),
        '$1<a href="$2" rel="nofollow">$2</a>$3',
    ];

// Remove non-UNIX standard newline stuffs that Windows or Apple may still add.
RE_FIX_NONSTANDARD_NEWLINES = [ new RegExp( '\\\r', 'g' ), '' ];
// Remove too many (more than 3) newlines in a row.
RE_FIX_TOO_MANY_NEWLINES = [ new RegExp( '\\\n{4,}', 'g' ), '\n\n\n' ];
// newlines into HTML newlines
RE_PARAGRAPH = [ new RegExp( '\\\n', 'g' ), '\n<br>\n' ];

function textfilter( str ){
    if( !str ) return '';
    str = str.replace( '<', '&lt;' ); // convert html tags to 
    str = str.replace( '>', '&gt;' ); // normal text first.
    str = str.replace( RE_FIX_NONSTANDARD_NEWLINES[0], RE_FIX_NONSTANDARD_NEWLINES[1] );
    str = str.replace( RE_FIX_TOO_MANY_NEWLINES[0], RE_FIX_TOO_MANY_NEWLINES[1] );

    str = str.replace( RE_HREF_WWW[0], RE_HREF_WWW[1] ); // www.x.com --> http://www.x.com
    str = str.replace( RE_USERNAME[0], RE_USERNAME[1] ); // @username --> <a href="...">@username</a>
    str = str.replace( RE_HASHTAG[0], RE_HASHTAG[1] ); // #hashtag --> <a href="...">#hashtag</a>
    str = str.replace( RE_MARKDOWN_STYLE_LINK[0], RE_MARKDOWN_STYLE_LINK[1] );
    str = str.replace( RE_PARAGRAPH[0], RE_PARAGRAPH[1] );
    str = str.replace( RE_IMGUR_IMAGE_LINK[0], RE_IMGUR_IMAGE_LINK[1] );
    str = str.replace( RE_IMGUR_SUBREDDIT_LINK[0], RE_IMGUR_SUBREDDIT_LINK[1] );
    str = str.replace( RE_YOUTUBE_COM_VIDEO[0], RE_YOUTUBE_COM_VIDEO[1] );
    str = str.replace( RE_YOUTU_BE_VIDEO[0], RE_YOUTU_BE_VIDEO[1] );

    // last
    str = str.replace( RE_HREF_HTTP[0], RE_HREF_HTTP[1] ); // http://www.x.com -> <a href="..."

    return str;
}


