//
// Display an overlay picviewer for a list of pictures.
//
// Call with: 
//
// picviewer(pics, pic)
//     pics_list   -> Array of full size picture URLs.
//     thumbs_list -> Array of small picture URLs, same order as above.
//     initial_pic -> URL of the first large pic to show, must be part of "pics_list".
//

function picviewer(pics_list, thumbs_list, initial_pic) {

    var KEY_BACKSPACE = 8;
    var KEY_ESC = 27;
    var KEY_SPACE = 32;
    var KEY_ARROW_LEFT = 37;
    var KEY_ARROW_UP = 38;
    var KEY_ARROW_RIGHT = 39;
    var KEY_ARROW_DOWN = 40;

    var THUMBSLIST_PIC_PER_ROW = 5; // In the preview thumbs list, how many pics are shown per line?

    // TODO: Create the necessary DOM nodes here so that no HTML template 
    //       is needed.
    document.getElementById('pic-viewer').classList.toggle('active');

    // Find the Array index in "piclist" for a picid "id".
    var getIndexByUrl = function(url){
        for (i = 0; i < pics_list.length; i++) if (pics_list[i] == url) return i;
        return false;
    }

    // Buffer DOM elements
    var elPicViewer = document.getElementById('pic-viewer');
    var elPicViewerPic = document.getElementById('pic-viewer-pic');
    var elPicViewerData = document.getElementById('pic-viewer-data');
    var elPicViewerPicslist = document.getElementById('pic-viewer-picslist');
    var elImg = elPicViewerPic.getElementsByClassName('img')[0];
    var elImgPrevBtn = elPicViewerPic.getElementsByClassName('prev')[0];
    var elImgNextBtn = elPicViewerPic.getElementsByClassName('next')[0];
    var picIndex = getIndexByUrl(initial_pic); // Always the Array index of current pic.
    var picThumbUrl = thumbs_list[picIndex]; // Get the URL of the thumb pic.

    // Show a thumbnails list in the sidebar.
    var showThumbsList = function(){
        elPicViewerPicslist.innerHTML = '';
        for (i = 0; i < thumbs_list.length; i++){
            var elA = document.createElement('a');
            var elImg = document.createElement('img');
            elImg.setAttribute('src', thumbs_list[i]);
            elA.setAttribute('href', pics_list[i]);
            elA.onclick = function(e) {
                e.preventDefault();
                var url = (e.target.attributes['href'] || e.target.parentElement.attributes['href']).value;
                showPic(url);
            }
            elA.appendChild(elImg);
            elPicViewerPicslist.appendChild(elA);
        }
    }

    // Show the full size picture with url url.
    var showPic = function(picUrl){

        // Find the index of this pic in the pics_list
        var newPicIndex = getIndexByUrl(picUrl);
        if (newPicIndex === false) return false;
        picIndex = newPicIndex;
        picThumbUrl = thumbs_list[picIndex];

        // Set prev/next buttons and load the large image.
        var hasPrev = pics_list[picIndex - 1] !== undefined;
        var hasNext = pics_list[picIndex + 1] !== undefined;
        elImgPrevBtn.style.visibility = hasPrev ? 'visible' : 'hidden';
        elImgNextBtn.style.visibility = hasNext ? 'visible' : 'hidden';

        // Show the full size picture.
        elImg.style.backgroundImage = 'url(' + picUrl + ')';

        // Remove "active" class from all thumbs.
        var a = elPicViewerPicslist.getElementsByTagName('a');
        for (i=0; i<a.length; i++) { a[i].classList.remove('active'); }

        // And find the active thumb and set it "active".
        var q = 'a[href="' + picUrl + '"]';
        var picActive = elPicViewerPicslist.querySelector(q);
        picActive.classList.add('active');
    }

    // Initialize viewer.
    showThumbsList();
    showPic(initial_pic);

    // Left or Right arrow clicked.
    elImgPrevBtn.onclick = function(){ showPic(pics_list[picIndex - 1]); }
    elImgNextBtn.onclick = function(){ showPic(pics_list[picIndex + 1]); }

    // Close button clicked.
    document.getElementById('pic-viewer-close').onclick = function(e){
        e.preventDefault();
        document.getElementById('pic-viewer').classList.toggle('active');
    };

    document.onkeydown = function(e) {
        var elPicViewer = document.getElementById('pic-viewer');
        //if (elPicViewer.classList.indexOf('active') < 0) return; // Only if picviewer is visible.
        e = e || window.event;
        if (e.keyCode == KEY_ARROW_LEFT || e.keyCode == KEY_BACKSPACE) showPic(pics_list[picIndex - 1]);
        if (e.keyCode == KEY_ARROW_RIGHT || e.keyCode == KEY_SPACE) showPic(pics_list[picIndex + 1]);
        if (e.keyCode == KEY_ARROW_UP) showPic(pics_list[picIndex - THUMBSLIST_PIC_PER_ROW]);
        if (e.keyCode == KEY_ARROW_DOWN) showPic(pics_list[picIndex + THUMBSLIST_PIC_PER_ROW]);
        if (e.keyCode == KEY_ESC) elPicViewer.classList.toggle('active');
    };

}
