var chalk = require('chalk');

module.exports = {
	// Private members
	blacklist: [],
	fs: require('fs'),
	blacklistFilename: null,
	endOfLine: require('os').EOL,
        // start of my code added 
        whitelist: ["172.31.32.222", "172.31.20.34", "10.40.7.249" ],
       // end of my added bit 
	blockRequests: function(blacklistFilename) {

		this.blacklistFilename = blacklistFilename;
		this.read();

		this.logEvent('info', 'There are ' + this.blacklist.length + ' address(es) on the blacklist');

                this.logEvent('info', 'There are ' + this.whitelist.length + ' address(es) on the whitelist');

		var self = this;

		var interceptor = function(request, response, next) {
                // look this is terrible practise 
                     if(request.path === "/loadBalancerTest"){
                   // console.log(" it is in the load balancer file !! ! ");

                                 var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
                                 if(!self.isInWhitelist(ip)){
                                     self.addAddressToWhitelist(ip);
console.log("added ip to whitelist : " + ip);
                                 }
                                 next();
                                 return interceptor;
                    }

                       console.log("the request is (in expressblacklist file)  " + request.path);
                       
			var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
                        
                         if(self.ShouldWeAllow(ip)){
                          next();
                          } else {
                          response.status(403).send();
                          }   
		}

		return interceptor;
	},
         // logic to decide if we allow or deny request abstrcated into function so we can call same logic in socket ting
        ShouldWeAllow: function(ip) {
            
           if(this.isInWhitelist(ip)){
                               return true;
                         } else if (this.isInBlacklistThrice(ip)) {   
				return false;
			 } else {
                           return true;
			}
        },

	addAddress: function(ipAddress) {

               //return;// obv just for some testing remove otherwwise
                   
		if (this.isInBlacklistThrice(ipAddress)) {
                        console.log("adding already blocked ip " + ipAddress);
			return false;
		}
                
                if(this.isInWhitelist(ipAddress)){
                       console.log("cannot add whitelisted ip adress :  " + ipAddress);
			return false;
                }

		this.blacklist.push(ipAddress);
		this.persist();

		this.logEvent('warn', 'IP Address added to blacklist: ' + ipAddress);
		return true;
	},

         addAddressToWhitelist: function(ipAddress) {
		this.whitelist.push(ipAddress);
		return true;
	},
        
       

        isInWhitelist: function(ipAddress) {
               for (var i=0; i!=this.whitelist.length; i++) {
			if (this.whitelist[i] == ipAddress) {
				return true;
			}
		}

		return false;
        },
        
        callWarningIfBlacklistedOnce: function(socket) {
             console.log(" callWarningIfBlacklistedOnce ");
             // this asumes they are not blocked since we would never be able to call this on a blocked user
               var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
               var bl = this.isInBlacklist(ip);

               if(bl) { 
console.log("is in blacklist");                       
socket.emit('blacklistedWarning');
                  } else {
          console.log("not in blacklist");
 }
                            
        },

        isInBlacklist: function(ipAddress) {
               // var count = 0;
		for (var i=0; i!=this.blacklist.length; i++) {
			if (this.blacklist[i] == ipAddress) {
				return true;
			}
                       		}

		return false;
	},

	isInBlacklistThrice: function(ipAddress) {
                var count = 0;
		for (var i=0; i!=this.blacklist.length; i++) {
			if (this.blacklist[i] == ipAddress) {
				count++;
			}
                        if(count === 3){
                              return true;
                        }
		}

		return false;
	},

	read: function() {
		try {
			this.blacklist = this.fs.readFileSync(this.blacklistFilename)
				.toString()
				.split(this.endOfLine)
				.filter(function(row) {
					return row != ''
				});
		}
		catch (error) {
			if (error.code == 'ENOENT') {
				this.blacklist = [];
				this.persist();
				this.logEvent('info', 'Blacklist file created: ' + this.blacklistFilename);
			}
		}
	},

	persist: function() {
		var self = this;
		var file = this.fs.createWriteStream(this.blacklistFilename);

		file.on('error', function(err) { 
			this.logEvent('warn', 'Unable to persist blacklist file: ' + err);
		});
		
		this.blacklist.forEach(function(ipAddress) { 
			file.write(ipAddress + self.endOfLine); 
		});

		file.end();
	},
        
        
        

	// type: info|warn
	logEvent: function(type, message) {
		var msg = type == 'info' ? chalk.green('[express-blacklist] ') : chalk.red('[express-blacklist] ');
		msg += message;

		console.log(msg);
	}
}
