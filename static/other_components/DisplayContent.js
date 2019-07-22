/*
 * module is used for displaying the retrieved webpage in th iframe.
 * 
 * it reverses links, strips scripts and inserts html along with setting the iframes csp
* (Content Security Policy) whoch blocks network requests and inline javascript. 
* 
 */

var DisplayContent = (function (URI, URLUtils, esrever) {


	window.displayedImagesTest;

	/**
	 * When we are loading a page we put a random gif in the iframe. 
	 * This also empties out any previous content in the iframe. 
	 * 
	 * * NOTE: the requested data is stored in a custom iframe with a security policy
	 * which stops network requests directly coming from it. 
	 */
	function insertRandomLoadingGifInIframe(uriWeAreFetching) {
		var iframe = document.getElementById('foo');
		var rand = Utils.randomIntFromInterval(1, 13);
		var src = './gifs/tenor' + rand + '.gif';
		iframedoc = iframe.contentDocument || iframe.contentWindow.document;
		emptyMainIframe();
		var htmlAsString = "<HTML><HEAD><TITLE> Loading .... </TITLE></HEAD><BODY><figure><figcaption> " + uriWeAreFetching + " is Loading ....</figcaption><img src ='";
		htmlAsString += src + "' id='randLoadingGif' alt='loading symbol'></figure> </BODY></HTML>";
		iframedoc.body.innerHTML = htmlAsString;
	}


	/**
	 * HTML has a noscript tag with stuff to display when javascript is not running, 
	 * we display this stuff in our iframe. 
	 */
	function displayNoScript(container) {

		container.find('noscript').replaceWith(function () {
			return this.textContent || this.innerText;
		});
	}

	/**
	 * Main method used to hanlde eg process the insertion of 
	 * the HTML into the iframe. 
	 * 
	 * The datatags which will be used to insert images were already added in the pseudoexit node. 
	 * 
	 * It empties the previous data from the iframe, 
	 * calls sanitizing functions, sets the current requests id to the live request id,
	 * so that queued images will be inserted correctly, it then calls functions which intercept
	 * link clicks and instead pushes the responses back into network. 
	 *
	 */
	function processInsertHTMLIframe(string, extraDataExtracted) {
		string = removeEventHandlersBeforeExecutingThem(string);
		$('#galleryHolder').show();
		window.toCheckOkPre = string;
		window.displayedImagesTest = 0;
		var iframe = document.getElementById('foo');
		iframedoc = iframe.contentDocument || iframe.contentWindow.document;

		emptyMainIframe();
		setIframeContentSecurityPolicy(iframedoc);

		var container = $('<div/>').html(string);
		var result = [];
		var testCountingScriptsRemoved = 0;
		// Remove javascript in page. 
		container.find('script').each(function (i, u) {
			$(this).remove();
			testCountingScriptsRemoved++;
		});
		displayNoScript(container);
		var uri = URI(extraDataExtracted.url);
		window.pageReqID = extraDataExtracted.reqID;
		window.loadedreqIDs.push(extraDataExtracted.reqID);

		var hostname = URLUtils.hostNameFromRequest(extraDataExtracted.url)
		/* so since we have a csp in the iframe we don't need this, but the reversig of uris
		 * was done before I realised this was possible, and is left in anyway. */
		container.find('*').each(function (i, link) {
			reverseHref($(this), hostname, uri, link);
			reverseSrc($(this), hostname, uri, link);
			reverseBackgroundImage($(this));
		});
		var htmlAsString = container[0].outerHTML;
		window.toCheckOk = htmlAsString;
		iframedoc.body.innerHTML = htmlAsString;
		/* after we have inserted the html into the frame we want to intercept the link clicks
		 * so we can reroute these back into the network as requests to give a good UI 
		 */
		Whitelisted.InsertQueuedImages();
		Whitelisted.InterceptLinkClicksIframe(hostname);
		Whitelisted.interceptformSubmits(hostname);
		window.postInsertHTMLToTest = iframedoc.body.innerHTML;
	}

	/**
	 * Between requests we must empty the iframe of previous content. 
	 * NOTE: iframe is given elementID foo and probably wants a refactor. 
	 */
	function emptyMainIframe() {
		var iframe = document.getElementById('foo');
		iframedoc = iframe.contentDocument || iframe.contentWindow.document;
		iframedoc.body.innerHTML = "";
	}
	/**
	 * remove inline style sheets from html as string. 
	 */
	function getAndRemoveStyleSheets(string) {
		var mask = 'data-whatever="wtf"';
		var res = string.split(mask);
		var mask2 = "<style>";
		var res2 = string.split(mask2);
		var before = res2.shift();
		var after = res2.join(mask2);
		var result = htmlString.replace(regEx, replaceMask);
		return result;
	}

	/**
	 * NOTE: removing all event handlers was done to prevent network requests 
	 *       violating networks anonymity, but csp that blocks all network requests from the iframe
	 *       solved the problem better, but this was still left. 
	 */
	function removeEventHandlersBeforeExecutingThem(string) {
		var d = new DOMParser().parseFromString(string, "text/html");
		walkTheDOM(d, cleanHandlers);
		return d.documentElement.innerHTML;
	}


	/**
	 * NOTE: copied from stackoverflow, needs referencing
	 */
	function walkTheDOM(node, func) {
		func(node);
		node = node.firstChild;
		while (node) {
			walkTheDOM(node, func);
			node = node.nextSibling;
		}
	}

	/**
	 * NOTE: copied from stackoverflow, needs referencing
	 */
	function cleanHandlers(el) {
		// only do DOM elements
		if (!('tagName' in el)) {
			return;
		}
		var a = el.attributes;
		for (var i = 0; i < a.length;) {
			if (a[i].name.match(/^on/i)) {
				el.removeAttribute(a[i].name);
			} else {
				++i;
			}
		}
		// recursively test the children
		var child = el.firstChild;
		while (child) {
			cleanHandlers(child);
			child = child.nextSibling;
		}
	}

	/**
	 * Sets the iframes Content Security Policy.
	 * 
	 * NOTE: very important since this stops any links that were not parsed out from being able
	 * to make network requests. It stops all network requests from the page, and from any javascript 
	 * running in the frame. 
	 *
	 */
	function setIframeContentSecurityPolicy(iframedoc) {
		var meta = iframedoc.createElement('meta');
		meta.httpEquiv = "Content-Security-Policy";
		meta.content = "script-src 'none'; connect-src 'self' ; default-src 'self'; frame-src 'none'; style-src 'unsafe-inline'; img-src 'unsafe-inline' 'self' data:; ";
		iframedoc.getElementsByTagName('head')[0].appendChild(meta);
	}

	/*
	 * NOTE: not in use. 
	 * NOTE: needs referencing, not own work. 
	 * @param {type} iframeDocument
	 * @returns {undefined}
	 */
	function interceptRightClicks(iframeDocument) {
		iframeDocument.body.onclick = function (e) {
			var isRightMB;
			e = e || window.event;
			if ("which" in e) // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
				isRightMB = e.which == 3;
			else if ("button" in e) // IE, Opera 
				isRightMB = e.button == 2;

			alert("Right mouse button " + (isRightMB ? "" : " was not") + "clicked!");
		}
	}

	/* 
	 * For singe domnode as jquery object we reverse href link if one exists.
	 * processing on the jquery object is done on the jquery object passed by reference.
	 *  We also convert relative URIs to absolute.
	 * @param {Object} a jquery Object of dom node to work on. 
	 * @returns {void}
	 */
	function reverseHref(jqueryObj, hostname, uri, link) {
		if (jqueryObj.attr('href') == undefined) return;
		var href = jqueryObj.attr('href');
		href.trim();
		if (URLUtils.isDataURL(href)) {
			return;
		}
		if (URLUtils.isURLProtocolRelative(href)) href = URLUtils.protocolRelativeConvert(href, 'http');
		if (href.length == 0) return;
		var replacement = URLUtils.RunUrlCorrectionMethods(jqueryObj.attr('href'), "http", hostname);
		replacement = esrever.reverse(replacement);
		link.href = replacement;
	};


	/*
	 * helper of processInsertHTML. 
	 * For singe domnode as jquery object we reverse src link.
	 * processing on the jquery object is done on the jquery object passed by reference.
	 *  We also convert relative URIs to absolute.
	 * @param {Object} a jquery Object of dom node to work on. 
	 * @returns {void}
	 */
	function reverseSrc(jqueryObj, hostname, uri, link) {
		if (jqueryObj.attr('src') == undefined) return;
		var src = jqueryObj.attr('src');
		var first7 = src.substring(0, 7);
		if (first7 === "PICTURE") return;
		if (URLUtils.isDataURL(src)) return;
		src.trim();
		if (URLUtils.isURLProtocolRelative(src)) src = URLUtils.protocolRelativeConvert(src, 'http');
		if (src.length == 0) return;
		if (URLUtils.isPathRelative(jqueryObj.attr('src'))) {
			src = hostname + jqueryObj.attr('src');
			var path = uri.path();
			src = src.replace(path, '');
		}
		link.src = src;
	};

	/*
	 * reverses background image url in jquery object representing single dom node. 
	 * Only works on single node. 
	 * helper of processInsertHTML
	 * @param {type} jqueryObj
	 * @returns {void}
	 */
	function reverseBackgroundImage(jqueryObj) {
		var background = jqueryObj.css('background-image');
		background.trim();
		// return true continues each loop
		if (background === 'none' || background.length == 0) return;
		background = background.replace('url("', '').replace('")', '');
		background = esrever.reverse(background);
		background = 'url(' + background + ')';
		jqueryObj.css('background-image', background);
		var reversedAgainTesting = esrever.reverse(background);
		window['backgroundImagesTesting'].push(reversedAgainTesting);
	};


	return {
		insertRandomLoadingGifInIframe: insertRandomLoadingGifInIframe,
		removeEventHandlersBeforeExecutingThem: removeEventHandlersBeforeExecutingThem,
		processInsertHTMLIframe: processInsertHTMLIframe,
		setIframeContentSecurityPolicy: setIframeContentSecurityPolicy,
		emptyMainIframe: emptyMainIframe
	}
})(URI, URLUtils, esrever);
