/*  
 * This contains various methods that are called and run when a node closes, not in the node itself but in the
 * other side of the datachannel. These largely pertain to replacing the closed node and rerouting requests. 
 */
"use strict";

var Closing = (function() {

/*
 * closes DCSO of datachannel. Largely added to the onclose event of a datachannel and then calls a 
 * method to replace the channel with a spare. 
 */
  function CloseAndRerouteThroughSpare(){
   var DCSO = Queries.fetchDCSOByConnectionId(this.self.connectionId);
   
    if(DCSO.role !== 'closed') DCSO.role = 'closed';
    
    if(!DCSO.hasOwnProperty('spareId')){
        console.warn('datachannel closed without spare');
        console.info('conid : ' + this.self.connectionId + ' and role : ' + this.self.role);
        return;
    }
    
    if(!DCSO.hasOwnProperty('swapped') || DCSO.swapped === false ){ 
        replaceWithSpare(DCSO);
    }
    
    console.assert(DCSO.role !== false, " role shouldnt be false here  false here")
    
    };
    
/**
*When a channel is closed we request another spare to stop our count of spares being depleted. 
*we do this by asking another channel to signal via p2p channel creation to create us a new channel. 
*
*We also create relavent permissions to do this since channel will not allow neibour to create a channel and give it to 
*self unless we have given permission to this already in our permissions table. 
*/
function requestNewSpare(NotCalledFromOnCloser = false){   
    if(NotCalledFromOnCloser){
        var spareToAskDCSO = Queries.getRandomOpenUnusedSpare([]);
    } else {
        var DCSO = Queries.fetchDCSOByConnectionId(this.self.connectionId);
        console.assert(DCSO !== "undefined", "DCSO not found with conId " + this.self.connectionId);
        var spareToAskDCSO = Queries.getRandomOpenUnusedSpare([DCSO]);
        if(DCSO.role !== "spare" && DCSO.role !== "P2PSpare" && DCSO.role !== "unusedSpare" && DCSO.role !== "signallerPseudoExit"){ 
        console.error('incorrect role at moment only spare/P2PSpare supported with role : ' + DCSO.role + 
                      "connection ID " + DCSO.connectionId);
              throw new Error('incorrect role');
              
     }
    }   
    console.assert(spareToAskDCSO.role === "unusedSpare", " error");
    var key = UUID.generate();    
    // key used to give permission to reply! 
    var connId = spareToAskDCSO.connectionId;
window.permissionKeysSent.insert({"key": key,
                                  "connectionId": connId,
                                  "action": "addNewSpare"});
                      
console.log('inserted key into window.PermissionKeysSent with key ' + key + " annd conId : " + connId);
 spareToAskDCSO.dataChannel.send(JSON.stringify({id: 'GetAndGiveNewUnusedSpare', key: key }));
}

/**
*This is the other side of the "requestNewSpare" and handles the high end logic to give 
*a channel to another channel asking for one. 
*
*/
function GetAndGiveNewUnusedSpare(key, DC){
    console.log('getAndGiveNewSpareCalled with  conid ' + DC.connectionId );
    document.getElementById('log').innerHTML += '<br>Get And Give New Unused Spare';
    var DCSO = Queries.fetchDCSOByConnectionId(DC.connectionId);
    
    if(DCSO.role !== "spare" && DCSO.role !== "P2PSpare" && DCSO.role !== "unusedSpare") {
        console.error("currentnt doesnt ecept this role : " + DCSO.role);
        process.exit();
    }
    // do we not check spare isnt already connected??????
    var randSpare = Queries.getRandomOpenUnusedSpare([DCSO]);
    console.assert(DCSO !== randSpare, " cannot be self");
    Signalling.addNewUnusedSpare(DCSO, randSpare, key);
}


/**starts rerouting algorithm
 * called when main path node shuts down. now it needs to be modified
 * 
 * The rerouting algorithmm is the centre of the operation when either the first or second relay leaves and initaites
 * the main distributed rerouting algorithm "the infinite rerouter". 
 * 
 * @param {DCSO} ClosingDCSO is optional and allows us to pass in the closing DCSO, else we will use the this.self property 
 * which is found since it is otherwise being called from inside a callback from a datachannel event which will have this preset. 
 */ 

function startReroutingAlgorithm(closingDCSO = false){    
    // if its the pseudoexit things might need to be different    
    document.getElementById('log').innerHTML += '<br>start Rerouting Algorithm';
    console.log('startReroutingAlgorithm');
    // this bit is added nad takes a different way to get DCSO if its called manually with 
    if(closingDCSO === false){
    var DCSO = Queries.fetchDCSOByConnectionId(this.self.connectionId);
    }  else {
     var DCSO = closingDCSO;   
    }
    
    console.assert(DCSO.role !== false, "assertion"); 
            var facing = (DCSO.role === "consumer") ? "consumer" : DCSO.facing ;
            var pos = Groups.getAssociatedPosition(DCSO.connectionId);
            if(facing === "consumer" && pos === "second"){
              var potentialSwaps = Groups.fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles(DCSO.connectionId, facing, ["P2PSpare"]);
            } else {
                // otherwise deafult is that is is the p2p spare one
                 var potentialSwaps = Groups.fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles(DCSO.connectionId, facing, ["P2PSpare"]);
            }
         
    potentialSwaps = orderPotentialSwapsOfPseudoExit(potentialSwaps);
    if(typeof potentialSwaps === "undefined" || potentialSwaps.length === 0){
       console.log("no swaps found");
       debugger;
        return;
    }
    
    if(DCSO.hasOwnProperty('swapped') && DCSO.swapped === false ) {
        console.log('swapped exit return');
        return;
    }  
    
        console.log('sending forwardAssertionOfSwitchOver + conid ' + potentialSwaps[0].connectionId);
        potentialSwaps[0].dataChannel.send(JSON.stringify({id: 'forwardAssertionOfSwitchOver',   
                                             OriginalRouteConnectionIdHash: DCSO.connectionIdHash
                                         }));
};

/*
*When swapping pseudoexit node we classify potential replacements. the preferded replacements are those given by the server, and 
*then those given by the hider. 
*
*/

function orderPotentialSwapsOfPseudoExit(DCSOArrOfToOrder){
    //we basically merely create new array and push into this array first any DCSOs with 
    var ordered = []
    for(var i = 0; i < DCSOArrOfToOrder.length; i++){
        if(DCSOArrOfToOrder[i].hasOwnProperty("HiderAddedPseudoExitSpare")){
            ordered.unshift(DCSOArrOfToOrder[i]);
        } else {
            ordered.push(DCSOArrOfToOrder[i]);
        }
         
    }
    return ordered;
    
}
// finds if there is a ssuitable new route to rerouted through.  
// returns connectionIdhHash and connectioniid as object if true. If not true returns false
//SSEEEMS UNUSED MAYBE DELETE!!!!!

/**
* Finds swaps to reroute through. 
* 
*@return {DCSO} returns the Datachannel Storage Object (DCSO) to be used as replacement for closed channel
*               from the list of spare channel ids associataed with a channel. 
*/
function findPotentialSwap(DCSO){
    var spareDCSO, readyState; 
     for(var i = 0; i < DCSO.spareId.length; i++){     
        spareDCSO = Queries.fetchDCSOBySpareId([DCSO.spareId[i]], DCSO);
        readyState =  spareDCSO.dataChannel.getReadyState();
        if(typeof spareDCSO !== "undefined" && readyState === 'open' && spareDCSO.role !== "closed"){
            return spareDCSO;
        }       
     }
     debugger;
 return false;
}

// only call if it hasnt got replaced
// to be called by other closer
// finds a spare and swaps it

/**
*This replaces the actual roles in the DCSOs when it is closing by finding a listed associtated active spare datachnnel
*(DCSO) and swapping over the roles and assigning it its edge id and changing the state of the DCSO param to closed.
*
*/

function replaceWithSpare(DCSO){
    
    var oldEdgeId = DCSO.edgeId;
    var oldRole = DCSO.role;
    var spareDCSO;
    var readyState;
    console.assert(DCSO.role !== false, "role  shouldnt be false here or anywhere");
    DCSO['swapped'] = false;
    for(var i = 0; i < DCSO.spareId.length; i++){     
        spareDCSO = Queries.fetchDCSOBySpareId(DCSO.spareId[i], DCSO);
        readyState =  spareDCSO.dataChannel.getReadyState();
        
        if(typeof spareDCSO == "undefined" || readyState !== 'open') continue;
           var sparesLosingRoleJustForConsolelogging = spareDCSO.role;
           console.assert(oldRole !== false, " old role shouldnt be false");
           spareDCSO.role = oldRole;
           spareDCSO.dataChannel.role = oldRole;
           spareDCSO.edgeId = oldEdgeId;
           console.log('conId ' + spareDCSO.connectionId + " oldrole " + sparesLosingRoleJustForConsolelogging + 
                       " and new " + oldRole);
           // unneccessary but makes it easier to understand
           DCSO.swapped = true; 
           DCSO['replacedBySpareWithConnectionId'] = spareDCSO.connectionId;
           break;
      }
}; 


/*
 * The rerouting algorithm (infinite rerouter initiator but for closing spares routes. 
 *  for P2PSpare closing so it can replace itself. Always called from the consumer (actual requester)
 *  side facing node when a node closes. The spare paths have spare aes keys and so must be repalced. 
 * This is attatched to onclose events and will not run (self quit) if the spare path has become the main path.
 */
function P2PClosingSoReplace(){
    console.log('P2PClosingSoReplace');     
    var DCSO = Queries.fetchDCSOByConnectionId(this.self.connectionId);   
    
    if(DCSO.role === "consumer" || DCSO.role === "relay" || DCSO.role === "pseudoExit" ){
        
        if(DCSO.role === "pseudoExit"){
            console.error("this is not an error just glad it passed here and will delete now i know this is vsiisted");
        } 
        
        console.info('P2PClosingSoReplace aborted since connection became active');
        return;
    } else {
        document.getElementById('log').innerHTML += '<br>P2P Closing So Replace';
    }
    
    var pathDCSO = Queries.fetchActivePathDCSOByGroupAndFacingTheConsumer(this.self.connectionId);
    alert("yes its actu did get to just to show");
    console.error("path conid is " + pathDCSO.connectionId); 
        pathDCSO.dataChannel.send(JSON.stringify({id: 'ReplaceClosingP2P' }));      
        pathDCSO.dataChannel.send(JSON.stringify({id: "NEWTEST"}));
        
}

/**
 * Called in relay node in path.
*/


function ReplaceClosingP2P(DC, recursive = false){
    if(recursive) console.error("recursive replace closingDC");
    // the relay dcso
    var relayDCSO = Queries.fetchDCSOByDC(DC);
    document.getElementById('log').innerHTML += '<br>REPLACE CLOSING P2P called';
    console.log('ReplaceClosingP2P'); 
    console.assert(relayDCSO.role === "relay" || relayDCSO.role === "pseudoExit" || relayDCSO.role === "consumer", "working assumption should only be called in active path" );
    
    var closingSpareDCSOConnectionId = relayDCSO['sparesChannelConnId']; 
    var closingSpareDCSO = Queries.fetchDCSOByConnectionId(closingSpareDCSOConnectionId);             
    // we get a new spare that is not the same spare as the one thats got the closing p2pspare
    console.assert();
    var nextSpareDCSO = Queries.getRandomOpenUnusedSpare([closingSpareDCSO]);
          if(typeof nextSpareDCSO === "undefined"){
            console.error('spareDCSo undefined so essentially cannot find new spare to go to');
            var bf = ReplaceClosingP2P.bind(null, DC, true);
            var timePeriod = 1000;
            window.socket.emit('newSpare');
            setTimeout(bf, timePeriod);
            return;
        }
    if(relayDCSO.role === "pseudoExit" || relayDCSO.role === "pseudoExitSpare"){     
    SelfP2PChannelNegotiation.main(nextSpareDCSO, relayDCSO, null, true);
    } else {  
    var matchingEdgeDCSO = Queries.fetchMatchingEdgeDCSOByDCSOWithRole(relayDCSO, "relay");
    SelfP2PChannelNegotiation.main(nextSpareDCSO, relayDCSO, matchingEdgeDCSO);
    }
    requestNewSpare(true);
}  
    return {
        P2PClosingSoReplace: P2PClosingSoReplace,
        ReplaceClosingP2P: ReplaceClosingP2P,
        requestNewSpare: requestNewSpare,
        GetAndGiveNewUnusedSpare: GetAndGiveNewUnusedSpare,
        CloseAndRerouteThroughSpare: CloseAndRerouteThroughSpare,
        startReroutingAlgorithm: startReroutingAlgorithm
    }
})();