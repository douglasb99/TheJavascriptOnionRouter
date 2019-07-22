/*  
 * singleton with static methiods which hold zero state
 * 
 * 
 * NOTE::: I have removed "inner" search innerhtml modifications ( 2/2 total )
 */
"use strict";

var P2PChannelNegotiation = (function() {
    
// position can be null if mesh connetion only at this stage  
// spare gets this
function initiate(connectionId, edgeId, role,  DC, addSpareFlag, facing, key, meshingKey, AESKey, position = null){
    
     if(role == "GivenHider") {
        // alert("this is the initiate of the reroutin algo");
        // 
        // delete if wrong
        document.title = "HIDER";
     }
    
    console.assert(position !== null || role === "meshSpare" || role === "unusedSpare" || role === "pseudoExitSpare", "needs position which is null");
    console.assert(arguments.length === 10 , "10 args required");
    console.info("INITIATE P2PChannelNegotiation with role " + role);
      console.log("connectionId: " + connectionId);
     var DCSO = Queries.fetchDCSOByDC(DC);
     // could be seperate function called from message handler
     
      if(role === "consumer"){
        console.error(' cannot create consumer here');
        return;
    }
     
      if(role === "spare"){
         // debugger;
          if(!Queries.hasPermissions(key, DCSO.connectionId, "addNewSpare")){
              console.error(' tried to initiate a spare without correct key' + key);
              return;
          }
          
      }
        
    function sendOffer(offer)
     {
      DC.send(JSON.stringify({id: 'forwardOffer', 
                        connectionId: connectionId, 
                        offer: offer,
                        clientId: window.clientId
                        }));
     }; 
     
   //  console.assert(role !== 'pseudoExit', 'role pseudoExit used  therefore add method to create pseudoexit id ');
     
      var params = new Array(DC, connectionId);
      
     function sendIceCandidate(params, candidate, self){
         console.log('SENDING CANDIDATE ' + params.length);
                var message = {};
                message.id = "forwardCandidate";
                message.connectionId = params[1];
                message.candidate = candidate;
                var DaC = params[0];
                DaC.send(JSON.stringify(message));
            };
        // all bound functions have BF in variable name    
        var IceCandidateCBBF = sendIceCandidate.bind(null, params);
    
    
   var ExistsOrNotTest = Queries.fetchDCSOByConnectionId(connectionId);
   
   if(typeof ExistsOrNotTest !== "undefined"){
         
          DC.send(JSON.stringify({id: 'ExistsAlreadyRejection', 
                        connectionId: connectionId, 
                        role: role
                        }));
           return;
     }
    
    var dataChannel = new DataChannel (IceCandidateCBBF, fileBufferReader, null, connectionId, role);
    
             if(role === "unusedSpare" || DCSO.role === "unusedSpare"){
      console.error("NOT ERROR JUST SHOWING THIS THING WAS HTHE ERROR IN INIT");
  } else {
            
        Groups.linkUnknowns(connectionId, DCSO.connectionId);
    }
        //debugger;
        if(AESKey !== null) {
            var msgTesting = "line 82 in p2p neg  and role : " + role;
            Groups.associateKey(connectionId, AESKey, msgTesting);
        }
    
    dataChannel.addOnDCOpen(function(){
        console.log('COMREADY from p2pchan neg init ' + this.self.connectionId);
        console.count('COMREADY');
        var DCSOForTesting = Queries.fetchDCSOByConnectionId(this.self.connectionId);
       // document.getElementById('log').innerHTML += '<br>COMREADY :  ' + DCSOForTesting.role + " " + this.self.connectionId;
 
        //debugger;
        if(meshingKey !== null) {   
            //console.assert(facing !== null, "this is just as auumption more than rule at the moment");
           // console.log('sending sendMeshingNextCheckMessage message and facing : ' + facing);
            Meshing.sendMeshingNextCheckMessage(DCSO, meshingKey, facing);
        }         
    });

    // initiate will be called in the new spare we will transform into the pseudoExit
      if(role == "GivenHider"){
             dataChannel.addOnDCOpen(function(){
             console.log("givenHider spare opened");
              
            
             });
        }

    dataChannel.initiate(sendOffer);
    //'P2PSpare'
  //  var pseudoExitId = (role === "pseudoExit") ? UUID.generate() : null;
    var dataChannelObj = Queries.createDCSO(dataChannel, connectionId, role, edgeId, facing);
    //
    Groups.associatePosition(connectionId, position);
    
    // used to get small triangle of big 
    dataChannelObj['originatorConId'] = DC.connectionId;
    
    //var DCSO = Queries.fetchDCSOByDC(DC);
    
    // surely these are added onopen? 
    //if(addMeshingSpareId) addMeshingSpareConnectionId(DCSO, dataChannelObj);
    
    window.DataChannels.push(dataChannelObj);
};

// if we add meshing spare currently this flag also means we add mesh spares to channel!!
// if this is 

// key param which defaults to null is used in hider when we pass it to associate the new connection with the 


function receive(connectionId, role, DC, addSpareFlag, facing, hider, key = null){
  //  console.assert(addSpareFlag === true, "dfdfgd");
  //console.assert(arguments.length === 5 , "five args required");
    /*
     * NEED TO ADD CHECK FOR ROLE NOT BEING SPARE WITHOUTKEY!!
     */
    //if(role == "Hider") debugger;
    
     console.info("RECEIVE P2PChannelNegotiation with role " + role);
       console.log("connectionId: " + connectionId);
    var params = new Array(DC, connectionId);
    
     if(role === "consumer"){
        console.error(' cannot create consumer here');
        return;
    }
    
    // does it really? since doesnt seem to pass it. 
     if(hider === true){
         console.assert(hider === true, "hider should be trrue since bool" )
                  if(key === null) console.error("expects both passed and hider is " + hider);
                  else if(key.length > 3){
                      alert("delete once observed: 154 p2pneg");
                  }
     } else if(hider !== null){
          console.error("HMMMMM HMMMM" + hider + " and key " + key);
          debugger;
         
         
     }
    
       // not dsco just created obviously
   var DCSO = Queries.fetchDCSOByDC(DC);
    
    function sendIceCandidate(params, candidate, self){
            console.log('SENDING CANDIDATE ' + params.length);
                var message = {};
                message.id = "forwardCandidate";
                message.connectionId = params[1];
                message.candidate = candidate;
                var DaC = params[0];
                DaC.send(JSON.stringify(message));
            };
  
  //var pseudoExitId = (role === "pseudoExit") ? UUID.generate() : null;
  //debugger;
        // all bound functions have BF in variable name    
        
        // test if it already exists we don't go further!!
           var ExistsOrNotTest = Queries.fetchDCSOByConnectionId(connectionId);
   
   if(typeof ExistsOrNotTest !== "undefined"){
         
          DC.send(JSON.stringify({id: 'ExistsAlreadyRejection', 
                        connectionId: connectionId, 
                        role: role
                        }));
           return;
     }
        
        
  var IceCandidateCBBF = sendIceCandidate.bind(null, params); 
  
  
  var dataChannel = new DataChannel (IceCandidateCBBF, fileBufferReader, null, connectionId, role);
  
  
  // var D = Queries.fetchDCSOByConnectionId(connectionId);
  
  if(role === "unusedSpare" || DCSO.role === "unusedSpare"){
      console.error("NOT ERROR JUST SHOWING THIS THING WAS HTHE ERROR");
  } else { 
  Groups.linkUnknowns(connectionId, DCSO.connectionId);
     }
  
  dataChannel.addOnDCOpen(function(){ 
      console.log('COMREADY from p2pchan neg recev ' + this.self.connectionId);
     
        var DCSOForTesting = Queries.fetchDCSOByConnectionId(this.self.connectionId);
       // document.getElementById('log').innerHTML += '<br>COMREADY :  ' + DCSOForTesting.role + " " + this.self.connectionId;
    
      console.count('COMREADY');
      
      // lets only add the closer when it opens
      //this.self.addOnClose(Closing.startReroutingAlgorithm);
  }); 
  
  // this should be in pseudoExit
  if(role == "Hider"){
      alert("WHY IS THIS IN P2p BEING TRIGGERED!!");
      console.error("hider removed why is this being triggered!!");
      //  alert("we did this ting 177 p2p");
      console.info("THIS SHOULD BE IN PSEUDOEXIT");
      dataChannel.addOnDCOpen(function(){ 
       // new channel acts as ligand
        var DCSOLigand = Queries.fetchDCSOByConnectionId(this.self.connectionId);
        console.assert(key.length > 4, "expect a key at this juncture");
        var row = Queries.getRowAssociatedWithKey(key, DCSO.connectionId);

        Groups.linkUnknowns(this.self.connectionId, row.conIdFromGroup);
        //row.conIdFromGroup;
        
        var group = Groups.getGroup(row.connectionId);
        // THIS DOESNT JUST FETCH THE PSEUDOEXIT IT FUCKING WELL DOES A LOT OF STUFF!!!
        //var DCSOGroup = Groups.fetchDCSOByConnectionIdGroupFacingAndAcceptableRoles(this.self.connectionId, "pseudoExit", ["pseudoExit"]);
        var PseudoExitDCSO = Queries.fetchAssociatedPseudoExitNode(group);
         // debugger;
          //debugger;
          //debugger;
        // so the hider should be the Signaller 
        Signalling.pseudoConnect(PseudoExitDCSO, DCSOLigand, true);
  }); 
  
  // the flag hider is in the signaller2 or position 2 and will be used to tell the channel to close this channel and also to change 
  // the role of the other.    
  }
  
  // this is seperate to the above one and is the result of the signalling pseudoconnect and is called in the pseudoexit
  // I think 
  if(hider === true){
    //  alert("THE ONE WE WANT!!!");
      console.info("Hider with conid " + connectionId);
    //console.log("THIS IS CALLED IN THE PSEUDOEXIT AND REPRESENTS THE NEXT PART OF THE HIDER ALGORITHM WHERE connect is called !!");
    // now at this stage we ought to change this one over to being the data channel
    // how do we remove the pseudoExits oncloser?
    // lets get it working to this point ok. 
    dataChannel.addOnDCOpen(function(){
        // alert("HIDER OPENING");
      
    /// debugger;
    // debugger;
    // debugger;
            //Hider.SwitchOverToNewPseudoExit(this.self.connectionId, DCSO);
  Hider.controllerOfHiderFinalSwitchOver(this.self.connectionId, DCSO);
        

    });
  
    
  }
    
    if(hider && (role === "relay")){
       // debugger;
        var position = "second";
    } else {
        var position = null;
    }
    
  var dataChannelObj = Queries.createDCSO(dataChannel, connectionId, role, null, facing, position);

  if(addSpareFlag) addSpareIds(DCSO, dataChannelObj);
  
  window.DataChannels.push(dataChannelObj); 
  
  // this is the issue. HMMM SHOULD THIS BE REMOVED FROM CHANNELS ONCE THEY ARE NO LONGER P2P BUT PATH NODES??? 
  if(dataChannelObj.role === "P2PSpare" && facing === "consumer"){
      console.log("added P2PClosingSoReplace function to conId " + connectionId);
      dataChannelObj.dataChannel.addOnClose(Closing.P2PClosingSoReplace);
  }    
};


function offer(offer, connectionId, DC, clientId){
    console.log("p2p offer offer recieved: " + offer); 
      console.log("connectionId: " + connectionId);
      
          function sendAnswer(answer){
                                      DC.send(JSON.stringify({id: 'forwardAnswer', 
                        connectionId: connectionId, 
                        answer: answer,
                    clientId: window.clientId }));
            }; 
            
          
    //var sendOfferBF = sendOffer.bind(null
          //var sendAnswerBF = sendAnswer.bind(null, DC, connectionId, edgeId);
          var DCSO = Queries.fetchDCSOByConnectionId(connectionId);
          console.assert(typeof DCSO !== "undefined", " fetchByDCSO in queiries didnt find dcso with conid " + connectionId);

          DCSO.dataChannel.offer(offer, clientId, sendAnswer); 
        
};


function answer(answer, connectionId, clientId){
    console.assert(arguments.length === 3, " requires 3 args at this point we have only: " + arguments.length);
    console.log("answer in P2PChannelNegotiation"); 
      console.log("connectionId: " + connectionId);
    var P2PDC = Queries.fetchDCSOByConnectionId(connectionId);
    P2PDC.dataChannel.answer(answer, clientId);
    };


function candidate(candidate, connectionId){
    console.log("candidate in P2PChannelNegotiation");
     console.log("connectionId: " + connectionId);
     var P2PDC = Queries.fetchDCSOByConnectionId(connectionId)
     P2PDC.dataChannel.addICECandidate(candidate, connectionId);
};

// change spares to array to stop overwriting other spare ids. 

/*
 *  
 * currently a channel may have multiple spares
 * 
 * BUT a spare channel (spare for routing requests ) may only be spare for one 
 * channel
 * 
 * ***** IN REFACTOR CHANGE TO USE CONNECTIONID OF OTHER SPARE. FAR FUCKING EASIER. AS WITH MESHID *******!!!!
 */
function addSpareIds(DCSOA, DCSOB){
    console.assert(arguments.length === 2, 'incorrect number of arguments to addspareid');
    
         var spareId = UUID.generate();
        
        if(!DCSOA.hasOwnProperty('spareId')) DCSOA['spareId'] = [];
        if(!DCSOB.hasOwnProperty('spareId')) DCSOB['spareId'] = [];
        
        
        DCSOA['spareId'].push(spareId);
        DCSOB['spareId'].push(spareId);
    };


    
    

   
/*
 * called in last part of rerouting algoriuthm where we reconect spares to new relay in route. 
 */
/*
function removeFormerSameEdge(edgeId, facing){
    
    debugger;
       var done = false;     
              for(var i = 0; i < window.DataChannels.length; i++)
              {                  
                  if(window.DataChannels[i]['role'] === "P2PSpare" 
                      && window.DataChannels[i]['edgeId'] === edgeId 
                      && window.DataChannels[i]['facing'] === facing) 
                  {
                      Queries.closeDCSO(window.DataChannels[i]);
                     done = true;
                  }
              }
        console.error(done === true, "surely should be one to delete error");
       return;

};*/

    return {
        initiate: initiate,
        receive: receive,
        offer: offer,
        answer: answer,
        candidate: candidate
    }
})();