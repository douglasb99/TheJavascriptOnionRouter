/*  
 * This has higher level cryptographic methods which call the lower level encrypt/decrypt methods of cryptography.js
 * These are calling the encrypt/decrypt methods multiple times as is requierd to fully wrap/unwrap the onion. 
 */
"use strict";

var CryptoMethods = (function () {
	/*
	This is a method only for testing during development. 
	 */

	function TestCallerTester() {
		var keys = [
			"794c1a77bf8c952976782d52b924d63c",
			"c20b7e6eeecbe010f432323ad7427608",
			"245236d4482f3599010860b449e1d199"
		];

		var STRINGTOTEST = "LATIN EPUS IPSUM FLOTSUM";

		function successCB(result) {
			var expected = "XC4hXrw7PigKUNGTM5GRk2HfBtLtIROxF1ICtEUc/42CmN7dGbeusNcgIZPWYCFdg+m+LYtBsFP7w/VMB5rk0Bb0NU45lT+XfJANRvgvLNCOMS201cA7/ZB5R/H2R0Hk1N6RSBa2i1F8H9eU5mYyg0sSaBawAmHrgkQJVSf6L6QuWt8qLadtZiILTfmiHHFLVo3PJHEuXYY+hqj9g4JQwg==";
		}
		ConsumerEncryptMultipleeURL(keys, 2, successCB, STRINGTOTEST);
	}

	/**
	 *redundant
	 *TODO:safely delete
	 *
	 */
	function fileTester() {

		var keys = [
			"794c1a77bf8c952976782d52b924d63c",
			"c20b7e6eeecbe010f432323ad7427608",
			"245236d4482f3599010860b449e1d199"
		];
	}

	/**
	 * This is the high level logic that causes the encryption to be called 3 times, once with each 
	 * of the array of keys given, and in order. Asyncronous. 
	 *
	 *@param {Array} keys An array of length 3 containing the three 16byte hex keys to be encrypted with in order ie 
	 *               with 1 then the result with 2 and the result of that with 3. 
	 *               
	 *@param {integer) i I am unhappy with this hack but we need to know where in the loop we are at and so state is passed between 
	 *                 the recursive calls with  i needed to be started at 0 or undefined. It is really internal and should be refactored
	 *                 away from being a paramater. 
	 *@param {function} successCB The callback to be executed upon commplete multiple encryption with the string result as 
	 *                  the sole paramater being given. 
	 *@param {string} urlAsString poorly named but essentially whatever (string) data is to be encrypted.                                           
	 */
	function ConsumerEncryptMultipleeURL(keys, i, successCB, urlAsString) {

		if (typeof i === "undefined") {
			i = 0;
		}
		if (i < 0) {
			// on success we pass the encrypted string in
			successCB(urlAsString);
			return;
		}
		var keyInHex = keys[i];
		i--;
		var ConsumerEncryptMultipleeURLBF = ConsumerEncryptMultipleeURL.bind(null, keys, i, successCB);
		var FlagIfItIsString = true;
		var stringParamInCallbackFlag = true;
		Cryptography.encrypt(urlAsString, ConsumerEncryptMultipleeURLBF, keyInHex, FlagIfItIsString, stringParamInCallbackFlag);
	}


	/**
	 * This is the high level logic that causes the decryption to be called 3 times, once with each 
	 * of the array of keys given, and in order. Asyncronous. 
	 *
	 *@param {Array} keys An array of length 3 containing the three 16byte hex keys to be decrypted with in order ie 
	 *               with 1 then the result with 2 and the result of that with 3. 
	 *               
	 *@param {integer) i I am unhappy with this hack but same hack as above. start by calling it with i = 0. 
	 *@param {function} successCB The callback to be executed upon commplete multiple encryption with the string result as 
	 *                  the sole paramater being given. 
	 *@param {string} textAsBlob poorly named but essentially whatever (string) data is to be encrypted.                                           
	 */
	function ConsumerMultipleeDecryptBlobToBlob(keys, i, successCB, textAsBlob) {
		if (i > 2) {
			successCB(textAsBlob);
			return;
		}
		var keyInHex = keys[i];
		i++;
		var ConsumerDECRYPTStringToBlobBF = ConsumerMultipleeDecryptBlobToBlob.bind(null, keys, i, successCB);
		console.info("THE KEY USED IS : " + keyInHex);
		Cryptography.decrypt(textAsBlob, ConsumerDECRYPTStringToBlobBF, keyInHex, false, false);
	}

	return {
		TestCallerTester: TestCallerTester,
		ConsumerEncryptMultipleeURL: ConsumerEncryptMultipleeURL,
		ConsumerMultipleeDecryptBlobToBlob: ConsumerMultipleeDecryptBlobToBlob
	}
})();