$(document).ready(function(){

    var re = /^\/u\/([a-zA-Z0-9_-]{3,60})\/?$/;
    var username = location.pathname.match(re)[1];
    if (username == null) return;

    $.get('/api/v1/profile.json', { 'username':username }, function(data){
        console.log(data);
        $.each(data, function(k, v){
            var sel = '[data-display="' + k + '"]';
            console.log('Setting content in "'+sel+'" to "'+v+'".');
            $(sel).html(v);
        });
        window.profileuser = data;

        // Calculate how many small pics we need to fill the screen.
        // Each .profilelinks pic is 50px+6px width, and there is a 20px margin
        // on either side of the list.
        var param = {
            count: Math.floor(($(window).width()-40)/56),
            gender: profileuser.gender,
            minage: 18,
            maxage: 99,
            city: profileuser.city,
            dist: 50,
        }
        render_search_results('#profilelinks', param);
        render_latest_messages('#messages-list', { user:window.profileuser['id'], count:20 });
        render_pics();
        render_send_message_pic();
    });

    // Activate clickable elements
    $('.profile.messages form').on('submit', function(e){
        e.preventDefault(); e.stopPropagation();
        var param = {}
        param["to"] = window.profileuser['id'];
        param["msg"] = $(this).find('textarea').val();
        param['csrfmiddlewaretoken'] = get_csrf_token();
        var cls = 'sent';
        var pic = get_pic_url(window.authuser['pic'], 'small');
        var ts = Math.round(Date.now()/1000);
        var html = '<div class="item ' + cls + '">' +
              '<img class="userpic" src="' + pic + '" alt="">' +
              '<span class="timestamp" data-timestamp="' + ts + '"></span>' +
              '<span class="text">' + param['msg'] + '</span>' +
              '</div>';
        $('#messages-list').prepend(html);
        $(this).find('textarea').val('').focus();
        $.post('/api/v1/msgs.json', param, function(){
            update_time_deltas();
        }).error(function(err){
            $('#messages-list div.item:first-child').remove();
        });
    });

    $('.profile.picdata').on('click', '.userpic', function(e){
        e.preventDefault();
        var clicked = (e.target.attributes['href'] || e.target.parentElement.attributes['href']).value;
        picviewer(get_pic_url(window.profileuser['pics'], 'large'),
                  get_pic_url(window.profileuser['pics'], 'small'), clicked);
    });
});


function render_pics(){
    var i=1, max_pics=9, lpic=get_pic_url(window.profileuser['pic'], 'large');

    $('.profile.picdata > a.userpic.large').attr('href', lpic)
            .css({ 'background-image': 'url(' + lpic + ')' });

    window.profileuser['pics'].forEach(function(row){
        if (row != window.profileuser['pic'] && i <= max_pics) {
            var spic = get_pic_url(row, 'medium');
            var lpic = get_pic_url(row, 'large');
            $('.profile.picdata > a.userpic.small:nth-child(' + (++i) + ')')
                    .attr('href', lpic).css({ 'background-image': 'url(' + spic + ')' });
        }
    });
    

}

function render_send_message_pic(){
    // Add the authuser profile pic to the send messaages textarea background.
    var pic = get_pic_url(window.authuser['pic'], 'small');
    var css = { 'background-image': 'url(' + pic + ')' };
    $('.profile.messages > .form > textarea').css(css);
}

function render_latest_messages(sel, param){
    if (!window.authuser) { window.location = "/" }
    $.get('/api/v1/msgs.json', param, function(data){

        console.log(data);

        var cls = pic = html = '';
        data.forEach(function(row, i){
            if (row['user'] == window.authuser['id']) {
                cls = 'sent';
                pic = get_pic_url(window.authuser['pic'], 'small');
            } else {
                cls = 'recv';
                pic = get_pic_url(window.profileuser['pic'], 'small');
            }
            html += '<div class="item ' + cls + '">' +
              '<img class="userpic" src="' + pic + '" alt="">' +
              '<span class="timestamp" data-timestamp="' + row['ts'] + '"></span>' +
              '<span class="text">' + row['msg'] + '</span>' +
              '</div>';
        });
        $(sel).prepend(html);
        update_time_deltas();

    }).error(function(err){
        //pass
    });
}
