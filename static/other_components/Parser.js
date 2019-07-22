/* 
 * At the psuedoexit after making the rquest for html we parse it as a new DOMParser() dom tree 
 * allowing us to not run javascript whilst doing this to sanitize it and extract data we need. 
 * 
 * We parse it to replace image URIs and css files with datatags which will 
 * be used to reinsert content into at the client. 
 * 
 * This module all processes the parsed html to find the nearest heading text to the image. This is for the galleries
 * feature whereby each image in the gallery has an overlay of text, since this text is usually more relavent to 
 * explaining the image than is the alt text. The gallery is useful since some image may not be displayed properly, or
 * at all, in a plain html (not javascript augmented) rendering of a webpage. 
*  
*   NOTE: messageObj references in this module (and throughout the program) is of form  {content : content,   url: url, 
                                                                                         reqID: reqID, 
                                                                                         pseudoExitId: pseudoExitId }
*   
*       We traverse the dom seperatelt to fetch images, background images and css files, which could or should
*       be swapped for a single pass. 
*         
 */
"use strict";

var Parser = (function () {


	var maxImagesPerReq = 50000;


	/*
	 * should get all links from html strings, all rescources
	 * 
	 *  basic fear is that any javascript we execute could potentially access our main javascript.
	 *   
	 *   this is the requested URL used to work with relative urls
	 *  
	 * 
	 *     
	 */
	function GetAllLinksOfHtmlString(messageObj) {
		messageObj.content = DisplayContent.removeEventHandlersBeforeExecutingThem(messageObj.content);
		var $doc = new DOMParser().parseFromString(messageObj.content, "text/html");

		var len = $doc["images"].length;
		var ImageCounterObj = {
			count: 0
		};
		getAllBackGroundImagesInHTML($doc, messageObj, ImageCounterObj);
		dealWithImages($doc, messageObj, ImageCounterObj);

		var styleSheets = getStyleSheets($doc, messageObj.url);
		alert("found style sheets number: " + styleSheets.length);
		CSSRequester.SendStyleSheetsAsync(styleSheets, messageObj);
		// we make a copy since this stops changes or destructuring at exit node affecting other usages 
		// since otherwise only reference passed. 
		var messageObjCopy = {
			content: $doc.documentElement.innerHTML,
			url: messageObj.url,
			reqID: messageObj.reqID,
			pseudoExitId: messageObj.pseudoExitId
		};
		ExitNode.sendContent(messageObjCopy);

	};

	/**
	 * removes script property. 
	 */
	function removeScripts($doc) {
		$doc.scripts = [];
	}

	/**
	 * gets text of closest heading text. This works, and currently is not used but easily 
	 * can be used again. The idea is that since the alt text is often useless to caption an 
	 * image you should find the closest piece of text, which is usually the nearest heading, and 
	 * this has been displayed as an overlay on the images in the gallery. 
	 */
	function getClosestHeadingText(el) {
		var res = closest(el);
	}

	/**
	 * We look for the closest node with text by traversal of dom tree. 
	 *
	 * NOTE: this is adapted from code taken from somewhere else, but significatly
	 * my own. 
	 */
	function closest(el) {
		var text = null;
		var textLower = null;
		var textUpper = null;
		var UpperSiblings;
		var LowerSiblings;
		var countUpper = 0;
		var countLower = 0;
		var elSaved = el;
		upper:
			do {
				countUpper++;
				UpperSiblings = getAllSiblings(el);

				for (var i = 0; i < UpperSiblings.length; i++) {
					text = UpperSiblings[i].innerText; // || UpperSiblings;
					if (typeof text === "string" && text.length > 3) {
						textUpper = text;
						break upper;
					};
				}

			} while (el = el && el.parentNode);

		el = elSaved;
		// lower search
		lower:
			do {
				countLower++;
				LowerSiblings = getAllSiblings(el);
				for (var i = 0; i < LowerSiblings.length; i++) {
					text = LowerSiblings[i].innerText || LowerSiblings[i].textContent;
					if (typeof text === "string" && text.length > 3) {
						textLower = text;
						break lower;
					};
				}

			} while (el = el && el.childNode);
		// maybe if this is established switch order to search lower first since that has priority!
		if (textLower !== null && textUpper !== null) {
			return textLower;
		} else if (textLower !== null) {
			return textLower;
		} else if (textUpper !== null) {
			return textUpper;
		} else {
			return null;
		}
	}

	/** 
	 * Gets all siblings of dom node. 
	 * 
	 * NOTE: copied from somehwere. 
	 */
	function getAllSiblings(elem) {
		var sibs = [];

		if (elem.parentNode === null) {
			debugger;
			return [];
		}

		elem = elem.parentNode.firstChild;
		do {
			if (elem.nodeType === 3) continue; // text node
			sibs.push(elem);
		} while (elem = elem.nextSibling)
		return sibs;
	}

	/**
	 *TODO: safely delete. 
	 */
	function Closest2(element) {
		var textContent;
		do {
			textContent = element.textContent;
			if (textContent > 3)
				return textContent;
		} while (element = element.parentNode)
		return null;
	};


	/**
	 *searches each dom node in dom tree for styles of background. 
	 *
	 *If we find a background we convert relative/protocol relative uris to absolute and
	 *create a bound function which will perform the request, and pass that to the ratelimiter. 
	 *
	 */
	function getAllBackGroundImagesInHTML($doc, messageObj, ImageCounterObj) {
		var messageObjCopy;
		var ret = [];
		var temp, src, dataAttribute, backgroundImageReformed;
		for (var i = 0; i < $doc['all'].length; i++) {

			temp = $doc['all'][i].style;

			if (typeof temp !== "undefined") {
				if (typeof temp['backgroundImage'] !== "undefined" && temp['backgroundImage'].length > 3) {
					debugger;
					var backgroundURI = temp['backgroundImage'].replace('url("', '').replace('")', '');
					dataAttribute = Math.random().toString(36).substring(7) + "reversed";

					src = URLUtils.correctSRC(backgroundURI, messageObj.url);
					backgroundImageReformed = ' url(PICTURE' + dataAttribute + ')';
					var extraText = closest($doc['all'][i]);
					$doc['all'][i].style.backgroundImage = backgroundImageReformed;
					if (src == "null") {
						console.error("the src was null when completed for orig src ::  " + $doc["images"][i]['src']);
						continue;
					}
					ret.push(temp['backgroundImage']);
					ret.push(src);
					messageObj["type"] = "background";
					var messageObjCopy = {
						content: messageObj.content,
						url: messageObj.url,
						type: "background",
						reqID: messageObj.reqID,
						extraText: extraText,
						pseudoExitId: messageObj.pseudoExitId
					};

					var bf = Requester.fetchImage.bind(null, src, messageObjCopy, dataAttribute);
					// discard images beyond certain number per request. 
					if (ImageCounterObj.count > maxImagesPerReq) {
						return;
					}
					ImageCounterObj.count++;
					RateLimiter.execute(bf);
				}
			}
		}
		window['getAllBackGroundImagesInHTMLTest'] = ret;
	}


	function getTitleOfParentNode(el) {
		if (el['parentNode']['title'].length > 1) {
			return el['parentNode']['title'];
		} else return "";
	}

	/**
	 *searches each dom node in dom tree for images 
	 *
	 *If we find an uri for an image we convert relative/protocol relative uris to absolute and
	 *create a bound function which will perform the request, and pass that to the ratelimiter. 
	 */
	function dealWithImages($doc, messageObj, ImageCounterObj) {
		var html = $.parseHTML(messageObj.content);
		var dataAttribute, src;
		var countOfDataAttributesSetForTesting = 0;
		var picString;
		var srcOriginal;
		for (var i = 0; i < $doc["images"].length; i++) {

			if ($doc["images"][i]['src'].length == 0) continue;
			dataAttribute = Math.random().toString(36).substring(7) + "hahahaha";
			picString = "PICTURE" + dataAttribute;
			srcOriginal = $doc["images"][i]['src'];
			$doc["images"][i].setAttribute("src", picString);
			$doc["images"][i].setAttribute("data-PICTURE", dataAttribute);
			src = URLUtils.correctSRC(srcOriginal, messageObj.url);
			var extraText = closest($doc['images'][i]);
			if ($doc['images'][i]['alt'].length > 1) {
				if (extraText == null) extraText = "";
				extraText = $doc['images'][i]['alt'] + ":->>: " + extraText;
			}
			if (src == "null") continue;
			var messageObjCopy = {
				content: messageObj.content,
				url: messageObj.url,
				type: "dataURL",
				extraText: extraText,
				reqID: messageObj.reqID,
				pseudoExitId: messageObj.pseudoExitId
			};

			if (ImageCounterObj.count > maxImagesPerReq) return;
			ImageCounterObj.count++;
			var bf = Requester.fetchImage.bind(null, src, messageObjCopy, dataAttribute);
			RateLimiter.execute(bf);
		}
	}

	/*
	 * searches each dom node in dom tree for images 
	 *
	 * If we find an uri for a style sheet we convert relative/protocol relative uris to absolute and
	 * create a bound function which will perform the request, and pass that to the ratelimiter. 
	 *
	 * url param is main url of request, for converting relative to absolute uris. 
	 */
	function getStyleSheets($doc, url) {
		var styleSheets = [];
		var localName, href, reqID, ext, jay, link, type;
		var extentions = "";
		for (var j = 0; j < $doc['all'].length; j++) {
			localName = $doc['all'][j]['localName'];
			jay = $doc['all'][j];
			if (typeof jay.href === "undefined" || jay.length < 2) continue;
			if (typeof jay.type === "undefined") continue;
			href = jay.href;
			ext = URLUtils.getExtention(href);
			type = jay.type;
			type = type.toUpperCase();

			if (ext == "css" || type == "TEXT/CSS") {
				link = URLUtils.correctSRC(href, url);
				styleSheets.push(link);
			} else {
				extentions = extentions + " ext is :  " + ext + " href is : " + href + " type is " + jay.type;
			}
		}
		return styleSheets;
	}

	/**
	 * This method is scattered around the code base
	 * and is used only during testing to print images during testing. 
	 */
	function printImageTestMethod(imageBuffer) {
		var img = $('<img id="dynamic">');
		img.attr('src', imageBuffer);
		img.appendTo('.test');
	}

	/**
	 * find the doctype string from document tree. 
	 * 
	 * NOTE: copied from stack overflow. 
	 */
	function getDocTypeOfHTMLDocument(document) {
		var node = document.doctype;
		// a default doctype for null and thus mistyped doctypes
		if (node === null) {
			return "<!DOCTYPE html>";
		}
		var ret = "<!DOCTYPE " +
			node.name +
			(node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') +
			(!node.publicId && node.systemId ? ' SYSTEM' : '') +
			(node.systemId ? ' "' + node.systemId + '"' : '') +
			'>';
		S
		return ret;
	}

	return {
		GetAllLinksOfHtmlString: GetAllLinksOfHtmlString
	}
})();