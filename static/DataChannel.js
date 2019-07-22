/*
 * Datachannel Class is wrapper around a webRTC datachannel. 
 * It saves data associated with a datachannel, and provides wrappers 
 * around the logic of creating an offer, answer and icecandidates to set configs for creating this channel. 
 * it also allows binding of arbitrary numbers of functions to a multitude of datachannel events eg opening, stores
 * state of channel eg offerer in sdp protocol and handles buffering, polling configuration, adds custom munging of the sdp
 * answers/offers, and attatches the filebufferreader and capabilities to process messages recieved and send along datachannel. 
 * 
 * This class is well tested and rarely if ever gives errors. 
 * 
 * Below is constructor and private functions ( which must appear in constructor in JS prototype pattern), 
 * and functions within prototype are our public functions 
 * 
 * @param {array} onICECandidateCallBackParams array of paramaters to be passed to onICECandidateCallBack. swap later by binding to cb in this refactor
 * @param {Object} onICECandidateCallBack function
 * @param {socket} the websocket
 * @param {connectionId} the id we are giving to the connection. Note that there is a lower level guid to assign to te datachanel 
 * which is stored on the actual peerconnection which is different and not used by this application. 
 * @param {string} role is effectively an enum of allowed roles for datachannel whoch is stored here and duplicated on the 
 *                 DCSO when really it should only be on the DCSO but refactoring this is low priority. 
 */
