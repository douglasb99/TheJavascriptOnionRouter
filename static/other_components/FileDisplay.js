/*
 * taken from tutorial on fileBufferReader and hardly modified . WILL REFERENCE SOON. Only used for 
 * debugging so i can see easily the status of files being sent will remove from later iterations.  
 */
var FileDisplay = (function() {
    

    var htmlReceived = 0;
    var cssReceived = 0;
    var imageReceived = 0;
    var backgroundReceived = 0;
    var transitTotal = 0;

function onBegin() {
   // debugger;
    transitTotal++; 
    // $("#transitTotal").val(incremented); 
    $("#transitTotal").text(transitTotal);
};
    
function onEnd(id) {
   // debugger;
    var myString = id.substring(1);
    
    if(myString === "imageReceived"){
        imageReceived++;
        $("#imageReceived").text(imageReceived);
        
    }else if(myString === "backgroundReceived"){
        backgroundReceived++;
        $("#backgroundReceived").text(backgroundReceived);
        
    }else if(myString === "htmlReceived"){
        htmlReceived++;
        $("#htmlReceived").text(htmlReceived);      
    }else if(myString === "cssReceived"){
        cssReceived++;
        $("#cssReceived").text(cssReceived);      
    }
    
    /* transit total removed. 
    transitTotal--;
    $("#transitTotal").text(transitTotal);
    */
};   
   

    return {
        onBegin: onBegin,
        onEnd : onEnd
        
    };

})();