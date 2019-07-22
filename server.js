process.env.NODE_ENV = "development";
process.env.PORT = 8000;

if (process.env.NODE_ENV === "development") {
	process.env.PORT = 8000;
} else {
	process.env.PORT = 5000;
}

var http = require('http');
var https = require('https');
var path = require('path');
var async = require('async');

var socketio = require('socket.io')({
	path: '/jor/socket.io'
});
var express = require('express');
var app = express();
var phantom = require('phantom');
const console = require('./myConsole');

console.log("process.env.NODE_ENV");
console.log(process.env.NODE_ENV);

var Captcha = require('./Captcha.js');
var validUrl = require('valid-url');
var fs = require("fs");
var path = require('path');
var URI = require('urijs');
var uuid = require('node-uuid');
var parseuri = require('parseuri');
var urlCore = require('url');
var request = require('request').defaults({
	encoding: null
});
var Type = require('type-of-is');
var URL = require('./utils/URL.js');
var crypto = require('crypto');
var RECAPATCHA_SITEKEY = "6LeU9XcUAAAAAB8moqVJndki35tdMRo9QMPY60gH";
var RECAPATCHA_PRIVATEKEY = "6LeU9XcUAAAAAIBJ4JYnLNtiB5NX6TgBv1uZtu9k";
var DOWEHAVEQUEUEDSOCKETSFLAG = false;

app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs'); // both


if (process.env.NODE_ENV === "development") {
	app.set('views', './static'); // Local
	app.use(express.static('./static')); // Local
} else {
	app.set('views', path.join(__dirname, 'static')); // PROD
	app.use(express.static(path.join(__dirname, 'static'))); // Local
	app.use('/jor', express.static(path.join(__dirname, 'static'))); // PROD
}
var ACOUNTTEST = 0;
var blacklist = require('./express-blacklist');

app.use(blacklist.blockRequests('blacklist.txt'));

var server = http.createServer(app);
var io = socketio.listen(server);

// This is to respond the messages sent by load balancer testing if the application is still running.
app.get('/loadBalancerTest', function (req, res, next) {
	res.sendStatus(200);
});

app.get('/', function (req, res, next) {
	console.log('JORMAIN:: get request for client recieved');
	res.render('client');
});
// This is main request for the application. 
app.get('/jor/', function (req, res, next) {
	console.log('JORMAIN:: get request for client recieved');
	res.render('client');
});

var TestingSpareCountTesting = 0;
var SENTALREADY = false;
var STARTEDTWICE = false;
var STARTEDTHRICE = false;
var STARTED4 = false;
var STARTED5 = false;
var STARTED6 = false;
var STARTED7 = false;

// array of all connected websockets
var sockets = [];
/* groupId is the array index, and the array contains an array of socket refereneces representing a path
 * initially given for a user.
 */
var groups = [];

function DoWeHave2connectionsPerIPAlready(ip) {
	var count = 0;
	for (var i = 0; i < sockets.length; i++) {
		if (sockets[i]['webRTCIP'] === ip) {
			count++;
		}
		if (count == 2) return true;
	}
	return false;
}
// queue of sockets awaiting a path. 
var queue = [];

