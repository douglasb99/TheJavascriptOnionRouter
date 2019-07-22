/*  
 * These methods are part of the core reroutinng algorithm that allows rerouting around closing clients. 
 * 
 * This is a dsitributed algorithm running across a large number of different nodes in the network. 
 * This module has a focus on sending messages to different nodes in the network telling them that they must now use a different
 * path and sending/recieving confirmations, and changin the roles of channels across the network, 
 * but it also signals the addition of new spare nodes in different parts of the network when a node leaves. 
 * so that the nodes whoch were spares when they become parts of the main path also signal new nodes of their pool
 * of spares to replace them in the network. 
 * 
 */
"use strict";

var SparePriority = (function () {

	/*
	 * TODO: delete previously used for testing. 
	 */
	function sleep_s(secs) {
		secs = (+new Date) + secs * 1000;
		while ((+new Date) < secs);
	}

	/*
	 * When a spare becomes a main part of the route it is important that its connections know this so they can treat it as this, 
	 * and thus we use this method to tell its neibours that the node is now part of the main path. 
	 * It is called in spare. 
	 * This method has multiple responsibilities and 
	 * also he gets new spare and creates connection around this spare so that it can take over its vacated role as a spare in the path. 
	 *   
	 * connectionIdHash is hash of connection closed
	 * 
	 * Alernative use is if a connection is just broken   then its used
	 * to tell the other side of the connection which connection is being overriden. 
	 */
	function forwardAssertionOfSwitchOver(OriginalRouteConnectionIdHash, DC) {

		var po = Groups.getAssociatedPosition(DC.connectionId);
		var DCSO = Queries.fetchDCSOByConnectionId(DC.connectionId);

		// only close up the pseudo
		if (DCSO.facing === 'consumer') {
			return;
		}

		var PreviousSpareToAvoidDCSO = Queries.fetchDCSOByConnectionId(DCSO['originatorConId']);
		var unusedSpareDCSO = Queries.getRandomOpenUnusedSpare([PreviousSpareToAvoidDCSO]);

		if (po === "third" || DCSO.role === "pseudoExitSpare") {
			DCSO.role = 'pseudoExit';
			DCSO.dataChannel.role = 'pseudoExit';
			DCSO['pseudoExitId'] = UUID.generate();
			if (typeof unusedSpareDCSO !== "undefined") {
				DC.send(JSON.stringify({
					id: 'rerouteConfirmation',
					OriginalRouteConnectionIdHash: OriginalRouteConnectionIdHash
				}));
				SelfP2PChannelNegotiation.main(unusedSpareDCSO, DCSO, null, true);
			} else {
				window.socket.emit('newSpare');
			}

			// everybody gotta know. 
			tellMeshSparesAboutChangeOfRole(DC.connectionId, true);
		} else if (DCSO.role === "P2PSpare") {
			// could be sped up by returning dcso directly
			var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCSO, "P2PSpare");
			var matchingEdgeDCSO = Queries.fetchDCSOByDC(matchingEdgeDC);
			// should implment check if matching edge is open. and otherwise return failed. 
			var statusTest = matchingEdgeDC.getReadyState();
			matchingEdgeDC.role = 'relay';
			DC.role = 'relay';
			matchingEdgeDCSO.role = "relay";
			DCSO.role = "relay";
			alert("sendin da reoute confirmation");
			// send message back to originator telling him that his reroute was a good idea and to 
			DC.send(JSON.stringify({
				id: 'rerouteConfirmation',
				OriginalRouteConnectionIdHash: OriginalRouteConnectionIdHash
			}));
			// send message to other side of broken node to relay to reroute into this new path.        
			matchingEdgeDC.send(JSON.stringify({
				id: 'rerouteInToMe'
			}));
			// original signaller of connection we don't want since thats spare we are coming from
			// originator is kept when swapping over mesh spares so may not refer always to originator 

			if (typeof unusedSpareDCSO !== "undefined") {
				SelfP2PChannelNegotiation.main(unusedSpareDCSO, DCSO, matchingEdgeDCSO);
			} else {
				console.error("should have scaffolded onwards");
				alert("FINDANDLOOKHERE line 108 sparepriority");
			}

			tellMeshSparesAboutChangeOfRole(matchingEdgeDCSO.connectionId, false);
			addReroutingCloserToCorrectEdge(matchingEdgeDCSO, DCSO);
			/*seems that we will add rerouting closer to the edge of the new connection that is near the 
			 * consumer side of the new connection. When nodes become parts of the main path they also need methods added to their 
			 * onclose events to start the rerouting algorithm should they themslevs close. 
			 */
			function addReroutingCloserToCorrectEdge(edgeDCSO1, edgeDCSO2) {
				if (edgeDCSO1.facing === "consumer") {
					edgeDCSO1.dataChannel.addOnClose(Closing.startReroutingAlgorithm);
				} else if (edgeDCSO2.facing === "consumer") {
					edgeDCSO1.dataChannel.addOnClose(Closing.startReroutingAlgorithm);
				} else console.error("unexpected errror");
			}
		} else {
			throw new error();
		}
		// assume that this must be set on all spares. 
		var orginatorConId = DCSO['originatorConId'];
		var originatorDCSO = Queries.fetchDCSOByConnectionId(orginatorConId);
		var readyState = originatorDCSO.dataChannel.getReadyState();
		// tell this open channel to close 
		originatorDCSO.dataChannel.sendWithOpenCheck(JSON.stringify({
			id: 'close',
			connectionIdHash: OriginalRouteConnectionIdHash
		}));
	};

	/**
	 *This is called in the other previously spare channels to tell them to reroute into the channel as a 
	 *path channel rather than a spare channel. 
	 *
	 */
	function rerouteInToMe(DC) {
		// we are coming from the spare  
		// Can a channel be a spare on multiple users connections 
		var DCSOToReouteThrough = Queries.fetchDCSOByDC(DC);
		var dyingRelayDCSO = Groups.FetchRelayRelayByAssociatedConnectionIdAndFacing(DCSOToReouteThrough.connectionId, DCSOToReouteThrough.facing);
		replaceWith(dyingRelayDCSO, DCSOToReouteThrough);
	}

	/** replaces in path DCSO with replacementDCSO
	 *   Performs changes in roles assigned to DSCO
	 */

	function replaceWith(DCSO, replacementDCSO) {
		var oldEdgeId = DCSO.edgeId;
		var oldRole = DCSO.role;

		// small test
		var GN1 = Groups.getGroupNumber(DCSO.connectionId, true);
		var GN2 = Groups.getGroupNumber(replacementDCSO.connectionId, true);
		console.assert(GN1 === GN2, "should be in same group");

		// assumes is either relay 1 or 2 otherwise modify
		if (oldRole === "pseudoExit") {
			replacementDCSO['pseudoExitId'] = DCSO.pseudoExitId;
		}

		if (oldRole === "consumer") {
			replacementDCSO['consumerKeys'] = DCSO.consumerKeys;
		}
		replacementDCSO.role = oldRole;
		replacementDCSO.dataChannel.role = oldRole;
		replacementDCSO.edgeId = oldEdgeId;
		// unneccessary attribute but makes it easier to understand
		DCSO.swapped = true;
		console.assert(replacementDCSO.role !== false, " ghgh  ");
		DCSO.role = 'closed';
		DCSO.dataChannel.role = 'closed';
		DCSO['replacedBySpareWithConnectionId'] = replacementDCSO.connectionId;
		spareIdsJoin(DCSO, replacementDCSO);
	};

	/** 
	 *Adds spareIds together, without duplicating common spare ids.
	 *Spare IDs are used to quickly locate spare channels for a channel when it closes and now the channels share spares 
	 *after this method. 
	 */
	function spareIdsJoin(DCSO1, DCSO2) {
		if (!DCSO1.hasOwnProperty("spareId") && !DCSO2.hasOwnProperty("spareId")) {
			return;
		} else if (!DCSO1.hasOwnProperty("spareId")) {
			DCSO1["spareId"] = DCSO2['spareId'];
		} else {
			Queries.removeCommonSpareIds(DCSO1, DCSO2);
			DCSO1.spareId = DCSO1['spareId'].concat(DCSO2['spareId']);
		}
	}

	/*
	 * 
	 * Similar to forward assertion of switchover but regarding meshspare channels. 
	 * so when role changes we tell mesh spares that we are now the relay ( having previously been the p2pspare) and thus the
	 * connected mesh spares need to change their roles in these other nodes. 
	 * this function is called in this new relay and it sends messages to all the other mesh spares telling them that 
	 * it is now the relay and thus they should change the roles of their mesh spares to p2p spares.
	 */

	function tellMeshSparesAboutChangeOfRole(anyConnectionIdInGroup, pseudoExitFlag) {
		var HowManySparesWeToldTestVar = 0;
		var totalMeshSparesInGroupTestVar = 0;
		// uses getGroup which hard fails if not found!!!
		var group = Groups.getGroup(anyConnectionIdInGroup);
		var readyState;
		var tempTestArr = [];
		loop1:
			for (var i = 0; i < window.DataChannels.length; i++) {
				if (window.DataChannels[i]['role'] === "meshSpare" &&
					group.indexOf(window.DataChannels[i]['connectionId']) !== -1) {
					readyState = window.DataChannels[i].dataChannel.getReadyState();
					totalMeshSparesInGroupTestVar++;
					// change later to add onopener for opening/connecting data channels
					if (readyState === 'closed' || readyState === 'closing') {
						continue loop1;
					} else if (readyState === 'connecting' || readyState === null) {
						window.DataChannels[i].dataChannel.addOnDCOpen(function () {
							var DCSOSelf = Queries.fetchDCSOByConnectionId(this.self.connectionId);
							DCSOSelf.dataChannel.send(JSON.stringify({
								id: 'MeshChange'
							}));
						});

					} else {

						//i think both mesh spares should be p2p spares always when moved across.
						function changeRoleFromMeshSpareToP2PSpare(meshSpare) {
							meshSpare.role = "P2PSpare";
						}

						function changeRoleFromMeshSpareToPseudoExitSpare(meshSpare) {
							meshSpare.role = "pseudoExitSpare";
						}
						tempTestArr.push(window.DataChannels[i]);
						if (pseudoExitFlag) changeRoleFromMeshSpareToPseudoExitSpare(window.DataChannels[i]);
						else changeRoleFromMeshSpareToP2PSpare(window.DataChannels[i]);
						HowManySparesWeToldTestVar++;
						window.DataChannels[i].dataChannel.send(JSON.stringify({
							id: 'MeshChange'
						}));
					}
				}
			}
	}

	/**
	 * This mesh is recieved down a meshSpare and when recieved its since other side has routed around and we need to thus 
	 * make two changes. Firstly we need to shut the previous relay channel since its now out of order, and secondly connect the mesh spare
	 * into it.
	 * I THINK THAT THIS IS CALLED when the other side of mesh channel becomes the active connection it messages it to tell it.
	 * This is similar to reroute into me but regarding meshspare channels. 
	 */
	function meshChange(DC) {
		var meshDCSO = Queries.fetchDCSOByDC(DC);
		// firstly we close up current relay
		var pos = Groups.getAssociatedPosition(meshDCSO.connectionId);

		if (pos === "third") {
			var P2P2Replace = getP2PassociatedWithMeshSpare(meshDCSO, false);
		} else {
			var P2P2Replace = getP2PassociatedWithMeshSpare(meshDCSO, true);
		}
		replaceP2PWithMeshSpare(meshDCSO, P2P2Replace);
		// call after we have closed it. 
		closeDatachannel(P2P2Replace);
	}

	/** 
	 * Does that actual switching of the data associated with switching the roles on the DCSOs
	 */
	function replaceP2PWithMeshSpare(meshSpare, P2P) {
		meshSpare.role = "P2PSpare";
		meshSpare["originatorConId"] = P2P["originatorConId"];
		meshSpare["edgeId"] = P2P.edgeId;

	}

	/*
	 * This one finds the p2p we are gonna shut and replace with hte  mesh spare connected to the 
	 * new relay node in the last part of the rerouting algo where we change the role of the meshspares to p2p spares
	 * 
	 * P2POrMeshSpareFlag is recently added and refers to if the spare is 
	 * looking for a p2p or mesh spare. originally it ws only a p2p spare
	 * but this has been exented to search for pseudoExit since when we added rerouting to pseudoexit and meshspares
	 * if true then its looking for p2p. 
	 * 
	 */

	function getP2PassociatedWithMeshSpare(meshSpare, P2PorPseudoExitFlag) {
		if (P2PorPseudoExitFlag) {
			var P2PorPseudoExitString = "P2PSpare";
		} else {
			var P2PorPseudoExitString = "pseudoExitSpare";
		}

		var testCount = 0;
		var ret;
		var group = Groups.getGroup(meshSpare.connectionId);
		loop1:
			for (var i = 0; i < window.DataChannels.length; i++) {
				// we want to find the relay facing same direction as meshSpare
				if (window.DataChannels[i]['role'] === P2PorPseudoExitString &&
					group.indexOf(window.DataChannels[i]['connectionId']) !== -1 &&
					window.DataChannels[i].hasOwnProperty("facing") &&
					window.DataChannels[i]["facing"] === meshSpare.facing
				) {
					testCount++;
					var ret = window.DataChannels[i];
				}
			}
		return ret;
	}


	/** 
         * Reroutes original reuestor ( called in orginal requester)
	 * The hash it created when it first sent message asking to reroute. 
	 * it actually reroutes into the dc when this is recieved. 
	 */
	function rerouteConfirmation(OriginalRouteConnectionIdHash, DC) {
		console.log('rerouteConfirmation');
		var DCSO = Queries.fetchDCSOByDC(DC);
		var originalPathDCSOToBeSwapped = Queries.fetchDCSOByHash(OriginalRouteConnectionIdHash);
		replaceWith(originalPathDCSOToBeSwapped, DCSO);
		DCSO.dataChannel.addOnClose(Closing.startReroutingAlgorithm);
	};


	/*
         * Called in other side of broken connection
	 */
	function close(connectionIdHash, DC) {
		var DCSO = Queries.fetchDCSOByHash(connectionIdHash);
		// if other side has rerouted
		if (!DCSO.hasOwnProperty('replacementConnectionId')) {
			console.warn('UNSURE IF ERROR: consumer doesnt have property replacementConnectionId');
			return;
		}

		if (DCSO.role === "pseudoExitSpare") {
			var selfDCSO = Queries.fetchDCSOByDC(DC);
			closeDatachannel(selfDCSO);
			return;
		}

		var matchingEdgeDC = Queries.fetchMatchingEdgeDC(DCSO, "relay");
		var matchingEdgeDCSO = Queries.fetchDCSOByDC(matchingEdgeDC);
		// close relay exiting this one on timeout. this will 
		// connect 6 to a pseudoexit
		closeDCSOWithTimeout(matchingEdgeDCSO);
		var allSpares = Queries.fetchAllSpares(matchingEdgeDCSO);

		for (i = 0; i < allSpares.length; i++) {
			closeDatachannel(allSpares[i]);
		}


		var selfDCSO = Queries.fetchDCSOByDC(DC);
		closeDatachannel(selfDCSO);
		// lets find the one that closed on the otherside 
		var replacementsConnectionId = DCSO.replacementConnectionId;
		// edge 6,3
		var newRoutesDCSO = Queries.fetchDCSOByConnectionId(replacementsConnectionId);
		newRoutesDCSO.dataChannel.send(JSON.stringify({
			id: 'setClosingTimeoutAndForward'
		}));
		closeDCSOWithTimeout(newRoutesDCSO);

		/* NOTE:  3 things to do here on the close. 
		 * close both sides of the edge id, and send message up rerouted not original one
		 * and close that one. i mean close the whole datachannel. 
		 * check DCSO for ['replacementConnectionId'] property and if it has it then call timeout close of channel   
		 */
	}


	function closeDCSOWithTimeout(DCSO) {
		setTimeout(function () {
			closeDatachannel(DCSO);
		}, 5000);
	};

	function closeDatachannel(DCSO) {
		DCSO.dataChannel.close();
		DCSO.role = 'closed';
		DCSO.dataChannel.role = 'closed';
	}

	return {
		meshChange: meshChange,
		close: close,
		setClosingTimeoutAndForward: setClosingTimeoutAndForward,
		forwardAssertionOfSwitchOver: forwardAssertionOfSwitchOver,
		rerouteConfirmation: rerouteConfirmation,
		rerouteInToMe: rerouteInToMe,
		closeDCSOWithTimeout: closeDCSOWithTimeout
	}
})();