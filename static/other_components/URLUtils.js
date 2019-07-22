/*
 *This has many util methods for working with URIs which this app makes heavy use of. 
 *
 * URI is object returned from uri.js library for url parsing, which this makes heavy use of. 
 * 
 * Much of this code is also used in the server side node.js, and the file there of the same name uses
 * the same methods but with the node.js require syntax to export them rather than the module pattern. 
 */

var URLUtils = (function (URI) {

	var hostNameFromRequest = function (request) {
		var hostname = request.split('?')[0];
		hostname = request.split('#')[0];
		return hostname;
	};

	/* before was isPathrelative
	 * distinguishes between absolute and relative uris. 
	 */
	var isPathRelative = function (url) {
		var url = url.toUpperCase();
		return (url.length >= 1 && (url.substring(0, 4) !== 'HTTP' || url.substring(0, 2) == './' || url.indexOf('/') == 0 || url.substring(0, 3) == '../'));
	};

	/* is the URL valid URL
         * 
	 * formerly is_url
	 */
	var isURL = function (str) {
		regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
		return (regexp.test(str));
	};


	var isDataURL = function (str) {
		var regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;
		return str.match(regex);
	};

	/** 
	 * gets file extention of valid uri eg .html or .css and returns as a string
	 */
	var getExtention = function (url) {
		var uri = new URI(url);
		return uri.suffix();
	}


	var isURLProtocolRelative = function (url) {
		return (url.substring(0, 2) === '//');
	};

	/**
	 * takes a protocol and a protocol relative URL and returns a complete URL. 
	 */
	var protocolRelativeConvert = function (protocolRelativeUrl, protocol) {
		return protocol + ":" + protocolRelativeUrl;
	};

	function rootRelativeConvert(rootRelativeUrl, baseURL) {
		return baseURL + rootRelativeUrl.substring(1);
	};
	/*
	 * private converts relative urls starting with a dir above or more  ( .. ) to absolute uris based on current uri
	 * 
	 * helper of makeAbsoluteURL 
	 * 
	 */
	function upperLevelDirectoryRelativeUrlToAbsoluteUrl(relativeURL, currentURL) {
		// remove file from baseurl to get to current directory
		var uri = new URI(currentURL);
		uri.pathname("");
		var websiteURL = uri.toString();
		var rel = relativeURL.split("/");
		var uri = new URI(currentURL);
		var path = uri.pathname();
		var arr = path.split("/");
		arr.pop();
		while (rel[0] == '..') {
			if (arr.length === 0) return websiteURL;
			arr.pop();
			rel.shift();
		}
		var bit = arr.join('/');
		if (bit != '') websiteURL = websiteURL + bit + '/';
		var strn = rel.join('/');
		return websiteURL + strn;
	};

	/*
	 * private: converts relative urls starting with a dir to absolute uris based on current uri
	 * 
	 * helper of makeAbsoluteURL
	 * 
	 */
	function relativeUrlstartingWithDirectoryToAbsolute(relative, currentURL) {
		var base = currentURL.split("/");
		var lastChar = currentURL.charAt(currentURL.length - 1);
		var uri2 = new URI(currentURL);
		var path = uri2.pathname();
		// if its  not directory and it has a path then it points to file so navigate up
		if (lastChar !== '/' && path !== '/') base.pop();
		var uri = base.join('/');
		var lastC = uri.charAt(uri.length - 1);
		if (lastC != '/') uri += '/';
		return uri + relative;
	};

	/*
	 * private and converts relative urls starting in same dir to absolute uris based on current uri
	 * 
	 * helper of makeAbsoluteURL
	 * 
	 */

	function relativeUrlSameDirToAbsolute(relative, currentURL) {
		var uri = new URI(currentURL);
		var path = uri.pathname();
		var strn = relative.substring(2);
		var uri2 = uri;
		uri2.pathname("");
		var websiteURL = uri.toString();
		return path == "/" ? websiteURL + strn : websiteURL + path.substring(1) + strn;
	};

	/*
	 * takes relative url and current pages uri and converts relative to absolute using 3 helper functions above.
	 * switch statement decides which type of relative uri reative uri is and we then process based on which type. 
	 * 
	 * it works with a lot of wierd strings a browser accepts as a uri such as . and ./ and # and // relative/protocol 
	 * relative/rootrelative uris. 
	 * 
	 */
	function makeAbsoluteURL(currentPageURL, relative) { // remove query string or hash symbol from base url
		var splitUp = currentPageURL.split(/[?#]/);
		currentPageURL = splitUp[0];
		splitUp.shift();
		var getBit = splitUp.join();

		switch (true) {
			// short url only of  ./ or .
			case relative === './' || relative === '.':
				var uri = new URI(currentPageURL);
				var path = uri.pathname();
				var lastChar = currentPageURL.charAt(currentPageURL.length - 1);
				var base = currentPageURL.split("/");
				if (lastChar !== '/' && path !== '/') base.pop();
				var ret = base.join("/");
				break;
				// protocol relative url
			case relative.substring(0, 2) === '//':
				var uri = new URI(currentPageURL);
				var protocol = uri.protocol();
				var ret = protocolRelativeConvert(relative, protocol);
				break;
				// root relative url
			case relative.charAt(0) == "/":
				var uri = new URI(currentPageURL);
				uri.pathname("");
				//var websiteURL = ;
				var ret = rootRelativeConvert(relative, uri.toString());
				break;
				// relative going up at least one directory
			case relative.substring(0, 2) == '..':
				var ret = upperLevelDirectoryRelativeUrlToAbsoluteUrl(relative, currentPageURL);
				break;
				// relative from dir of file
			case relative.substring(0, 2) == './':
				var ret = relativeUrlSameDirToAbsolute(relative, currentPageURL);
				break;
			case relative === "#":
				return relative;
				break;
			default:
				var ret = relativeUrlstartingWithDirectoryToAbsolute(relative, currentPageURL);
				break;
		}
		return ret;
	};


	/*
	 *  should complete url without protocol e.g. google.com
	 * 
	 * has associated tests
	 * @param {string} str to be completed
	 * @returns {string} completed URL. 
	 */
	function CompleteUrl(str) {
		var parts = URI.parse(str);

		// partial urls get path and not hostname so one for full, else for partial urls
		if (parts.hostname !== null && parts.hasOwnProperty('hostname')) {
			console.log(' does visit here ');
			var lower = parts['hostname'].toLowerCase();
			if (lower.substring(0, 4) === "www.") parts.hostname = parts['hostname'].substring(4);
		} else if (parts.path !== null && parts.hasOwnProperty('path')) {
			console.log(' visits here as weell');
			var lower = parts['path'].toLowerCase();
			if (lower.substring(0, 4) === "www.") parts.path = parts['path'].substring(4);
		}
		if (parts.protocol === null || !parts.hasOwnProperty('protocol'))
			parts.protocol = 'http';
		var ret = URI.build(parts);
		var lastC = ret.charAt(ret.length - 1);
		if (lastC === '/')
			ret = ret.substring(0, ret.length - 1);

		return ret;
	};


	/*
	 * recieved a valid uri with a valid protocol and switchs it to https 
	 * 
	 * @param {string} url
	 * @returns {string}
	 */
	function switchProtocolOfValidURLWithProtocoltoHTTPS(url) {
		var uri = new URI(url);
		uri.protocol("https");
		return uri.toString();
	}


	function correctSRC(src, requestsUrl, ignoreErrors = true) {

		const OurSitesURL = "http://localhost:8000";
		const OurSitesURLSecond = "http://0.0.0.0:8000";
		const OurSitesURLFourth = "https://thejor.com"
		var hostname = src;

		console.error("the hostname is : " + hostname + "from request : " + src);
		var n = hostname.includes(OurSitesURL);
		var m = hostname.includes(OurSitesURLSecond);
		// var o = hostname.includes(OurSitesURLThird);
		var p = hostname.includes(OurSitesURLFourth);

		var found = false;
		if (m || n || p) {
			src = src.replace(OurSitesURL, '');
			src = src.replace(OurSitesURLSecond, '');
			src = src.replace(OurSitesURLFourth, '.');

			found = true;
		}

		// replace standardly only replaces first occurance!!  
		var ret = RunUrlCorrectionMethods(src, "http", requestsUrl);

		if (ret == null && !ignoreErrors) {
			throw new Error("in this instance we don't wish to allow it to not correct itself!!");
		}
		return ret;
	}

	/**
	 * Sometimes file paths have .htm instead of .html but browsers accept this, and so do we now. 
         * We also check in a case insensitive manner since .HTM is the same to a browser as .hTml or .html
	 */
	function correctHTMtype(url) {

		if (url.length < 4) return url;

		var last4 = url.substr(url.length - 4);
		var res = last4.toUpperCase();

		if (res === "HTM") {
			var tester = url;
			url += "l";
			alert("corrected url to " + url + " from : " + tester);
		}
		return url;
	}


	function RunUrlCorrectionMethods(uri, protocol, refererURI) {
		var URL = URLUtils;
		var uri2 = new URI(refererURI);
		// i am swapping ou tthe protocol bit in a nasty nasty nasty nasty evil way 
		var protocol2 = uri2.protocol();

		if (URL.isURLProtocolRelative(uri))
			uri = URL.protocolRelativeConvert(uri, protocol2);
		if (URL.isPathRelative(uri))
			uri = URL.makeAbsoluteURL(refererURI, uri);
		return uri;
	}


	return {
		switchProtocolOfValidURLWithProtocoltoHTTPS: switchProtocolOfValidURLWithProtocoltoHTTPS,
		RunUrlCorrectionMethods: RunUrlCorrectionMethods,
		correctSRC: correctSRC,
		getExtention: getExtention,
		isPathRelative: isPathRelative,
		isURL: isURL,
		isDataURL: isDataURL,
		isURLProtocolRelative: isURLProtocolRelative,
		rootRelativeConvert: rootRelativeConvert,
		protocolRelativeConvert: protocolRelativeConvert,
		CompleteUrl: CompleteUrl,
		makeAbsoluteURL: makeAbsoluteURL,
		hostNameFromRequest: hostNameFromRequest
	}
})(URI);