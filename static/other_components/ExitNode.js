/*  
 * 
 * This module encrpyts (or calls the encryption of) fetched files and then sends them
 * back down the path in te pseudoexit (the name of the node at the end ofthe onion route).
 * It finds the right channel to send images/css/html down and does that. 
 * 
 * It also sends a failed response when we cannot fetch a page. 
 *   
 */
"use strict";

var ExitNode = (function () {

	/**
	 * When a page cannot be requested we have this little error page we send, 
	 * which also includes a couple of tags that we replace. We then send it 
	 * down the network how we send a regular page. 
	 *
	 */
	function sendFailedResponse(messageObj, errorMessageText) {
		jQuery.get('errorPage.html', function (data) {
			data = data.replace("<!!!PAGE!!!>", messageObj.url);
			data = data.replace("<!!!ERROR!!!>", errorMessageText);

			messageObj.content = data;
			var bf = ExitNode.sendContent.bind(null, messageObj);
			RateLimiter.execute(bf, true);
		});
	}

	/**
	 * We encrypt, and then send down the datachannel the fetched css. 
	 */
	function sendCSS(messageObj) {
		var message = messageObj;
		window.AboutTOSendTestCSS = message.content;
		var DCSO = Queries.fetchDCSOByPseudoExitIdAndRole(message.pseudoExitId, 'pseudoExit');
		var keyHex = Groups.getAssociatedKey(DCSO.connectionId);
		var contentConstatenated = Cryptography.concatFNAndStrn(message.url, "css", message.reqID, message.content);
		var FlagIfItIsString = true;
		Cryptography.encrypt(contentConstatenated, cbContent, keyHex, FlagIfItIsString);

		function cbContent(blob) {
			var file = new File([blob], "message.url");
			var getNextChunkCallbackBF = getNextChunkCallback.bind(null, DCSO.dataChannel);
			console.assert(DCSO.dataChannel instanceof DataChannel, "socket.on.content and fetchbypseudoexit didnt return datachannel");
			var extra = {
				chunkSize: 13 * 1000
			};
			fileBufferReader.readAsArrayBuffer(file, function (uuid) {
				fileBufferReader.getNextChunk(uuid, getNextChunkCallbackBF);
			}, extra);
		};
	}

	/**
	 * This encrypts, or calls the method to encrypt, the main html and then sends it down the path. It takes html
	 * ie "content" and sends it onwards. 
	 *
	 */
	function sendContent(messageObj) {
		var message = messageObj;
		window.AboutTOSendTest = message.content;
		var DCSO = Queries.fetchDCSOByPseudoExitIdAndRole(message.pseudoExitId, 'pseudoExit');
		var keyHex = Groups.getAssociatedKey(DCSO.connectionId);
		var contentConstatenated = Cryptography.concatFNAndStrn(message.url, "html", message.reqID, message.content);
		var FlagIfItIsString = true;
		Cryptography.encrypt(contentConstatenated, cbContent, keyHex, FlagIfItIsString);

		function cbContent(blob) {
			var file = new File([blob], "message.url");
			var getNextChunkCallbackBF = getNextChunkCallback.bind(null, DCSO.dataChannel);
			console.assert(DCSO.dataChannel instanceof DataChannel, "socket.on.content and fetchbypseudoexit didnt return datachannel");
			var extra = {
				chunkSize: 13 * 1000
			};
			fileBufferReader.readAsArrayBuffer(file, function (uuid) {
				fileBufferReader.getNextChunk(uuid, getNextChunkCallbackBF);
			}, extra);
		};
	}

	window.backgroundTestArr = [];
	/**   
	 * This encrypts, or calls the method to encrypt, an image (as datauris) 
	 * and then sends it down the path. Within the network all images are converted into 
	 * dataURIS and processed as such. 
	 */
	function sendImage(imageAsDataUri, pseudoExitId, urlOfRequest, reqID, imageData, type, extraText) {
		var message = {
			image: true,
			reqID: reqID,
			data: imageData,
			buffer: imageAsDataUri,
			pseudoExitId: pseudoExitId,
			extraText: extraText
		};
		var DCSO = Queries.fetchDCSOByPseudoExitIdAndRole(pseudoExitId, 'pseudoExit');

		var keyHex = Groups.getAssociatedKey(DCSO.connectionId);
		var urlParam = (typeof message.url === "undefined") ? null : message.url;
		var contentConstatenated = Cryptography.concatFNAndStrn(urlParam, type, message.reqID, message.buffer, message.data, message.extraText);
		var FlagIfItIsString = true;
		Cryptography.encrypt(contentConstatenated, cbImage, keyHex, FlagIfItIsString);
		// data is i think data to be inserted into image
		function cbImage(blob) {
			var file = new File([blob], "image.url");
			var extra = {
				chunkSize: 13 * 1000
			};
			console.assert(DCSO.dataChannel instanceof DataChannel, "socket.on.image and fetchbypseudoexit didnt return datachannel");
			var getNextChunkCallbackBF = getNextChunkCallback.bind(null, DCSO.dataChannel);
			fileBufferReader.readAsArrayBuffer(file, function (uuid) {
				fileBufferReader.getNextChunk(uuid, getNextChunkCallbackBF);
			}, extra);
		}
	}
        /**
        * callback is required to send chunks using muaz kahns file buffer reader, this is that 
        * callback sends the next chunk when requested. 
        */
	function getNextChunkCallback(DC, nextChunk, isLastChunk) {
		if (isLastChunk) console.log('we sent it ');
		DC.send(nextChunk);
	};

	return {
		sendFailedResponse: sendFailedResponse,
		sendImage: sendImage,
		sendContent: sendContent,
		sendCSS: sendCSS

	}
})();