function DataChannel(onICECandidateCB, fileBufferReader, socket, connectionId, role) {

	if (typeof onICECandidateCB !== "function") {
		console.error("onICECandidateCB must be a function");
		var d = 0;
	}


	var exitRolesTestArr = ['pseudoExit', 'sparePseudoExit', 'signallerPseudoExit'];
	this.connectionId = connectionId;
	this.offerer = false;
	this.initiator = false;
	this.role = role;
	this.threshold = 65535;
	this.threshold = 1;
	// since sometimes we have bug where channel only open one side
	// on first message we send through we resend until an ack recieved. 
	this.firstMessageSentThroughFlag = false;
	this.queuedMessagesAwaitingOpenFlag = [];
	this.sendOpenCheckCalledCount = 0;
	this.maxCallsOfOpenCheck = 10;
	// if we haven;t we send an ack if asked. 
	this.ackSentFlag = false;
	// we save the client id here. its a bit funy but tch. this is given to us by the 
	// parter and prevents u sfrom using two on the same channel. 
	this.clientId = null;
	/* we use polling to check the state of the internal datachannel buffer in some browsers */
	this.usePolling;
	/* state flag used to test the state of the channel */
	this.sentOffer = false;
	/* state flag used to test the state of the channel */
	this.sentAnswer = false;


	this.errorShown = false;

	/* We use this as our own buffer to store data if channel is at max capacity, and send data later when the datachannels own
	 * internal buffer is decreaesed below a threshold. 
	 */
	this.internalBuffer = [];
	/* start of logic in construtor*/
	var self = this;
	/* message handler is a huge thing and used to actually process the recieved message depending on the type of it */
	this.msgHandler = messageHandler();
	this.msgHandler.init(fileBufferReader, socket, self);
	/* This is our actual peerconnections datachannel and is
	 * undefined until either init or offer called */
	this.rtcdatachannel;
	/*
	 * so these are the turn servers used. I think here are free ones I found online that can handle
	 * a tiny amount of traffic. 
	 */
	var configuration = {
		iceServers: [{
			urls: ["turn:eu-turn3.xirsys.com:80?transport=udp",
				"turn:eu-turn3.xirsys.com:3478?transport=udp",
				"turn:eu-turn3.xirsys.com:80?transport=tcp",
				"turn:eu-turn3.xirsys.com:3478?transport=tcp",
				"turns:eu-turn3.xirsys.com:443?transport=tcp",
				"turns:eu-turn3.xirsys.com:5349?transport=tcp"
			],
			username: "af2e419c-f8b1-11e8-8115-05db8a0592d6",
			credential: "af2e4278-f8b1-11e8-987e-d5bdc8548df8"
		}, {
			urls: [
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302"
			]
		}]
	};
	/*
	 * 
	 * genuinely unique id to assign to datachannel. datachannel requires id 
	 */
	this.guid;
	RTC_IS_MOZILLA = !!window.mozRTCPeerConnection,
		this.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.msRTCPeerConnection;
	this.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.msRTCSessionDescription;
	this.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.msRTCIceCandidate;
	this.RTCPeerConn = new this.RTCPeerConnection(configuration);
	/*
	 * callback executed on error at various points
	 * 
	 * @param {type} e error object
	 * @returns {void}
	 */
	this.onError = function (e) {
		throw new Error(e);
	};

	this.testIfOpened = function (recursiveCall = false) {
		var timePeriod = 20000;
		if (recursiveCall === true) {
			var readyState = self.getReadyState();
			if (readyState !== "open" && !self.errorShown) {
				self.errorShown = true;
			} else if (readyState === "open") {
				self.OnDCEHsGen.next(function () {
					console.error("seems onopen didnt run yet but its open already");
				});
				self.OnDCEHsGen.next();

			}
		}
		var bf = self.testIfOpened.bind(null, true);
		if (readyState !== 'open') {
			setTimeout(bf, timePeriod);
		}
	};

	this.testIfOpened();


	/*
	 *event handler called when buffered amount is low in sctp channel. 
	 *  I mean seems counterintuitive in that it seems to be called when the buffered amount was low and then returns to 
	 *  normal hence this method sends all the internally buffered data when called which otherwise would make little sense.
	 *  
	 *   The send method it calls will itself buffer the data if the buffered amount goes back over the threshold again.  
	 * @returns {void}
	 */
	this.bufferedAmountLow = function () {
		console.warn('====== BUFERED AMOUNT LOW ======');
		self.bufferedLogger(" the buffered amount is low ");
		var data;
		for (var i = 0; i < self.internalBuffer.length; i++) {
			data = self.internalBuffer.shift();
			self.send(data);
		}
	};

	this.bufferedLogger = function (extraInfo) {
		var log;
		var amount = self.rtcdatachannel.bufferedAmount;
		log = "conid : " + self.connectionId + " buffered amount : " + amount + " and extra is : " + extraInfo;
		window.bufferedLogging.push(log);
	}


	/*
	 * a generator function which allows us to execute an arbitrary number of functions on an event and add at any point
	 * more functions until the event occurs.
	 * Most events have such functionality but not datachannel events. 
	 *  currently used for onclose event, for on datachannel event, and on datachannel open event. 
	 *  each of which has a public method near end of class that allows arbitrary functions to be taken as args and added 
	 *  to event. 
	 *  
	 *  first time its called generator accepts no args, then n2 - nx while paramter is function it adds func to
	 *  array. when called empty ( by event handler usually ) it executes the bunch of functions. it is private and accessed by a method 
	 *  that ensures users of the class can only call it with function to add. 
	 *  
	 *   
	 */
	// difference between these three is merely limited to log messages for debugging
	function* eventHandlerFunctionAdderGeneratorFactoryOpener() {
		var funcs = [];
		var flag = function () {};

		while (typeof flag === "function") {
			flag = yield false;
			funcs.push(flag);
			// debugger;
			console.log('Opener: add loop of generator conid ' + this.self.connectionId);
		}
		console.log('Opener: starting execute of generator' + this.self.connectionId);
		this.self = self;
		while (funcs.length > 1) {
			funcs.shift().call(this);
			console.log('Opener: execute loop of generator conid ' + this.self.connectionId);

		}

	}

	function* eventHandlerFunctionAdderGeneratorFactoryCloser() {
		var funcs = [];
		var flag = function () {};

		while (typeof flag === "function") {
			flag = yield false;
			funcs.push(flag);
		}
		this.self = self;
		while (funcs.length > 1) {
			funcs.shift().call(this);
		}

	}

	function* eventHandlerFunctionAdderGeneratorFactoryAddEventHandler() {
		var funcs = [];
		var flag = function () {};

		while (typeof flag === "function") {
			flag = yield false;
			funcs.push(flag);
		}
		this.self = self;
		while (funcs.length > 1) {
			funcs.shift().call(this);
		}

	}

	// create/initialize generator for adding onclose events
	this.closeGen = eventHandlerFunctionAdderGeneratorFactoryCloser();
	this.closeGen.next();

	// On data Channel Event Hamdlers Generator
	this.OnDCEHsGen = eventHandlerFunctionAdderGeneratorFactoryAddEventHandler();
	this.OnDCEHsGen.next();

	// DC open is run inside DCEH so only added once DC exists. 
	this.OnDCOpen = eventHandlerFunctionAdderGeneratorFactoryOpener();
	this.OnDCOpen.next();
	this.OnDCEHsGen.next(function () {
		var self = this.self;
		// is order guaranteed
		var readStateTest = this.self.getReadyState();
		if (readStateTest === "open") {
			self.OnDCOpen.next();
		} else {
			this.self.rtcdatachannel.onopen = function () {
				self.OnDCOpen.next();
			}
		}

		this.self.rtcdatachannel.onerror = this.self.onError;
		this.self.rtcdatachannel.onbufferedamountlow = this.self.bufferedAmountLow;
		this.self.rtcdatachannel.onclose = this.self.onClosing;
		this.self.rtcdatachannel.binaryType = "arraybuffer";
		this.self.rtcdatachannel.onmessage = this.self.msgHandler.main;
		// this value taken from https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/bufferedAmountLowThreshold 


		if (typeof this.self.rtcdatachannel.bufferedAmountLowThreshold === 'number') {
			this.self.usePolling = false;
		} else {
			this.self.usePolling = true;
		}
		this.self.rtcdatachannel.bufferedAmountLowThreshold = this.self.threshold;
	});

	this.OnDCOpen.next(function () {
		this.self.rtcdatachannel.onmessage = this.self.msgHandler.main;

		function wait(ms) {
			var start = new Date().getTime();
			var end = start;
			while (end < start + ms) {
				end = new Date().getTime();
			}
		}
	});


	/*
	 * event handler when ice candidate is produced calling callback provided in constructor. 
	 * Essentially when produced we wish to give the ICE candidate to our partner and if a server
	 * is signaller then we send to server, and if p2p negotiation is being used then we must send down another
	 * datachannel. 
	 * 
	 * @param {type} event
	 * @returns {void}
	 */

	this.RTCPeerConn.onicecandidate = function (event) {
		if (!event || !event.candidate) {
			console.log(' the last candidate!!! conId: ' + self.connectionId);
			return;
		}
		onICECandidateCB(event.candidate, self);

	};

	/*
	 * called by chrome if partner disconnects. firefox calls onclose event handler instead
	 */
	this.RTCPeerConn.oniceconnectionstatechange = function () {
		if (self.RTCPeerConn.iceConnectionState == 'disconnected') {
			console.info('ice connection state change' + self.connectionId);
			self.closeGen.next();
			var msg = "possible for RTCPeerConn to close before instance exists, but look anyway since weird";
			if (self.rtcdatachannel === undefined) throw new error(msg);

			// I am closing it anyway just to be sure.
			self.rtcdatachannel.close();
		}
	}

	/*
	 * called when datachannel established
	 * ondatachannel event  only exists in reciever not initiator of new datachannel
	 * 
	 * @param {Object} event
	 * @returns {void}
	 */

	this.RTCPeerConn.ondatachannel = function (event) {
		console.log(' ondatachannel function called');
		self.rtcdatachannel = event.channel;
		self.OnDCEHsGen.next();
	};


	/**
	 * only called in firefox at time of writing. 
	 */
	this.onClosing = function () {
		self.closeGen.next();
		self.rtcdatachannel.close();
	}

	/**
	 * we can manually close the channel ourself WITH calling any of the attatched closing callbacks we have attatched
	 * to the closing event. 
	 *
	 */
	this.manualCloseDCWithCallingOnClosingEvents = function () {
		console.info('manualCloseDCWithCallingOnClosingEvents');
		self.closeGen.next();
		self.rtcdatachannel.close();
	}

	/**
	 * we can manually close the channel ourself WITHOUT calling any of the attatched closing callbacks we have attatched
	 * to the closing event. 
	 *
	 */
	this.manualCloseWithoutCallingOnClosingEvents = function () {
		console.info('manualCloseDCWithOUTCallingOnClosingEvents - WITHOUT WITHOUT');

		if (typeof self.rtcdatachannel === "undefined") {
			console.error("DC not existant in conid : " + self.connectionId);
			this.OnDCEHsGen.next(function () {
				self.rtcdatachannel.onclose = function () {};
			});
			return;
		}
		// we just replace all the attatched generator functions with empty functions then close it. 
		self.rtcdatachannel.onclose = function () {};
		self.RTCPeerConn.oniceconnectionstatechange = function () {};
		self.rtcdatachannel.close();
	}

	/**
	 * This function should be sparingingly used and after doing this any added onclose events will silently fail ie be added
	 * to a generator attatched to nothing. the idea is that before closing in manual rerouting its partners will shut it off
	 * and we don't want it then trying to route around this.
	 */
	this.removeOnClosingEventsFromChannel = function () {
		self.rtcdatachannel.onclose = function () {};
		self.RTCPeerConn.oniceconnectionstatechange = function () {};
	}


	/*
	 * A Hack to changes SDP answer to increase max bandwidth 
	 * if it is set to AS:30 which is it does in Chrome  
	 * 
	 * @param {string} sdp answer
	 * @returns {string}  sdp answer with chnaged max bit rate component
	 */
	this.mungSDPAnswer = function (answer) {
		var maxBandWidthBitPerSecond = 1638400;
		var split = answer.split("b=AS:30");
		if (split.length > 1) answer = split[0] + "b=AS:" + maxBandWidthBitPerSecond + split[1];
		return answer;
	};
}


