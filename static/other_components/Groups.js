/*  
 *
 *We group dataChannels which are part of a single users network e.g. those 
 *which are of any role  in the path of a single user. The advantage of this is that 
 *we may need another channel and we need to store this association. These window.groups are stored in the window.groups array.
 *
 *  no
 connectionId should be stored in multiple window.groups, and if they are the window.groups will be merged.
  Although peerConnections or two clients may have a 
* multiplicity > 1 dataChannels may only have a multiplicity of 1 with regards to networks.  

* Since a single user will hold multiple roles to multiple other users in network there will be multiple window.groups. 
* 
* If there is a position property for any channel, since a node may only represent a single position to a single user
* any position will be the same across all channels so a position may be associated with a group with a multiplicity of
* 1 position per group. position options are strings of set[ "consumer", "first", "second", "pseudoExit"]. 
* 
* This is a singleton and holds state for the whole client.
* 
* TODO: refactor groups into TaffyDB tables. 
 *
 */

"use strict";

var Groups = (function () {
	/* the actual groups with their conid to say which is linked to which. array of arrays 
	 * Groups Datastructure  is array of arrays and each array stored represents linked connectionids 
	 * of datachannels associated with same network */
	window.groups = [];
	/* we say what position is a group in the network eg pseudoexit */
	var groupPositions = [];
	/* the aes key associated with a group */
	var groupKeys = [];
	/* added to window just for debugging. TODO: remove */
	window.groupKeys = groupKeys;
	var TESTINGLOOPSAMPLER = {};

	function addToLoop(conId, refererMethod, key) {
		if (typeof key === "undefined") return;
		if (!(TESTINGLOOPSAMPLER.hasOwnProperty(conId))) {
			TESTINGLOOPSAMPLER[conId] = key;
		}
	}

	/**
	 * Used to add an aes key to a group. 
	 * param referer method was only used for debugging errors. 
	 *
	 */
	function associateWithGroup(groupNumber, key, refererMethod) {
		for (var i = 0; i < window.groups[groupNumber].length; i++) {
			addToLoop(window.groups[groupNumber][i], refererMethod, key);
			var DCSO = Queries.fetchDCSOByConnectionId(window.groups[groupNumber][i]);
		}
	}

	/**
	 * adds a datachannel to a group by the number of the group. 
	 */
	function addToGroup(groupNumber, connId) {
		var key = window.groupKeys[groupNumber];
		if (typeof key !== "undefined") {
			if (key.length < 3) {
				console.error("key is " + key + " with this method ln90");
			}
		} else {
			addToLoop(connId, "add to group", key)
		}

	}


	function testAllGroups() {
		for (var i = 0; i < window.groups.length; i++) {
			var key = groupKeys[i];
			associateWithGroup(i, key, "testAllGroups");
		}
	}

	/*
	 * We have three connectionIds and we want them all in the same group we call this method. Since no connection ID may 
	 * be in multiple groups this can lead to groups being merged. The "unkowns" part of the method refers to the connection Ids
	 * not being known to be in any group or new. 
	 */
	function linkThreeUnknowns(connectionId1, connectionId2, connectionId3) {
		linkUnknowns(connectionId1, connectionId2);
		linkUnknowns(connectionId3, connectionId1);
	}


	/*
	 * This method takes a new connection id and links it with a pre-existing connection id ( one that 
	 * is already associated with a group). It can only be used when one is sure that a connectionId 
	 * is not already in a group (as with a new one). It puts the two in the same group, merging groups if needed. 
	 */
	function link(nuovoConnectionId, connectionIdToLinkTo) {
		var len;
		// checks if method failed ie 
		var failed = true;
		loop1:
			for (var i = 0; i < window.groups.length; i++) {
				len = window.groups[i].length;
				for (var j = 0; j < len; j++) {
					// we have found our others. 
					if (window.groups[i][j] === connectionIdToLinkTo) {
						window.groups[i].push(nuovoConnectionId);
						addToGroup(i, nuovoConnectionId);
						failed = false;
						break loop1;
					}
				}
			}
		if (failed) console.error(" connectionId not found in window.groups: " + connectionIdToLinkTo);
	}

	/*
	 * Links two connection Ids. 
	 * Far slower but should be used if we are unsure if a connectionID is assigned to a group. 
	 */
	function linkUnknowns(connectionId1, connectionId2) {
		// if they are both already in different window.groups then we throw, currently not accepted
		var groupNumber1 = getGroupNumber(connectionId1, true);
		var groupNumber2 = getGroupNumber(connectionId2, true);
		// if neither already exist then create new group
		if (groupNumber1 === false && groupNumber2 === false) {
			createNewGroup(connectionId1);
			var last = window.groups.length - 1;
			window.groups[last].push(connectionId2);
		} else if (groupNumber1 === false) {
			link(connectionId1, connectionId2);
		} else if (groupNumber2 === false) {
			link(connectionId2, connectionId1);
		} else if (groupNumber2 !== false && groupNumber2 !== false) {
			joinTwoGroupsIntoOne(groupNumber1, groupNumber2);
		}
		return;
	}

	/**
	 * This method joins two groups, leavinng only one group. 
	 * 
	 * when  two window.groups that need joining that have a link, we join the second one into the first and 
	 *  delete the first group. 
	 */
	function joinTwoGroupsIntoOne(groupNumber1, groupNumber2) {
		if (groupNumber1 === groupNumber2) {
			console.info("already in same group so wasted call");
			return;
		}
		if (groupNumber1 > groupNumber2) {
			var higher = groupNumber1;
			var lower = groupNumber2;
		} else {
			var higher = groupNumber2;
			var lower = groupNumber1;
		}
		joinAndDeleteGroupsPosition(higher, lower);
		joinAndDeleteGroupsKey(higher, lower);
		window.groups[lower] = window.groups[lower].concat(window.groups[higher]);
		window.groups.splice(higher, 1);
		testAllGroups();
	}

	/*
	 * private helper of joinTwoGroupsIntoOne
	 * @param {type} groupNumberHigher high numbererd group to be deleted
	 * @param {type} groupNumberLower lower numbered group which will take position if this is not null
	 * @returns {undefined} void
	 */
	function joinAndDeleteGroupsPosition(groupNumberHigher, groupNumberLower) {

		if (groupPositions[groupNumberHigher] === null && groupPositions[groupNumberLower] === null) {
			// no action      
		} else if (typeof groupPositions[groupNumberHigher] === 'undefined' && typeof groupPositions[groupNumberLower] === 'undefined') {
			// no action
		} else if (typeof groupPositions[groupNumberHigher] === 'undefined') {
			// no action 
		} else if (typeof groupPositions[groupNumberLower] === 'undefined') {
			groupPositions[groupNumberLower] = groupPositions[groupNumberHigher];
		} else if (groupPositions[groupNumberHigher] !== groupPositions[groupNumberLower] &&
			groupPositions[groupNumberHigher] !== null &&
			groupPositions[groupNumberLower] !== null) {
			console.error(" above positions do not match of window.groups being joined ");
		} else if (groupPositions[groupNumberHigher] !== null && groupPositions[groupNumberLower] === null) {
			groupPositions[groupNumberLower] = groupPositions[groupNumberHigher];
		}
		// if lower isnt null and higher is null we leave it and miss all conditions
		groupPositions.splice(groupNumberHigher, 1);
		testAllGroups();
		return;
	};

	/*
	 *  same as for positions above but with groupKeys replacing groupPositions. 
	 * 
	 * private helper of joinTwoGroupsIntoOne
	 * @param {type} groupNumberHigher high numbererd group to be deleted
	 * @param {type} groupNumberLower lower numbered group which will take position if this is not null
	 * @returns {undefined} void
	 */
	function joinAndDeleteGroupsKey(groupNumberHigher, groupNumberLower) {
		if (groupKeys[groupNumberHigher] === null && groupKeys[groupNumberLower] === null) {
			// no action      
		} else if (typeof groupKeys[groupNumberHigher] === 'undefined' && typeof groupKeys[groupNumberLower] === 'undefined') {
			// no action                
		} else if (typeof groupKeys[groupNumberHigher] === 'undefined') {
			// no action 
		} else if (typeof groupKeys[groupNumberLower] === 'undefined') {
			//debugger;
			groupKeys[groupNumberLower] = groupKeys[groupNumberHigher];
		} else if (groupKeys[groupNumberHigher] !== groupKeys[groupNumberLower] &&
			groupKeys[groupNumberHigher] !== null &&
			groupKeys[groupNumberLower] !== null) {
			console.log("groupKeys not matching : " + groupKeys[groupNumberHigher] + " and " + groupPositions[groupNumberHigher]);
			console.error(" above groupKeys do not match of window.groups being joined ");
		} else if (groupKeys[groupNumberHigher] !== null && groupKeys[groupNumberLower] === null) {
			groupKeys[groupNumberLower] = groupKeys[groupNumberHigher];
		}

		// if lower isnt null and higher is null we leave it and miss all conditions
		groupKeys.splice(groupNumberHigher, 1);
		testAllGroups();
		return;
	};


	/**
	 * So we have a connection id and we look and we create a group for it, and 
	 * then also save the key at the same number in the keys array, and save the position so 
	 * we can access this all later. 
	 */
	function createIfNew(maybeNuovoConnectionId, position = null, key = null) {
		var groupNumber = getGroupNumber(maybeNuovoConnectionId, true);

		if (groupNumber === false) {
			createNewGroup(maybeNuovoConnectionId);
			groupPositions.push(null);
		}

		if (position !== null) {
			associatePosition(maybeNuovoConnectionId, position);
		}

		if (key !== null) {
			associateKey(maybeNuovoConnectionId, key, "createIfNew");
		}

		testAllGroups();
	};

	/*
	 * pass a position and a connectionid (whoch must exist already in some group) and we associate a key with 
	 * that group that can be retrieved later. 
	 * 
	 * @param{string} the connectionID of a channel. 
	 * @param{string} position a string but effectively an enum of strings first, second or third. Refactor to 
	 *                         use actual enum
	 */
	function associatePosition(connectionId, position) {
		var i = getGroupNumber(connectionId);
		if (position === null) return;
		groupPositions[i] = position;
		return;
	};

	/**
	 * so we associate the aes key with whatever group the given connectionId is associated with. 
	 */
	function associateKey(connectionId, key, callerForTesting) {

		if (key === null || typeof key === "undefined") {
			return;
		}
		var i = getGroupNumber(connectionId);
		groupKeys[i] = key;
		testAllGroups();
		return;
	}


	/**
	 * If there is an associated position it returns it. 
	 * The position is a string of first, second or third and represents the different positions the group
	 * must hold one of in the onion chain of the path this group is within. Third is the same as pseudoexit. 
	 * The positions are also the same of the group is a spare it is a spare of the first relay it is still considered to 
	 * be the first regardless, and the same for the other positions. 
	 */
	function getAssociatedPosition(connectionId) {
		var i = getGroupNumber(connectionId, true);
		return groupPositions[i];
	}

	/**
	 * gets the aes key associated with the given ConnectionID
	 */
	function getAssociatedKey(connectionId) {
		var i = getGroupNumber(connectionId, true);
		return groupKeys[i];
	}

	/**
	 * returns a copy of group, rather than reference, and removes individual member from the group. 
	 *
	 */
	function getCopyOfGroupWithoutSelf(connectionIdSelf) {

		var i = getGroupNumber(connectionIdSelf, true);

		if (i === false) {
			return false;
		}

		var dupArray = [];
		var counter = 0;
		for (var j = 0, len = window.groups[i].length; j < len; j++) {
			if (window.groups[i][j] === connectionIdSelf) continue;
			dupArray[counter] = window.groups[i][j];
			counter++;
		}
		return dupArray;
	}

	/*
	 * gets the index of the group of the connectionId
	 */
	function getGroupNumber(connectionId, softfail = false) {
		var len = window.groups.length;
		var lenInner;
		for (var i = 0; i < len; i++) {
			lenInner = window.groups[i].length;
			for (var j = 0; j < lenInner; j++) {
				// we have found our others. 
				if (window.groups[i][j] === connectionId) {
					return i;
				}

			}
		}
		if (softfail) {
			return false;
		}
	}

	/*
	 * returns array or throws error.
	 */
	function getGroup(connectionId, softFailure = false) {
		var len = window.groups.length;
		var lenInner;
		for (var i = 0; i < len; i++) {
			lenInner = window.groups[i].length;
			for (var j = 0; j < lenInner; j++) {
				// we have found our others. 
				if (window.groups[i][j] === connectionId) {
					return window.groups[i];
				}
			}
		}
		if (softFailure) {
			return false;
		}
	};

	/**
	 * Creates a new group with connectionId as the arrays only (first) member. 
	 * @return {void}
	 */
	function createNewGroup(connectionId) {
		window.groups.push([]);
		var last = window.groups.length - 1;
		window.groups[last].push(connectionId);
		groupPositions[last] = null;
	};

	/*
	 * lastPositionInChainFlag is an optional flag which when passed allows facing to be null or absent or undefined and 
	 * means we don't look at facing property. the thing is that the last position in the chain then facing properties may be absent 
	 * so we code around this. 
	 * 
	 * NOTE: used by rerouting algorithm
	 */
	function FetchRelayRelayByAssociatedConnectionIdAndFacing(connectionId, facing, lastPositionInChainFlag = false) {
		var groupConnIds = getGroup(connectionId);
		var acceptableRoles = ["relay", "pseudoExit"];
		var ret;

		if (lastPositionInChainFlag) {
			for (var i = 0; i < window.DataChannels.length; i++) {
				if (groupConnIds.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					acceptableRoles.indexOf(window.DataChannels[i].role) !== -1 &&
					window.DataChannels[i].hasOwnProperty("facing") &&
					window.DataChannels[i].facing === facing) {
					return window.DataChannels[i];
				}
			}

		} else {


			for (var i = 0; i < window.DataChannels.length; i++) {

				if (groupConnIds.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					acceptableRoles.indexOf(window.DataChannels[i].role) !== -1 &&
					window.DataChannels[i].facing === "pseudoExit") {

					var readyStatus = window.DataChannels[i]['dataChannel'].getReadyState();

					console.error(" and the role of the returned channel is : " + window.DataChannels[i].role + "readystatus " + readyStatus);
					return window.DataChannels[i];
				}
			}

		}
	}

	/*
	 * works with datachannels and the group stuff. maybe shouldnbt be in here
	 * used in rerouting algo first part ( in consumer if sig1 disconnects) which finds the p2p to reroute through
	 * 
	 * will not return connection id passed ( maybe obvious ) or closed/closing DCSOs 
	 * 
	 * 
	 * THIS FUNCTION SEEMS/APPEARS TO DO MULTIPLE THINGS IE IT. It doesnt' merely fetch the 
	 * 
	 * REFACTOR SINCE THIS DOES TOO MANY THINGS AND THEREFORE TOUGH TO UNDERSTAND. ASKING FOR SILLY BUG
	 */
	function fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles(connectionId, facing, acceptableRoles) {
		var group = Groups.getGroup(connectionId);
		var DCSOGroup = [];
		console.assert(Array.isArray(acceptableRoles), "requires array of acceptable roles parameter");
		//e.g. ["meshSpare", "P2PSpare"];
		var readyState;

		loop1:
			for (var i = 0; i < window.DataChannels.length; i++) {
				if (window.DataChannels[i].hasOwnProperty('facing') &&
					facing === window.DataChannels[i]['facing'] &&
					acceptableRoles.indexOf(window.DataChannels[i]['role']) !== -1 &&
					group.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					window.DataChannels[i].connectionId !== connectionId
				) {
					readyState = window.DataChannels[i].dataChannel.getReadyState();
					// change later to add onopener for opening/connecting data channels
					if (readyState === 'closed' || readyState === 'closing') {
						console.warn("readyState " + readyState + " conId : " + window.DataChannels[i].connectionId);
						continue loop1;
					} else if (readyState === 'connecting' || readyState === null) {
						window.DataChannels[i].dataChannel.addOnDCOpen(function () {
							var DCSOSelf = Queries.fetchDCSOByConnectionId(this.self.connectionId);
							Signalling.meshConnect(DCSO, DCSOSelf, DCSO.position);
						});
					} else {
						DCSOGroup.push(window.DataChannels[i]);
					}
				}
			}
		return DCSOGroup;
	}

	return {
		createIfNew: createIfNew,
		associatePosition: associatePosition,
		link: link,
		linkUnknowns: linkUnknowns,
		linkThreeUnknowns: linkThreeUnknowns,
		getGroup: getGroup,
		fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles: fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles,
		FetchRelayRelayByAssociatedConnectionIdAndFacing: FetchRelayRelayByAssociatedConnectionIdAndFacing,
		getGroupNumber: getGroupNumber,
		getAssociatedPosition: getAssociatedPosition,
		getCopyOfGroupWithoutSelf: getCopyOfGroupWithoutSelf,
		associateKey: associateKey,
		getAssociatedKey: getAssociatedKey

	};
})();