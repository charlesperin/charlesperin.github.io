(function () {
	'use strict';

	var connection;
	var listeners = [];
	var connected = false;

	function start() {
		if (typeof connection === 'undefined') {
			connection = new WebSocket('ws://localhost:3333/kinect');
			connection.onopen = startPing;
			connection.onerror = logError;
			connection.onmessage = parseMessage;
		}
	}

	function ping() {
		connection.send('Ping');
		setTimeout(ping, 10000);
	}

	function addListener(listener) {
		if (typeof listener !== 'undefined') {
			var i = listeners.indexOf(listener);
			if (i === -1) {
				listeners.push(listener);
			}
		}
	}

	function removeListener(listener) {
		if (typeof listener !== 'undefined') {
			var i = listeners.indexOf(listener);
			if (i >= 0) {
				listeners.splice(i, 1);
			}
		}
	}

	function handsUp(joints) {
		if (joints.HandLeft.Position.Y < joints.Head.Position.Y) {
			return false;
		}
		if (joints.HandRight.Position.Y < joints.Head.Position.Y) {
			return false;
		}
		return true;
	}

	function handsTogether(joints) {
		if (Math.abs(joints.HandLeft.Position.Y - joints.HandRight.Position.Y) < 0.1 &&
			Math.abs(joints.HandLeft.Position.X - joints.HandRight.Position.X) < 0.1) {
			return true;
		}
		return false;
	}

	// Private Methods

	function logError(error) {
		console.log('WebSocket Error ' + JSON.stringify(error));
	}

	function startPing() {
		console.log('Websocket open');
		connected = true;
		ping();
	}

	function parseMessage(e) {
		var data = JSON.parse(e.data);
		if (data) {
			for (var i = listeners.length - 1; i >= 0; --i) {
				listeners[i].apply(this, [data]);
			}
		}
	}

	function isConnected() {
		return connected;
	}

	window.kinect = {
		start: start,
		addListener: addListener,
		removeListener: removeListener,
		handsTogether: handsTogether,
		handsUp: handsUp,
		isConnected: isConnected
	};

})();