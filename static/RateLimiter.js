/**
 *
 * This has a quueue and ensures that an exit node only makes so many requests per time period. 
 * By default new requests are added to the back of the queue, but higher priority requests 
 * can be added to the front of the queue. 
 * 
 * Works by using an infinite loop that executes a certain number of requests per timeperiod, where each 
 * request is a callback function.
 */

var RateLimiter = (function () {

	/* unused TODO: safely delete */
	var maxImageRequestsPerSecond;
	/* queue of functions to execute */
	var queue = [];
	/*  max requests to execute per time period */
	var max = 30;
	// time period to execute loop on in ms
	var timePeriod = 250
	// number executed within the time period
	var executedCount = 0;

	loop();

	/**
	 *The infinite loop that executes the functions
	 *
	 */
	function loop() {
		var numberToExecute = max - executedCount;
		executedCount = 0;
		for (var i = 0; i < numberToExecute; i++) {

			if (queue.length == 0) break;
			var func = queue.shift();
			if (typeof func !== "function") throw new TypeError('not function!!! ');
			func.call();
		}

		setTimeout(loop, timePeriod);
	};


	/** 
	 *priority means we put it at the front of the queue rather than default where we queue 
	 *from the back. 
	 */
	function execute(callback, priority = false) {
		if (typeof callback !== "function") throw new TypeError('can only add functions');

		if (executedCount > max) {
			if (priority) queue.unshift(callback);
			else queue.push(callback);
			return;
		}
		executedCount++;
		callback();
	};

	return {
		execute: execute
	}
})();