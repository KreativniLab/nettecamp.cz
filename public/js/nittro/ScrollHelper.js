_context.invoke('App', function() {
    //
    function scrollTo(element, to, duration) {
        var start = element.scrollTop,
            change = to - start,
            increment = 20;

        var animateScroll = function(elapsedTime) {
            elapsedTime += increment;
            var position = easeInOut(elapsedTime, start, change, duration);
            element.scrollTop = position;
            if (elapsedTime < duration) {
                setTimeout(function() {
                    animateScroll(elapsedTime);
                }, increment);
            }
        };

        animateScroll(0);
    }

    function easeInOut(currentTime, start, change, duration) {
        currentTime /= duration / 2;
        if (currentTime < 1) {
            return change / 2 * currentTime * currentTime + start;
        }
        currentTime -= 1;
        return -change / 2 * (currentTime * (currentTime - 2) - 1) + start;
    }

    var ScrollHelper = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };

        this._.snippetManager.on('after-update', this._handleUpdate.bind(this));
    }, {
        _handleUpdate: function(evt) {
            if (evt.data.update && 'snippet--content' in evt.data.update) {
                // $('body, html').animate({scrollTop: $('#snippet--content').offset().top}, 300);
                window.setTimeout(function() {
                    scrollTo(document.body, 0, 300);
                }, 200);

            }
        }
    });

    _context.register(ScrollHelper, 'ScrollHelper');

});