io.on('connection', function (socket) {
	// start it as false so that we can then if nt false it means the guy has a time stamp to leave
	socket['ts'] = false;
	socket.relays = {};
	socket.relaysExtraData = {};
	socket['wrongCaptchas'] = 0;
	socket['captchaText'] = "";
	// ip address from the webrtc derivation. 
	socket['webRTCIP'];

	socket.on('captchaText', function (text) {
		Captcha.verifyCaptcha(text, socket, connectingBusiness);
	});

	socket.on('soonLeaving', function (MillisecondsSince1970) {
		var ts = Math.round((new Date()).getTime());

		if (!Number.isInteger(MillisecondsSince1970)) {
			console.log("its not an integer");
			socket['ts'] = ts;
			return;
		}
		// we loook to see if user given timestamp is plausible then we use it otherwise we discard it.        
		var diff = MillisecondsSince1970 - ts;
		var absDiff = Math.abs(diff);
		// if its within two seconds we take it 
		if (absDiff > 2000) {
			socket['ts'] = ts;
		} else {
			socket['ts'] = MillisecondsSince1970;
		}
	});

	socket.on('disconnect', function () {
		console.log('disconnection');
		var randSocket;
		// used to associate random sockets with groups. 
		groupRandSockets = {};

		if (typeof socket['webRTCIP'] == "undefined") {
			console.log("ip address was undefined which means that they were disconnected programatically before joining");
			if (sockets.indexOf(socket) == -1) {
				console.log("socket was not found and removed");
				return;
			} else {
				sockets.splice(sockets.indexOf(socket), 1);
				console.log("socket was found and removed");
				return;
			}

		}
		sortOutUnfinishedConnections(socket);

		function sortOutUnfinishedConnections(socket) {
			// see which relays are left
			var arrOfUnfinishedConIds = [];
			var count1 = 0;
			var size = Object.keys(socket['relays']).length;

			console.log(" and first loop size is : " + size);

			for (var property in socket['relays']) {
				if (socket['relays'].hasOwnProperty(property)) {
					count1++;
					arrOfUnfinishedConIds.push(property);
					console.log("conid (first loop ) is : " + property);
				}
			}

			var count2 = 0;
			var count3 = 0;
			var size = Object.keys(socket['relaysExtraData']).length;

			for (var property in socket['relaysExtraData']) {
				if (socket['relaysExtraData'].hasOwnProperty(property)) {
					var timeStamp = socket['relaysExtraData'][property]['ts'];
					var timeStampAndASecond = timeStamp + 100000;
					count2++;
					if (arrOfUnfinishedConIds.includes(property)) {
						console.log(" this one isnt completed " + property);
						count3++;
						var n = Date.now();
						var grupNumber = socket['relaysExtraData'][property]['grupNumber'];

						if (groupRandSockets.hasOwnProperty(grupNumber)) {
							console.log("did have rand socket");
							randSocket = groupRandSockets[grupNumber];
						} else {
							for (var i = 0; i < 10; i++) {
								randSocket = getReplacementSock(grupNumber);
							}
							groupRandSockets[grupNumber] = randSocket;
						}

						if (timeStampAndASecond > n) {
							console.log("and its recently within the time");
							// get the other socket in that wasn't finished. 
							var sock = socket['relays'][property];
							var partnerConnectedFlag = isSocketConnected(sock);
							if (!partnerConnectedFlag) {
								console.log("NOT CONNECTED LOOK HERE!!!");
							} else {
								if (typeof randSocket === "undefined") {
									console.log("rand socket undefined and there are connected sockets " + sockets.length);
								} else {
									// params :: sockToReplace, randSocket, closingSocket, connectionIdToReplace
									ACOUNTTEST++;
									console.log(" calling resend time number  " + ACOUNTTEST);
									console.log();
									resend(sock, randSocket, socket, property, grupNumber);
								}
							}
						}

					} else {
						console.log(" COMPLETED: " + property);
					}

				}

			}
		}

		sockets.splice(sockets.indexOf(socket), 1);

		var t = Math.round((new Date()).getTime());
		var timeRequiredToWaitBeforeDisconnectinginMilliseconds = 5000;
		var earliestAllowedRequestToDisconnectTime = t - timeRequiredToWaitBeforeDisconnectinginMilliseconds;
		if (queue.indexOf(socket) !== -1) queue.splice(queue.indexOf(socket), 1);
		var ip = socket['webRTCIP'];

		if (socket["ts"] === false) {
			console.log("They are leaving without any notice");
			blacklist.addAddress(ip);
		} else if (socket["ts"] > earliestAllowedRequestToDisconnectTime) {
			console.log("They are leaving with too little notice");
			blacklist.addAddress(ip);
		} else {
			console.log("They are leaving correctly");
		}
	});
	count = 0;

	socket.on('lessThan5Mins', function (message) {
		var ip = socket['webRTCIP'];
		blacklist.addAddress(ip);
	});

	socket.on('recaptacha3', function (message) {
		blacklist.addAddress("4444" + message.done);

		if (process.env.NODE_ENV === "development") {
			socket['webRTCIP'] = message.done; // only here for testing
			connectingBusiness(socket);
			return;
		}

		function ShouldWeAllowThemToConnectBasedOnIPRules(ip) {

			if (!URL.validateIPaddress(ip)) {
				console.log("1 ShouldWeAllowThemToConnectBasedOnIPRules: not a  valid IP address : " + ip);
				return false;
			} else if (!blacklist.ShouldWeAllow(ip)) {
				console.log("2 ShouldWeAllowThemToConnectBasedOnIPRules: blacklisted : " + ip);
				return false;
				//return;
			} else if (DoWeHave2connectionsPerIPAlready(ip)) {
				console.log("3 ShouldWeAllowThemToConnectBasedOnIPRules: DoWeHave2connectionsPerIPAlready : " + ip);
				return false;
			} else {
				return true;
			}
		}

		if (!ShouldWeAllowThemToConnectBasedOnIPRules(message.done)) {
			socket.disconnect(true);
			console.log("ShouldWeAllowThemToConnectBasedOnIPRules based on rules we did not let them connect");
			return;
		} else {
			console.log("ShouldWeAllowThemToConnectBasedOnIPRules was passed");
		}

		var secret = RECAPATCHA_PRIVATEKEY;
		var response = message.token;
		request.post({
				url: 'https://www.google.com/recaptcha/api/siteverify',
				form: {
					secret: secret,
					response: response
				}
			},
			function (err, httpResponse, body) {
				console.log("google responded func with err : " + err + "httpResponse : " + httpResponse + " body : " + body);


				if (err !== null) {
					sockets.splice(sockets.indexOf(socket), 1);
					console.log("REJECTED with err in request");
					socket.emit("capatcha failed");
					socket.disconnect(true);
					return;
				}

				var bodyParsed = JSON.parse(body);
				if (bodyParsed.success !== true || bodyParsed.score < .7) {
					sockets.splice(sockets.indexOf(socket), 1);
					console.log("REJECTED with err, success and score as respectively : " + err + " " + bodyParsed['success'] + " " + bodyParsed.score);
					socket.emit("capatcha failed");
					socket.disconnect(true);
					return;
				} else {
					// so we succeded and we then send the captcha ting
					console.log("passed google recaptcha3 so sending captcha");
					Captcha.createSendSVGCaptcha(socket, false);
				}

			})
	});


	/*
	 * client requests path whenever needs one and we heed that and connect it. 
	 */

	function connectingBusiness(socket) {
		reconnectFlag = false;
		/* relays is object acting as associative array e.g. key => value 
		 * containg relays and the id of their connection, and value being reference to their socket object
		 * now it works for not only relays but any socket you are connecting to e.g. signallers and spares
		 */
		// don't repush reconnects
		if (reconnectFlag) console.log('request_path called with reconnectFlag');
		var path, partnersSocket, edgeId, nextEdgeId;


		if (!reconnectFlag) {
			// an unused variable
			var networkStarted = false;

			if (sockets.indexOf(socket) == -1) {
				console.log('socket new therefore pushed');
				sockets.push(socket);
			} else {
				console.log('socket already connected');
			}
			console.log('request_partner');
			console.log(' there are currently ' + sockets.length + ' connected sockets ');


			if (sockets.length > 25) console.log(' more than 25');

			if (sockets.length < 25) {

				if (STARTED7) {
					console.log("started5 WE HAVE IT !!!!!! ");
				}

				console.log('queued socket and sockets length' + sockets.length);
				enqueueSocket(socket);
				return;
			}
		}


		if (DOWEHAVEQUEUEDSOCKETSFLAG) {
			console.log("DOWEHAVEQUEUEDSOCKETSFLAG TRUE");
			startqueuedSockets();
		}

		function startqueuedSockets() {
			console.log("startqueuedSockets called");
			var print2Test = " ";
			for (var i = 0; i < sockets.length; i++) {
				print2Test += "  ";
				print2Test += sockets[i]['queued'];
			}
			console.log("2printTest ::::::: " + print2Test);

			var number = 1000;
			var count = 0;

			for (var i = 0; i < sockets.length; i++) {

				if (count > 5) {
					DOWEHAVEQUEUEDSOCKETSFLAG = false;
					return;
				}


				if (sockets[i]['queued'] === true) {
					console.log("socket number is queued : " + i + " ok ");
					number = number + 7000;
				}
			}
			DOWEHAVEQUEUEDSOCKETSFLAG = false;
		}

		startNetwork(socket);

    /**
    * The main logic to provide the initial set of nodes for a connecting client. Socket is the socket
    * of the connecting client. 
    *
    */
		function startNetwork(socket) {

			dequeueSpecificSocket(socket);
			var grup = [];
			var dequeued = socket;
			grup.push(socket);
			dequeued['keys'] = makeKeys();
			console.log(' the dequeued socket: ' + dequeued);
			var edgesArrsByclient = {};

			var counting = 0;
			// while disabled to make it easier to develop peers as servers for handshakes
			path = findPath(dequeued);
			grup.push(path[0]);
			grup.push(path[1]);
			grup.push(path[2]);

			var edgeIds = createEdgeIds();
			var spareForTesting = getTestingSpare(dequeued, path);
			grup.push(spareForTesting);
			console.log('!!!!! the length of edgeIds is ' + edgeIds.length);

			var grupNumber = groups.length;


			InitiatePath(dequeued, path, edgeIds, grupNumber);
			counting++;
			console.log("while lloops increment number " + counting);
			console.assert(path.length === 3, 'incorrect path length in while in request_partner');

			var pathNode, spareNode;
			var extraSpare = getTestingSpare(dequeued, path, [spareForTesting]);
			grup.push(extraSpare);
			var getSeventhNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare]);
			grup.push(getSeventhNodeAnExtraSpare);
			var getEightNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare]);
			grup.push(getEightNodeAnExtraSpare);
			var getNinthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare]);
			grup.push(getNinthNodeAnExtraSpare);
			var getTenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare]);
			grup.push(getTenthNodeAnExtraSpare);
			var getEleventhNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare]);
			grup.push(getEleventhNodeAnExtraSpare);
			var getTwelfthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare]);
			grup.push(getTwelfthNodeAnExtraSpare);
			var getThirteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare]);
			grup.push(getThirteenthNodeAnExtraSpare);
			var getFourteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare]);
			grup.push(getFourteenthNodeAnExtraSpare);
			var getFifteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare]);
			grup.push(getFifteenthNodeAnExtraSpare);
			var getSixteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare]);
			grup.push(getSixteenthNodeAnExtraSpare);
			var getSeventeenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare]);
			grup.push(getSeventeenthNodeAnExtraSpare);
			var getEighteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare]);
			grup.push(getEighteenthNodeAnExtraSpare);
			var getNinteenthNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare]);
			grup.push(getNinteenthNodeAnExtraSpare);
			var get20thNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare]);
			grup.push(get20thNodeAnExtraSpare);
			var get21ndNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare, get20thNodeAnExtraSpare]);
			grup.push(get21ndNodeAnExtraSpare);
			var get22ndNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare, get20thNodeAnExtraSpare, get21ndNodeAnExtraSpare]);
			grup.push(get22ndNodeAnExtraSpare);
			var get23rdNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare, get20thNodeAnExtraSpare, get21ndNodeAnExtraSpare, get22ndNodeAnExtraSpare]);
			grup.push(get23rdNodeAnExtraSpare);
			var get24thNodeAnExtraSpare = getTestingSpare(dequeued, path, [spareForTesting, extraSpare, getSeventhNodeAnExtraSpare, getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, getSeventeenthNodeAnExtraSpare, getEighteenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare, get20thNodeAnExtraSpare, get21ndNodeAnExtraSpare, get22ndNodeAnExtraSpare, get23rdNodeAnExtraSpare]);
			grup.push(get24thNodeAnExtraSpare);

			var testingExtra = 1;
			var positionOfAjoinedPath1, positionOfAjoinedPath2;
			// seems like this bitis just adding pathspares
			for (var i = 0; i < 2; i++) {
				pathNode = path[0];
				spareNode = spareForTesting;
				positionOfAjoinedPath1 = numberToPosition(i);
				addSpare(pathNode, spareNode, edgeIds[i], testingExtra, positionOfAjoinedPath1, dequeued.keys[0], grupNumber);
				addUnusedSpare(spareNode, extraSpare, grupNumber);
				addUnusedSpare(extraSpare, getSeventhNodeAnExtraSpare, grupNumber);
				// now signaller 1 will get 2 spares and see whats goin on. 
				addSpare(pathNode, getEleventhNodeAnExtraSpare, edgeIds[i], testingExtra, positionOfAjoinedPath1, dequeued.keys[0], grupNumber);
				addUnusedSpare(getEleventhNodeAnExtraSpare, getTwelfthNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getTwelfthNodeAnExtraSpare, getFifteenthNodeAnExtraSpare, grupNumber);
				testingExtra++;
				// so add second spare now 
				positionOfAjoinedPath2 = numberToPosition(1);
				addSpare(path[1], getEightNodeAnExtraSpare, edgeIds[1], testingExtra, positionOfAjoinedPath2, dequeued.keys[1], grupNumber);
				addUnusedSpare(getEightNodeAnExtraSpare, getNinthNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getNinthNodeAnExtraSpare, getTenthNodeAnExtraSpare, grupNumber);
				// now signaller 2 will get a second spare
				addSpare(path[1], getThirteenthNodeAnExtraSpare, edgeIds[1], testingExtra, positionOfAjoinedPath2, dequeued.keys[1], grupNumber);
				addUnusedSpare(getThirteenthNodeAnExtraSpare, getFourteenthNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getFourteenthNodeAnExtraSpare, getSixteenthNodeAnExtraSpare, grupNumber);
				addPseudoExitSpare(path[2], getSeventeenthNodeAnExtraSpare, edgeIds[2], dequeued.keys[2], grupNumber);
				addPseudoExitSpare(path[2], getEighteenthNodeAnExtraSpare, edgeIds[2], dequeued.keys[2], grupNumber);
				addUnusedSpare(path[2], get22ndNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getSeventeenthNodeAnExtraSpare, getNinteenthNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getEighteenthNodeAnExtraSpare, get20thNodeAnExtraSpare, grupNumber);
				addUnusedSpare(getNinteenthNodeAnExtraSpare, get21ndNodeAnExtraSpare, grupNumber);
				addUnusedSpare(get20thNodeAnExtraSpare, get22ndNodeAnExtraSpare, grupNumber);
				addUnusedSpare(path[2], get23rdNodeAnExtraSpare, grupNumber);
				addUnusedSpare(get23rdNodeAnExtraSpare, get24thNodeAnExtraSpare, grupNumber);
				groups.push(grup);
				break;
			}
		};
	};

	/* 
	 * stupidly made position a string e.g. first, or second so need to get this string from number
	 */
	function numberToPosition(number) {
		if (number === 0) {
			return "first";
		} else if (number === 1) {
			return "second";
		} else console.error('func numberToPosition has invalid input param number : ' + number);
	}

	/*
	 * opposite of numbertoposition
	 */
	function positionToNumber(position) {
		console.assert(position === "first" || position === "second", " only accepts positoons first or second currently");

		if (position === "first") {
			return 0;
		} else if (position === "second") {
			return 1;
		} else console.error("error take a loook OUT OF BOUNDS");
	}


	/*
	 *  returns a random socket that is not contained within paramater  grup number
	 */
	function getReplacementSock(grupNumber) {
		console.assert(typeof grupNumber !== "undefined", "group number is undefined");
		var grup = groups[grupNumber];
		var shuffled = shuffle(sockets);
		for (var i = 0; i < shuffled.length; i++) {
			var rand = shuffled[i];
			var i = grup.indexOf(rand);
			if (i == -1) {
				return rand;
			}
		}
		process.exit("didnt find a ran socket");
	}


	function getPseudoExitSpares(consumer, path, spareNode, additionalExclusions = []) {
		var PseudoSpares = [];
		var pseudoCandidate;
		for (var i = 0; i < sockets.length; i++) {
			pseudoCandidate = sockets[i];
			if (pseudoCandidate["ts"] !== false) continue;
			if (consumer === pseudoCandidate) continue;
			if (path.indexOf(pseudoCandidate) !== -1) continue;
			if (pseudoCandidate == spareNode) continue;
			if (PseudoSpares.indexOf(pseudoCandidate) !== -1) continue;
			if (additionalExclusions.indexOf(pseudoCandidate) !== -1) continue;
			PseudoSpares.push(pseudoCandidate);
			if (PseudoSpares.length === 2) return PseudoSpares;
		}

		console.error('didnt find two pseudoExitSpares');

	}
	/*  
	 * additionalExclusions an array of nodes to exclusions
	 */
	function getTestingSpare(consumer, path, additionalExclusions = []) {
		var sock;
		for (var i = 0; i < sockets.length; i++) {
			sock = sockets[i];
			if (consumer === sock) continue;
			if (sock["ts"] !== false) continue;
			if (additionalExclusions.indexOf(sock) !== -1) continue;
			if (path.indexOf(sock) === -1) return sock;
		}
	}

	function addPseudoExitSpare(pseudoExitNode, spareNode, edgeId, key, grupNumber) {
		if (isNaN(grupNumber)) {
			console.log("error line 590 : " + grupNumber);
		}
		var connectionId = uuid.v4();

		if (pseudoExitNode === spareNode) return;


		pseudoExitNode['relays'][connectionId] = spareNode;
		spareNode['relays'][connectionId] = pseudoExitNode;

		var ts = Date.now();

		pseudoExitNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'signallerPseudoExit',
			'edgeId': edgeId
		};
		spareNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': null,
			'role': 'pseudoExitSpare',
			'AESKey': key,
			'facing': 'pseudoExit'
		};

		console.log('addPseudoExitSpare ');

		pseudoExitNode.emit('initiate', {
			'connectionId': connectionId,
			'role': 'signallerPseudoExit',
			'edgeId': edgeId

		});

		spareNode.emit('recieve', {
			'connectionId': connectionId,
			'edgeId': null,
			'role': 'pseudoExitSpare',
			'AESKey': key,
			'facing': 'pseudoExit'
		});


	}

	/*
	 * 
	 * edge id neede in signaller must be same as edge id in that main connection
	 * 
	 * THIS DOESNT ADD A SPARE AT ALL NOTICE THIS IT WAS WRITTEN A LONG TIME AGO AND ACTUALLY ADDS THE SIGNALLERS
	 * 
	 */

	function addSpare(pathNode, spareNode, edgeId, testingExtra = 0, positionOfAjoinedPath, key, grupNumber) {

		if (isNaN(grupNumber)) {
			console.log("error line 615 : " + grupNumber);
		}

		console.assert(arguments.length === 7, " incorrect args num");
		var connectionId = uuid.v4();

		console.assert(positionOfAjoinedPath === "first" || positionOfAjoinedPath === "second", "check if this is ok");

		// at this juncture if its self ie trying to connect to self isnt possible since 
		// no checks then we just block and make message to that effect    
		if (pathNode === spareNode) {
			console.error(' TWO SAME IN ADD SPARE SO DIDNT MAKE THIS CONNECTION');
			return;
		}

		pathNode['relays'][connectionId] = spareNode;
		spareNode['relays'][connectionId] = pathNode;

		var ts = Date.now();

		pathNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'signaller',
			'edgeId': edgeId,
			'testingExtra': testingExtra,
			'position': positionOfAjoinedPath
		};
		spareNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': null,
			'role': 'spare',
			'spareManTesting': true,
			'position': positionOfAjoinedPath,
			'testingExtra': testingExtra,
			'key': key
		};

		pathNode.emit('initiate', {
			'connectionId': connectionId,
			'role': 'signaller',
			'edgeId': edgeId,
			'testingExtra': testingExtra,
			'position': positionOfAjoinedPath
		});
		spareNode.emit('recieve', {
			'connectionId': connectionId,
			'edgeId': null,
			'role': 'spare',
			'spareManTesting': true,
			'position': positionOfAjoinedPath,
			'testingExtra': testingExtra,
			'key': key
		});

	};

	function addUnusedSpare(pathNode, extraSpare, grupNumber) {

		if (isNaN(grupNumber)) {
			console.log("error line 672 : " + grupNumber);
		}

		console.assert(arguments.length === 3, "requires 2 args");
		var connectionId = uuid.v4();

		if (pathNode === extraSpare) {
			console.error(' TWO SAME IN ADD SPARE SO DIDNT MAKE THIS CONNECTION');
			return;
		}

		pathNode['relays'][connectionId] = extraSpare;
		extraSpare['relays'][connectionId] = pathNode;

		var ts = Date.now();

		pathNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'unusedSpare'
		};

		extraSpare['relaysExtraData'][connectionId] = {
			'ts': ts,
			'grupNumber': grupNumber,
			'role': 'unusedSpare',
			'testingValForRole': 'unusedSpare',
			'extraSpareNumber': TestingSpareCountTesting
		};

		pathNode.emit('initiate', {
			'connectionId': connectionId,
			'role': 'unusedSpare'
		});

		TestingSpareCountTesting++;
		console.log("TestingSpareCountTesting: " + TestingSpareCountTesting);
		extraSpare.emit('recieve', {
			'connectionId': connectionId,
			'role': 'unusedSpare',
			'testingValForRole': 'unusedSpare',
			'extraSpareNumber': TestingSpareCountTesting

		});
	};

	function addUnusedSpareNextP2PNode(pathNode, extraSpare, key, grupNumber) {

		if (isNaN(grupNumber)) {
			console.log("error line 721 : " + grupNumber);
		}

		console.log('adding unusedSpare');
		var connectionId = uuid.v4();
		if (pathNode === extraSpare) {
			console.error(' TWO SAME IN ADD SPARE SO DIDNT MAKE THIS CONNECTION');
			return;
		}
		pathNode['relays'][connectionId] = extraSpare;
		extraSpare['relays'][connectionId] = pathNode;

		var ts = Date.now();

		pathNode['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'spare'
		};
		extraSpare['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'spare',
			'testingValForRole': 'extraSpare',
			'extraSpareNumber': TestingSpareCountTesting,
			'nextP2PNode': true
		};

		// path node already has a position
		pathNode.emit('initiate', {
			'connectionId': connectionId,
			'role': 'spare'

		});
		TestingSpareCountTesting++;
		extraSpare.emit('recieve', {
			'connectionId': connectionId,
			'role': 'spare',
			'testingValForRole': 'extraSpare',
			'extraSpareNumber': TestingSpareCountTesting,
			'nextP2PNode': true
		});
	};

	/**  
	 * When a client leaves the network before a connection has been declared open ie when it is 
	 * in the process of being created we must instead remake this connection with a different user. 
	 * 
	 * @param {Socket} sockToReplace The replacement socket which will replace the closing socket
	 * @param {Socket} randSocket Another random socket which fill form part of the path
	 *
	 */
	function resend(sockToReplace, randSocket, closingSocket, connectionIdToReplace) {
		var conId = uuid.v4();
		var extraDataFromSock = sockToReplace['relaysExtraData'][connectionIdToReplace];
		var extraDataClosingData = closingSocket['relaysExtraData'][connectionIdToReplace];
		delete sockToReplace['relays'][connectionIdToReplace];
		extraDataFromSock['connectionId'] = conId;
		extraDataFromSock['replacementConId'] = connectionIdToReplace;
		delete extraDataFromSock['ts'];
		var grupNumber = extraDataFromSock['grupNumber'];
		extraDataFromSock['extraTestParam'] = true;

		if (extraDataFromSock.role === "pseudoExit" || extraDataFromSock.role === "relay") {
			extraDataFromSock['extraTestParam'] = "wassup";
		}

		extraDataClosingData['connectionId'] = conId;
		delete extraDataClosingData['ts'];
		extraDataClosingData['grupNumber'] = grupNumber;
		extraDataClosingData['extraTestParam'] = true;

		if (extraDataClosingData.role === "pseudoExit" || extraDataClosingData.role === "relay") {
			extraDataClosingData['extraTestParam'] = "wassup";
		}
		// we aren't preserving the order of the initator. 
		sockToReplace.emit('initiate', extraDataFromSock);
		randSocket.emit('recieve', extraDataClosingData);

		randSocket['relays'][conId] = sockToReplace;
		sockToReplace['relays'][conId] = randSocket;
		var ts = Date.now();
		delete extraDataFromSock.connectionId;
		extraDataFromSock['ts'] = ts;
		delete extraDataClosingData.connectionId;
		extraDataClosingData['ts'] = ts;
		sockToReplace['relaysExtraData'][conId] = extraDataFromSock;
		randSocket['relaysExtraData'][conId] = extraDataClosingData;
	}

	/**
	 *  finds two sockets at random to be used as spares in initial path of client. 
	 *  
	 *  @param {socket} socket which cannot be returned as spare. 
	 *  @param {array[socket, socket]} sockets which cannot be returned in each position with 
	 *                                 the first not allowed as the first returned socket, and 
	 *                                 the second not allowed as the second returned socket. 
	 *  
	 *  
	 *@return {array} array of two sockets to be used as spares for clients initial 
	 *                set of connections. 
	 */

	function findPathSpares(singleExclusion, positionExclusions) {

		var pathSpares = [],
			rand, socketsCopy;
		while (pathSpares.length < 2) {
			rand = Math.floor(Math.random() * sockets.length);
			var randSocket = sockets[rand];

			if (randSocket === singleExclusion ||
				randSocket === positionExclusions[pathSpares.length] ||
				pathSpares.indexOf(randSocket) !== -1)
				continue;
			if (randSocket["ts"] !== false) continue;
			pathSpares.push(randSocket);
		}
		return pathSpares;
	}


	/*
	 * Gets the nodes to be in the initial path given to newly connecting user. 
	 * 
	 * @param {socket} socket to exclude from path ie consumer. may be self or another depending on call
	 *               
	 * @returns {Array[socket, socket, socket] } of sockets to be in path. 
	 */
	function findPath(socket) {
		var path = [],
			rand, randSocket;

		while (path.length < 3) {
			rand = Math.floor(Math.random() * sockets.length);
			randSocket = sockets[rand];
			// remove comment when stepped through
			if (randSocket["ts"] !== false) continue;
			if (randSocket === socket || path.indexOf(randSocket) !== -1) continue;
			path.push(randSocket);
		}

		return path;
	}
	/*
	 * Forwards SDP offer from sender to reciver. 
	 */
	socket.on('offer', function (offer) {
		var connectionId = offer.connectionId;
		var wock = socket['relays'][connectionId];
		partnerConnected = isSocketConnected(wock);
		if (partnerConnected) {
			var partnersSocket = socket['relays'][connectionId];
			partnersSocket.emit('offer', offer);
		} else {
			console.error('partner has disconnected:  recall partner search ');
		}
	});


	/*
	 * We find out the group number associated with a user (a socket).  
	 */
	function getGroupNumberOfSocket(socket) {
		for (var i = 0; i < groups.length; i++) {
			if (groups[i][0] === socket) return i;
		}

		// essentially lets assume now it doesnt have a group number and instead return something else, as currently running
		// only partial networks without every tab taking every position      
		return false;
	}

	/*
	 * Called when a user wants a new spare connection, and we find a socket that is not 
	 * already connected to the user (at random) and then create the datachannel between the two.
	 * This is typically called when spares leave and are not replaced, and the number of spares runs low.  
	 */
	socket.on('newSpare', function () {
		// TODO: add rate limiting
		var grupNumber = getGroupNumberOfSocket(socket);
		var spare = getTestingSpare(socket, [], []);
		addUnusedSpare(socket, spare, grupNumber);
	});


	/*
	 * Forwards the sdp answer. Recieves from client, finds the connectionid and uses 
	 *that to route the answer to the correct socket. 
	 */
	socket.on('answer', function (answer) {
		var connectionId = answer.connectionId;

		if (typeof (socket['relays'][connectionId]) !== 'undefined') {
			var partnersSocket = socket['relays'][connectionId];
			partnersSocket.emit('answer', answer);
		} else {
			console.error('couldnt find answerers socket');
		}
	});

	/*
	 * Forwards the sdp ICE Candidate. 
	 * Same principle as with other parts of SIP eg SDP offer/answer
	 */
	socket.on('candidate', function (message) {
		if (typeof message.candidate == null) {
			console.log("null candidate recieved!");
		}

		var partnersSocket = socket['relays'][message.connectionId];
		partnerConnected = isSocketConnected(partnersSocket);

		if (partnerConnected) {
			partnersSocket.emit('candidate', message);
		}
	});

	/*
	 * Handles Message sent when the webrtc peerconnection opens in client, and deletes information used to forward handshake
	 * information since no longer needed. 
	 */
	socket.on('complete', function (connectionId) {
		delete socket['relays'][connectionId];
	});

	/*
	 * makes all the 16 byte keys for users the path and returns as an array. 
	 * order is preserved and important with the order corresponding to the order
	 * of keys used in the onion network. 
	 */

	function makeKeys() {
		keys = [];
		keys[0] = generateKey();
		keys[1] = generateKey();
		keys[2] = generateKey();
		return keys;
	}
	/**        
	 * Generates 16 byte key for AES 
	 */
	function generateKey() {
		const buf = crypto.randomBytes(16);
		return buf.toString('hex');
	}

	/*
	 * correction methods completes protocol relative url or calls logic converting relative
	 * to absolute url 
	 *
	 * @param (String) uri input uri to process
	 * @param (String) protocol  the protocol required of uri e.g. http
	 * @param (String) refererURI the current uri of the page from which this uri was extracted
	 *
	 * @return (String) returns url with corrections applied, or null if unable to correct url
	 */
	function RunUrlCorrectionMethods(uri, protocol, refererURI) {
		if (URL.isURLProtocolRelative(uri))
			uri = URL.protocolRelativeConvert(uri, protocol);
		if (URL.isPathRelative(uri))
			uri = URL.makeAbsoluteURL(refererURI, uri);
		if (!URL.isURL(uri)) return null;
		return uri;
	}

	/*
	 * Sends connection information to initial path which has them create the initial path of connections. 
	 * Information includes copies of AES keys, and telling them where in the path they are. They will then use this 
	 * to themselves run other algorithms to scramble the path, and create spare connections for rerouting around diconnects. 
	 * 
	 *  @param (Socket)the Clients socket 
	 * @param (array) path is array of the sockets (users) who will form the initial path for onion routing. 
	 * @param (array) ordered array of integers (edge ids). These are used by the client to connect the two sides peerconnections
	 *                and route the packets along the correct path by connecting the two different peerconnections. 
	 * @ @param (Integer) 
	 * 
	 */
	function InitiatePath(socket, path, edgeIds, grupNumber) {
		var connectionId = uuid.v4();
		var firstEdgeId = edgeIds[0];
		var firstRelay = path.shift();
		var ts = Date.now();
		socket['relays'][connectionId] = firstRelay;
		firstRelay['relays'][connectionId] = socket;

		socket['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'consumer',
			'edgeId': null,
			key1: socket.keys[0],
			key2: socket.keys[1],
			key3: socket.keys[2]
		};
		firstRelay['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': firstEdgeId,
			position: "first",
			'role': 'relay',
			'facing': 'pseudoExit',
			AESKey: socket.keys[0]
		};
		socket.emit('initiate', {
			'connectionId': connectionId,
			'role': 'consumer',
			'edgeId': null,
			key1: socket.keys[0],
			key2: socket.keys[1],
			key3: socket.keys[2]
		});
		firstRelay.emit('recieve', {
			'connectionId': connectionId,
			'edgeId': firstEdgeId,
			position: "first",
			'role': 'relay',
			'facing': 'pseudoExit',
			AESKey: socket.keys[0]
		});

		var secondRelay = path.shift();
		connectionId = uuid.v4();
		var secondEdgeId = edgeIds[1];
		firstRelay['relays'][connectionId] = secondRelay;
		secondRelay['relays'][connectionId] = firstRelay;

		firstRelay['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': firstEdgeId,
			'role': 'relay',
			position: "first",
			'facing': 'consumer'
		};
		secondRelay['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': secondEdgeId,
			'role': 'relay',
			position: "second",
			'facing': 'pseudoExit',
			AESKey: socket.keys[1]
		};

		firstRelay.emit('initiate', {
			'connectionId': connectionId,
			'edgeId': firstEdgeId,
			'role': 'relay',
			position: "first",
			'facing': 'consumer'
		});
		secondRelay.emit('recieve', {
			'connectionId': connectionId,
			'edgeId': secondEdgeId,
			'role': 'relay',
			position: "second",
			'facing': 'pseudoExit',
			AESKey: socket.keys[1]
		});


		var thirdEdgeId = edgeIds[2];
		var thirdRelay = path.shift();
		connectionId = uuid.v4();
		secondRelay['relays'][connectionId] = thirdRelay;
		thirdRelay['relays'][connectionId] = secondRelay;

		secondRelay['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'edgeId': secondEdgeId,
			'role': 'relay',
			'facing': 'consumer',
			position: "second"
		};
		thirdRelay['relaysExtraData'][connectionId] = {
			'grupNumber': grupNumber,
			'ts': ts,
			'role': 'pseudoExit',
			'edgeId': thirdEdgeId,
			'facing': 'pseudoExit',
			AESKey: socket.keys[2]
		};
		secondRelay.emit('initiate', {
			'connectionId': connectionId,
			'edgeId': secondEdgeId,
			'role': 'relay',
			'facing': 'consumer',
			position: "second"
		});

		thirdRelay.emit('recieve', {
			'connectionId': connectionId,
			'role': 'pseudoExit',
			'edgeId': thirdEdgeId,
			'facing': 'pseudoExit',
			AESKey: socket.keys[2]
		});


		// the path is passed by reference and since we pop off the sockets in it we must rebiuld it.
		// TODO: rewrite the logic of this method to not need to do this. 
		path.push(firstRelay);
		path.push(secondRelay);
		path.push(thirdRelay);
		return;
	}
});

