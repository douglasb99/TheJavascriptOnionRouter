
/*  
 * 
 * This has the basic encryption and decryption methods for single encryption/decryption using 
 * webcrypto and AES. The encryption and decryption is used to wrap/unwrap the messages sent through the onion network.
 * 
*The cryptography methods module which uses this then chain then to multiplee encrypt/decrypt as is done with onion routing
**/

var Cryptography = (function() {

/**
*This method was for testing but has been left in the code. It tests that we can turn a blob into a file 
*with satifactory properties to encrypt. 
*
**/
function testBlobVsFileBsBug(){
    
         function blobToFile(theBlob, fileName){
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
}
    
        var myBlob = new Blob([concatentated_string], {type : "text/plain"});
     var keys = [
"794c1a77bf8c952976782d52b924d63c",
"c20b7e6eeecbe010f432323ad7427608",
"245236d4482f3599010860b449e1d199"];

encrypt(myBlob, cbDecrypt, keys[0], false, true);
}


/**
*So before encrypting we constatenate various bits of data as a string.
*We use a custom seperator to do this with. Unsure if this is optimimum but that is how it is done. 
*/
function concatFNAndStrn(url, contentType, requestId, stringToEncrypt, imageData = null, extraText = null){
    if(imageData !== null && contentType === "html") console.error("error here");
    if(imageData === null && contentType === "dataURL") console.error("image needs dataURL");
   
    var acceptableContentTypes = ["html", "dataURL", "background", "css-background", "css"];
        
        if(acceptableContentTypes.indexOf(contentType) === -1){
            console.error("unnacceptable content type : " + contentType);
            return;
        }
        
         const SEPERATOR = "<<X!!SEPERATOR!!X>>";
         // or maybe just remove any instances of this rather than throw error
         console.assert(url === null || url.indexOf(SEPERATOR) === -1, "very bad character shouldnt be in there really!!!");
         
    return url + SEPERATOR + contentType + SEPERATOR + requestId + SEPERATOR + imageData + SEPERATOR + stringToEncrypt + SEPERATOR + extraText; 
     };


/**
*when decrypting a blob is returned. This method turns the blob into a base64 string , and then parses to get de-constatenate
*the properties which were constatenated together. If the result is as a string thne we can directly call the extracateFNFromString
*instead of this method
*/
function extracateFNFFROMBLOB(decryptedBlob, successCBWithTwoParams){    
      // if this works make a blobToString() function for future usage
       blobToBase64(decryptedBlob, function(base64Strn){
                        var decodedData = window.atob(base64Strn);
                         var ret = extracateFNFromString(decodedData);
                         successCBWithTwoParams(ret);
                    });
}

/**
*So before encrypting we constatenate various bits of data as a string. 
*This method is the inverse and when decrypted we then split by the custom seperator to get back 
*out the various properties we had constatenated together, encrypted and presumably sent. 
*
*@return {Object} with each of the parts of the decrypted string forming the properties. 
*/
function extracateFNFromString(decryptedString){

         const SEPERATOR = "<<X!!SEPERATOR!!X>>";
         var arr = decryptedString.split(SEPERATOR);
         
         var len = SEPERATOR.length + SEPERATOR.length + SEPERATOR.length  + SEPERATOR.length + SEPERATOR.length;
         len = len + arr[1].length + arr[2].length + arr[3].length + arr[4].length;
         var decryptedString = decryptedString.substring(decryptedString.indexOf(SEPERATOR)+len);
         var ret = {};
        
         ret["url"]= arr[0]; 
         ret["contentType"] = arr[1];
         ret["reqID"] = arr[2];
         ret["imageData"] = arr[3];
         ret["extraText"] = decryptedString;
         ret["content"] = arr[4];
         return ret;
     };

/**
* I have left in functions used to test the encryption/decryption when developing. 
*
*/
function testEncryptionOfBlobManyTimes(){
    var stringToEncrypt = "This is my blob content";
    var url = "this is the test url";
    var requestId = 0123456789; 
    var imageData = null;
    
    var concatentated_string = concatFNAndStrn(url, "html", requestId, stringToEncrypt, imageData);
    
    var myBlob = new Blob([concatentated_string], {type : "text/plain"});
     var keys = [
"794c1a77bf8c952976782d52b924d63c",
"c20b7e6eeecbe010f432323ad7427608",
"245236d4482f3599010860b449e1d199"];


encrypt(myBlob, cbDecrypt, keys[0], false, true);

function cbDecrypt(encryptedString){
    decrypt(encryptedString, prind, keys[0], true, false);
    
    function prind(blob){
       var extracated = extracateFNFFROMBLOB(blob, function(result){ 
                                             debugger; 
                                              });
    }
}
    
}


/**
*Main AES encryption method that takes a string or blob (depending on FlagifString parameter) and
*passes encrypted (using 16byte hex key) data as blob to callback parameter asyncronously. 
*
**@param{blob OR string} stringToEncrypt poorly named parameter either blob or string depending on FlagIfItIsString. 
*@param{function} callback result passed into this callback as sole param when complete successfully. 
*@param{string} keyHex (aes key) requires a 16 byte hexstring
*@param{boolean} FlagIfItIsString if trie it is string else it is blob
*@param{boolean} stringParamInCallbackFlag if true result is passed to callback as a base 64 string, else it is passed as blob
*                note: blob always refers to blob as per javascripts file api. 
*/
 function encrypt(stringToEncrypt, callBack, keyHex, FlagIfItIsString = true, stringParamInCallbackFlag = false){
     var aesKeyBytes = hexStringToByteArray(keyHex);
     var aesKey;
     window.crypto.subtle.importKey(
            "raw",
            aesKeyBytes,
            {name: "AES-CBC", length: 128},
            true,
            ["encrypt", "decrypt"]
        ).
        then(function(importedKey) {
            aesKey = importedKey;
            
            if(!FlagIfItIsString)
            {
                // it is blob
                var arrayBuffer;
                var fileReaderN = new FileReader();
                fileReaderN.onload = function() {
                arrayBuffer = this.result;
                internalFunkEncrypt(arrayBuffer, aesKey, stringParamInCallbackFlag, stringToEncrypt);
                };
            fileReaderN.readAsArrayBuffer(stringToEncrypt);
            } 
            else {
            var arrBuffer = stringToArrayBuffer(stringToEncrypt);
            internalFunkEncrypt(arrBuffer, aesKey, stringParamInCallbackFlag, stringToEncrypt);
            }
        }).
        catch(function(err) {
            alert("Key import and file read failed: " + err.message);
        });
        
        function internalFunkEncrypt(arrBuffer, aesKey, stringParamInCallbackFlag, stringToEncrypt){
            var iv = window.crypto.getRandomValues(new Uint8Array(16));
                
              window.crypto.subtle.encrypt(
                {name: "AES-CBC", iv: iv},
                aesKey,
                arrBuffer
            ).
            then(function(result) {        
                var blob = new Blob([iv, new Uint8Array(result)], {type: "application/octet-stream"});
                
                if(stringParamInCallbackFlag){    
                    blobToBase64(blob, callBack);  
                    }
                     else {
                    callBack(blob);
                }
            }).
            catch(function(err) {
                debugger;
                alert("Encryption failed: " + err.message);
            });            
        }    
 };
  
/**
* Asyncronously decrypts param Blob22 using AES-CBC and passes result to callback as sole param. 
*
*@param{blob OR string} blob22 poorly named parameter either blob or string depending on FlagIfItIsString. 
*@param{function} callback 
*@param{string} keyHex aes key in 16byte hexstring
*@param{boolean} FlagIfItIsString if trie it is string else it is blob
*@param{boolean} FlagIfPassCBString if true result is passed to callback as a base 64 string, else it is passed as blob
*                note: blob always refers to blob as per javascripts file api. 
*/
     function decrypt(blob22, callback, keyHex, FlagIfItIsString = false, FlagIfPassCBString = false) {
         if(FlagIfItIsString){
            //  blob param is  a string so lets make it into blob
           blob22 = base64toBlob(blob22, "application/octet-stream");
         }
         
        var aesKeyBytes = hexStringToByteArray(keyHex);
        var aesKey; 
        var reader = new FileReader();

        reader.onload = function() {
            var iv = new Uint8Array(reader.result.slice(0, 16));
            window.crypto.subtle.decrypt(
                {name: "AES-CBC", iv: iv},
                aesKey,
                new Uint8Array(reader.result.slice(16))
            ).
            then(function(result) { 
                 var blob = new Blob([new Uint8Array(result)], {type: "application/octet-stream"}); 
                 if(FlagIfPassCBString)
                 {
                    blobToBase64(blob, function(base64Strn){
                        var decodedData = window.atob(base64Strn);
                        callback(decodedData);
                    });
                 } 
                 else 
                 {
                     callback(blob);
                 }
            }).
            catch(function(err) {
                alert("Decryption failed: " + err.message);
            });
        };

        // import key, and trigger file reader when ready
        window.crypto.subtle.importKey(
            "raw",
            aesKeyBytes,
            {name: "AES-CBC", length: 128},
            true,
            ["encrypt", "decrypt"]
        ).
        then(function(importedKey) {
            aesKey = importedKey;
            reader.readAsArrayBuffer(blob22);
        }).
        catch(function(err) {
            alert("Key import and file read failed: " + err.message);
        });
    };

  
  
  
/**
*NOTE: reference needed. Copied from StackOverflow. 
*
*/
function stringToArrayBuffer(str){
    if(/[\u0080-\uffff]/.test(str)){
        var arr = new Array(str.length);
        for(var i=0, j=0, len=str.length; i<len; ++i){
            var cc = str.charCodeAt(i);
            if(cc < 128){
                arr[j++] = cc;
            }else{
                if(cc < 2048){
                    arr[j++] = (cc >> 6) | 192;
                }else{
                    arr[j++] = (cc >> 12) | 224;
                    arr[j++] = ((cc >> 6) & 63) | 128;
                }
                arr[j++] = (cc & 63) | 128;
            }
        }
        var byteArray = new Uint8Array(arr);
    }else{
        var byteArray = new Uint8Array(str.length);
        for(var i = str.length; i--; )
            byteArray[i] = str.charCodeAt(i);
    }
    return byteArray.buffer;
};

/**
*NOTE: reference needed. Copied from StackOverflow. 
*
*/
    function hexStringToByteArray(hexString) {
        
        if (hexString.length % 2 !== 0) {
            throw Error("Must have an even number of hex digits to convert to bytes");
        }

        var numBytes = hexString.length / 2;
        var byteArray = new Uint8Array(numBytes);
        for (var i=0; i<numBytes; i++) {
            byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
        }
        return byteArray;
    };
    
   /**
*NOTE: Copied from https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/atob 
*
*/
    function base64toBlob(base64Data, contentType = "application/octet-stream") {
    contentType = contentType || '';
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
};
                

function blobToBase64(blob, cb) {
    var reader = new FileReader();
    reader.onload = function() {
    var dataUrl = reader.result;
    var base64 = dataUrl.split(',')[1];
    cb(base64);
    };
    reader.readAsDataURL(blob);
};

    return {
        testEncryptionOfBlobManyTimes: testEncryptionOfBlobManyTimes,
        encrypt:encrypt,
        decrypt: decrypt,
        base64toBlob: base64toBlob,
        extracateFNFFROMBLOB: extracateFNFFROMBLOB,
        extracateFNFromString: extracateFNFromString,
        concatFNAndStrn: concatFNAndStrn
    }
})();