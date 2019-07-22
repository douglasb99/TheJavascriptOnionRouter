/*  
 *
 *This file is a hack in terms of being a coherant module. I was trying to whitelist functions to 
 *run within IFRAME via nonces BUT then went againt this. These functions broadly pertain to 
 *the displaying and rendering of the recieved data in the iframe and intercepting and processing of link clicks with
 *in the iframe. 
 */
"use strict";

var Whitelisted = (function () {


	(function ($) {
		$.fn.serializeAllArray = function () {
			var obj = {};

			$('input', this).each(function () {
				obj[this.name] = $(this).val();
			});
			return $.param(obj);
		}
	})(jQuery);

/**
*
*If images or css is sent before the HTML of a page we queue it, and then when a html 
*page is loaded we look at the id of that request, and if there are images queued with that id we then afterwards insert 
*them into the page. 
*
*/
	function InsertQueuedImages() {
		var req = '',
			f = '';
		var type;
		for (var data in window.queuedImages) {
			if (window.queuedImages.hasOwnProperty(data)) {
				for (var reqidNo in window.queuedImages[data]) {
					if (window.queuedImages[data].hasOwnProperty(reqidNo)) {
						if (reqidNo == window.pageReqID) {
							var file = window.queuedImages[data][reqidNo];
							type = window.queuedImages[data]["type"];
							if (type === "background") {
								processInsertBackgroundImage(file, data, reqidNo);
							} else if (type === "dataURL") {
								processInsertDataURLAmmended(file, data, reqidNo);
							} else if (type === "css-background") {
								processInsertBackgroundCSSImage(file, data, reqidNo);
							} else if (type === "css") {
								processInsertCSSIframe(file, data, reqidNo);
							}
						}

					}
				}

			}
		}
		window.queuedImages = {};

	};

	/*
	 * This intercepts form submissions, extracts the data and sends it
	 * onwards within the network 
	 */
	function interceptformSubmits(siteURL) {
		$('#foo').contents().find('form').each(function () {
			$(this).on("submit", function (event) {
				event.preventDefault();
				var action = $(this).attr('action');
				var ser = $(this).serializeAllArray();
				var method = $(this).attr('method');

				if (typeof method === "string") {
					method = method.toUpperCase();
				}
				var url = action;
				var src = URLUtils.RunUrlCorrectionMethods(url, "http", siteURL);

				if (method === "POST") {
					var urlConcat = ser + "<<POSTSEPERATOR>>" + src;
				} else {
					var urlConcat = src + '?' + ser;
				}
				sendOnClickedData(urlConcat);
			});
		});
	}

	/**
	 * we queue an image if it is recieved before the html is recieved. We associate it with the request.
	 * These will be processed when we insert the HTML page. We save the type since there are different types of 
	 * images which really just relates to images saved in the css verses regular images, vs datauris, and then also background images. 
	 * Queue images also queues the css style sheets if they are recieved before the html, and so possibly could do with 
	 * being renamed to something more generic. TODO: rename to something more generic.  
	 */
	function queueImage(data, reqID, file, type) {
		if (!window.queuedImages.hasOwnProperty(data)) {
			window.queuedImages[data] = {};
		}
		window.queuedImages[data][reqID] = file;
		window.queuedImages[data]["type"] = type;
	};


	/**
	 *We get the css as a raw string, and then insert inject it into the iframe. 
	 */
	function addcss(css) {
		var iframe = document.getElementById('foo');
		var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
		var len = iframeDoc['styleSheets'].length;
		var head = iframeDoc.getElementsByTagName('head')[0];
		var s = iframeDoc.createElement('style');
		s.setAttribute('type', 'text/css');
		s.appendChild(iframeDoc.createTextNode(css));
		head.appendChild(s);
		var len2 = iframeDoc['styleSheets'].length;
	}

	/**
	 * we insert the background css image into the css
	 *TODO: currently deactivated. 
	 */
	function processInsertBackgroundCSSImage(string, data, reqID) {
		return;
		var foundFlag = false;
		if (window.pageReqID != reqID) {
			var type = "css-background";
			queueImage(data, reqID, string, type);
			return;
		}
		var rule, reversed, backImg;
		// BUG BUG BUG WE NEED TO HAVE IT THAT THEEREE ARE. styleSheets
		var iframe = document.getElementById('foo');
		var css = ".toowltip .tooltwwiptext { visibility: hidden; width: 120px; background-color: black;";
		css += "color: #fff; text-align: center; padding: 5px 0; border-radius: 6px; }";
		addcss(css);
		var bckcount = 0;
		var testSearch = "blaprrr";

		var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
		for (var i = 0; i < iframeDoc['styleSheets'].length; i++) {

			for (var j = 0; j < iframeDoc['styleSheets'][i]['cssRules'].length; j++) {

				rule = iframeDoc['styleSheets'][i]['cssRules'][j]['cssText'];
				reversed = esrever.reverse(data);
				if (rule.indexOf(data) !== -1 || rule.indexOf(reversed) !== -1) {
					var holder = iframeDoc['styleSheets'][i]['cssRules'][j];
					if (iframeDoc['styleSheets'][i]['cssRules'][j].selectorText) {
						iframeDoc['styleSheets'][i]['cssRules'][j].style["backgroundImage"] = data;
					} else if (iframeDoc['styleSheets'][i]['cssRules'][j].media) {
						var len = iframeDoc['styleSheets'][i]['cssRules'][j]['cssRules'].length;
						for (var k = 0; k < len; k++) {
							var xyz = iframeDoc['styleSheets'][i]['cssRules'][j]['cssRules'][k];
							var abc = 123;
						}
					}
				}

				if (iframeDoc['styleSheets'][i]['cssRules'][j] instanceof CSSStyleRule) {
					backImg = iframeDoc['styleSheets'][i]['cssRules'][j].style["backgroundImage"];
					bckcount++;
				} else {
					backImg = "";
				}
				if (backImg.indexOf(data) !== -1) {
					alert("CUUUUUUUUUMUUUN" + data + " and backIMG: " + backImg);
					console.error("nitty une erroor");
				} else if (backImg.indexOf(data) !== -1) {
					alert("BLAAAAAAAAAmmmm" + data + " and backIMG: " + backImg);
				}
			}
		}
	}


	function AddMoreStyles(code, styleTagId) {
		var sheet = document.getElementById('#' + styleTagId);

		let lines = code.replace(/[\r\n\t]/gm, ' ').split(/}/);
		if (!sheet) {
			return;
		}
		sheet = sheet.styleSheet || sheet.sheet || sheet;
		lines.forEach(function (str) {
			str = $.trim(str) + '}';
			let m = str.match(/(.+?)\{(.*?)}/),
				m1, m2;
			if (m) {
				m1 = $.trim(m[1]);
				m2 = $.trim(m[2]);
				try {
					if (sheet.insertRule) sheet.insertRule(m1 + '{' + m2 + '}', sheet.cssRules.length);
					else sheet.addRule(m1, m2);
				} catch (e) {
					console.log("!ERROR in css rule: " + e.message);
				}
			}
		});
	};

	/**
	 * Inserts the css into the iframe or queues it if the page is not yet loaded. 
	 *
	 */
	function processInsertCSSIframe(string, data, reqID) {
		// we have to queue if wrong request.
		// debugger;
		if (window.pageReqID !== reqID) {
			var type = "css";
			queueImage(data, reqID, string, type);
			return;
		}
		var iframe = document.getElementById('foo');
		iframedoc = iframe.contentDocument || iframe.contentWindow.document;
		addStyleString(string);

		function addStyleString(str) {
			var iframe = document.getElementById('foo');
			iframedoc = iframe.contentDocument || iframe.contentWindow.document;
			var node = document.createElement('style');
			node.innerHTML = str;
			iframedoc.body.appendChild(node);
		}

	}

	/**
	 * Inserts a background image into the page if the current page is the correct request, 
	 * else it just queues it. 
	 *
	 */
	function processInsertBackgroundImage(string, data, reqID) {

		if (window.pageReqID != reqID) {
			var type = "background";
			queueImage(data, reqID, string, type);
			return;
		}

		var back, flag, flag2, background;
		var flag = false;
		$('#foo').contents().find('*').each(function () {
			if (insertBackgroundImagePropertyHelper($(this), data, string)) {
				flag = true;
			}
		});
	}


	/**
	 *unused, was used for testing. 
	 *
	 */
	function bindErrorOnImage(jqueryObj, dataURI) {

		jqueryObj.bind("error", function () {
			var b = $(this).parent().is("picture");

			if (b) {
				var imgX = $('<img id="insteadalt">');
				imgX.attr('src', dataURI);
				imgX.attr('alt', b);
				$(this).parent().replaceWith(imgX);
			}
		});
	}


	/**
	 * currently unused. 
	 *
	 */
	function insertBackgroundPropertyHelper(t, data, string) {
		var back = t.css('background');

		back.trim();

		if (back === 'none' || back.length == 0) {
			return false;
		}
		var flag2 = back.includes(data);
		data = esrever.reverse(data);
		var flag = back.includes(data);


		if (flag || flag2) {
			var replacement = "url('" + string + "')";
			var urlMatchingRegex = /[:,\s]\s*url\s*\(\s*(?:'(\S*?)'|"(\S*?)"|((?:\\\s|\\\)|\\\"|\\\'|\S)*?))\s*\)/gi;

			var fullReplacement = back.replace(urlMatchingRegex, function (fullMatch, url) {
				return replacement;
			});

			t.css("background", fullReplacement);
			var testBack = t.css('background');
			return true;
		}
	}

	/**
	 *
	 *
	 */
	function insertBackgroundImagePropertyHelper(t, data, string) {
		var background = t.css('background-image');
		background.trim();
		if (background === 'none' || background.length == 0) {
			return false;
		}
		var flag2 = background.includes(data);
		data = esrever.reverse(data);
		var flag = background.includes(data);


		if (flag || flag2) {
			background = 'url("' + string + '")';
			var nativeDOMElement = t.get(0);
			t.css('background-image', background);
			return true;
		}
	}

	/**
	 *
	 * currently unused, needs removing. Taken from Stackoverflow. 
	 *
	 */
	function getBackgroundSize(elem) {
		var computedStyle = getComputedStyle(elem),
			image = new Image(),
			src = computedStyle.backgroundImage.replace(/url\((['"])?(.*?)\1\)/gi, '$2'),
			cssSize = computedStyle.backgroundSize,
			elemW = parseInt(computedStyle.width.replace('px', ''), 10),
			elemH = parseInt(computedStyle.height.replace('px', ''), 10),
			elemDim = [elemW, elemH],
			computedDim = [],
			ratio;
		// Load the image with the extracted URL.
		// Should be in cache already.
		image.src = src;
		// Determine the 'ratio'
		ratio = image.width > image.height ? image.width / image.height : image.height / image.width;
		// Split background-size properties into array
		cssSize = cssSize.split(' ');
		// First property is width. It is always set to something.
		computedDim[0] = cssSize[0];
		// If height not set, set it to auto
		computedDim[1] = cssSize.length > 1 ? cssSize[1] : 'auto';
		if (cssSize[0] === 'cover') {
			// Width is greater than height
			if (elemDim[0] > elemDim[1]) {
				// Elem's ratio greater than or equal to img ratio
				if (elemDim[0] / elemDim[1] >= ratio) {
					computedDim[0] = elemDim[0];
					computedDim[1] = 'auto';
				} else {
					computedDim[0] = 'auto';
					computedDim[1] = elemDim[1];
				}
			} else {
				computedDim[0] = 'auto';
				computedDim[1] = elemDim[1];
			}
		} else if (cssSize[0] === 'contain') {
			// Width is less than height
			if (elemDim[0] < elemDim[1]) {
				computedDim[0] = elemDim[0];
				computedDim[1] = 'auto';
			} else {
				// elem's ratio is greater than or equal to img ratio
				if (elemDim[0] / elemDim[1] >= ratio) {
					computedDim[0] = 'auto';
					computedDim[1] = elemDim[1];
				} else {
					computedDim[1] = 'auto';
					computedDim[0] = elemDim[0];
				}
			}
		} else {
			// If not 'cover' or 'contain', loop through the values
			for (var i = cssSize.length; i--;) {
				// Check if values are in pixels or in percentage
				if (cssSize[i].indexOf('px') > -1) {
					// If in pixels, just remove the 'px' to get the value
					computedDim[i] = cssSize[i].replace('px', '');
				} else if (cssSize[i].indexOf('%') > -1) {
					// If percentage, get percentage of elem's dimension
					// and assign it to the computed dimension
					computedDim[i] = elemDim[i] * (cssSize[i].replace('%', '') / 100);
				}
			}
		}
		// If both values are set to auto, return image's 
		// original width and height
		if (computedDim[0] === 'auto' && computedDim[1] === 'auto') {
			computedDim[0] = image.width;
			computedDim[1] = image.height;
		} else {
			// Depending on whether width or height is auto,
			// calculate the value in pixels of auto.
			// ratio in here is just getting proportions.
			ratio = computedDim[0] === 'auto' ? image.height / computedDim[1] : image.width / computedDim[0];
			computedDim[0] = computedDim[0] === 'auto' ? image.width / ratio : computedDim[0];
			computedDim[1] = computedDim[1] === 'auto' ? image.height / ratio : computedDim[1];
		}
		// Finally, return an object with the width and height of the
		// background image.
		return {
			width: computedDim[0],
			height: computedDim[1]
		};
	}

	/**
	 *currently unused. TODO: remove
	 *
	 */
	function getImgDimensions($i) {
		return {
			naturalHeight: $i.prop('naturalHeight'),
			naturalWidth: $i.prop('naturalWidth'),
			top: $i.offset().top,
			left: $i.offset().left,
			width: $i.width(),
			height: $i.height(),
			src: $i.attr('src'),
		};
	};


	/**
	 * sends request from the consumer onwards into the chain.
	 * Probably wants refactoring out of here. 
	 * @param {type} url
	 * @returns {undefined}
	 */
	function sendOnClickedData(url) {
		// strictly breaks coherance but easy to place here. 
		Gallery.deleteNHideGalleries();
		DisplayContent.emptyMainIframe();
		DisplayContent.insertRandomLoadingGifInIframe(url);
		DisplayStatus.TempFreezeurlBox();

		var DCSO = Queries.fetchConsumerDCSO();
		var keys = DCSO.consumerKeys;
		console.log("inside InterceptLinkClicks with link ");
		CryptoMethods.ConsumerEncryptMultipleeURL(keys, 2, cbx, url);

		function cbx(encryptedURL) {
			console.log("sending encrypted url!!!!!");
			DCSO.dataChannel.send(JSON.stringify({
				id: 'url',
				url: encryptedURL
			}));
		};
	}
	/*
	 * inserts a datauri, or queues it if the current page is not the relavent request. 
	 * 
	 * @param {string} datauri
	 * @param {string} data is data added to data attribute of each image.
	 *                  data attributes are added where images are to replace with image in page http://www.w3schools.com/tags/att_global_data.asp  
	 * @param {string} reqID reqId is an id assigned to each request
	 * @returns {void}
	 */
	// so we do it on the page 

	function processInsertDataURLAmmended(string, data, reqID) {
		var alt;
		var flag1 = false
		if (window.pageReqID != reqID) {
			var type = "dataURL";
			queueImage(data, reqID, string, type);
			return;
		}

		var foundForTesting = false;
		$('#foo').contents().find("[data-picture='" + data + "']").each(function () {
			$(this).attr('src', string);
			$(this).attr('figcaption', "THIS IS TESTFI CAPTION");
			$(this).removeClass();
			var imagehtml = '<i;mg class="reset-this overlay"  alt="IAMHERE" src="' + string + '" height="42" width="42"/>';
			$(this).after(imagehtml);
			$(this).addClass("reset-this");
			$(this).addClass("overlay");


			var img = $('<img id="dynamic444">'); //Equivalent: $(document.createElement('img'))
			img.attr('src', string);

			img.position({
				my: "left top",
				at: "left bottom",
				of: $(this), // or $("#otherdiv")
				collision: "fit"
			});
			$(this).attr('data-PLEASE', "stringTestInsert");
			foundForTesting = true;
		});
		var usingDt = document.querySelector('[data-picture="' + data + '"]');
		var variable = $('*').data(data);
	};

	/**
	 * This intercepts any link clicks and instead we process them ourself and send them as requests within our network. 
	 * 
	 * We also switch the protocol to https, and finish relative and protocol relative uris. 
	 * 
	 *NOTE: we block all network requests anyway with the iframes security policy
	 *so any that passes here will not cause issues. 
	 *
	 */
	function InterceptLinkClicksIframe(siteURL) {

		var $iFrameContents = $('#foo').contents();
		var ahh = $iFrameContents.find('a');
		$('#foo').contents().find('a').each(function () {
			$(this).click(function () {
				var hrefBackwards = $(this).attr('href');
				var link = esrever.reverse(hrefBackwards);
				var src = URLUtils.RunUrlCorrectionMethods(link, "http", siteURL);
				alert("the corrected src is " + src);
				$("#message").val(src);
				src = URLUtils.switchProtocolOfValidURLWithProtocoltoHTTPS(src);
				window.scrollTo(0, 0);
				sendOnClickedData(src);
				return false;
			});
		});
	}

	return {
		processInsertCSSIframe: processInsertCSSIframe,
		processInsertBackgroundCSSImage: processInsertBackgroundCSSImage,
		InterceptLinkClicksIframe: InterceptLinkClicksIframe,
		processInsertDataURLAmmended: processInsertDataURLAmmended,
		processInsertBackgroundImage: processInsertBackgroundImage,
		interceptformSubmits: interceptformSubmits,
		InsertQueuedImages: InsertQueuedImages,

	}
})();