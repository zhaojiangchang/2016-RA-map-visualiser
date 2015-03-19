// =================================================================================
// Author: github.com/samdutton, modified by Will Hardwick-Smith
// original code from https://github.com/samdutton/simpl/blob/master/getusermedia/sources/js/main.js
// Contains: request access to user microphone, 
// requests to recorder.js to record audio and export as a wav blob,
// 
// =================================================================================

// select elem for audio devices
var audioSelect = document.querySelector("#audio-source");

navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var audioRecorder = null;

function saveAudio() {
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
    audioRecorder.exportWAV( doneEncoding );

    function doneEncoding(){
        console.log("done encoding (doing nothing now)");
    }
}

// start recording
function startAudioRecording() {
    audioRecorder.clear();
    audioRecorder.record();
    displayAudioGraphic();
}

// stops record and prepares wav data blob
// cb is executed after encoding is complete
function stopAudioRecording(cb){
    audioRecorder.stop();
    audioRecorder.getBuffers( function (buffers){        
        gotBuffers(buffers, cb);
    });
    removeAudioGraphic();

    function gotBuffers( buffers, cb ) {
        // the ONLY time gotBuffers is called is right after a new recording is completed - 
        // so here's where we should set up the download.
        audioRecorder.exportWAV( function(buffers){
            doneEncoding(buffers, cb);
        });

        function doneEncoding( blob, cb ) {
            // sets the audio of the current user's current exploration
            currentUser.getCurrentExploration().setAudio(blob);            
            if (cb)
                cb();
        }
    }
}


// called when sources are confirmed 
function gotSources(sourceInfos) {
    for (var i = 0; i != sourceInfos.length; ++i) {
        var sourceInfo = sourceInfos[i];
        var option = document.createElement("option");
        option.value = sourceInfo.id;
        if (sourceInfo.kind === 'audio') {
            option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
            audioSelect.appendChild(option);
        } else if (sourceInfo.kind === 'video') {
            option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
            videoSelect.appendChild(option);
        } else {
            console.log('Some other kind of source: ', sourceInfo);
        }
  }
}

if (typeof MediaStreamTrack === 'undefined'){
    alert('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
} else {
    MediaStreamTrack.getSources(gotSources);
}

function gotMedia(stream) {
    // makes input, gain and analyser AudioNodes
    var audioInput = audioContext.createMediaStreamSource(stream);
    var source = audioContext.createGain(); // gain node

    audioInput.connect(source);
    audioRecorder = new Recorder( source );

    var zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    source.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
}

function errorCallback(error){
    console.log("navigator.getUserMedia error: ", error);
}

// sends request to use mic
function start(){
    if (!!window.stream) {
        window.stream.stop();
    }
    var audioSource = audioSelect.value;
    var constraints = {
        audio: {
            optional: [{sourceId: audioSource}]
        }
    };
    navigator.getUserMedia(constraints, gotMedia, errorCallback);
}

audioSelect.onchange = start;

start();