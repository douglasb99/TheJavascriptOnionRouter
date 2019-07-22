/*  
 * fetches css style sheets when given as array, passes them on to exit node to send back to requester. 
 *  part of exit node functionality. 
 */
"use strict";

var CSSRequester = (function () {

	/**
	 * Iterates over aan array of style sheets with each one it calls a method to fetch/send the style sheet. 
	 *
	 */
	function SendStyleSheetsAsync(styleSheetsArr, messageObj) {
		for (var i = 0; i < styleSheetsArr.length; i++) {
			getStyleSheet(styleSheetsArr[i], messageObj);
		}

	}

	/*
	 * fetches a given style sheet by URI, and then calls exitNode.sendCSS and binds this into the ratelimiter. 
	 * @param {string} styleSheetURL is the complete uri of the css file.
	 * @param {Object} messageObj is an object containing various parts of the message as is required by the exitnode. 
	 */
	function getStyleSheet(styleSheetURL, messageObj) {
		fetch(styleSheetURL).then(function (response) {
			return response.text();
		}).then(function (txt) {
			messageObj.content = txt;
			var bf = ExitNode.sendCSS.bind(null, messageObj);
			RateLimiter.execute(bf, true);
		});
	}

	return {
		SendStyleSheetsAsync: SendStyleSheetsAsync
	}
})();