/**
 *
 * When a message is revieved on a datachannel the main method function is attatched to the onmessage
 * and sorts through many different types of possible messages.  
 * 
 * 
 * This was started small and just got bigger and messier and is the worst part of the application in terms of 
 * how it looks and is designed. 
 * 
 * Essentially it has one grossly huge function called main which firstly checks if the message is
 * valid json, which if true that means it is not the response to the request being returned (which is sent as
 * arraybuffer or DataView) . 
 * 
 * If it is valid json then we look for the id which all messages have and says what the message actually does, 
 * and the message then usually calls some other function to perform what are usually RPCS. 
 * Now if it does not have an action we decrypt once as a request and forward on the message.
 * 
 * The main function is attatched to the onmessage of a datachannel event. 
 */

var messageHandler = function () {
	var chunk,
		socket,
		fileBufferReader,
		DC;

	/*
	 * init function: constructor equivalent
	 * 
	 * @param {Object} fbr instance of fileBufferReader. we use one instance across all 
	 * @param {Object} socketInstance is an instance
	 * @returns {void}
	 */
	init = function (fbr, socketInstance = null, dataChannelInstance) {
			fileBufferReader = fbr;
			socket = window.socket;
			DC = dataChannelInstance;
		},

		/*
		 * handles main flow of handing a recieved message on datachannel, 
		 * calling other method depending on the message type.
		 * This is passed as callback into file buffer reader on chunk method 
		 * 
		 * @param event is event object passed by the datachannel onmessage function. 
		 */
		main = function (event) {
			chunk = event.data;

			// if message is json then its not a file, its an internal communication messgae. 
			// many different types of message seen within this   
			if (IsJsonString(chunk)) {

				var parsed = JSON.parse(chunk);
				/* This is the test if the thing is actuallly open when first opened. just bounce it back if we get it.
				 * if not open then it will be dropped. 
				 * Used to send test message down the path to see if the path is open yet. 
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "OPENYET") {
					if (!DC.ackSentFlag) {
						// could at this stage verify its open on our own end surely since we recieved a message on it??? ok
						DC.verifyOpen();
						console.error("sending ack which is " + DC.ackSentFlag);
						DC.ackSentFlag = true;
						DC.send(JSON.stringify({
							id: "ack"
						}));
					}
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "ack") {
					DC.verifyOpen();
					return;
				}
				/* message sent just for internal testing that a datachannel is functioning, often from console */
				if (parsed.hasOwnProperty('id') && parsed.id === "NEWTEST") {
					alert("NEW TEST");
					console.error('NEWTEST : ' + parsed.connectionId);
					return;
				}
				// neighbour who is closing should send this message to neighbour
				if (parsed.hasOwnProperty('id') && parsed.id === "manuallyClosing") {
					DC.manualCloseDCWithCallingOnClosingEvents();
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "MeshChange") {
					SparePriority.meshChange(DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "checkForAndAddMeshSpares") {
					Meshing.findAddMeshSpares(DC, parsed.key, parsed.facing);
					return;
				}

				/* when signalling creation of datachannel using peers as signalling apparatus
				 * this initiate represents message requesting node to initiate creation of new peerconn + datachannel
				 * along with all required data for DCSO
				 */

				if (parsed.hasOwnProperty('id') && parsed.id === "initiate") {
					var HasItAPseudoExitChannelForTesting = Queries.TestMethodDoIHavePseudoExitChannel();
					var addSpareFlag = (parsed.hasOwnProperty('addSpareFlag')) ? addSpareFlag : false;
					var key = (parsed.hasOwnProperty('key')) ? parsed.key : null;
					var AESKey = (parsed.hasOwnProperty('AESKey')) ? parsed.AESKey : null;
					var facing = (parsed.hasOwnProperty('facing')) ? parsed.facing : null;
					var position = (parsed.hasOwnProperty('position')) ? parsed.position : null;
					var meshingKey = (parsed.hasOwnProperty('meshingKey')) ? parsed.meshingKey : null;
					var edgeId = (parsed.hasOwnProperty('edgeId')) ? parsed.edgeId : null;

					P2PChannelNegotiation.initiate(parsed.connectionId,
						edgeId, parsed.role, DC,
						addSpareFlag, facing, key, meshingKey, AESKey, position);
					return;
				}

				/* when signalling creation of datachannel using peers as signalling apparatus
				 * this recieve represents message requesting node to create new channel and recieve whoch means they will
				 * recieve sdp offer and return the answer in terms of asymmetric handshake. 
				 */

				if (parsed.hasOwnProperty('id') && parsed.id === "receive") {
					var HasItAPseudoExitChannelForTesting = Queries.TestMethodDoIHavePseudoExitChannel();
					var addSpareFlag = (parsed.hasOwnProperty('addSpareFlag')) ? parsed.addSpareFlag : false;
					var facing = (parsed.hasOwnProperty('facing')) ? parsed.facing : null;
					var hider = (parsed.hasOwnProperty('hider')) ? parsed.hider : null;
					var key = (parsed.hasOwnProperty('key')) ? parsed.key : null;
					P2PChannelNegotiation.receive(parsed.connectionId, parsed.role, DC,
						addSpareFlag, facing, hider, key);
					return;
				}

				/* When signalling creation of datachannel using peers as signalling apparatus
				 * this is called not in node that creates new peerconnection BUT the signalling server
				 * node ( hence the signalling module used) who should then forward this along a different 
				 * channel to the other peer who will recieve the offer. 
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "forwardOffer") {
					console.log('forwardOffer messagehandler');
					console.assert(typeof parsed.clientId != "undefined", "requires clientid with conid next print");
					console.log("connectionId: " + parsed.connectionId);
					Signalling.forwardOffer(parsed.offer, parsed.connectionId, parsed.clientId, DC);
					return;
				}
				/* When signalling creation of datachannel using peers as signalling apparatus
				 * this is called  in node that creates new peerconnection. 
				 * and who recievs the SDP offer
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "offer") {
					P2PChannelNegotiation.offer(parsed.offer, parsed.connectionId, DC, parsed.clientId);
					return;
				}
				/* When signalling creation of datachannel using peers as signalling apparatus
				 * this is called not in node that creates new peerconnection BUT the signalling server
				 * node ( hence the signalling module used) who should then forward this along a different 
				 * channel to the other peer who will recieve the answer. 
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "forwardAnswer") {
					Signalling.forwardAnswer(parsed.answer, parsed.connectionId, parsed.clientId, DC);
					return;
				}

				/* When signalling creation of datachannel using peers as signalling apparatus
				 * this is called  in node that creates new peerconnection. 
				 * and who recievs the SDP answer
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "answer") {
					console.log('answer messageHandler');
					console.assert(typeof parsed.clientId != "undefined", "requires clientid with conid next print");
					console.log("connectionId: " + parsed.connectionId);
					P2PChannelNegotiation.answer(parsed.answer, parsed.connectionId, parsed.clientId);
					return;
				}
				/**
				 * ditto forward answer and offer but with ICE candidate
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "forwardCandidate") {
					console.log('forwardCandidate  messageHandler ');
					console.log("connectionId: " + parsed.connectionId);
					Signalling.forwardCandidate(parsed.candidate, parsed.connectionId, DC);
					return;
				}
				/**
				 * ditto answer and offer but with ICE candidate
				 */
				if (parsed.hasOwnProperty('id') && parsed.id === "candidate") {
					console.log('candidate messageHandler on DC.conId : ' + DC.connectionId);
					console.log("connectionId: " + parsed.connectionId);
					P2PChannelNegotiation.candidate(parsed.candidate, parsed.connectionId);
					return;
				}

				/* SELF p2p negotiation messages ie when we multiplex
				 *  same as above messages but when self-signalling. For further explanation of 
				 *  what this is see comment at the top of the SelfP2PChannelNegotiation module. 
				 *  NOTE: no selfInitiate message
				 */

				if (parsed.hasOwnProperty('id') && parsed.id === "selfReceive") {
					var addSpareFlag = (parsed.hasOwnProperty('addSpareFlag')) ? parsed.addSpareFlag : false;
					// changed it so that the facing property is set to null 
					var facing = null;
					SelfP2PChannelNegotiation.receive(parsed.connectionId,
						parsed.role, DC,
						addSpareFlag, parsed.spareDCSOToReplicateConnectionId, parsed.position);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "selfOffer") {
					var clientId = parsed.clientId;
					SelfP2PChannelNegotiation.offer(parsed.offer, parsed.connectionId, DC, clientId);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "selfAnswer") {
					var clientId = parsed.clientId;
					SelfP2PChannelNegotiation.answer(parsed.answer, parsed.connectionId, clientId);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "selfCandidate") {
					console.log('candidate messageHandler');
					console.log("connectionId: " + parsed.connectionId);
					SelfP2PChannelNegotiation.candidate(parsed.candidate, parsed.connectionId);
					return;
				}

				/* END of self P2P negotiation Messages */

				if (parsed.hasOwnProperty('id') && parsed.id === "forwardAssertionOfSwitchOver") {
					SparePriority.forwardAssertionOfSwitchOver(parsed.OriginalRouteConnectionIdHash, DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "rerouteConfirmation") {
					SparePriority.rerouteConfirmation(parsed.OriginalRouteConnectionIdHash, DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "rerouteInToMe") {
					SparePriority.rerouteInToMe(DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "close") {
					console.log('close');
					SparePriority.close(parsed.connectionIdHash, DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "setClosingTimeoutAndForward") {
					console.log('setClosingTimeoutAndForward');
					SparePriority.setClosingTimeoutAndForward(DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "closeDCSOWithTimeout") {
					console.log('closeDCSOWithTimeout');
					var DCSO = Queries.fetchDCSOByDC(DC);
					SparePriority.closeDCSOWithTimeout(DCSO);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "GetAndGiveNewUnusedSpare") {
					console.log('requestNewSparet in messageHandler');
					Closing.GetAndGiveNewUnusedSpare(parsed.key, DC);
					return;
				}
				/* messages that are part of hider algorithm */
				if (parsed.hasOwnProperty('id') && parsed.id === "GetAndGiveNewUnusedSpareHider") {
					Hider.GetAndGiveNewUnusedSpare(parsed.key, DC);
					return;
				}

				if (parsed.hasOwnProperty('id') && parsed.id === "ChangeTheNewHiderToPseudoExitSpare") {
					var DCSO = Queries.fetchDCSOByDC(DC);
					Hider.ChangeTheNewHiderToPseudoExitSpare(DCSO);
					return;
				}
				/* end of messages from hider algorithm */
				if (parsed.hasOwnProperty('id') && parsed.id === "ExistsAlreadyRejection") {
					alert('ExistsAlreadyRejection in messageHandler');
					// currently ONLY in hider algorithm but we'll adapt this if we find it elsewhere
					var DCSO = Queries.fetchDCSOByDC(DC);
					Hider.ChangeTheNewHiderToPseudoExitSpare(DCSO);
					return;
				}

				/* for rerouting closing p2pspare   */

				if (parsed.hasOwnProperty('id') && parsed.id === "ReplaceClosingP2P") {
					console.log('requestNewSparet in messageHandler conId ' + DC.connectionId);
					Closing.ReplaceClosingP2P(DC);
					return;
				}

				/*  for closetest messages  */
				if (parsed.hasOwnProperty('id') && parsed.id === "testMessage") {
					var DCSO = Queries.fetchDCSOByDC(DC);
					if (DCSO.role === "relay") {
						console.log('test message received and relayed  ' + DC.connectionId);
						// same code as relayng normal message maybe turn into function ought to in refactor  
						var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCSO, "relay");
						var readyState = matchingEdgeDC.getReadyState();
						var testNumMatchingEdges = Queries.matchingEdgeCountTest(DCSO, "relay");
						matchingEdgeDC.send(JSON.stringify({
							id: 'testMessage',
							key: parsed.key
						}));

						console.log('relay from ' + DCSO.connectionId + ' TO ' + matchingEdgeDC.connectionId);
					} else if (DCSO.role === "pseudoExit") {
						console.log('test message received and bounced back  ' + DC.connectionId);
						// maybe put permissions thing to prevent too many of these messages come in
						DC.send(JSON.stringify({
							id: 'testMessage',
							key: parsed.key
						}));
					} else if (DCSO.role === "consumer") {
						console.log('test message back at consumer  ' + DC.connectionId);
						// maybe put permissions thing to prevent too many of these messages come in
						CloseTest.processReply(parsed.key, DC);
					} else {
						console.error('hmmm testMessage should be pseudoExit or relay but was ' + DCSO.role);
					}
					return;
				}
				if (parsed.hasOwnProperty('id') && parsed.id === "ConsumerClosingMessage") {
					// pass it on and we let the ClosingDown handle it   
					var DCSO = Queries.fetchDCSOByDC(DC);
					// if its a relay we pass it on
					if (DCSO.role === "relay") {
						console.log('ConsumerClosingMessage message received and relayed  ' + DC.connectionId);
						// same code as relayng normal message maybe turn into function ought to in refactor  
						var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCSO, "relay");
						var readyState = matchingEdgeDC.getReadyState();
						var testNumMatchingEdges = Queries.matchingEdgeCountTest(DCSO, "relay");

						if (readyState !== 'open' || testNumMatchingEdges > 1) {
							console.error("not open edge in ConsumerClosingMessage relay if statement");
							DC.dataChannel(JSON.stringify({
								id: 'closedEdge'
							}));
						}

						matchingEdgeDC.send(JSON.stringify({
							id: 'ConsumerClosingMessage'
						}));
						console.log('sent ConsumerClosingMessage from ' + DCSO.connectionId + ' TO ' + matchingEdgeDC.connectionId);
					}
					// since this will sybcronously close dc must relay first
					ClosingDown.onClosingMessage(DC);
					return;
				}
				/**
				 * This part represents messages which are the request and run on different parts of the decryption chain depending
				 *  on the role ie the position in the chain. 
				 * This part continues until the end if this main method.
				 */
				var DCStorageObject = fetchDataChannelStorageObject(DC.connectionId);
				// used for relaying message e.g. request for url
				if (DCStorageObject.role === "relay") {
					var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCStorageObject, "relay");
					var readyState = matchingEdgeDC.getReadyState();
					var testNumMatchingEdges = Queries.matchingEdgeCountTest(DCStorageObject, "relay");
					var keyHex = Groups.getAssociatedKey(DCStorageObject.connectionId);
					// my assumption here was that this was for relaying requests
					var obj = JSON.parse(chunk);
					Cryptography.decrypt(obj.url, cb, keyHex, true, true);

					function cb(partiallyDecryptedRequest) {
						matchingEdgeDC.send(JSON.stringify({
							id: 'url',
							url: partiallyDecryptedRequest
						}));
						console.log('relay from ' + DCStorageObject.connectionId + ' TO ' + matchingEdgeDC.connectionId);
					}
					return;
				} else if (DCStorageObject.role === "P2PSpare") {
					// maybe get rid of p2pspare and replace with relay soon since v similar
					console.log('p2p spare hopefully passing on');
					var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCStorageObject, "P2PSpare");
					console.log('spares conid: ' + matchingEdgeDC.connectionId);
					matchingEdgeDC.send(chunk);
					console.log('p2psparerelay from ' + DCStorageObject.connectionId + ' TO ' + matchingEdgeDC.connectionId);
					return;
				} else if (DCStorageObject.role === "pseudoExit") {
					var keyHex = Groups.getAssociatedKey(DCStorageObject.connectionId);
					// my assumption here was that this was for relaying requests
					var obj = JSON.parse(chunk);
					Cryptography.decrypt(obj.url, cb, keyHex, true, true);

					function cb(DecryptedRequest) {
						var reqData = makeRequestObject(DecryptedRequest);
						window.fetchesMade.push(reqData);
						// so this is the last part of the decryption chain and the plain text request is now made
						DoThisRequestYourself(reqData, DCStorageObject);
					}
					return;
				}
			}
			/* 
			 * so if it is not json then that means that its not an 
			 * internal communications message 
			 *  but it is core data being sent as chunks ie response to request and is run in an encryption chain. 
			 */
			if (chunk instanceof ArrayBuffer || chunk instanceof DataView) {
				if (chunk instanceof DataView) console.count("chunk instanceof DataView");
				if (chunk instanceof ArrayBuffer) console.count("chunk instanceof ArrayBuffer");
				fileBufferReader.convertToObject(chunk, function (object) {
					DC.rtcdatachannel.onmessage({
						data: object
					});
				});
				return;
			}

			// process the extra data if we have it in chunk. note its sent with each chunk of message
			if (chunk.hasOwnProperty('extra')) {
				// we'll do this later stage now since instead when encrypted part of main packet
				var uuid = chunk.uuid;
				chunk.extra.uuid = uuid;
				chunk.extra.connectionId = DC.connectionId;
			}

			if (chunk.readyForNextChunk) {
				fileBufferReader.getNextChunk(chunk.uuid, function (nextChunk, isLastChunk) {
					DC.rtcdatachannel.send(nextChunk);
				});
				return;
			}
			fileBufferReader.addChunk(chunk, function (promptNextChunk) {
				console.log('chunk recieved ask for next chunk');
				DC.rtcdatachannel.send(promptNextChunk);
			});
		};

	/*
	 * Determines if input is parsable ( valid ) json string. 
	 * Note that this seems hacky using a try-catch, but this is 
	 * the recommended way to determine this. 
	 * 
	 * @param {tring} string to test
	 * @returns {boolean} true is json valid, false otherwise
	 */
	function IsJsonString(str) {
		// not adviced usage but i have searched and its the only way i can find. 
		try {
			JSON.parse(str);
		} catch (e) {
			console.log('invalid json');
			return false;
		}
		console.log('true json');
		return true;
	};

	/*
	 * TODO: remove since this is a duplicate of a method in Queiries.js, and 
	 * it is not coherant being here. 
	 * 
	 * @param {type} connectionId
	 * @returns {window.DataChannels|Window.DataChannels|window@arr;DataChannels}
	 */
	function fetchDataChannelStorageObject(connectionId) {

		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['connectionId'] === connectionId) {
				ret = window.DataChannels[i];
				console.assert(connectionId === window.DataChannels[i].connectionId, 'fetch datachannel object got wrong channel');
				break;
			}
		}
		return ret;
	}

	/*
	 * TODO: remove since this is a duplicate of a method in Queiries.js, and 
	 * it is not coherant being here. 
	 * 
	 * @param {type} file
	 * @returns {Object} datachannel ie instance of datachannel class of other edge
	 */
	function fetchMatchingEdgeDC(DCStorageObject) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCStorageObject.edgeId &&
				DCStorageObject !== window.DataChannels[i]) {
				ret = window.DataChannels[i]['dataChannel'];
				break;
			}
		}
		return ret;
	}

	/*
	 * Called in fetchurl. Request object has the required properties of a request as expected by exit node functionality. 
	 * 
	 * @param {string} url of request
	 * @returns {Object} object of structure  reqData = { 'url' => request url, 'redID' => the request id }
	 */
	var makeRequestObject = function (url) {
		var reqID = UUID.generate();
		var reqData = {};
		reqData.url = url;
		reqData.reqID = reqID;
		return reqData;
	};

	/*
	 * sends url request to server. helper of fetchUrl. called in fetchUrl method 
	 * NOTE: not in use. Doesn't work also is swapped in. 
	 * @param {type} reqData is object created by makeRequestObject 
	 * @returns {void}
	 */
	var forwardUrlRequestToServer = function (reqData, pseudoExitId) {
		var jsonMessage = {
			url: reqData.url,
			reqID: reqData.reqID,
			pseudoExitId: pseudoExitId
		};
		socket.emit('fetch', jsonMessage);
		return;
	};
	/* 
        *Since we act as an exit node this is where we make the request
        *or call the making of the request. 
        */
	var DoThisRequestYourself = function (reqData, DCStorageObject) {
		var reqID = UUID.generate();
		var messageObj = {
			content: null,
			url: reqData.url,
			reqID: reqData.reqID,
			pseudoExitId: DCStorageObject.pseudoExitId
		};
		Requester.requestSwitcher(messageObj);
		return;
	}
	return {
		init: init,
		main: main
	};
};