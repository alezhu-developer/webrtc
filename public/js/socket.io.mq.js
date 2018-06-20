'use strict';

class mqEvents {
		
	constructor(url, exchangeName, queueName) {
		mqEvents.url = url;
		this.queueName = queueName;
		this.exchangeName = exchangeName;
		mqEvents.eventSubscriptions = {};
		this.webSocketClient;
		this.webSocket;
	}
	
	on(eventName, functionName) {
		//Make suscription
		mqEvents.eventSubscriptions[eventName] = functionName;
	}
	
	onMessageReceived(mqData) {
		console.log('onMessageReceived');
		console.log(mqData);
		console.log(this);
		output.innerHTML += "<p class = 'response'>MESSAGE RECEIVED: " + mqData.body + "</p>";
		
		try {
			mqEvents.eventSubscriptions[mqData.headers.event](JSON.parse(mqData.body));
		} catch (ex) {
			console.log(ex);
		}
	}
  
	emit(eventName, data) {
		var headers = {};
		var apiUrl = '/exchange/' + this.exchangeName + '/' + this.queueName;
		
		headers['event'] = eventName;
		console.log("emit: " + apiUrl);
		this.webSocketClient.send(apiUrl, headers, JSON.stringify(data));
	}

	
	static onOpen(evt){
		//called as soon as a connection is opened
		output.innerHTML = "<p>CONNECTED TO SERVER</p>";
		console.log("CONNECTED TO SERVER");
		console.log(evt);
/*
		if (typeof this.webSocketClient == "undefined" ) {
			console.log("ERROR NOT DEFINED: " + this.queueName);
		}
	*/	
		this.subscribe("/queue/" + this.queueName, this.onMessageReceived);
	} // end onOpen
  
  
	static onError(evt){
		//called on error
		console.log("ERROR: " + evt.data);
		mqEvents.reConnect();
	} // end onError
  
	connect(url){
		//open socket
		//url = 'http://192.168.1.105:15674/stomp';
		if ("WebSocket" in window){
		  this.webSocket = new SockJS(mqEvents.url);
		  
		  this.webSocketClient = Stomp.over(this.webSocket);
		  
		  //note this server does nothing but echo what was passed
		  //use a more elaborate server for more interesting behavior
	  
		  console.log("connecting... sid:" + this.queueName) ;
		  
		  this.webSocketClient.queueName = this.queueName;
		  this.webSocketClient.onMessageReceived = this.onMessageReceived;
		  //this.webSocketClient.eventSubscriptions = mqEvents.eventSubscriptions;
		  //this.webSocket.eventSubscriptions = mqEvents.eventSubscriptions;
		  mqEvents.reConnect = this.connect;
		  
		  this.webSocketClient.connect('guest', 'guest', mqEvents.onOpen, mqEvents.onError, '/');
	  
		} else {
		  console.log("WebSockets not supported on your browser!!!");
		} // end if
	  } // end connect

	sendMessage(message){
		//get message from text field
		//txtMessage = document.getElementById("txtMessage");
		//message = txtMessage.value;
		//pass message to server
		//client.send('/exchange/chat/' + sid, {"event":"test"}, message);
		this.emit('test', message);
	} // end sendMessage
}