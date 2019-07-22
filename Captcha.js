/**
* Logic for sending and verifying captchas used to check if user is not bot. 
*/

var svgCaptcha = require('svg-captcha');

exports.createSendSVGCaptcha = function(socket, errorFlag)
{
        var captcha = svgCaptcha.create({'size': 5});
        socket['captchaText'] = captcha['text'].toUpperCase();
         socket.emit('captchaSVG', { 'svg': captcha.data,  
                                           'errorFlag' : errorFlag
         });   
        }

exports.verifyCaptcha = function(text, socket, syncCallback){
    
    if(socket['captchaText'].length < 1){
        return;
    }
    
    if(typeof text !== "string" || text.length < 1 || socket['captchaText'] !== text){
        // its not verified. 
        socket['wrongCaptchas'] = socket['wrongCaptchas']  + 1;
        console.log("wrong captcha with capthcha of " + text + "and required of : " + socket['captchaText']);
        var maxWrongCaptchas = 5;
        
        if(socket['wrongCaptchas'] > maxWrongCaptchas) {
            socket.emit("maxAttemptsExceededCaptchas");
            // ADD BLACKLIST AT THIS POINT !!! //
            socket.disconnect(true);
            return; 
        } else {  
        module.exports.createSendSVGCaptcha(socket, true);
        return;
        }  
    } else {
            socket['captchaText'] = ""; 
        // so wen verfied we let them through // 
        // this is connecting business and only done to avoid the issues around scope of the said function
        socket.emit("captchaSVGsuccess");
        syncCallback(socket);
    }   
}