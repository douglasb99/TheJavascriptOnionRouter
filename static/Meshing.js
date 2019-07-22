/*  
 When the bare path for the onion network is created we then add spares but really every node in 
 * each position but attatch to every node in the next and previous position so that all relays in the first position must 
 * attatch to every relay in the second position, and thes extra channels are all created using p2p signalling, and specifically 
 * this module high level module. In the diagrams these channels are termed mesh spares. 
 *  
 *  
 */
"use strict";

var Meshing = (function () {

	/**
	 *called in connect in signalling and decides on each channel if to add meshing key to an initiate message.
	 *
	 *So we do not add them if you face the consumer since there is and can be no spares of the consumer.
	 */
	function ShouldIAddMeshingKeyDecider(position, facing) {
		var facingTestOptions = ["consumer", "pseudoExit"];
		console.assert(facingTestOptions.indexOf(facing) !== -1, "invalid facing parameter : " + facing);

		if (position === "first" && facing === "pseudoExit") {
			return false;
		} else if (position === "second" && facing === "consumer") {
			return true;
		} else {
			return true;
		}
	}

	/*
	 *Permissions system means we require all new channels that are meshing  to have permissions and this sets
	 *the permissions and saves the permissions key, which can be shared with the clients we wish to mesh with, and then 
	 *sent back with their sdp handshake data, to verify they are opening channels we want them to open. 
	 */
	function getNewMeshingKey(connectionId) {
		// key means that only if key will add meshing spare, and acknoledge the message
		var key = UUID.generate();

		window.permissionKeysSent.insert({
			"key": key,
			"connectionId": connectionId,
			"action": "checkForAndAddMeshSpares"
		});
		return key;
	}

	/**
	 *In initiate added to onopen. when it opens it sends back message to get more meshspares
	 * could be that there is a double check. first check initially then when opens checks again. 
	 *
	 */
	function sendMeshingNextCheckMessage(ligandDCSO, key, facing) {
		console.log("into sendMeshingNextCheckMessage");
		ligandDCSO.dataChannel.send(JSON.stringify({
			id: 'checkForAndAddMeshSpares',
			key: key,
			facing: facing
		}));
	}

	/**
	 *called back in signaller and via messageHandler in response to message ie not in the 
	 *node which started the meshing algorithm. 
	 *
	 */
	function findAddMeshSpares(DC, key, facing) {
		console.assert(arguments.length === 3, "INCORRECT PARAMATERS: Three arguments required");
		var DCSO = Queries.fetchDCSOByDC(DC);

		if (!Queries.hasPermissions(key, DCSO.connectionId, "checkForAndAddMeshSpares")) {
			console.warn('INCORRECT PERMISSIONS KEY: possible attack');
			return;
		}

		var group = Groups.getGroup(DCSO.connectionId, true);
		if (group === false) {
			console.log('checked no meshing spares conId : ' + DCSO.connectionId);
			return;
		}

		var posit = Groups.getAssociatedPosition(DCSO.connectionId);

		if (posit === "first") {
			console.assert(facing === "consumer", "i think this must be case since cannot mesh spare with consumer");
			var facingOriginal = "consumer";
			var DCSOGroup = getDCSOGroup(DCSO, facingOriginal);
		} else if (posit === "second") {
			var facingOriginal = facing;
			var DCSOGroup = getDCSOGroup(DCSO, facingOriginal);
		} else if (posit === "third") {
			var DCSOGroup = getDCSOGroup(DCSO, "pseudoExit", true);
		} else {
			console.error("no valid position property : " + posit);
		}
		var len = DCSOGroup.length;
		var position;

		for (var i = 0; i < len; i++) {
			position = Groups.getAssociatedPosition(DCSO.connectionId);
			Signalling.meshConnect(DCSO, DCSOGroup[i], position, "132");
		}
	}

	/**takes gruop as array of conIds and gets arrya of DCSOs with specified Facing property
	 *
	 *gets ROLES we can accept which are meshSpare, relay, P2PSpare on open DCSOs. 
	 *
	 */

	function getDCSOGroup(DCSO, facing, pseudoExitFlag = false) {
		var group = Groups.getGroup(DCSO.connectionId);
		var DCSOGroup = [];

		if (pseudoExitFlag) {
			var acceptableRoles = ["meshSpare", "P2PSpare", "pseudoExitSpare"];
		} else {
			var acceptableRoles = ["meshSpare", "pseudoExitSpare", "P2PSpare"];
		}
		var readyState;

		loop1:
			for (var i = 0; i < window.DataChannels.length; i++) {
				if (window.DataChannels[i].hasOwnProperty('facing') &&
					facing === window.DataChannels[i]['facing'] &&
					acceptableRoles.indexOf(window.DataChannels[i]['role']) !== -1 &&
					group.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					window.DataChannels[i].connectionId !== DCSO.connectionId
				) {
					readyState = window.DataChannels[i].dataChannel.getReadyState();
					// change later to add onopener for opening/connecting data channels
					if (readyState === 'closed' || readyState === 'closing') {
						console.warn("readyState " + readyState + " conId : " + window.DataChannels[i].connectionId);
						continue loop1;
					} else if (readyState === 'connecting' || readyState === null) {
						window.DataChannels[i].dataChannel.addOnDCOpen(function () {
							console.log("adding meshSpare wiill be from addonoppen");
							var DCSOSelf = Queries.fetchDCSOByConnectionId(this.self.connectionId);
							Signalling.meshConnect(DCSO, DCSOSelf, DCSO.position, "188");
						});
					} else {
						DCSOGroup.push(window.DataChannels[i]);
					}
				}
			}
		return DCSOGroup;
	}

	/*
	 * basically its the same as the not overloaded method but called when we don't have a facing property and no associated 
	 * position ie only in the pseudoexit level of graph. 
	 * 
	 * it is exactly the same as the not overloaded method with the difference being that we don't check the facing property since 
	 * we do not have one. 
	 */

	function getDCSOGroupOverloaded(connectionId, DCSO) {
		var group = Groups.getGroup(connectionId);
		var DCSOGroup = [];
		var acceptableRoles = ["meshSpare", "P2PSpare"];
		var readyState;

		loop1:
			for (var i = 0; i < window.DataChannels.length; i++) {
				if (acceptableRoles.indexOf(window.DataChannels[i]['role']) !== -1 &&
					group.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					window.DataChannels[i].connectionId !== connectionId
				) {
					readyState = window.DataChannels[i].dataChannel.getReadyState();
					// change later to add onopener for opening/connecting data channels
					if (readyState === 'closed' || readyState === 'closing') {
						continue loop1;
					} else if (readyState === 'connecting' || readyState === null) {
						window.DataChannels[i].dataChannel.addOnDCOpen(function () {
							var DCSOSelf = Queries.fetchDCSOByConnectionId(this.self.connectionId);
							Signalling.meshConnect(DCSO, DCSOSelf, DCSO.position, "240");
						});

					} else {
						DCSOGroup.push(window.DataChannels[i]);
					}
				}
			}
		return DCSOGroup;
	}

	return {
		getNewMeshingKey: getNewMeshingKey,
		ShouldIAddMeshingKeyDecider: ShouldIAddMeshingKeyDecider,
		sendMeshingNextCheckMessage: sendMeshingNextCheckMessage,
		findAddMeshSpares: findAddMeshSpares
	}
})();
