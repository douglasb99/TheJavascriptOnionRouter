/*  
 * 
 * Most methods here relate to the UI whereby we have a box which allows the user to request URIs,
 * we can disable this with different messages depending on why they may not make requets such as 
 * because they are queued, offline, have just made a request ect.
 * 
 *  This also deals with another part of the UI ie telling the user if they are online (allowing requests and by checking 
 *  the status of the main datachannel the consumer channel) and of telling the user how long they have been online.  
 *
 */

"use strict";

var DisplayStatus = (function () {
	/* this signals that we have joined the network, and is used to start the counter */
	var startedTheNetwork = false;
	// so we only start the countup once
	var startedTheCountupFlag = false;
	// var fiveMinConnectedFlag = false;

	/**
	 * shows the box to enter a uri request into. 
	 */
	function showTheURLBox() {
		document.getElementById("send").disabled = false;
		//document.getElementById("loadingGif").style.visibility = "hidden";
		$("#loadingGif").remove();
		$("#connectingMessage").text("ready");
	}
	/**
	 * hides the box to enter a uri request into. 
	 */
	function hideTheURLBox() {
		document.getElementById("send").disabled = true;
		$("#loadingGif").remove();
		$('#connectingMessage').after('<span>&nbsp&nbsp</span><img src =" ./css/gif-load.gif" id="loadingGif" alt="loading symbol">');
		document.getElementById("loadingGif").style.visibility = "visible";
		$("#connectingMessage").text("wait reconnecting");
	}

	/**
	 * hides the box but with a different message. 
	 */
	function hideTheUrlBoxShowTheyAreNotOnline() {
		document.getElementById("send").disabled = false;
		$("#loadingGif").remove();
		$('#connectingMessage').after('<span>&nbsp&nbsp</span><img src =" ./css/gif-load.gif" id="loadingGif" alt="loading symbol">');
		$("#connectingMessage").text("internet connection not detected! will retry in 5 seconds ..");
	}

	function hideTheUrlBoxShowTheyAreQueued(totalNumberOfQueuedSockets) {
		document.getElementById("send").disabled = true;
		$("#loadingGif").remove();
		$('#connectingMessage').after('<span>&nbsp&nbsp</span><img src =" ./css/gif-load.gif" id="loadingGif" alt="loading symbol">');
		// document.getElementById("loadingGif").style.visibility = "visible";
		var msg = "wait ... queued waiting for new members to join. There are " + totalNumberOfQueuedSockets + " of 25 minimum  required";

		$("#connectingMessage").text(msg);
	}

	function leavingHideTheURLBox() {
		document.getElementById("send").disabled = true;
		$("#loadingGif").remove();
		// document.getElementById("loadingGif").style.visibility = "hidden";
		$("#connectingMessage").text("Thanks for using the site!!");
	}

	function fetchingHideTheURLBox() {
		document.getElementById("send").disabled = true;
		$("#loadingGif").remove();
		// document.getElementById("loadingGif").style.visibility = "hidden";
		$("#connectingMessage").text("");
	}

	/**
	 * Freezes the box to enter URI in but only for a short period of time ie five seconds, 
	 * to stop people making requests too rapidly, although there is a seperate rate limiter for this
	 * this is an extra precaution largely to stop accidentally this being done. 
	 *
	 */
	function TempFreezeurlBox() {
		window.requestInLastTenSeconds = true;
		fetchingHideTheURLBox();
		setTimeout(function () {
			window.requestInLastTenSeconds = false;
		}, 5000);
	}


	window.scramblerLastCalledTS = Date.now();

	/**
	 * This is a loop that polls to see if the network is actuve and connected and ready for the user. 
	 * When it is it shows them this
	 *
	 */
	function pageLoaderInfiniteLoop() {
		var connectedConsumerFlag = Queries.amIConnectedConsumer();

		if (window.SoonLeavingFlag) {
			leavingHideTheURLBox();
		} else if (window.requestInLastTenSeconds) {
			fetchingHideTheURLBox();
		} else if (connectedConsumerFlag) {
			startedTheNetwork = true;
			startCountUp();
			startedTheCountupFlag = true;
			showTheURLBox();
		} else if (!connectedConsumerFlag && startedTheNetwork) {
			// this looks like a bug of some type. . lets ignore right now but 
			//startedTheNetwork = false;
			hideTheURLBox();
		} else if (connectedConsumerFlag && startedTheNetwork) {
			// console.error(" group 2 open is :  " + count);
			showTheURLBox();
		}

		setTimeout(pageLoaderInfiniteLoop, 100);

	}

	/*
	 * pretty much does what it says on the tin. We do however read the data directly 
	 * from the UI which is questionable. 
	 *
	 */
	function HaveWeBeenConnectedFiveMinutes() {
		var minutesCounter = document.getElementById("minutesCounter");
		var mins = minutesCounter.innerHTML;
		var ret = parseInt(mins);
		return Boolean(ret >= 5);
	}

	/**
	 *starts the count on the page of how long the user has been connected. 
	 */
	function startCountUp() {
		if (startedTheCountupFlag) {
			return;
		}
		document.getElementById("lessThanFive").style.visibility = "visible";
		var minutesLabel = document.getElementById("minutesCounter");
		var secondsLabel = document.getElementById("secondsCounter");
		var totalSeconds = 0;
		var setTimeBF = setTime.bind(null, totalSeconds, secondsLabel, minutesLabel);
		setTimeout(setTimeBF, 1000);
	}

	/**
	 * tells us in a string how long left until the user has been connected for 5 minutes. 
	 *
	 */
	function HowLongUntilStayedFiveMinutes() {
		var minutesLabel = document.getElementById("minutesCounter");
		var secondsLabel = document.getElementById("secondsCounter");

		if (minutesLabel.innerHTML >= 5) {
			return 0;
		} else {
			var minsLeftRequired = 4 - minutesLabel.innerHTML;
			var secondsLeftRequired = 60 - secondsLabel.innerHTML;
			// if it is 
			if (minsLeftRequired == 0) {
				return secondsLeftRequired + " seconds";
			} else {
				// could add the format to removal plurals
				return minsLeftRequired + " minutes and " + secondsLeftRequired + " seconds ";
			}
		}


	}
	/*
	 * Formats the seconds into minutes and seconds and set it in the UI
	 */
	function setTime(totalSeconds, secondsLabel, minutesLabel) {
		++totalSeconds;
		secondsLabel.innerHTML = pad(totalSeconds % 60);
		minutesLabel.innerHTML = pad(parseInt(totalSeconds / 60));
		var setTimeBF = setTime.bind(null, totalSeconds, secondsLabel, minutesLabel);
		setTimeout(setTimeBF, 1000);
	}

	function pad(val) {
		var valString = val + "";
		if (valString.length < 2) {
			return "0" + valString;
		} else {
			return valString;
		}
	}

	/**
	 * Getter
	 */
	function getStartedNetworkVariableFlag() {
		return startedTheNetwork;
	}


	return {
		HowLongUntilStayedFiveMinutes: HowLongUntilStayedFiveMinutes,
		TempFreezeurlBox: TempFreezeurlBox,
		getStartedNetworkVariableFlag: getStartedNetworkVariableFlag,
		HaveWeBeenConnectedFiveMinutes: HaveWeBeenConnectedFiveMinutes,
		fetchingHideTheURLBox: fetchingHideTheURLBox,
		pageLoaderInfiniteLoop: pageLoaderInfiniteLoop,
		hideTheUrlBoxShowTheyAreQueued: hideTheUrlBoxShowTheyAreQueued
	}
})();