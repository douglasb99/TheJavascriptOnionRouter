/*  
 * essentially static methods so they hold zero state
 * 
 * 
 * This is used for a user to periodically test if their route or chain is still active.
 * We send a messge down to the end of the channel, which an exit node realises is a test and returns. 
 * 
 * We send a unique key which we save in our datastore, and upon the return of it rmeove it. We bind a timeout to
 * test if the key still exists, and if it does the test is failed. 
 * 
 * 
 */
"use strict";

var CloseTest = (function() {
    
    /* time to allow before checking if message has returned when checking if connection is still alive
    *if we do not get message back in this time period the connection is assumed dead
    */
    const MAXDELAY = 5000;
   
    /*
     * Main logic of the module
     * Called by consumer to test if connection is still open.
     *  sets the timeout that decides to check if the connection is still open. currently set at MAXDELAY milliseconds
     */
    function checkConnection(DCSO){
        var DC = Queries.fetchDCByRole('consumer');
        var key = UUID.generate();    
        window.permissionKeysSent.insert({"key": key,
                                  "connectionId": DCSO.connectionId,
                                  "action": "closeTest"});
         DCSO.dataChannel.send(JSON.stringify({id: 'testMessage', key: key}));
         setTimeout(didItReturnCheck.bind(null, key, DCSO.connectionId), MAXDELAY);   
    };
    
    // called after delay period. if the key has not been removed it means that the 
    // message didnt return in the specified period.

    function didItReturnCheck(key, connectionId){
        // permissions key should be removed if processRely called;
         if(Queries.hasPermissions(key, connectionId, "closeTest")){
             console.info('didItReturnCheck checked and found that channel is CLOSED  with conid' + connectionId);
         } else {
             console.info('didItReturnCheck checked and found channel is OPEN with conid' + connectionId);  
         }
    };
    
    /*
     * we get it back, with the key. this is the return of the message that we sent. 
     * we check it was a message sent with permissions and if true then we delete. 
     */
    function processReply(key, DC){
          var DCSO = Queries.fetchDCSOByDC(DC);
          if(!Queries.hasPermissions(key, DCSO.connectionId, "closeTest")){
              console.log('doesnt have permissions');
              return;
          }
          
          window.permissionKeysSent({"key": key,
                                  "connectionId": DCSO.connectionId,
                                  "action": "closeTest"}).remove();     
    }
    
    /*
     * to minimize jamming attacks this one should check. 
     */
    function CloseMessage(){
        // should each message key sent as a thing. so message also should have a key means that  for each message then you get
        // a key. ok lets do that after this thing gets working. but still requires. still means that we can gossip the message.
    }

    return {
        checkConnection: checkConnection,
        processReply: processReply  
    }
})();