/*
 * adds references of associated sockets on each others sockets 
 * 
 */
updateSocketReferences = function (socket, partnersSocket) {
	socket.partnersSocket = partnersSocket;
	partnersSocket.partnersSocket = socket;
}

/*
 * Checks if any socket is still connected by checking if it is in array of sockets. 
 */
function isSocketConnected(referenceToSocket) {
	var len = sockets.length;
	if (sockets.indexOf(referenceToSocket) == -1) {
		return false;
	} else {
		return true;
	}
}

/*
 * Dequeues random queued socket, or undefined if no queued socket. 
 *
 *  @returns {Object} returns socket object or undefined if no queued socket. 
 */
function dequeueRandomSocket() {
	var ret;
	for (i = 0; i < sockets.length; i++) {
		if (sockets[i].queued === true) {
			sockets[i].queued = false;
			ret = sockets[i];
			break;
		}
	}
	return ret;
}

/*
 * changes queued status of socket to false. 
 */
function dequeueSpecificSocket(socket) {
	socket.queued = false;
}
/*
 * enqueues socket. socket queued if insufficient clients to generate path.
 *
 *  @returns {Object} returns socket object or undefined if no queued socket. 
 */
function enqueueSocket(socket) {
	socket['queued'] = true;
	messageAllQueuedSocketsWithTotalNumberOfQueuedSockets();
	DOWEHAVEQUEUEDSOCKETSFLAG = true;
}

