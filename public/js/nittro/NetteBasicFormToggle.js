_context.invoke('App', function (Nette) {

    var NetteBasicFormToggle = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };

        this._.snippetManager.on('after-update', this._handleUpdate.bind(this));
    }, {
        _handleUpdate: function() {
            var forms = [].slice.call(document.getElementsByTagName('form'));
            forms.forEach(Nette.toggleForm);
        }
    });

    _context.register(NetteBasicFormToggle, 'NetteBasicFormToggle');

}, {
    Nette: 'Nittro.Forms.Vendor'
});
