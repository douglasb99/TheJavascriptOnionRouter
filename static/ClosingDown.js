/*  
 * essentially static methods so they hold zero state
 * 
 * logic for consumer closing down intentionally ie 
 * 
*shutting down main path is useful because it stops all agorithms and computing power to keep rerouting.
*we leave  spares dangling since to shut them down or create an ability to from live paths creates permissions issue so best to
*. paths that are not declared latent will be shut by that nodes own garbage collecting
* functionality ( not language native garbage collection but part of network ) where by a node will prune unused nodes when 
*  needed. This allows for their management without creating more permissions ie to shut spares. Main path relays and pseudoExits
*  need shutting since they are control centers and otherwise dead path will keep rerouting and creating new connections which
*  is wasteful.  
 * 
 * 
 */
"use strict";

var ClosingDown = (function() {
    

   
    /*
     * to be called by consumer to test if connection is still open.
     * sets the timeout that decides to check if the connection is still open. currently set at 2 second test 
     */
    function closeSelfConsumer(connectionId = null){
       
       if(connectionId !== null){
         var DCSO = Queries.fetchDCSOByConnectionId(connectionId);
       } else {
       var DCSO =  Queries.fetchConsumerDCSO();
       }
       // lets start by not bothering to inform the rest of the network. maybe we ought to be be honest since otherwise will fuck the network.
       sendConsumerClosingMessage(DCSO);   
    };
    
    /*
     * this sends initial closign message by 
     * @param {type} DC
     * @returns {undefined}
     */
    function sendConsumerClosingMessage(DCSO){
        console.assert(DCSO.role === "consumer", " should be consumer only closing up channel");  
        DCSO.dataChannel.send(JSON.stringify({id: 'ConsumerClosingMessage'}));   
    }
    
    /*
     * verify that the message is from consumer will be done from onion stuff ie if can decrypt must be
     */
    function onClosingMessage(DC){
    var DCSO = Queries.fetchDCSOByDC(DC);
    console.log("onClosingMessage");
    if(DCSO.role !== "relay" && DC.role !== "pseudoExit"){
     console.warn('only closing messages should be from relay or pseudoExit but came from role '
                  + DCSO.role + "+ conId: " + DCSO.connectionID);
     return;
    }   
    Queries.closeDCSO(DCSO);
}

    
    // private
 
    
    

    return {
        closeSelfConsumer: closeSelfConsumer,
        onClosingMessage: onClosingMessage
    };
})();