/*   
 * Generic utility functions 
 *
 *As utility methods the module is stateless. 
 * 
 * When there is any code that I did not write I try to mention that in the docblock
 * of the function. In this module each method was individually taken from StackOverflow
 * and are generic utility methods.  
 */

"use strict";

var Utils = (function () {
	/**
	 * I did not write this. Taken from StackOverflow. 
	 */
	function amIChrome() {
		/* please note, 
		 * that IE11 now returns undefined again for window.chrome
		 * and new Opera 30 outputs true for window.chrome
		 * but needs to check if window.opr is not undefined
		 * and new IE Edge outputs to true now for window.chrome
		 * and if not iOS Chrome check
		 * so use the below updated condition
		 */
		var isChromium = window.chrome;
		var winNav = window.navigator;
		var vendorName = winNav.vendor;
		var isOpera = typeof window.opr !== "undefined";
		var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
		var isIOSChrome = winNav.userAgent.match("CriOS");

		if (isIOSChrome) {
			// is Google Chrome on IOS
			return true;
		} else if (
			isChromium !== null &&
			typeof isChromium !== "undefined" &&
			vendorName === "Google Inc." &&
			isOpera === false &&
			isIEedge === false
		) {
			// is Google Chrome
			return true;
		} else {
			// not Google Chrome 
			return false;
		}
	}

	/**
	 * NOTE: I did not write this. Taken from StackOverflow. 
	 */
	function validateIPaddress(inputText) {
		var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		return !!inputText.match(ipformat);
	}

	/**
	 * NOTE: I did not write this: taken from StackOverflow. 
	 * NOTE: inclusive of min and max
	 */
	function randomIntFromInterval(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	/**
	 * NOTE: I did not write this: taken from StackOverflow. 
	 */
	function arrayBufferToBase64(buffer) {
		var binary = '';
		var bytes = [].slice.call(new Uint8Array(buffer));
		bytes.forEach((b) => binary += String.fromCharCode(b));
		return window.btoa(binary);
	};

	/**
	 * NOTE: I did not write this: taken from StackOverflow. 
	 */
	function dataURLtoBlob(dataurl) {
		var arr = dataurl.split(','),
			mime = arr[0].match(/:(.*?);/)[1],
			bstr = atob(arr[1]),
			n = bstr.length,
			u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new Blob([u8arr], {
			type: mime
		});
	}

	return {
		amIChrome: amIChrome,
		validateIPaddress: validateIPaddress,
		randomIntFromInterval: randomIntFromInterval,
		arrayBufferToBase64: arrayBufferToBase64
	}
})();