DataChannel.prototype = {
	constructor: DataChannel,
	/*
	 * Begins process of creating datachannel by initiator and creating 
	 * the SDP offer which is passed to callback
	 * 
	 * @param {array} cbArgs arguments to be passed to callback
	 * @param {type} callback to be executed on success, with cbArgs as first param, and offer as second
	 * @returns {void}
	 */
	initiate: function (callback) {
		this.initiator = true;
		this.guid = UUID.generate();
		console.log(' and our guid is ' + this.guid);
		this.rtcdatachannel = this.RTCPeerConn.createDataChannel(this.guid);
		var self = this;
		self.OnDCEHsGen.next();
		self.OFTFFERER = 'LE OFFERER';
		this.RTCPeerConn.createOffer(function (SDPoffer) {
			self.SDPoffer = SDPoffer;
			self.RTCPeerConn.setLocalDescription(SDPoffer, function () {
				var output = {};
				output['type'] = "offer";
				output['sdp'] = self.SDPoffer.sdp;

				//RTCSessionDescription.toJSON returns json str in FF, but json obj in Chrome
				if (typeof output === 'string') output = JSON.parse(output);
				callback(output, self);
			}, self.onError);
		}, this.onError);
	},
	/*
	 * Creates SDP offer, and passes it to the callback when created. This is called by the other side of the proposed 
	 * datachannel which is not the initator and recieves the sdp offer, and produces the sdp answer. 
	 * 
	 * @param {string} offer the sdp off
	 * @param {array} cbArgs arguments to pass into the callback
	 * @param {function} callback callback to be executed on success with args
	 * @returns {void} 
	 */
	offer: function (sdpOffer, clientId, callback) {
		if (typeof clientId === "undefined" || clientId.length <= 5) {
			throw new Error("needs a client id" + clientId);
		}
		this.clientId = clientId;
		var offer = new this.RTCSessionDescription(sdpOffer);
		var self = this;
		console.assert(this.initiator === false, 'initiator then offerer failure: cannot take both roles with same channel ' + self.connectionId);
		console.assert(this.offerer === false, ' offerer failure: Trying to offer twice ' + self.connectionId);
		this.offerer = true;
		this.RTCPeerConn.setRemoteDescription(offer, function () {
			self.RTCPeerConn.createAnswer(function (answer) {
				self.RTCPeerConn.setLocalDescription(answer, function () {
					var output = {};
					output['type'] = "answer";
					output['sdp'] = answer.sdp;
					//RTCSessionDescription.toJSON returns a json str in FF, but json obj in Chrome
					if (typeof output === 'string') output = JSON.parse(output);
					var message = {
						answer: output
					};
					if (message.hasOwnProperty('answer')) {
						//*** THIS WAS THE ORIG LINE FOR AAAGES THEN was removed tos ee effects
						output.sdp = self.mungSDPAnswer(output.sdp);
					}
					callback(output, self);
				}, self.onError);
			}, self.onError);
		}, self.onError);
	},

	/*
	 * Accepts the SDP offer in the channel which initiated and sent the original offer. 
	 * answer starts as hopefull
	 * answer to create channel with initiator only.
	 * @return void 
	 */
	answer: function (answer, clientId) {
		if (typeof clientId === "undefined" || clientId.length <= 5) {
			throw new Error("needs a in answer client id" + clientId);
		}
		this.clientId = clientId;
		var desc = new this.RTCSessionDescription(answer);
		this.RTCPeerConn.setRemoteDescription(desc, function () {}, this.onError);
	},

	/*
	 * process ICE Candidate recieved from partner. 
	 * 
	 * @param {string} candidate ice
	 * @returns {void}
	 */
	addICECandidate: function (candidate, connectionId) {
		var self = this;
		if (this.RTCPeerConn.remoteDescription) {
			console.assert(connectionId === self.connectionId, ' ADDICAND self conid ' + self.connectionId + 'bound : ' + connectionId);
			self.RTCPeerConn.addIceCandidate(new self.RTCIceCandidate(candidate));
		}
	},


	listener: function (data) {
		this.rtcdatachannel.removeEventListener('bufferedamountlow', listenerBF);
		this.send(data);
	},

	/*
	 * Sends data along datachannel. If the channel has a buffered amount greater than the threshold
	 * then we buffer it and send either with a timeout or when buffered amount falls below threshold. 
	 * 
	 * @param {mixed} data to send, small data only max size 15k bytes 
	 * @returns {void}
	 */
	send: function (data) {

		if (this.rtcdatachannel.bufferedAmount > this.threshold) {

			if (this.usePolling) {
				var sendBF = this.send.bind(this, data);
				setTimeout(sendBF, 250);
			} else {
				debugger;
				// basically we add to an array of buffered data and send that stuff when buffered low is called;
				this.internalBuffer.push(data);
			}
			return;
		}

		// this is the regular send when channel is not at capacity that will usually we called. 
		var self = this;
		try {
			this.rtcdatachannel.send(data);
			this.bufferedLogger(" from send worked");
		} catch (err) {
			this.bufferedLogger("send (from send method) failure");
		}

	},

	/**
	 *same as above but without buffering so use sparingly.
	 *
	 */
	sendWithOpenCheck: function (data) {
		if (this.rtcdatachannel.readyState !== "open") {
			console.warn("sending failed");
			//debugger;
			return;
		}
		try {

			this.rtcdatachannel.send(data);
			this.bufferedLogger(" from send worked with opencheck");
		} catch (err) {
			this.bufferedLogger(" failed from send with opencheck");
			console.error("tried to send but failure and entered catchblock");
		}
	},


	/*
	 * Function called when a message is recieved. 
	 * 
	 * @param {Object} function to attatch to event handler
	 * @returns {void}
	 */
	onMessage: function (eventHandler) {
		this.rtcdatachannel.onmessage = eventHandler;
	},

	/*
	 * returns state of datachannel or null if not created ie still signalling
	 * 
	 * 
	 * @returns {Mixed} five possible values:  connecting, open, closing, closed, null 
	 */
	getReadyState: function () {
		if (this.rtcdatachannel === undefined) return null;
		return this.rtcdatachannel.readyState;
	},


	close: function () {
		this.RTCPeerConn.close();
	},


	/*
	 * change name when working since now specific to onopen 
	 *@param  flag options are string enum of passive, once, 
	 * @param func is function to add
	 * 
	 * @param event string representing event to listen for e.g. onmessage or onopen
	 * @returns {void }
	 */
	addEventListener: function (event) {
		var bf = event.bind(this);
		this.rtcdatachannel.onopen = bf;
	},
	/**
	 * Add function to datachannels on oopen event.
	 * Any number of times this can be called. 
	 *
	 */
	addOnDCOpen: function (eventHandler) {

		if (typeof eventHandler !== "function") throw new Error('addonDCOPEN requires function');
		this.OnDCOpen.next(eventHandler);
	},
	/**
	 * attach a function to the on datachannel event, any number of functions can be added. 
	 */
	addOnDC: function (eventHandler) {
		if (typeof eventHandler !== "function") throw new Error('addonDC requires function');
		this.OnDCEHsGen.next(eventHandler);
	},


	/*
	 * Add a function to the on close event of the datachannel. 
	 * This can be called any number of times and each will add an additional function to 
	 * the event, all of which will be called when the channel closes. 
	 * 
	 * @param {type} function 
	 * @returns {void}
	 */
	addOnClose: function (eventHandler) {
		if (typeof eventHandler !== "function") throw new Error('addonclose requires function');
		this.closeGen.next(eventHandler);
	}

};