/*
 * when we are queing sockets is when the total number of users is below the threshold to run the network 
 * we message each queued client telling them how many sockets are queued, and they can then show this information in
 * the UI.  
 * 
 */
function messageAllQueuedSocketsWithTotalNumberOfQueuedSockets() {
	var totalQueued = 0;
	for (var i = 0; i < sockets.length; i++) {

		if (sockets[i]['queued'] === true) {
			totalQueued++;
		}
	}

	for (var i = 0; i < sockets.length; i++) {

		if (sockets[i]['queued'] === true) {
			sockets[i].emit("queued", totalQueued);
		}
	}
}

/**
 * Creates all edge ids for single user. 
 * 
 * Edge ids are sent to all connections a user has which are associated with the same 
 * users path so that when they recieve a message they can route it to the correct client. 
 * 
 *  @return {Array} ordered array of 3 random ids to be used as edge ids. 
 */

function createEdgeIds() {
	var firstEdgeId = uuid.v4();
	var secondEdgeId = uuid.v4();
	var thirdEdgeId = uuid.v4();
	var ret = [];
	ret.push(firstEdgeId);
	ret.push(secondEdgeId);
	ret.push(thirdEdgeId);
	return ret;
}

/**
 *shuffles order of array
 *
 *NOTE: copied from stackoverflow but verified by myself. 
 *
 *@param {Array} array to shuffle
 *@return {Array} input array but with randomized element order. 
 */
function shuffle(array) {
	var currentIndex = array.length,
		temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

/*
 * tests if string is parsable ( valid ) json string
 * 
 * @param {tring} string to test
 * @returns {boolean} true is json valid, false otherwise
 */
function IsJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}

	return true;
};


server.listen(process.env.PORT || 8000, process.env.IP || "0.0.0.0", function () {
	var addr = server.address();
	console.log("server listening at ", addr.address + ":" + addr.port);
});
