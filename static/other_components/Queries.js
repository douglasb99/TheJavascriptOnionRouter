/*
 * We store these large array of DCSOs on global window object.
 * We need to query this to find DCSOs where, for example, 
 * the edge id is x and the facing property is y and the readystate of the channel is open. 
 * Hindsight would have this in some cient side datastore BUT it is not and most of these methods pertain to
 * queries on this data. 
 * 
 */

var Queries = (function (UUID) {

	function fetchActivePathDCSOByGroupAndFacingTheConsumer(groupConnectionId) {
		var getGroupResult = Groups.getGroup(groupConnectionId);

		for (var i = 0; i < window.DataChannels.length; i++) {
			if (getGroupResult.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
				window.DataChannels[i].facing == "consumer" && window.DataChannels[i].role === "relay") {
				return window.DataChannels[i];

			} else if (getGroupResult.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
				window.DataChannels[i].role === "consumer") {
				return window.DataChannels[i];
			}
		}
		console.error("found nothing, ought to have. called possibly from closing ln295");
	}

	function getRandomOpenChannel(clientIdsToExcludeArr) {
		var shuffled = Utils.shuffle(window.DataChannels);
		var ret;

		for (var i = 0; i < shuffled.length; i++) {
			var readyState = window.DataChannels[i].dataChannel.getReadyState();
			if (clientIdsToExcludeArr.indexOf(shuffled[i].dataChannel.clientId) !== -1) continue;
			if (readyState === "open") {
				ret = shuffled[i];
				break;
			}
		}
		console.assert(typeof ret !== "undefined", " should have found an open channel here");
		return ret;
	}

	function fetchRandomOpenChannelWithRoleGroup2() {
		var done = false;
		counter = 0;
		do {

			counter++
			var r = Math.floor(Math.random() * window.DataChannels.length) + 1;
			var readyState = window.DataChannels[i].dataChannel.getReadyState();
			if (window.DataChannels[i].role === "group2" && readyState === "open") done = true;

		} while (counter < 10000 && done === false);


	}

	function fetchRandomOpenChannelWithRoleGroup() {
		var done = false;
		counter = 0;
		do {
			counter++
			var r = Math.floor(Math.random() * window.DataChannels.length) + 1;
			var readyState = window.DataChannels[i].dataChannel.getReadyState();
			if (window.DataChannels[i].role === "group" && readyState === "open") done = true;

		} while (counter < 10000 && done === false);


	}

	function doesClientIdExist(clientId) {
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i].clientId === clientId)
				return true;
		}
		return false;
	}

	function getClientIdsOfGroupByOneConIdFromGroup(groupConnectionId) {
		var getGroupResult = Groups.getGroup(groupConnectionId);
		var ret = [];

		for (var i = 0; i < window.DataChannels.length; i++) {
			if (getGroupResult.indexOf(window.DataChannels[i]['connectionId']) !== -1) {
				ret.push(window.DataChannels[i]);
			}
		}
		return ret;
	}


	function getRelayConnectedToPseudoExit(groupConnectionId) {

		var getGroupResult = Groups.getGroup(groupConnectionId);

		for (var i = 0; i < window.DataChannels.length; i++) {

			if (getGroupResult.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
				window.DataChannels[i].role === "relay" &&
				window.DataChannels[i].facing == "consumer")
				return window.DataChannels[i];
		}
	}


	/* 
         * We fetch the pseudoExit node DCSO using the array of connection  ids from get group in groups which we pass in as paramter.
       */

	function fetchAssociatedPseudoExitNode(getGroupResult) {
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (getGroupResult.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
				window.DataChannels[i].role === "pseudoExit")
				return window.DataChannels[i];
		}
	}


	/**
	 * Only used during testing. 
	 * TODO: safely delete. 
	 *
	 */
	function TestMethodDoIHavePseudoExitChannel() {
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i].role === "pseudoExit") return true;
		}

		return false;
	}

	/*
	 *  Checks if self has a consumer datachannel attatched, 
	 *  and checks the state of that datachannel
	 *
	 * @returns {Boolean} 
	 */
	function amIConnectedConsumer() {
		var DC = fetchDCByRole('consumer');
		if (typeof DC === "undefined") {
			//alert('delete, but know it works if not connected');
			return false;
		}
		var readyState = DC.getReadyState();
		if (readyState === "open") return true;
		console.info("amIconnectedConsumer failed with readyState" + readyState);
		return false;
	};

	/**
	 * closes all Channels  without calling the onclose events. It also changes the status of 
	 * all the associated DCSOS to be closed also. 
	 */
	function closeAllChannels() {
		console.log("in closeAllChannels");
		for (var i = 0; i < window.DataChannels.length; i++) {
			window.DataChannels[i].role = "closed";
			window.DataChannels[i]['dataChannel'].manualCloseWithoutCallingOnClosingEvents();
		}
	}

	/*
	 * reason for this is that other side of channels will shut channels so we don't want it rerouting around them
	 * as though they have disappeared when they haven't. 
	 */
	function removeAllOncloseEventsOnSelfConnectedChannels() {
		for (var i = 0; i < window.DataChannels.length; i++) {
			window.DataChannels[i]['dataChannel'].removeOnClosingEventsFromChannel();
		}

	}

	/**
	 * If we are closing we need to send a message to all of our connections to say this so if needed they 
	 * can reroute around us, or replace us, and so this nice early message is sent when possible. 
	 *
	 */
	function sendSoonLeavingMessageToAllConnectedDatachannels() {
		for (var i = 0; i < window.DataChannels.length; i++) {
			window.DataChannels[i]['dataChannel'].send(JSON.stringify({
				id: 'manuallyClosing'
			}));
		}
	}

	/*
	 * closes datachannel and sets role to closed along with that of the DCSO so it is clear to any user that the channel 
	 * is closed. 
	 */
	function closeDCSO(DCSO) {
		DCSO.role = "closed";
		DCSO.dataChannel.role = "closed";
		DCSO.dataChannel.close();
	};

	/**
	 * If we have the datachannel and wish to from this find the DCSO it is attatched to this is 
	 * our guy
	 */
	function fetchDCSOByDC(DC) {
		var ret = null;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['dataChannel'] === DC) {
				ret = window.DataChannels[i];
				break;
			}
		}
		// added for debugging only. 
		if (ret === null) {
			function sleep(miliseconds) {
				var currentTime = new Date().getTime();
				while (currentTime + miliseconds >= new Date().getTime()) {}
			}
			alert("get to this brekapoint   !!!    !!  !    --");
			var miliseconds = 2000;
			sleep(miliseconds);
			debugger;

		}
		return ret;
	};

	/**
	 * Sometimes we pass around hashes of connection id for various security reasons and then when returned we can 
	 * use them to find the correct channel using this method. 
	 */
	function fetchDCSOByHash(hash) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {

			if (window.DataChannels[i]['connectionIdHash'] === hash) {
				ret = window.DataChannels[i];
				break;
			}
		}
		console.assert(ret['connectionIdHash'] === hash, 'does not pick right channel');
		return ret;
	}

	/** 
	 * when one dcso is swapped fro another we must swap over all the correct properties, and here is the method for that. 
	 */
	function replaceDCSO(connectionIdToReplace, DataChannel, connectionId, role, edgeId, facing, position = null) {

		if (role === "pseudoExitSpare") {
			// lazy hack since it seems that their is often no facing property
			facing = "pseudoExit";
		}
		// just silly putting that in  but otherwise was claiming it wasnt completed lol
		var DCSO2Mod = fetchDCSOByConnectionId(connectionIdToReplace);
		DCSO2Mod['connectionId'] = connectionId;
		DCSO2Mod['replacement'] = true;
		console.assert(role !== false, "role shouldnt ever be false");
		DCSO2Mod['connectionIdHash'] = sha256(connectionId);
		DCSO2Mod['role'] = role;
		DCSO2Mod['dataChannel'].manualCloseWithoutCallingOnClosingEvents();
		DCSO2Mod['dataChannel'] = DataChannel;
		return DCSO2Mod;
	};


	/*
	 * There are a lot of associated properties of a datachannel so we wrap the datachannal in an object called
	 * a dcso (datachannel storage object) which has associated properties such as directionality, role, edgeid, position (
	 * string representing position in the chain).  
	 *   
	 * creates object we use to storage data 
	 */
	function createDCSO(DataChannel, connectionId, role, edgeId, facing, position = null) {
		console.assert(arguments.length === 5 || arguments.length === 6, "incorrect number of arguments passed. req 6/7 passed : " + arguments.length);
		if (role === "pseudoExitSpare") {
			// lazy hack since it seems that their is often no facing property
			facing = "pseudoExit";
		}

		var dataChannelObj = {};
		dataChannelObj['connectionId'] = connectionId;
		console.assert(role !== false, "role shouldnt ever be false");
		dataChannelObj['connectionIdHash'] = sha256(connectionId);
		if (edgeId !== null) dataChannelObj['edgeId'] = edgeId;
		if (facing !== null) dataChannelObj['facing'] = facing;
		console.assert(edgeId !== "undefined", "should be null if not set");
		if (edgeId !== null) {
			var matchingEdgesConnectionIdsArr = findMatchingEdgesConnectionidsLimitTwo(edgeId, connectionId);
			if (matchingEdgesConnectionIdsArr.length === 1) {
				Groups.linkUnknowns(matchingEdgesConnectionIdsArr[0], connectionId);
			} else if (matchingEdgesConnectionIdsArr.length === 2) {
				Groups.linkThreeUnknowns(matchingEdgesConnectionIdsArr[0], matchingEdgesConnectionIdsArr[1], connectionId);
			}
		}

		Groups.createIfNew(connectionId, position);
		dataChannelObj['role'] = role;
		if (dataChannelObj['role'] === "pseudoExit") {
			// we create the pseudoexit id here now. 
			dataChannelObj['pseudoExitId'] = UUID.generate();
			console.assert(typeof dataChannelObj.pseudoExitId === 'string', " inside dc creation and not string as pseudoExitId ");
		}
		dataChannelObj['dataChannel'] = DataChannel;
		return dataChannelObj;
	}

	function findMatchingEdgesConnectionidsLimitTwo(edgeId, connectionIdToExclude) {
		var ret = [];
		var limit = 3;
		var count = 0;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === edgeId &&
				window.DataChannels[i]['connectionId'] !== connectionIdToExclude) {
				count++;
				if (count > limit) break;
				ret.push(window.DataChannels[i].connectionId);
			}
		}
		return ret;
	}
        
	/*
	 * returns datachannel specified by connection id
	 * 
	 * note: occassionally after partner disconnects will still search for dc so must remember
	 *       this when writing code for datachannel disconnections
	 * 
	 * hard fails if not found. or not. 
	 * @param {int} connectionId
	 * @returns {undefined}
	 */
	function fetchDCByConnectionId(connectionId) {
		var ret = null;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['connectionId'] === connectionId) {
				ret = window.DataChannels[i]['dataChannel'];
				console.assert(connectionId === window.DataChannels[i].connectionId, 'fetch channnel got wrong channel');
				break;
			}
		}
		// if the ret is null. 
		if (ret === null) {
			console.trace();
			console.error("above is trace. this shouldn't return null saying it cant find dc + conId : " + connectionId);
		}
		return ret;
	};

	/*
	 * allows to fetch datachannel by pseudoexiit id 
	 * 
	 * @param {type} connectionId
	 * @returns {window@arr;DataChannels}
	 */
	function fetchDCByPseudoExitId(pseudoExitId) {
		console.error('this method is depreciated');
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['role'] === "pseudoExit" &&
				window.DataChannels[i]['pseudoExitId'] === pseudoExitId) {
				ret = window.DataChannels[i]['dataChannel'];
				console.assert(pseudoExitId === window.DataChannels[i].pseudoExitId, 'pseudo Exit channel got wrong channel');
				break;
			}
		}

		return ret;
	};

	/*
	 * returns false if spare with edge id not found else spare dcso
	 *  
	 * @param {String} connectionId
	 * @returns {Object} data channel storage object
	 */
	function fetchDCSOByConnectionId(connectionId) {
		console.assert(typeof connectionId !== "undefined", "connectionId shouldnt be undefined");

		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['connectionId'] === connectionId) {
				ret = window.DataChannels[i];
				console.assert(connectionId === window.DataChannels[i].connectionId, 'fetch datachannel object got wrong channel');
				break;
			}
		}
		// console.assert(typeof ret !== "undefined", " fetchByDCSO in queiries didnt find dcso with conid " + connectionId);
		return ret;
	};

	/**
	 * where multiple spares exist we may need to get one, aving the other. 
	 *
	 */
	function getOtherSpare(spareId, DCSO) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['spareId'] === spareId &&
				DCSO !== window.DataChannels[i]) {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	}
        
	/*
	 *  
	 * @param {string} role is our role enum with different roles in the chain assigned to datachannel. 
	 * @returns {DataChannels.dataChannel} 
	 */
	function fetchDCByRole(role) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['role'] === role) {
				ret = window.DataChannels[i]['dataChannel'];
				break;
			}
		}
		return ret;
	};

	/**
	 * Note: each user should only have one consumer channel
	 *
	 */
	function fetchConsumerDCSO() {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['role'] === "consumer") {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	};


	function fetchDCSOByPseudoExitIdAndRole(pseudoExitId, role) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['role'] === role &&
				window.DataChannels[i]['pseudoExitId'] === pseudoExitId) {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	};


	function fetchDCSOByPseudoExitId(pseudoExitId) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['pseudoExitId'] === pseudoExitId) {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	};


	/*
	 * gets other matching edgeid of DCSO
	 * 
	 * @param {type} file
	 * @returns {Object} datachannel ie instance of datachannel class of other edge
	 */
	function fetchMatchingEdgeDCSOByDCSO(DCStorageObject) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCStorageObject.edgeId &&
				DCStorageObject !== window.DataChannels[i] &&
				window.DataChannels[i]['role'] === 'relay') {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	};

	function fetchMatchingEdgeDCSOByDCSOWithRole(DCStorageObject, role) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCStorageObject.edgeId &&
				DCStorageObject !== window.DataChannels[i] &&
				window.DataChannels[i]['role'] === role) {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	};

	/*
	 * The edge ids are used to link two sides of a path so that data routes from one into the other, and 
	 * this is therefore crucial since we will often want to route from one side of one channel into the other. 
	 *   
	 * @param {type} DCStorageObject
	 * @returns {window@arr;DataChannels.dataChannel}
	 */
	function fetchMatchingEdgeDC(DCSO, role) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCSO.edgeId &&
				DCSO !== window.DataChannels[i] &&
				window.DataChannels[i]['role'] === role) {
				ret = window.DataChannels[i]['dataChannel'];
				break;
			}
		}
		return ret;
	}

	/** 
	 *tMethod for testing. Delete later
	 */

	function matchingEdgeCountTest(DCStorageObject, role) {
		var count = 0;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCStorageObject.edgeId &&
				DCStorageObject !== window.DataChannels[i] &&
				window.DataChannels[i]['role'] === role) {
				count++;
			}
		}
		return count;
	}


	/*
	 * fetches dc storage object by edgeId. only gets one when migh tbe 2 or 1. 
	 * @type Array.dataChannel|Window.DataChannels.dataChannel
	 */
	function fetchDCSOByEdgeId(edgeId) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === edgeId) {
				ret = window.DataChannels[i]['dataChannel'];
				break;
			}
		}
		return ret;
	};

	/**
	 * checks if both edges are open for a given edgeID. 
	 *
	 *@return {boolean}
	 */
	function relayEdgesBothOpen(edgeId) {
		var ret = [];
		var readyState;
		var count = 0;
		for (var i = 0; i < window.DataChannels.length; i++) {
			readyState = window.DataChannels[i].dataChannel.getReadyState();
			if (window.DataChannels[i]['edgeId'] === edgeId && window.DataChannels[i]['role'] === "relay" &&
				readyState === "open") {
				count++;
				if (count == 2) return true;
			}
		}

		return false;;
	}

	/**
	 * Pass it DCSO and check if matching edge is relay with status of open. 
	 *
	 *@return {boolean}
	 */
	function isPartnerRelayOpen(DCSO) {
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['role'] === "relay" &&
				window.DataChannels[i] !== DCSO && window.DataChannels[i]['edgeId'] === DCSO['edgeId']) {
				var readyState = window.DataChannels[i].dataChannel.getReadyState();
				if (readyState !== "open") return false;
				return true;
			}
		}
		return false;
	}

	/*
	 * 
	 * 
	 * edge ids currently in triad with two relays and spare all associated. 
	 * If spare 
	 * 
	 */
	function partnerEdgesBothOpen(connectionId, softFailure = false) {
		var lastOpenedDCSO = fetchDCSOByConnectionId(connectionId);
		var MatchingEdgesArr = getBothMatchingEdgesDCSO(lastOpenedDCSO, softFailure);

		if (!MatchingEdgesArr) {
			console.log('first return false in partnerEdgesBothOpen so not 2 open others');
			console.info('legal but really not expected so much');
			return false;

		}
		var readyState1 = MatchingEdgesArr[0].dataChannel.getReadyState();
		var readyState2 = MatchingEdgesArr[1].dataChannel.getReadyState();
		var allowedVals = ['connecting', 'open', 'closing', 'closed', 'null'];
		var ret;
		if (readyState1 === 'open' && readyState2 === 'open') ret = true;
		else ret = false;
		if (ret) window.countingtestopen++;
		return ret;
	}

	/*
	 * Private function helper of partnerEdgesBothOpen above 
	 * of triad gets both other matches edges DCSO as array of form array(DCSO1, DCSO2);
	 * 
	 *@param {boolean} softFailure not implemented and only refers to printing of assertion message. 
	 *@param {string} optional and if passed we check if the matching edge matches passed role enum. 
	 */
	function getBothMatchingEdgesDCSO(DCSO, softFailure = false, role = null) {
		var ret = [];
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i]['edgeId'] === DCSO.edgeId &&
				DCSO !== window.DataChannels[i] &&
				ret.indexOf(window.DataChannels[i]) === -1) {
				if (role !== null && window.DataChannels[i].role !== role) {
					continue;
				}
				ret.push(window.DataChannels[i]);
			}
		}

		if (!softFailure) {
			console.assert(ret.length < 3, " too many edges not working. loop at this erorr");
		}

		if (ret.length !== 2) return false;
		return ret;

	};

	/**
	 *
	 *@param {DCSO} array of DCSOS to exclude in return
	 *@param {Array} array of clientIds and also does not include any if they match. 
	 *              This allows excludes any channels that are multiplexes of exclusion
	 */
	function getRandomOpenUnusedSpare(exclusions, exclusionsByClientId = []) {

		var is_array_tester = (Object.prototype.toString.call(exclusions) === '[object Array]') ? true : false;
		console.assert(is_array_tester, 'get random spare param not of correct type (array)');
		exclusions = expandExclusions(exclusions);
		var ret;
		var readyState;

		for (var i = 0; i < window.DataChannels.length; i++) {
			readyState = window.DataChannels[i].dataChannel.getReadyState();
			if (window.DataChannels[i].role == "unusedSpare" &&
				readyState === "open" &&
				exclusions.indexOf(window.DataChannels[i]) === -1 &&
				exclusionsByClientId.indexOf(window.DataChannels[i].dataChannel.clientId) === -1) {
				ret = window.DataChannels[i];
				break;
			}
		}
		return ret;
	}


	function getAllUnusedSparesRegardlessOfOpenStatus() {
		var ret = [];
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (window.DataChannels[i].role == "unusedSpare") {
				ret.push(window.DataChannels[i]);
			}
		}
		return ret;
	}

	/**
	 * expands all excluded dcsos to include those which are multiplexed over same connection
	 *
	 * @return {Array[DCSO]} returns array of dcsos including ones on same multiplexed connection
	 */
	function expandExclusions(exclusions) {
		var DCSOFromMultiplex;
		var multiplexConnectionId;
		var multiPlexes = [];

		for (var i = 0; i < exclusions.length; i++) {
			if (!exclusions[i].hasOwnProperty('multiplexConnectionId')) {
				continue;
			}
			multiplexConnectionId = exclusions[i]['multiplexConnectionId'];
			DCSOFromMultiplex = fetchDCSOByConnectionId(multiplexConnectionId);
			multiPlexes.push(DCSOFromMultiplex);
		}
		return exclusions.concat(multiPlexes);
	}

	/*
	 * spareid is array
	 */
	function fetchDCSOBySpareId(spareId, excludeDCSO) {

		var is_array_tester = (Object.prototype.toString.call(spareId) === '[object Array]') ? true : false;
		var ret;
		for (var i = 0; i < window.DataChannels.length; i++) {
			if (!window.DataChannels[i].hasOwnProperty('spareId') ||
				excludeDCSO === window.DataChannels[i]) continue;

			for (var j = 0; j < spareId.length; j++) {
				if (window.DataChannels[i].spareId.indexOf(spareId[j]) !== -1) {
					ret = window.DataChannels[i];
					break;
				}
			}

		}
		return ret;
	};

	/*

	 * When we allow one of our connected peers to do something eg create a channel with us
	 * we give them a permission key and store this in our taffydb table of them. Here he just check the key passed 
	 * is in the table. This is to reduce jamming attacks. 
	 * 
	 * NOTE: Move into another file not really similar to other Queries. 
	 * 
	 * key is permission key that is stored. 
	 * connectionId is connection id allowed to perform the action
	 * action is the action that is allowed to be performed
	 * 
	 * @return {boolean}
	 */

	function hasPermissions(key, connectionId, action) {
		console.assert(arguments.length === 3, " incorrect number of arguments passed");
		if (key.length < 3 || key === null) {
			console.error("hack key passed");
			return false;
		}

		var row = window.permissionKeysSent({
			"key": key,
			"connectionId": connectionId,
			"action": action
		}).last();
		if (row === false) {
			console.log('hasPermissions and returns false');
			return false;
		} else {
			console.log('hasPermissions and returns true');
			return true;
		}

	}

	/*
	 * works with permissions to get any associated data.
	 * at time of writing this works with the hider algorithm to get the connection id assocaited with teh spare we asked to use to
	 * reroute from the pseudoexit and use to hide. we store this so when we then create the new channel we can add it to the correct group
	 * via the connection id saved and its associated group. the reason we don't link initially is in case the spare rejects it???
	 * 
	 * 
	 */

	function getRowAssociatedWithKey(key, connectionId) {
		var row = window.permissionKeysSent({
			"key": key,
			"connectionId": connectionId
		}).last();
		console.assert(row['connectionId'].length > 4, "expects a valid row to be fouund");
		return row;

	}


	/**
	 *removes spareIds that link two DCSOs.
	 * called when you have used the spareId
	 *
	 */
	function removeCommonSpareIds(DCSO1, DCSO2) {
		if (!DCSO1.hasOwnProperty("spareId") || !DCSO2.hasOwnProperty("spareId")) {
			console.warn("one has no spare Id. Maybe warning");
			return;
		}

		var len1 = DCSO1['spareId'].length;
		var len2;
		outer:
			for (var i = 0; i < len1; i++) {
				len2 = DCSO2['spareId'].length;
				for (var j = 0; j < len2; j++) {

					if (DCSO1['spareId'][i] === DCSO2['spareId'][j]) {
						DCSO1['spareId'].splice(i, 1);
						DCSO2['spareId'].splice(j, 1);
						continue outer;
					}

				}
			}
		return;
	};


	return {
		fetchActivePathDCSOByGroupAndFacingTheConsumer: fetchActivePathDCSOByGroupAndFacingTheConsumer,
		replaceDCSO: replaceDCSO,
		getRandomOpenChannel: getRandomOpenChannel,
		fetchRandomOpenChannelWithRoleGroup: fetchRandomOpenChannelWithRoleGroup,
		doesClientIdExist: doesClientIdExist,
		getClientIdsOfGroupByOneConIdFromGroup: getClientIdsOfGroupByOneConIdFromGroup,
		getRelayConnectedToPseudoExit: getRelayConnectedToPseudoExit,
		getRowAssociatedWithKey: getRowAssociatedWithKey,
		fetchAssociatedPseudoExitNode: fetchAssociatedPseudoExitNode,
		TestMethodDoIHavePseudoExitChannel: TestMethodDoIHavePseudoExitChannel,
		amIConnectedConsumer: amIConnectedConsumer,
		createDCSO: createDCSO,
		sendSoonLeavingMessageToAllConnectedDatachannels: sendSoonLeavingMessageToAllConnectedDatachannels,
		closeAllChannels: closeAllChannels,
		removeAllOncloseEventsOnSelfConnectedChannels: removeAllOncloseEventsOnSelfConnectedChannels,
		fetchDCByConnectionId: fetchDCByConnectionId,
		fetchDCSOByPseudoExitIdAndRole: fetchDCSOByPseudoExitIdAndRole,
		fetchDCSOByPseudoExitId: fetchDCSOByPseudoExitId,
		fetchDCByRole: fetchDCByRole,
		fetchConsumerDCSO: fetchConsumerDCSO,
		fetchDCSOByConnectionId: fetchDCSOByConnectionId,
		fetchMatchingEdgeDCSOByDCSO: fetchMatchingEdgeDCSOByDCSO,
		fetchMatchingEdgeDCSOByDCSOWithRole: fetchMatchingEdgeDCSOByDCSOWithRole,
		fetchDCSOByEdgeId: fetchDCSOByEdgeId,
		partnerEdgesBothOpen: partnerEdgesBothOpen,
		getBothMatchingEdgesDCSO: getBothMatchingEdgesDCSO,
		getOtherSpare: getOtherSpare,
		fetchMatchingEdgeDC: fetchMatchingEdgeDC,
		fetchDCSOByDC: fetchDCSOByDC,
		fetchDCSOBySpareId: fetchDCSOBySpareId,
		matchingEdgeCountTest: matchingEdgeCountTest,
		fetchDCSOByHash: fetchDCSOByHash,
		getRandomOpenUnusedSpare: getRandomOpenUnusedSpare,
		hasPermissions: hasPermissions,
		relayEdgesBothOpen: relayEdgesBothOpen,
		isPartnerRelayOpen: isPartnerRelayOpen,
		removeCommonSpareIds: removeCommonSpareIds,
		getAllUnusedSparesRegardlessOfOpenStatus: getAllUnusedSparesRegardlessOfOpenStatus
	}
})(UUID);