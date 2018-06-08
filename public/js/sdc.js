/*
    Signaling data client based on websocket and stomp messaging  exchange
*/

var webSock;
var client;
var queueName = "/topic/chat";

var sdcSendData = function (data) {
	
	try {
		//var msg = {type: type, data: data};
		msg = JSON.stringify(data);
		
	client.send(queueName, {"content-type":"text/plain"}, msg);
	console.log('[SDC:sdcSendData] Sent data: ' + msg);
	} catch (e) {
		console.log('[SDC:sdcSendData] Sent data failed: ' + msg);
		console.log(e);
	}
}

var sdcCreateConnection = function(on_data_receive) {

	webSock = new SockJS("http://192.168.1.105:15674/stomp");
	client = Stomp.over(webSock);
	client.heartbeat.outgoing = 0;
	client.heartbeat.incoming = 0;
	
	var on_connect = function(x) {
	  id = client.subscribe(queueName, function(d) {
		   console.log('[SDC] Recieved data: ' + d);
		   on_data_receive(d.body);
	  });
	  
	  sdcSendData("message", "Hello i am connected !!!");
	};

	var on_error =  function() {
        console.log('error');
    };

	client.connect('guest', 'guest', on_connect, on_error, '/');
}

var testSdc = function () {
	sdcCreateConnection();
	sdcSendData("message", "Test Sdc Data Message");
}