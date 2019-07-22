var LineByLineReader = require('line-by-line');
var fs = require('fs');
var os = require("os");
exports.isIpBlocked = function(ip, cb) {

var lr = new LineByLineReader('blacklist.txt');

lr.on('error', function (err) {
	cb(true);
});

lr.on('line', function (line) {
        if(line === ip) cb(true); 
});

lr.on('end', function () {
        cb(false);
});
};


exports.blockIP = function(ip) { 
     
fs.appendFile('blacklist.txt', ip + os.EOL, function (err) {
  if (err) {
    // append failed
    console.log("FAILED TO WRITE TO FILE IP : " + ip);
  } else {
    // done
     console.log("IP WRITTEN TO FILE : " + ip);
  }
})   
};
