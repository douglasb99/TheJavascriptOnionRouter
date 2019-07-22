/**
* This module contains the same methods as used in the client side urlutrils file. 
*/

var URI = require('urijs');

exports.validateIPaddress = function(inputText)
  {
    var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    return !!inputText.match(ipformat);
  };

exports.isPathRelative = function(url) {
    var url = url.toUpperCase();
  return (url.length > 2 && ( url.substring(0,4) !== 'HTTP' || url.substring(0,2) == './' || url.indexOf('/') == 0 || url.substring(0,3) == '../') );

};

exports.isURL = function(str) { 
  regexp =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;  
  return (regexp.test(str));        
};

exports.isDataURL = function(str) { 
  var regex =  /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;     
 return str.match(regex);
};

exports.isURLProtocolRelative = function(url)  { return ( url.substring(0,2) === '//'); };

/*
 * converts root relative url to full url using websites baseURL
 * 
 * @param {string} rootRelativeUrl
 * @param {string} baseURL
 * @returns {string} absolute url constructed from root relative url
 */
exports.rootRelativeConvert = function (rootRelativeUrl, baseURL) { return baseURL + rootRelativeUrl.substring(1); };


/* 
 * if relative uri starts with .. then converts relative uri to absolulte found on page currentURL
 * 
 * @param {string} relativeURL relative url which navigates up at least one directory starting with ../  e.g. ../../index.html
 * @param {string} currentURL current url of current webpage
 * @returns {string} absolute url 
 */

function upperLevelDirectoryRelativeUrlToAbsoluteUrl(relativeURL, currentURL){
    // remove file from baseurl to get to current directory
    var uri = new URI(currentURL);
     uri.pathname("");
    var websiteURL = uri.toString();
   var rel = relativeURL.split("/");
   var uri = new URI(currentURL);
   var path = uri.pathname();   
   var arr = path.split("/");
   arr.pop();
        while(rel[0] == '..'){
            if (arr.length === 0) return websiteURL; 
            arr.pop();
            rel.shift();
        }      
       var bit =  arr.join('/');
       if(bit != '') websiteURL = websiteURL + bit + '/';
       var strn =  rel.join('/');
       return websiteURL + strn;
     }; 
        
function relativeUrlstartingWithDirectoryToAbsolute(relative, currentURL) {     
var base = currentURL.split("/");  
if(lastChar !== '/' && path !== '/') base.pop();  
var uri = base.join('/');
var lastChar = currentURL.charAt(currentURL.length - 1);
var uri2 = new URI(currentURL);
var path = uri2.pathname();  
   // if its  not directory and it has a path then it points to file so navigate up
if(lastChar !== '/' && path !== '/') base.pop();  
var lastC = uri.charAt(uri.length - 1);
if (lastC != '/') uri += '/';
return uri + relative;
};

/*
 * converts a relative url starting with ./  to absolute uri based on the current uri of the page. 
 * 
 */

function relativeUrlSameDirToAbsolute(relative, currentURL) { 
    var uri = new URI(currentURL);
    var path = uri.pathname(); 
    var strn = relative.substring(2);
    var uri2 = uri;
    uri2.pathname("");
    var websiteURL = uri.toString();
    return path == "/" ? websiteURL + strn : websiteURL + path.substring(1) + strn;
  };

/*
 * turns protocol relative uri to absolute using protocol param. 
 * 
 * @param {string} protocolRelativeUrl to convert to absolute
 * @param {string} protocol is the protocol of the page the url was on 
 * @returns {String} the absolute url 
 */
exports.protocolRelativeConvert = function(protocolRelativeUrl, protocol) { return protocol + ":" + protocolRelativeUrl; };

/**
* NOTE: not in use. 
*
*/
exports.CompleteUrl = function(str) { 
      var parts = URI.parse(str);
     
     // partial urls get path and not hostname so one for full, else for partial urls
      if(parts.hostname !== null && parts.hasOwnProperty('hostname')){
          var lower = parts['hostname'].toLowerCase();
          if (lower.substring(0,4) === "www." ) parts.hostname = parts['hostname'].substring(4); 
      } else if(parts.path !== null && parts.hasOwnProperty('path')){
           var lower = parts['path'].toLowerCase();
          if (lower.substring(0,4) === "www." ) parts.path = parts['path'].substring(4);  
      }      
    if(parts.protocol === null || !parts.hasOwnProperty('protocol')) parts.protocol = 'http';
    var ret = URI.build(parts);
    var lastC = ret.charAt(ret.length - 1);
    if ( lastC === '/') { 
       ret = ret.substring(0, ret.length - 1); 
    }
    return ret;  
};

/*
	 * takes relative url and current pages uri and converts relative to absolute using 3 helper functions above.
	 * switch statement decides which type of relative uri reative uri is and we then process based on which type. 
	 * 
	 * it works with a lot of wierd strings a browser accepts as a uri such as . and ./ and # and // relative/protocol 
	 * relative/rootrelative uris. 
	 * 
	 */

exports.makeAbsoluteURL = function (currentPageURL, relative) { 
    // remove query string or hash symbol from base url
   currentPageURL = currentPageURL.split(/[?#]/)[0];     
// what type of relative url is it? 
switch (true) {
    // short url only of  ./ or .
    case relative === './' || relative === '.':
        var uri = new URI(currentPageURL);
        var path = uri.pathname();
        var lastChar = currentPageURL.charAt(currentPageURL.length - 1);
        var base = currentPageURL.split("/");  
        if(lastChar !== '/' && path !== '/') base.pop();
        var ret = base.join("/");
        break;
    // protocol relative url
    case relative.substring(0,2) === '//':
        var uri = new URI(currentPageURL);
        var protocol = uri.protocol();
        var ret = protocolRelativeConvert(relative, protocol);    
        break;
   // root relative url
    case relative.charAt(0) == "/":
        var uri = new URI(currentPageURL);
        uri.pathname("");
        //var websiteURL = ;
        var ret =  rootRelativeConvert(relative, uri.toString());
        break;
   // relative going up at least one directory
    case relative.substring(0,2) == '..':
        var ret = upperLevelDirectoryRelativeUrlToAbsoluteUrl(relative, currentPageURL);    
        break;  
  // relative from dir of file
    case relative.substring(0,2) == './':
        var ret = relativeUrlSameDirToAbsolute(relative, currentPageURL);
        break;  
    default:
        var ret = relativeUrlstartingWithDirectoryToAbsolute(relative, currentPageURL);    
        break;      
}

return ret;
}; 