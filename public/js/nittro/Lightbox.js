_context.invoke('App', function () {

	var Lightbox = _context.extend(function(snippetManager) {
		this._ = {
			snippetManager: snippetManager,
			lightbox: null
		};

		this._.snippetManager.on('after-update', this._handleUpdate.bind(this));

	}, {
		_handleUpdate: function () {
			if (!this._.lightbox) {
				this._.lightbox = $('a[data-lightbox]').simpleLightbox();

			} else {
				this._.lightbox.refresh();

			}
		}
	});

	_context.register(Lightbox, 'Lightbox');

});