/*  
 *  Since images may not always render correctly there is a button which allows you to view all the images of the page as a 
 *  Gallery. This is the logic to create and insert the images into the gallery. 
 */
"use strict";
var Gallery = (function () {

	/* used to show if there are any active galleries */
	window.ActiveGalleryFlag = false;

	/*  sanitizes string for outputting in gallery */
	function sanitizeString(string) {
		if (string === null) return null;
		return DOMPurify.sanitize(string);
	}

	function addImageToGallery(dataUri, gallery, extraText) {
		var maxCaptionLength = 100;
		if (extraText !== null && extraText.length > maxCaptionLength) {
			extraText = extraText.substr(0, maxCaptionLength) + '...';
		}

		extraText = sanitizeString(extraText);

		if (extraText == null) extraText = "";
		// his is weakeness since its outside csp (content security policy) of iframe and probably 
		// needs looking at again in terms of sanitization
		var html = '<a href="' + dataUri + '">';
		html += '<img alt="' + extraText + '" src="' + dataUri + '"/> </a>';
		var sel = "#" + gallery;
		var iFrameDOM = $("#galleries").contents();
		iFrameDOM.find(sel).append(html);
	}

	/**
	 * deletes and hides the gallery. 
	 */
	function deleteNHideGalleries() {
		window.ActiveGalleryFlag = false;
		$('#galleriesInput').val("Show the gallery");
		$('#dataURIGal').justifiedGallery('destroy');
		$('#dataURIGal').empty();
		$('#backgroundGal').justifiedGallery('destroy');
		$('#backgroundGal').empty();
		$('#cssGal').justifiedGallery('destroy');
		$('#cssGal').empty();
		$('#galleries').hide();
	};

	// allows single image to be added to gallery. 
	function updateGalleries() {
		// this allows update to add only newly added images without all processing needing doing again
		$('#commandtest').justifiedGallery('norewind');
	}

	function makeGalleries() {
		$('#galleries').toggle();
		if (window.ActiveGalleryFlag) {
			$('#galleriesInput').val("Show the gallery");

			return;
		}
		$('#galleriesInput').val("Hide Gallery");
		window.ActiveGalleryFlag = true;

		$('#dataURIGal').justifiedGallery({
			rowHeight: 140,
			lastRow: 'nojustify',
			margins: 10,
			randomize: false
		});

		$('#backgroundGal').justifiedGallery({
			rowHeight: 140,
			lastRow: 'nojustify',
			margins: 10,
			randomize: true
		});
		// idea is to leave this one as an extra renderer
		$('#cssGal').justifiedGallery({
			rowHeight: 140,
			lastRow: 'nojustify',
			margins: 10,
			randomize: true
		});
	}

	return {
		addImageToGallery: addImageToGallery,
		deleteNHideGalleries: deleteNHideGalleries,
		makeGalleries: makeGalleries
	}
})();