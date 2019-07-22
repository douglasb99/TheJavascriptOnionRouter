/*
 * On occassion you want to multiplex a channel rather than share a channel when you need two 
 * channels between two clients and it uses a variant of p2p channel negotiation where instead of two channels
 * being used as a signalling server to create a new channel in a p2p fashion we only use one and share the sdp
 * offer/answer and icecandidates down a preexisting channel between two clients to create a second channel. 
 * 
This is kinda dumb, and was written due to a lack of knowledge of peerconnections and can be done automaticcaly natively. 
 */   
"use strict";

var SelfP2PChannelNegotiation = (function() {
   
/**
 * p2pdcs01 and 02 are the links to two original path nodes we will add a spare to and join to dcso.
 * DC is so when initiate called it can pass back down correct datachannel
 * NOTE: if its used in pseudoEXIT then null should be passed for p2pDCSO2
 */

function main(spareDCSOToReplicate, p2pDCSO1, p2pDCSO2, pseudoExitFlag = false){
    console.log("SelfP2PChannelNegotiation main called to replicate conid : " + spareDCSOToReplicate.connectionId);
     var connectionId = UUID.generate(); 
     var addSpareFlag = false;
     
     // maybe position should work for pseudoExit but who cares thats how i simply solved the bug
     if(pseudoExitFlag) {
         var position = "third";
     }
     else var position = Groups.getAssociatedPosition(p2pDCSO1.connectionId);
     
     
      var AESKey = Groups.getAssociatedKey(p2pDCSO1.connectionId);
    console.assert(AESKey.length > 3, " hmm ought to pas sthis one is there is an aes key");
    console.assert(position !== null);
    console.assert(position === "first" || position === "second" || position === "third", "invalid position property");
    initiate(connectionId, 'signaller', spareDCSOToReplicate, p2pDCSO1, p2pDCSO2, position, pseudoExitFlag);
    
    console.assert(spareDCSOToReplicate.role === "unusedSpare");
    spareDCSOToReplicate.dataChannel.send(JSON.stringify({id: 'selfReceive',
                                               role:'spare', 
                                               connectionId: connectionId,
                                               /* surely a usless property? hmm leave anyway !!!! */
                                               spareDCSOToReplicateConnectionId: spareDCSOToReplicate.connectionId, 
                                               addSpareFlag: false, 
                                               position: position
                                             
                                           }));
}   
/*
 * 
 * initiiate is just to establish the connection between spares to get additional channel. this is the
 * channel between already connected. called on self
 *   
 *   p2pDCSO1, p2pDCSO2 seem to be to pass to onopen not used directly
 *   
 *   (connectionId, role, spareDCSOToReplicate, p2pDCSO1, p2pDCSO2, position, pseudoExitFlag)
 *   
 */
function initiate(connectionId, role, spareDCSOToReplicate, p2pDCSO1, p2pDCSO2, position, pseudoExitFlag){
    var spareDCSOToReplicateConnectionId = spareDCSOToReplicate.connectionId;     
    console.info("INITIATE P2PChannelNegotiation and connectionId: " + connectionId);
    function sendOffer(offer)
     {
        
         console.warn('not a warning but send offer in selfP2P');
      spareDCSOToReplicate.dataChannel.send(JSON.stringify({id: 'selfOffer', 
                        connectionId: connectionId, 
                        offer: offer,
                        clientId : window.clientId
                        }));
     }; 
   
    var params = new Array(spareDCSOToReplicate.dataChannel, connectionId);
      
     function sendIceCandidate(params, candidate, self){
         console.log('SENDING CANDIDATE ' + params.length);
                var message = {};
                message.id = "selfCandidate";
                message.connectionId = params[1];
                message.candidate = candidate;
                var DaC = params[0];
                spareDCSOToReplicate.dataChannel.send(JSON.stringify(message));
            };
        // all bound functions have BF in variable name    
        var IceCandidateCBBF = sendIceCandidate.bind(null, params);
        
        var dataChannel = new DataChannel(IceCandidateCBBF, fileBufferReader, null, connectionId, role);
    
    dataChannel.addOnDCOpen(function(){
        console.log('COMREADY from selfP2pchan neg init ' + this.self.connectionId);
        console.count('COMREADY');
    });
    
    dataChannel.initiate(sendOffer);
    var dataChannelObj = Queries.createDCSO( dataChannel, connectionId, role, null, null);
    Groups.associatePosition(connectionId, position);
    // used to get small triangle of big 
    window.DataChannels.push(dataChannelObj);
    var signallerRelayOnOpenSignallerBF = signallerRelayOnOpenSignaller.bind(null, p2pDCSO1, p2pDCSO2, spareDCSOToReplicateConnectionId, pseudoExitFlag);
    dataChannel.addOnDCOpen(signallerRelayOnOpenSignallerBF);
    
    var spareDCSOToReplicateConnectionId = spareDCSOToReplicate.connectionId; 
    var saveMultiplexConnIdBF = saveMultiplexConnId.bind(null, spareDCSOToReplicateConnectionId);
    dataChannel.addOnDCOpen(saveMultiplexConnIdBF);
};


function saveMultiplexConnId(spareDCSOToReplicateConnectionId){
     var DCSO = Queries.fetchDCSOByConnectionId(self.connectionId);
         DCSO['multiplexConnectionId'] =  spareDCSOToReplicateConnectionId;
}

// signaller relay is to biuld bridges a along relay
function signallerRelayOnOpenSignaller(p2pDCSO1, p2pDCSO2, spareDCSOToReplicateConnectionId, pseudoExitFlag){
         var DCSOForTesting = Queries.fetchDCSOByConnectionId(self.connectionId);
        document.getElementById('log').innerHTML += '<br>COMREADY :  ' + DCSOForTesting.role + " " + self.connectionId;
                  var DCSO = Queries.fetchDCSOByConnectionId(self.connectionId);
                  var readyState1 = p2pDCSO1.dataChannel.getReadyState();                  
                  // this was added since in pseudoExit DCSO2 will not be used so we set it to open for easiness to fake this 
                  if(pseudoExitFlag)readyState2 = 'open';
                  else var readyState2 = p2pDCSO2.dataChannel.getReadyState();
                  
                  if(readyState1 !== 'open' || readyState2 !== 'open'){
                      console.warn("signallerRelayOnOpenSignaller didnt signal, not both open");
                      console.log('readystate1: ' + readyState1 + 'readystate2: ' + readyState2);
                  }
                    Groups.link(DCSO.connectionId, p2pDCSO1.connectionId);
                    if(pseudoExitFlag) {
                        Signalling.pseudoConnect(p2pDCSO1, DCSO);
                    }
                    else {
                        Signalling.connect(DCSO, p2pDCSO1, p2pDCSO2); 
                    }      
};

// @param sharedNodeData - this is obj representing data shared when new node created e.g. key

function receive(connectionId, role, DC, addSpareFlag, spareDCSOToReplicateConnectionId, position){
   
     console.info("RECEIVE P2PChannelNegotiation");
       console.log("connectionId: " + connectionId);
    var params = new Array(DC, connectionId);
    
    // to stop attacks since cannot e used here
    if(role === "consumer"){
        console.error(' cannot create consumer here');
        return;
    }
    var DCSO = Queries.fetchDCSOByDC(DC);
    DCSO.role = "replicatedSpareNotUsed";
    DC.role = "replicatedSpareNotUsed";
    
    function sendIceCandidate(params, candidate, self){
                var message = {};
                message.id = "selfCandidate";
                message.connectionId = params[1];
                message.candidate = candidate;
                var DaC = params[0];
                DaC.send(JSON.stringify(message));
            };
  
  var IceCandidateCBBF = sendIceCandidate.bind(null, params);  
  var dataChannel = new DataChannel(IceCandidateCBBF, fileBufferReader, null, connectionId, role);
  var DCSO = Queries.fetchDCSOByDC(DC);
  
  dataChannel.addOnDCOpen(function(){ 
      console.log('COMREADY from selfP2pchan neg recev ' + this.self.connectionId);
      console.count('COMREADY');
       var DCSOnForTesting = Queries.fetchDCSOByConnectionId(this.self.connectionId);
        document.getElementById('log').innerHTML += '<br>COMREADY :  ' + DCSOnForTesting.role + " " + this.self.connectionId;
       Groups.linkUnknowns(this.self.connectionId, spareDCSOToReplicateConnectionId);
  });  
    
   var dataChannelObj = Queries.createDCSO(dataChannel, connectionId, role, null, null);
   Groups.associatePosition(connectionId, position);

  if(addSpareFlag) addSpareIds(DCSO, dataChannelObj);
  window.DataChannels.push(dataChannelObj); 
   var saveMultiplexConnIdBF = saveMultiplexConnId.bind(null, spareDCSOToReplicateConnectionId);
   dataChannel.addOnDCOpen(saveMultiplexConnIdBF);
};




function offer(offer, connectionId, DC, clientId){
    function sendAnswer(answer){
                                      DC.send(JSON.stringify({id: 'selfAnswer', 
                        connectionId: connectionId, 
                        answer: answer,
                        clientId :window.clientId
                    }));
            }; 
          var DCSO = Queries.fetchDCSOByConnectionId(connectionId);
          DCSO.dataChannel.offer(offer, clientId, sendAnswer);     
};


function answer(answer, connectionId, clientId){
    var P2PDC = Queries.fetchDCSOByConnectionId(connectionId);
    P2PDC.dataChannel.answer(answer, clientId);
    };


function candidate(candidate, connectionId){
     var P2PDC = Queries.fetchDCSOByConnectionId(connectionId)
     P2PDC.dataChannel.addICECandidate(candidate, connectionId);
};


/** 
* change spares to array to stop overwriting other spare ids. 
*/
function addSpareIds(DCSOA, DCSOB){
        console.assert(arguments.length === 2, 'incorrect number of arguments to addspareid');
        var spareId = UUID.generate();
        
        if(!DCSOA.hasOwnProperty('spareId')) DCSOA['spareId'] = [];
        if(!DCSOB.hasOwnProperty('spareId')) DCSOB['spareId'] = [];
        
        DCSOA['spareId'].push(spareId);
        DCSOB['spareId'].push(spareId);
    };

    return {
        main: main,
        initiate: initiate,
        receive: receive,
        offer: offer,
        answer: answer,
        candidate: candidate
    }
})();