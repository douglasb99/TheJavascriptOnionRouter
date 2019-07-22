/*  
 * 
 * This module has three main responsibilities.
 * 
 * Firstly it checks if the browser enforces same origin policy. The app requires the suspension of this
 * to be achieved by using a browser add-on, or to be started with some flag allowing this. 
 * 
 * Secondly it makes rescource requests eg get and post requests at the exit node. 
 * When a user requests a URI the methods in this will fetch it. 
 * 
 * This module has a third function which is to to process outgoing requests and to 
 * 
 */
"use strict";

var Requester = (function () {


	/**
	 * Makes a sample cross origin request to determine if browser allows 
	 * cross origin requests. Ayncronous. 
	 * 
	 * @param {function} cbFailure callback to be executed without any params passed 
	 *                             if we CANNOT violate same origin policy. 
	 *                             NOTE: CURRENTLY NOT USED PARAM POST REFACTOR.
	 * @param {function} cbSuccess callback to be executed without any params passed 
	 *                             if we CAN violate same origin policy. 
	 */
	function TestIfWeCanViolateSameOriginPolicy(cbFailure, cbSuccess) {
		$.ajax({
			url: 'https://bbc.co.uk',
			dataType: 'html',
			success: function (data) {
				cbSuccess();
			},
			error: function (xhr, ajaxOptions, thrownError) {
				// cbFailure();
			}
		});
	}

	/**
	 * Requests have this string as a seperator if they are post requests.
	 * @return {boolean}  
	 */
	function isRequestPOST(request) {
		return request.includes("<<POSTSEPERATOR>>");
	}
	/**
	 * Requests which contain the post seperator we split on the seperator. 
	 */
	function seperatePostRequest(request) {
		return request.split("<<POSTSEPERATOR>>");
	}

	/*
	 * We either fetch a get or post request, This determines which type it is and calls the correct 
	 * requester method.  
	 */

	function requestSwitcher(messageObj) {
		if (!isRequestPOST(messageObj.url)) {
			fetchGetRequest(messageObj);
			return;
		}

		var postRequest = seperatePostRequest(messageObj.url);
		messageObj.url = postRequest[1];
		var postData = postRequest[0];
		fetchPostRequest(messageObj, postData);
	};

	/**
	 * We were fetching post requests, but at this moment have stopped
	 * that. 
	 */
	function fetchPostRequest(messageObj, postData) {
		return;
		/*  $.ajax({
    type: "POST",
    url: messageObj.url,
    data: postData,
    crossDomain: true,
    
    dataType: "html",
    success: function(data) {
        alert("successsful post request");
         messageObj.content = data;
         Parser.GetAllLinksOfHtmlString(messageObj);
        //var obj = jQuery.parseJSON(data); if the dataType is not specified as json uncomment this
        // do what ever you want with the server response
    },
    error: function(jqXHR, exception) {
         var msg = getErrorMessageText(jqXHR);
        ExitNode.sendFailedResponse(messageObj, msg);
        alert('error handing here with error post request with message' + msg);
    },
});*/
	}

	/** 
	 * Makes request for get request.
	 * Calls parser on HTML response.  
	 * currently only supports get requests that return .html files. 
	 */
	function fetchGetRequest(messageObj) {
		var dataType = 'html';
		$.ajax({
			url: messageObj.url,
			dataType: dataType,
			complete: function () {},
			success: function (data) {
				messageObj.content = data;
				Parser.GetAllLinksOfHtmlString(messageObj);
			},
			error: function (jqXHR, exception) {
				var msg = getErrorMessageText(jqXHR);
				ExitNode.sendFailedResponse(messageObj, msg);
			}
		});
	};

	/**    
	 * If we have a failed response this gives a custom message depending on the code.
	 * @return {string} code specific printable error message.
	 */
	function getErrorMessageText(jqXHR) {
		var msg = '';
		if (jqXHR.status === 0) {
			msg = 'unable to find URL check its correct';
		} else if (jqXHR.status == 404) {
			msg = 'Requested page not found. [404]';
		} else if (jqXHR.status == 500) {
			msg = 'Internal Server Error [500].';
		} else if (typeof exception !== "undefined" && exception === 'parsererror') {
			msg = 'Requested JSON parse failed.';
		} else if (typeof exception !== "undefined" && exception === 'timeout') {
			msg = 'Time out error.';
		} else if (typeof exception !== "undefined" && exception === 'abort') {
			msg = 'Ajax request aborted.';
		} else {
			msg = 'Uncaught Error.\n' + jqXHR.responseText;
		}
		return msg;
	}
	/**
	 * Method that prints image; only used when we were testing. 
	 */
	function printImageTestMethod(imageBuffer) {
		var img = $('<img id="dynamic">');
		img.attr('src', imageBuffer);
		img.appendTo('.test');
	}

	/**
	 *NOTE: this is currently unused. 
	 */
	function getStyleSheetsAndThenSendHtml(styleSheetsArr, messageObj, $doc) {
		console.assert(arguments.length === 3, " requires 3 args");
		var params = {};
		params["countdownFrom"] = styleSheetsArr.length;
		params["messageObj"] = messageObj;
		params["$doc"] = $doc;

		var styleSheetCollector = styleSheetCollectorGen();
		styleSheetCollector.next();
		styleSheetCollector.next(params);

		for (var i = 0; i < styleSheetsArr.length; i++) {
			getStyleSheet(styleSheetsArr[i], styleSheetCollector);
		}
	}

	/**
	 * A major mess trying to solve a wierd problem:  
	 * use a generator since it allows us to execute the request to fetch different 
	 * style sheets and then when they are returned eg fetched it re-enters this function at the second yeild
	 * which allows us to then count down until a response is recieved from all style sheet requests
	 * at which point we send them down the exit node as a single css string using the iife at the bottom
	 * of this junk-grade function. 
	 * 
	 * This is currently not in use all style sheets are sent seperately rather than waiting for the last fetch
	 * response, as that is faster. 
	 */
	function* styleSheetCollectorGen() {
		var styleSheetResults = [];
		// params expects an object containing 2 keys "countdownFrom" and "HTMLToSend"
		var params = yield false;
		var ob;
		var css, cssTest;
		var styleSheetURL;
		const storedCountDownForTesting = params["countdownFrom"];
		while (params["countdownFrom"] > 0) {
			ob = yield false;
			css = ob.text;
			styleSheetURL = ob.styleSheetURL;
			var messageObjectCopy = Object.assign({}, params["messageObj"]);
			console.assert(typeof messageObjectCopy.pseudoExitId !== "undefined", " Pseudoexitid required");
			try {
				cssTest = css;
				styleSheetResults.push(css);
			} catch (err) {
				styleSheetResults.push(" ");
			}
			params["countdownFrom"] = params["countdownFrom"] - 1;
		}

		(function () {
			var allPageStylesInOneSheet = styleSheetResults.join(" ");
			params["messageObj"]["content"] = alternativeCSSintoString(allPageStylesInOneSheet, params["$doc"]);
			console.assert(typeof params["messageObj"].pseudoExitId !== "undefined", " needs pseudoexitid ln 223");
			var bf = ExitNode.sendContent.bind(null, params["messageObj"]);
			RateLimiter.execute(bf, true);
		})();
	}

	/**
	 * fetches (using fetch API) single stylesheets, then calls iterator next method 
	 * as callback on success.  
	 * ITCB stands for iterator as callback
	 */
	function getStyleSheet(styleSheetURL, ITCB) {
		fetch(styleSheetURL).then(function (response) {
			return response.text();
		}).then(function (txt) {
			ITCB.next({
				"text": txt,
				"styleSheetURL": styleSheetURL
			});
		});
	}

	/** 
	 *This fuinction added to get imports which we will send
	 * seperately async and insert rather than wait for
	 */
	function getStyleSheetSeperate(styleSheetURL, cb) {
		fetch(styleSheetURL).then(function (response) {
			return response.text();
		}).then(function (txt) {
			cb();
		});
	}

	/** 
	 *fetches image, and then calls rsolution of arrayBuffer which sends the image onwards.
	 */
	function fetchImage(url, messageObj, imageDataAttribute) {
		fetch(url).then(function (response) {
			var myHeaders = response.headers;
			var contentType = myHeaders.get('Content-Type');
			var resolutionOfArrayBuffBF = resolutionOfArrayBuff.bind(null, contentType);
			var p = response.arrayBuffer();
			p.then(myBuffer => resolutionOfArrayBuff(myBuffer, contentType, messageObj, imageDataAttribute));
		});

		/**
		 * This takes the inage as an array buffer, transforms it into a datauri and string, 
		 * and then passes it to the exit node which will then encrypt and forward down path. 
		 */
		function resolutionOfArrayBuff(myBuffer, contentType, messageObj, imageDataAttribute) {
			// purely a testing thing.
			if (imageDataAttribute === 99) {
				function printImageTestMethod(imageBuffer) {
					var img = $('<img id="test">');
					img.attr('src', imageBuffer);
					img.appendTo('.test');
				}
				printImageTestMethod(myBuffer);
			}
			var base64Flag = 'data:' + contentType + ";base64,";
			var imageStr = Utils.arrayBufferToBase64(myBuffer);
			var imageAsDataURI = base64Flag + imageStr;
			ExitNode.sendImage(imageAsDataURI, messageObj.pseudoExitId, messageObj.url, messageObj.reqID, imageDataAttribute, messageObj.type, messageObj.extraText);
		}

	}

	/**
	 *inserts css as a string into document
	 *returns html as a string
	 */
	function alternativeCSSintoString(cssString, $doc) {
		$doc.querySelector('head').innerHTML += '<style data-whatever="wtf">' + cssString + '.blaprrr { color: red; } <style>';
		var ret = $doc.documentElement.innerHTML;
		return ret;
	}

	/** 
	 * We have valid html page as param, and in this we insert css
	 * string into the head of it. 
	 * 
	 * I do not believe it is in use at present. 
	 */

	function insertCssIntoHtmlString(cssString, htmlString, recursive = false) {

		if (recursive) {
			var searchMaskToReplaceCaseInsensitivily = "<head";
		} else {
			var searchMaskToReplaceCaseInsensitivily = "<head>";
		}

		var regEx = new RegExp(searchMaskToReplaceCaseInsensitivily, "i");
		var replaceMask = cssString;
		var replaced = htmlString.search(regEx);

		if (replaced === -1 && recursive == false) {
			insertCssIntoHtmlString(cssString, htmlString, true);
			return;
		} else if (replaced === -1) {
			throw new Error("didnt find to replace lol");
			return;
		}
		var result = htmlString.replace(regEx, replaceMask);
		return result;
	}

	return {
		getStyleSheetSeperate: getStyleSheetSeperate,
		requestSwitcher: requestSwitcher,
		fetchImage: fetchImage,
		getStyleSheetsAndThenSendHtml: getStyleSheetsAndThenSendHtml,
		TestIfWeCanViolateSameOriginPolicy: TestIfWeCanViolateSameOriginPolicy
	}
})();