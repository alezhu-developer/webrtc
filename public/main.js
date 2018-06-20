'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
var hangUpButton = document.getElementById('hangupButton');
var clientName;

hangUpButton.onclick = hangup;

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'public';
	
var socket = io.connect("https://site3.ltk:8080");

if (get('room') != '' ) {
	room = get('room');
	start();
}

function connectToRoom(room) {
	if (room !== '') {
		socket.emit('create or join', room);
		console.log('Attempted to create or  join room', room);
	}
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
  sendMessage("joined user: " + clientName );

});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
  sendMessage("joined user: " + clientName );
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

socket.on('hangup', function(array) {
  console.log.apply(console, array);
});


socket.on('widget', function(array) {
  console.log.apply(console, array);
  
  $(array.widgetId).update
  
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var recordVideo = document.querySelector('#recordVideo');

function start() {
  trace('Requesting local stream');
  //Connecting to the room
  connectToRoom(room);
  
  //callButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
 
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  audio: true,
  video: true
  
};

console.log('Getting user media with constraints', constraints);
clientName = get('clientName');

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
  window.stream = event.stream;
  
  if( !isInitiator ) {
	  startRecording();
  }
  
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  socket.emit('hangup', room);
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  if( !isInitiator ) {
	  stopRecording();
  }
  isStarted = false;
  pc.close();
  pc = null;
  window.location.href = 'index.html';
}



/* Recording */

var mediaRecorder;
var recordedBlobs;

var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
}

function startRecording() {                                                       
  console.log('Recording started! ');
  recordedBlobs = [];                                                             
  var options = {mimeType: 'video/webm;codecs=vp9'};                              
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {                         
    console.log(options.mimeType + ' is not Supported');                          
    options = {mimeType: 'video/webm;codecs=vp8'};                                
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {                       
      console.log(options.mimeType + ' is not Supported');                        
      options = {mimeType: 'video/webm'};                                         
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {                     
        console.log(options.mimeType + ' is not Supported');                      
        options = {mimeType: ''};                                                 
      }                                                                           
    }                                                                             
  }                                                                               
  try {                                                                           
    mediaRecorder = new MediaRecorder(window.stream, options);                    
  } catch (e) {                                                                   
    console.error('Exception while creating MediaRecorder: ' + e);                
    alert('Exception while creating MediaRecorder: '                              
      + e + '. mimeType: ' + options.mimeType);                                   
    return;                                                                       
  }                                                                               
  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);   
  //recordButton.textContent = 'Stop Recording';                                    
  //playButton.disabled = true;                                                     
  //downloadButton.disabled = true;                                                 
  mediaRecorder.onstop = handleStop;                                              
  mediaRecorder.ondataavailable = handleDataAvailable;                            
  mediaRecorder.start(1000); // collect 10ms of data                                
  console.log('MediaRecorder started', mediaRecorder);                            
}                                                                                 
                                                                                  
function stopRecording() {                                                        
  mediaRecorder.stop();                                                           
  console.log('Recorded Blobs: ', recordedBlobs);                                 
  //recordedVideo.controls = true;
  var blob = new Blob(recordedBlobs, {type: 'video/webm'});
  socket.emit('savevideo', {'room': room, 'data': blob});
  
  download();
}                                                                                 

function download() {
  var blob = new Blob(recordedBlobs, {type: 'video/webm'});
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

function get(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
      return decodeURIComponent(name[1]);
}