/*  
 *  
* when initial set of connections are given we then must get a path that the server is unaware of, and this is done by replacing 
* the original end of the onion route with a random peer which is swapped in by the node given as the final "pseudoexit". 
* 
 *It asks one of its connected nodes to give it a random node using p2p channel negotiation and then passes 
 *all the relavent data and datacahnnels onto this channel. This graph traversal algorithmm is called the hider. It then 
 *passes on all of the associated spare channels, and edge ids and aes key it holds all to this random channel which will take over 
 *its role, and means even the initial path is one the server is unaware of.   
 * 
 */
"use strict";

var Hider = (function() {
    
  window["switchedOverFlag"] = false;

    /*
     *   Called in the pseudoexit when it opens. 
     */
    function startHidingAlgorithm(conIdFromGroup){
        window.startedHidingAlgFlag = true;
        // see if we have an open spare? 
        var spareDCSOs = Queries.getAllUnusedSparesRegardlessOfOpenStatus();
        var idsToAvoid = Queries.getClientIdsOfGroupByOneConIdFromGroup(conIdFromGroup);
        function excludeDCSOsOfClientInPrevLayer(idsToAvoid, spareDCSOsToCheckAgainst){
            var ret = [];
            for(var i = 0; i < spareDCSOsToCheckAgainst.length; i++){
                var ind = idsToAvoid.indexOf(spareDCSOsToCheckAgainst[i].dataChannel.connectionId); 
               if(ind == -1) ret.push(spareDCSOsToCheckAgainst[i]);
            }
            return ret;  
        };
       var spareDCSOs = excludeDCSOsOfClientInPrevLayer(idsToAvoid, spareDCSOs);
            var status;
            var sendingGetAndGiveNewSpareToAHiderAHelperFBF;
            var counterTest = 0;
                for(var i = 0; i < spareDCSOs.length; i++){
                    //connecting, open, closing, closed, null are possible states
                    status = spareDCSOs[i]["dataChannel"].getReadyState();
                   
                    if(status === "open"){
                    counterTest++
                        sendingGetAndGiveNewSpareToAHiderAHelperF(spareDCSOs[i], conIdFromGroup);
                    } else if(status === "connecting"){
                       counterTest++
                        sendingGetAndGiveNewSpareToAHiderAHelperFBF = sendingGetAndGiveNewSpareToAHiderAHelperF.bind(null, spareDCSOs[i], conIdFromGroup);     
                spareDCSOs[i]["dataChannel"].addOnDCOpen(sendingGetAndGiveNewSpareToAHiderAHelperFBF); 
                     }
                }
    };
        /*
     * A helper of the start algorithm which is a function that actually sends
     * The message and saves the permission key. Either called directly or added as an onopener function 
     * 
     * conIdFromGroup is one of the connection ids which will be used to assocaite with the new conid
     * 
     * internal/private
     */
    
     function sendingGetAndGiveNewSpareToAHiderAHelperF(DCSOToAsk, conIdFromGroup){
                       var key = UUID.generate();    
                        window.permissionKeysSent.insert({"key": key,
                                  "connectionId": DCSOToAsk.connectionId,
                                  "action": "addNewSpare",
                                   "conIdFromGroup": conIdFromGroup});
                        
                        DCSOToAsk.dataChannel.send(JSON.stringify({id: 'GetAndGiveNewUnusedSpareHider', key: key,  }));
                        return;
     }

    // called in the said spare which finds a spare and passes it. 
    function GetAndGiveNewUnusedSpare(key, DC)
    {
    var DCSO = Queries.fetchDCSOByConnectionId(DC.connectionId);
    if(DCSO.role !== "spare" && DCSO.role !== "P2PSpare" && DCSO.role !== "unusedSpare") {
        console.error("currentnt doesnt ecept this role : " + DCSO.role);
    }
    if(window.SoonLeavingFlag === true){
            return;
     }  
    // do we not check spare isnt already connected??????
    var clientId = DCSO.dataChannel.clientId;
    var randSpare = Queries.getRandomOpenUnusedSpare([DCSO], [clientId]);
    if(typeof randSpare === "undefined"){
        return;
    }
    Signalling.addNewUnusedSparePartOfHider(DCSO, randSpare, key);
    }

    
    /*
     * Called in signaller 2 ( the end but one node in the clients onion path)
     * and handles final part where we actually switch over to the new p2p spare
     * this hamdles the final part 
     * 
     */
    function controllerOfHiderFinalSwitchOver(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit, DCSOToCloseConnectedToOriginalPseudoExit){
       
        if(window["switchedOverFlag"] !== true){
          SwitchOverToNewPseudoExit(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit, DCSOToCloseConnectedToOriginalPseudoExit)
           return;
       } else {
          SwitchOverToNewPseudoExitSpare(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit);
       }
    }
    
    function SwitchOverToNewPseudoExit(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit, DCSOToCloseConnectedToOriginalPseudoExit){
        var DCSO = Queries.fetchDCSOByConnectionId(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit);
        // this dcso is alert that connects to the cahnnel that will be the pseudoexit. 
        DCSOToCloseConnectedToOriginalPseudoExit['dataChannel'].removeOnClosingEventsFromChannel();
         // the channels needs the correct closer to start the resrouting algorithm if it closes.  
         DCSO.dataChannel.addOnClose(Closing.startReroutingAlgorithm); 
         swapOverFinalRelay(DCSOToCloseConnectedToOriginalPseudoExit, DCSO); 
        window["switchedOverFlag"] = true;
    }
    
    /** we don't close any channel we merely add this one as an extra spare and also
    *send across a message
   */
    function SwitchOverToNewPseudoExitSpare(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit){
        var DCSO = Queries.fetchDCSOByConnectionId(conIdOfNewDCSOToSwitchToBeingConnectedToTheToBePseudoExit);  
         DCSO.dataChannel.send(JSON.stringify({id: 'ChangeTheNewHiderToPseudoExitSpare'}));
         DCSO.role = "P2PSpare";
         DCSO.facing = "consumer";
         DCSO["dataChannel"].role = "P2PSpare";
         
    }
    /**
    * We must finally swap over the actual roles assigned to the dcso
  */
    function ChangeTheNewHiderToPseudoExitSpare(DCSO){
        DCSO.role = "pseudoExitSpare";
        DCSO.facing = "pseudoExit";
        DCSO['testPropUseless'] = "lol";
        DCSO.dataChannel.role = "pseudoExitSpare";
   
    }


    function swapOverFinalRelay(originalDCSO, toReplaceDCSO){
        toReplaceDCSO.role = "relay";
        originalDCSO.role = "closed";
        toReplaceDCSO["edgeId"] = originalDCSO.edgeId;
        toReplaceDCSO.spareId = originalDCSO.spareId;
    }

    return {
        ChangeTheNewHiderToPseudoExitSpare: ChangeTheNewHiderToPseudoExitSpare,
       controllerOfHiderFinalSwitchOver: controllerOfHiderFinalSwitchOver,
       startHidingAlgorithm: startHidingAlgorithm,
       GetAndGiveNewUnusedSpare: GetAndGiveNewUnusedSpare
       
    }
})();
