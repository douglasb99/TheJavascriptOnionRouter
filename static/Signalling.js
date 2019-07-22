/*  
 * essentially static methods so they hold zero state
 */
"use strict";

var Signalling = (function() {
    
/*
 * thus far connect is to start connection between spare and relays by relay.
 * 
 * it forms both connections to route around. 
 * 
 * requirues three connected DCSOs
 * @param {type} DCSOA
 * @param {type} DCSOB
 * @param {type} DCSOC
 * @returns {undefined}
 */
function connect(DCSOA, DCSOB, DCSOC){
    
    
    console.error("CONNECT CALLED : NOT ERORR");
    console.log('SIGNALLER CONTECT CALLED ');
   var sortedDCSOs = sortDCSOs(DCSOA, DCSOB, DCSOC);
   var spareDCSO = sortedDCSOs.shift();
   var relay1DCSO = sortedDCSOs.shift();
   var relay2DCSO = sortedDCSOs.shift();
   
   var edgeId = UUID.generate();
   // send two messages to start from the spare. spare intiates since this reduces failure points.
   var connectionId1 = UUID.generate() + "connect29" + window.clientId;
   
   console.assert(relay1DCSO.hasOwnProperty('facing'), 'relay 1 hasnt got facing');
   console.assert(relay2DCSO.hasOwnProperty('facing'), 'relay 2 hasnt got facing');
   
   var facing1 = relay1DCSO.facing;
   var facing1Opposite = getOppositeFacing(facing1);
   
   var facing2 = relay2DCSO.facing;
   var facing2Opposite = getOppositeFacing(facing2);
   
   if(relay1DCSO.hasOwnProperty("position")) debugger;
   
   // could be any connection Id since in same group I hope. 
   var position = Groups.getAssociatedPosition(relay1DCSO.connectionId);
   console.assert(position !== null, "position shouldnt be null");
   // when i hope i test REMOVE BEFORE LAUNCH
   
   var meshFlag = Meshing.ShouldIAddMeshingKeyDecider(position, relay1DCSO.facing);
   
   var key = (meshFlag) ? Meshing.getNewMeshingKey(spareDCSO.connectionId) : null ; 
   
   var AESKey = Groups.getAssociatedKey(relay1DCSO.connectionId);

   console.assert(AESKey != null && typeof AESKey !== "undefined", "AESKey Not Found");

   TESTALLAREINSAMEGROUPMETHOD(DCSOA, DCSOB, DCSOC);
   
   // this assumes DCSOB and DCSOC are in same group already
//Groups.linkUnknowns(DCSOA.connectionId, DCSOB.connectionId);
  //  actually lets merge instead
   function TESTALLAREINSAMEGROUPMETHOD(DCSOA, DCSOB, DCSOC){
      // debugger;
       var numberA = Groups.getGroupNumber(DCSOA.connectionId);
       var numberB = Groups.getGroupNumber(DCSOB.connectionId);
       var numberC = Groups.getGroupNumber(DCSOC.connectionId);      
console.assert(numberA === numberB, "should be in same group Aconid : " + DCSOA.connectionId + " Bconid " +  + DCSOB.connectionId);
console.assert(numberB === numberC, "should be in same group Bconid : " + DCSOB.connectionId + " Cconid " +  + DCSOC.connectionId);
   }


   spareDCSO.dataChannel.send(JSON.stringify({id: 'initiate', 
                                               role: 'P2PSpare',   
                                               connectionId: connectionId1,
                                               edgeId: edgeId,
                                               addSpareFlag: true,
                                               facing: facing1,
                                               meshingKey: key,
                                               position: position,
                                               AESKey: AESKey
                                           })); 
   
 /*   
   function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}

wait(1000);*/
    
   relay1DCSO.dataChannel.send(JSON.stringify({id: 'receive',
                                               role:'P2PSpare', 
                                               connectionId: connectionId1,
                                               addSpareFlag: true,
                                               facing: facing1Opposite
                                           }));
                                           
    var connectionId2 = UUID.generate() + "connect2"  + window.clientId;
    //console.assert();
    
    if(relay1DCSO.dataChannel.connectionId === relay2DCSO.dataChannel.connectionId){
        alert("relay1 == relay2 conid");
    }
    
    console.log("in connect our conid2 is " + connectionId2);
    console.log("our init conid is : " + spareDCSO.dataChannel.connectionId);
    console.log("our relay1 ( a diff one )  conid is : " + relay1DCSO.dataChannel.connectionId);
    console.log("and our receive conid is : " + relay2DCSO.dataChannel.connectionId);
    
    
    var state1 = relay2DCSO.dataChannel.rtcdatachannel.readyState;
    var state2 = spareDCSO.dataChannel.rtcdatachannel.readyState;
    console.log("states are : " + state1 + " : and : " + state2);
    
    //var position2 = Groups.getAssociatedPosition(relay2DCSO.connectionId);
    
    
   var meshFlag2 = Meshing.ShouldIAddMeshingKeyDecider(position, relay2DCSO.facing);
   
   var key2 = (meshFlag2) ? Meshing.getNewMeshingKey(spareDCSO.connectionId) : null ; 
    
    // does position need to be on both? since we associate? hmm
   spareDCSO.dataChannel.send(JSON.stringify({id: 'initiate', 
                                              role:'P2PSpare',
                                              connectionId: connectionId2,
                                              edgeId: edgeId,
                                              addSpareFlag: true,
                                              facing: facing2,
                                              meshingKey: key2,
                                              position: position,
                                              AESKey: AESKey
                                         }));
    
    
   relay2DCSO.dataChannel.send(JSON.stringify({id: 'NEWTEST',
                                               connectionId: connectionId2
                                           }));
    
   relay2DCSO.dataChannel.send(JSON.stringify({id: 'receive', 
                                               role:'P2PSpare',
                                               connectionId: connectionId2, 
                                               addSpareFlag: true,
                                               facing: facing2Opposite
                                           }));
                                           
  console.log("id4566524 and : "  + JSON.stringify({id: 'receive', 
                                               role:'P2PSpare',
                                               connectionId: connectionId2, 
                                               addSpareFlag: true,
                                               facing: facing2Opposite
                                           }));                                       

     
    window.signallingInfo.insert({"connectionId": connectionId1,
                                  "initiatorDCSO": spareDCSO, "recieverDCSO":relay1DCSO });
       
    window.signallingInfo.insert({"connectionId": connectionId2,
                                  "initiatorDCSO": spareDCSO, "recieverDCSO":relay2DCSO });
    // stored for biulding the mesh spares                          
    // add info to relay so that we can see which spare is connected to which relay so when 
    // we replace spare dataChannel when it disconnects we don't try to connect through the ssame spare. 
    // only add to one of pseudoExit facing  edge channel since reroutes from consumer side ony now.  
   
    //function addToRelaysLinksTo(){
   if(relay1DCSO.facing === "pseudoExit"){
    relay1DCSO['sparesChannelConnId'] = spareDCSO.connectionId; 
   } else if(relay2DCSO.facing === "pseudoExit") {
    relay2DCSO['sparesChannelConnId'] = spareDCSO.connectionId; 
   } else {
        throw new Error("not valid facing property");
    }
    //} 
    // edgeid seems to be of the newly created p2p spare ie a third party edgeid
    // what to do to reconnect hlaves since this disappears when edges cut. 
    //relay1DCSO.signallerIdObj.push({'edgeId': edgeId,  'signallerId' : spareDCSO.connectionId  });
    //relay2DCSO.signallerIdObj.push({'edgeId': edgeId, 'signallerId' : spareDCSO.connectionId  });
   };
   
   
 
 // meshConnect is to connect rest of mesh onto new spare. it just connects the two DSCOS
 // passed as parameters. It is called not in actual spare being meshed up but in the creator, 
 // and should be called at the point when the spare is added, and is seperate to adding the P2pspares.
 // 
 // ligandDCSOInitiator should be ligand DCSO. I think there will always be a ligand in algo
 //
 
 function meshConnect(ligandDCSOInitiator, DCSOToSendreceive, positionForTestingOnly = null, calledForTestingOnly = null){
      var connectionId = UUID.generate() + "mesh192"  + window.clientId;
    console.count('meshConnect with connectionId ' + connectionId  + " note i made the conId");
    console.log("connecting as initiator : " + ligandDCSOInitiator.connectionId + " and reciever : " + DCSOToSendreceive.connectionId);
    var testid = ligandDCSOInitiator.dataChannel.clientId;
    var testid2 = DCSOToSendreceive.dataChannel.clientId;
    console.assert(testid !== testid2, " cannot connect self to self");

   // facing can be derived from 
   console.assert(!ligandDCSOInitiator.hasOwnProperty("facing"), "ligand shouldnt have facing conId : " + ligandDCSOInitiator.connectionId + "caller line of meshing : " + calledForTestingOnly);
   var unwantedRolesTest = ['meshSpare', 'relay', 'P2PSpare' ];
   console.assert(unwantedRolesTest.indexOf(ligandDCSOInitiator.role) === -1, "unexpected role : " + ligandDCSOInitiator.role); 
   
   ligandDCSOInitiator.dataChannel.send(JSON.stringify({id: 'initiate', 
                                               role: 'meshSpare',   
                                               connectionId: connectionId,
                                               addSpareFlag: false,
                                               facing: DCSOToSendreceive.facing
                                           }));
    
   if(!DCSOToSendreceive.hasOwnProperty("facing")){
     console.error("should cross and thus should have this property");
     //debugger;
   };
   
    var opposite = getOppositeFacing(DCSOToSendreceive.facing); 
    
   DCSOToSendreceive.dataChannel.send(JSON.stringify({id: 'receive',
                                               role:'meshSpare', 
                                               connectionId: connectionId,
                                               addSpareFlag: false,
                                               facing: opposite
                                           }));

    window.signallingInfo.insert({"connectionId": connectionId,
                                  "initiatorDCSO": ligandDCSOInitiator, "recieverDCSO" : DCSOToSendreceive });
   };
    
   /*
    * This function is used for the intial signalling of "the last part" 
    * of the rerouting algorithm where spares from the other side have to connect to the new relay. 
    * This connects one such spare route with 
    * 
    * @param {type} replacementDCSO the new path channel
    * @param {type} spareDCSO the spare DCSO connecting to the p2p spare we are attatching
    * @param {type} spareDCSO the spare DCSO connecting to the p2p spare we are attatching
    * @returns {void}
    */ 
 /*function rerouteSpareAlgoLastPart(replacementDCSO, spareLigandDCSO, spareConnectorsConnIdsObj){
        
      
        //debugger;
        
      var connectionId = UUID.generate();
      // this one will overwrite another
      // the 90 degrees to the caller
      // give this one the 
    spareLigandDCSO.dataChannel.send(JSON.stringify({id: 'initiate', 
                                               role: 'P2PSpare',   
                                               connectionId: connectionId,
                                               edgeId: spareConnectorsConnIdsObj.edgeId,
                                               addSpareFlag: false,
                                               facing: replacementDCSO.facing,
                                               rerouter: true
                                           }));
                                           
   var oppositeFacing = getOppositeFacing(replacementDCSO.facing);
   
   replacementDCSO.dataChannel.send(JSON.stringify({id: 'receive',
                                               role:'spare', 
                                               connectionId: connectionId,
                                               addSpareFlag: true,
                                               facing: oppositeFacing
                                               
                                           }));
    
    window.signallingInfo.insert({"connectionId": connectionId,
                                  "initiatorDCSO": spareLigandDCSO, "recieverDCSO":replacementDCSO });

    
     
 }*/
                 
/*
 * 
 * pseudoexit refers to the dc that will be pseudoexit
 * 
 *may want to add AESKey and position attributes soon
 * 
 * BASICALLY IT SEEMS THAT THE second Param IS THE LIGAND TO THE SPARE, AND
 * FIRST IS TO THE RELAY IN THE PATH ( SIGNALLER 2  I GUESS ) 
 *  
 *JUST ADDED THE MESHCONNECT THING
 *
 * should i think be called in pseudoexit
 *   
 * @param {type} pseudoExitDCSO 
 * @param {type} signallerPseudoExit
 * @returns {undefined}
 */
function pseudoConnect(PseudoExit, SignallerPseudoExitDCSO, hider = false){
  //  debugger;
     console.log('PSEUDOCONNECT CALLED');
    // console.assert(arguments.length === 2,  'incorrectnumber of arguments');
     
     
     var AESKey = Groups.getAssociatedKey(SignallerPseudoExitDCSO.connectionId);
     
     //AESKey = 999;
     
    console.assert(AESKey.length > 3, " I THINK THERE OUGHT TO BE AN AES KEY AT THIS JUNCTURE HERE I GUESS");
     
     
     var Cid1 = PseudoExit.dataChannel.clientId;
     var Cid2 = SignallerPseudoExitDCSO.dataChannel.clientId;
     
     if(Cid1 == Cid2){
         debugger;
         alert("ACONNECTINNOWNOWSELFTOSELF");
         alert("connecting to self");
         console.error(" the same cid1 and 2 are : " + Cid1 + " and " + Cid2);
     }
     //console.error("cid1 and 2 are : " + Cid1 + " and " + Cid2);
     
     
     
     var position = "third";
     // really this is not needed since will always return true but i DUnno why i put it here so at least ShouldIAddMeshingSpareKeyDecider
     // always makes the decision. hmm a bit silly maybe but hey ho. 
     // assume you pass to ligand 
     ///var meshFlag = Meshing.ShouldIAddMeshingKeyDecider(position, facin);
     
    var meshFlag = true;
   
    var key = (meshFlag) ? Meshing.getNewMeshingKey(SignallerPseudoExitDCSO.connectionId) : null ; 
     
   var connectionId1 = UUID.generate();
  connectionId1 += "THEPSEUDODOESTHISEXISTANDINBOTHHOW"  + window.clientId;
   
   // I THINK UPON review that teh reason that these are added only to the pseudoexit relates to the fact that 
   /* ADDEED OUT OF HOPE AND TO BE REMOVED IF FOUND TO BE INCORRECT */
    PseudoExit['sparesChannelConnId'] = SignallerPseudoExitDCSO.connectionId; 
   
   if(hider) var roleA = 'pseudoExit';
  else var roleA = "pseudoExitSpare";
   
   
   console.log(' and connnection id is ' + connectionId1 );
SignallerPseudoExitDCSO.dataChannel.send( JSON.stringify({id: 'initiate', 
                                                role: roleA, 
                                                connectionId: connectionId1,
                                                AESKey: AESKey,
                                                position: position,
                                                meshingKey: key,
                                                facing: "pseudoExit"
                                                }));

console.warn("NOT A WARNING JUST A CHECK CONID with question is this signaller ");
                    
                    // i beleive that the pseudoExit is actually connecting to signaller 2
  // the hider flag is used to tell the node to reroute into the hider.
  
  if(hider) var role = 'relay';
  else var role = "P2PSpare";
  
PseudoExit.dataChannel.send(JSON.stringify({ id: 'receive', 
                                                   role: role, 
                                                   connectionId: connectionId1,
                                                   addSpareFlag: true,
                                                   facing: "consumer",
                                                   hider: hider
                                                   }));
 
  
window.signallingInfo.insert({"connectionId": connectionId1,
                                  "initiatorDCSO": SignallerPseudoExitDCSO, "recieverDCSO": PseudoExit });
     
 }
 
 /*
  * called by closer and adds new spare and intitates this new connection 
  * 
  */
 
 function addNewUnusedSpare(requestorOfSpareDCSO, unusedSpareToAddDCSO, key)
 {
     
     console.log('%cadd new spare called!!!!!', 'color: #bada55');
      var connectionId = UUID.generate() + "unused317"  + window.clientId;
      console.log('and connectionId INITIATOR OF IS :: ' + connectionId);
      // the key is required to initiate actual spare, to prevent unwanted spares being added
      
      console.assert(requestorOfSpareDCSO !== unusedSpareToAddDCSO, " new spare cannot be self ");
      
     requestorOfSpareDCSO.dataChannel.send(JSON.stringify({id: 'initiate', 
                                                role:'unusedSpare', 
                                                connectionId: connectionId,
                                                key: key
                                                }));
     unusedSpareToAddDCSO.dataChannel.send(JSON.stringify({id: 'receive', 
                                                   role:'spareGivenSoNotTrusted', 
                                                   connectionId: connectionId
                                                   }));
                                                   
     window.signallingInfo.insert({"connectionId": connectionId,
                                   "initiatorDCSO": requestorOfSpareDCSO, 
                                   "recieverDCSO": unusedSpareToAddDCSO});
                               
    
 }  
 
 /*
  * 
  *earlyin the hider algorithm we intially add the new spare. This part should be called in the spare we are asking us to
  *give us a new spare and it is called from the hider GetAndGiveNewUnusedSpare method. requestor will be the pseudoExitNode
  *
  */
 
 
 function addNewUnusedSparePartOfHider(requestorOfSpareDCSO, unusedSpareToAddDCSO, key)
 {
    // debugger; // this is where to look 
     console.assert(key.length > 4, " needs a key to be sent")
      console.log('%caddNewUnusedSparePartOfHider!!!!!', 'color: #bada55');
      var connectionId = UUID.generate() + "hider353"  + window.clientId;
      //var connectionId = 999999999999999;     
      console.log('and connectionId ' + connectionId);
      // the key is required to initiate actual spare, to prevent unwanted spares being added
      
      console.assert(requestorOfSpareDCSO !== unusedSpareToAddDCSO, " new spare cannot be self ");
      
      
      
      
     requestorOfSpareDCSO.dataChannel.send(JSON.stringify({id: 'receive', 
                                                role:'Hider', 
                                                connectionId: connectionId,
                                                key: key
                                                }));
                                                
   // so givenHider we need to then take a look at it and when opens we need to add some signalling stuff. 
                                                
                                                
     unusedSpareToAddDCSO.dataChannel.send(JSON.stringify({id: 'initiate', 
                                                   role:'GivenHider', 
                                                   connectionId: connectionId,
                                                   position: "third"
                                                   }));
                                                   
     window.signallingInfo.insert({"connectionId": connectionId,
                                   "initiatorDCSO": unusedSpareToAddDCSO, 
                                   "recieverDCSO": requestorOfSpareDCSO});
 }  

/*
 * in signaller we recieve bigoffer from initiate and send it to 
 * 
 * DC param only added for testing
 * 
 */

function forwardOffer(offer, connectionId, clientId, DC){
   console.assert(arguments.length === 4, "now must forward an OFFER with 4 args where got " + arguments.length);

    console.log('forwardOffer Signalling'); 
      console.log("connectionId: " + connectionId);
    var row = window.signallingInfo({connectionId: connectionId}).last();
    
    row.recieverDCSO.dataChannel.send(JSON.stringify({id: 'offer', 
                                               connectionId: connectionId, 
                                               offer: offer,
                                               clientId: clientId
                                           }));
                                           
    console.log("offer creating conId " + connectionId + " forwarded from " + DC.connectionId + " to " + row.recieverDCSO.dataChannel.connectionId);                                         
};

/* 
 * dc param only added for testing
 */

function forwardAnswer(answer, connectionId, clientId, DC){
    console.assert(arguments.length === 4, "now must forward an answer with 4 args where got " + arguments.length);
    console.log('forwardAnswer Signalling'); 
      console.log("connectionId: " + connectionId);
    var row = window.signallingInfo({connectionId: connectionId}).last();
   
   
   console.log("answer creating conId " + connectionId + " forwarded from " + DC.connectionId + " to " + row.initiatorDCSO.dataChannel.connectionId);

   
    row.initiatorDCSO.dataChannel.send(JSON.stringify({id: 'answer', 
                                               connectionId: connectionId, 
                                               answer: answer,
                                           clientId: clientId }));     
};


function forwardCandidate(candidate, connectionId, DC){
    
    console.log('forwardAnswer called inside Signalling');
      console.log("connectionId: " + connectionId);
    var row = window.signallingInfo({connectionId: connectionId}).last();
    var row1 = window.signallingInfo({connectionId: connectionId}).first();
    var row2 = window.signallingInfo({connectionId: connectionId});
    
    if (row.recieverDCSO.dataChannel === DC){
        console.log("in reciever of ifstatement");
        console.log("candidate creating conId " + connectionId + " forwarding from " + DC.connectionId + " to " + row.initiatorDCSO.dataChannel.connectionId);
        
        row.initiatorDCSO.dataChannel.send(JSON.stringify({id: 'candidate', 
                                               connectionId: connectionId, 
                                               candidate: candidate }));
    } else if(row.initiatorDCSO.dataChannel === DC){
                console.log("in initiator of ifstatement");

console.log("candidate creating conId " + connectionId + " forwarding from " + DC.connectionId + " to " + row.recieverDCSO.dataChannel.connectionId);
        
        row.recieverDCSO.dataChannel.send(JSON.stringify({id: 'candidate', 
                                               connectionId: connectionId, 
                                               candidate: candidate }));
    } else {
        console.error(' candidate not sent on since row selected made an error');
    }   
}

// takes string of facing and returns opposite facing property
function getOppositeFacing(facing){
    if(facing === 'consumer') return 'pseudoExit';
    if(facing === 'pseudoExit') return 'consumer';
    console.error('getOppositeFacing alled with input not consumer or pseudoExit with input : ' + facing);    
}

function sortDCSOs(DCSOA, DCSOB, DCSOC){
    var ret = [];
    
    if(DCSOA.role === 'signaller'){ 
        ret.push(DCSOA); 
        ret.push(DCSOB); 
        ret.push(DCSOC); 
    }
    else if(DCSOB.role === 'signaller'){
        ret.push(DCSOB);
        ret.push(DCSOA); 
        ret.push(DCSOC); 
    }
    else if(DCSOC.role === 'signaller'){
        ret.push(DCSOC);
        ret.push(DCSOA); 
        ret.push(DCSOB); 
    } 
    else if(DCSOA.role === 'pseudoExit'){
        ret.push(DCSOA);
        ret.push(DCSOB); 
        ret.push(DCSOC); 
    }
    else if(DCSOB.role === 'pseudoExit'){
        ret.push(DCSOB);
        ret.push(DCSOA); 
        ret.push(DCSOC);    
    }
    else if(DCSOC.role === 'pseudoExit'){
        ret.push(DCSOC);
        ret.push(DCSOA); 
        ret.push(DCSOB); 
    } else {
        console.assert(false, 'bad return in sortDCSOs in signalling');
    }
    return ret;  
};
 
 //         rerouteSpareAlgoLastPart: rerouteSpareAlgoLastPart taken from this part
 
    return {
        addNewUnusedSparePartOfHider: addNewUnusedSparePartOfHider,
        sortDCSOs: sortDCSOs,
        connect: connect,
        meshConnect: meshConnect,
        pseudoConnect: pseudoConnect,
        addNewUnusedSpare: addNewUnusedSpare,
        forwardOffer: forwardOffer,
        forwardAnswer: forwardAnswer,
        forwardCandidate: forwardCandidate
    }
})();