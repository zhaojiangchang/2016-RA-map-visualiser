
/*global document, $, console, currentUser, userLoggedOn, d3, Blob,updateNotifications, clearTimeout, explChooser,
	el, setTimeout, makeShortTimeFormat, zoom, updateScaleAndTrans, goToLoc, window, FileReader,
	map, audioRecorder, startAudioRecording, addRecordingGraphics, updateExplorationControls, getCityIndex,
	stopAudioRecording, alert, goToFirstLocation, showPathButton, isNextEvent,
	loadAllExplorations, gotExplorations, updateExplorationChooser, changeButtonColour, ProgressBar, PathView*/
/*exported startRecording, startPlayback, insertIntoSelectedExploration, saveExploration, deleteExploration,
    updateSelectedExploration, ensureExplorationSelected, setPositionFromClickedPathLine*/
//=================================================================================
//Authors: Will Hardwick-Smith & Jacky Chang
//Contains: Event and Exploration contructors.
//Contains functions which relate to explorations such as:
//- starting/stopping recording
//- playing/stopping/pausing/resuming playback
//- inserting into explorations
//- saving explorations
//- selecting explorations.

//Also contains references to the GUI elements: pathView and progressBar.
//And the currently selected exploration (selectedExploration).
//=================================================================================


//if the user is currently recording, playing ...
var explRecording = false,
playing = false,
paused = false,
inserting = false,
//id for timer which triggers next event in playback. Is used to stop playback.
playTimerID = -1,
//HTML5 audio element for any audio .
audioElem = el("exploration-audio"),
//the bar in the lower region of the screen
progressBar = new ProgressBar(),
//the high-level representation of the exploration, shown as a path
pathView = new PathView(),
//currently selected exploration
selectedExploration = null;

//an exploration event.
//can be of type: start, end, travel, movement
function Event(type, body, time){
	this.type = type;
	this.body = body;
	this.time = time;
}

//an exploration of the map
function Exploration() {
	this.name = null;
	this.userName = (currentUser ? currentUser.name : null); // user who recorded this
	this.events = []; // events that took place over the course of the exploration
	this.timeStamp = null;//time saving at save button pressed
	this.audio = null; // blob/string representing audio
	this.isNew = true; // has the user watched this before

	var firstEventTime = null; // time of the first event recorded (used as reference point)

	this.setTimeStamp = function(timestamp){
		this.timeStamp = timestamp.toString();
	};
	this.addEvent = function (type, body){
		var currentTime = new Date().getTime();
		if (firstEventTime === null){
			firstEventTime = currentTime;
		}
		var timeFromFirstEvent = currentTime - firstEventTime;
		var event = new Event(type, body, timeFromFirstEvent);
		this.events.push(event);
	};

	this.getEvent = function (i){
		return this.events[i];
	};

	this.getEvents = function(){
		return this.events;
	};

	this.getAudio = function(){
		return this.audio;
	};

	this.hasAudio = function(){
		return this.audio ? true : false;
	};

	this.setAudio = function(audio){
		this.audio = audio;
	};

	this.nextEvent = function (event){
		if (!isNextEvent(event)){
			throw "there's no next events in record";
		}
		return this.events[this.events.indexOf(event) + 1];
	};

	this.numEvents = function(){
		return this.events.length;
	};

	this.isEmpty = function(){
		return this.events.length === 0;
	};

	this.reset = function(){
		this.events = [];
		firstEventTime = null;

	};
	// transfers all properties from another exploration
	this.transferPropertiesFrom = function(exploration){
		var that = this;
		Object.getOwnPropertyNames(exploration).forEach(function(property){
			that[property] = exploration[property];
		});
	};

	// to establish exploration equality
	this.equals = function(exploration){
		if (exploration === null){
			return false;
		}
		return this.userName === exploration.userName && this.timeStamp === exploration.timeStamp;
	};
	this.getDuration = function(){
		if(this.events.length === 0){
			return 0;
			}
		return  this.events[this.events.length-1].time;//return millisecond

	};

	// gets the most recent event before this time
	// PRE: time must be > 0
	this.getEventAtTime = function(time){
		for (var i = 0; i < this.events.length; i++){
			if (this.getEvent(i).time > time){
				return this.getEvent(i-1);
				}
		}
	};

	// inserts all new events into events array after afterIndex
	// changes the time property of certain events according to the time provided
	this.insertEvents = function(newEvents, afterIndex, time){

		// duration of new exploration to be inserted
		var insertDuration = newEvents[newEvents.length-1].time;

		// remove start and end events
		newEvents = newEvents.slice(1, newEvents.length-2);

		// change time of events being added
		for (var i = 0; i < newEvents.length; i++){
			newEvents[i].time += time;
		}
		// increment time of all events after the insert
		for (var j = afterIndex; j < selectedExploration.numEvents(); j++){
			var event = selectedExploration.getEvent(j);
			event.time += insertDuration;
		}
		// insert new events into events array
		this.events = this.events.slice(0, afterIndex)
		.concat(newEvents)
		.concat(this.events.slice(afterIndex));

	};

	// gives the exploration a name based on the time it was recorded
	this.giveName = function(){
		this.name = this.userName + " " + makeShortTimeFormat(new Date(this.timeStamp));
	};

	// check the exploration is has city events return true
	this.hasCityEvents = function(){
		var events = this.events;
		for(var i = 0; i < events.length; i++){
			if(events[i].type === "travel"){
				return true;
				}
		}
		return false;
	};
}


//begins recording of user navigation actions
//insert is true if this recording will be inserted into another exploration
function startRecording() {
	// only reset exploration if
	if (!inserting){
		resetExplorations();
		}

	// adds event listeners which record user navigation actions
	zoom.on("zoom.record", recordMovement);
	// cities on the map
	var mapCities = document.getElementsByClassName("place");
	for (var i = 0; i < mapCities.length; i++){
		var city = mapCities.item(i);

		city.addEventListener("dblclick", recordTravel(city.id));
	}

	var newExpl = new Exploration();

	// add start event
	newExpl.addEvent("start", map.attr("transform"));

	// declares this exlporation as the user's currently recording exploration
	currentUser.setCurrentExploration(newExpl);

	// starts recording audio
	if (audioRecorder){
		startAudioRecording();
		}

	// shows that recording is in progess
	addRecordingGraphics();
	explRecording = true;
	updateExplorationControls();
}

//ends recording of user navigation
function stopRecording(audioCB) {
	var recordedExpl = currentUser.currentExpl;
	// if there is no recording, do nothing
	if (!recordedExpl || !explRecording){
		return;
		}

	// removes event listeners which are recording user navigation.
	zoom.on("zoom.record", null); // remove recording zoom listener
	// city elems on the map
	var mapCities = document.getElementsByClassName("place");
	for (var i = 0; i < mapCities.length; i++){
		var city = mapCities.item(i);
		city.removeEventListener("onclick", recordTravel(getCityIndex(city.id)));
	}

	recordedExpl.addEvent("end", "");

	recordedExpl.setTimeStamp(new Date().toString());
	recordedExpl.giveName();

	// else, it will overwrite the selected exploration
	if (!inserting){
		selectExploration(recordedExpl);
		}

	// audio stuff
	if (audioRecorder){
		stopAudioRecording(audioCB);
		}

	removeRecordingGraphics();
	explRecording = false;
	updateExplorationControls("stopped-recording");
	progressBar.load(currentUser.getCurrentExploration());
}

//remove recording related graphics
function removeRecordingGraphics(){
	d3.select("#record-border").remove();
	d3.select("#record-circle").remove();
}

//index of last event which was played
var currentEventIndex = 0,
// for pausePlayback
lastEventTime = -1, // the time which the last playback started
elapsedEventTime = -1; // how much time elapsed since event before pausing

//launches the events of an exploration started at the ith event
//*not supported currently* if elapsedTime is specified, plays from elapsedTime to event end time.
function launchEvents(exploration, i, elapsedTime){

	lastEventTime = new Date();
	currentEventIndex = i;
	var currentEvent = exploration.getEvent(i);

	// execute the event depending on the type
	switch (currentEvent.type){
	case ("travel"):
		var location = currentEvent.body;
	goToLoc(location, elapsedTime);
	pathView.updateProgress(currentEvent.time);
	break;
	case ("start"):
	case ("movement"):
		var transform = currentEvent.body;
	map.attr("transform", transform);
	updateScaleAndTrans();
	break;
	case ("end"):
		stopPlayback(exploration);
	return;
	}

	// prepare to launch next event
	var nextEvent = exploration.getEvent(i+1);
	var delay = nextEvent.time - currentEvent.time;
	// if elapsedTime is specified, remove it from delay
	if (elapsedTime){
		delay = delay - elapsedTime;
	}

	progressBar.updateProgress(exploration, currentEvent.time, delay);

	// launch next event setTimeout(yourFunctionReference, 4000, param1, param2, paramN);
	playTimerID = setTimeout(launchEvents, delay, exploration, i + 1);
}

//plays an exploration from the start
//PRE: no other exploration is being played
function startPlayback(exploration){
	if (!exploration || exploration.numEvents() === 0) {
		alert("nothing to play");
		return; // if no events, do nothing.
	}

	// launch the first event
	launchEvents(exploration, 0);

	if (exploration.hasAudio()){
		playAudio(exploration.getAudio());
	}
	// update to show exploration has been played
	if(currentUser.getExploration(exploration.timeStamp) && !palyExplNotification){
		setExplorationIsOld(exploration);
	}

	// updates GUI and globals
	updatePlaybackStarted();
	updateNotifications();
}


//stops playback and resets position to the start
function stopPlayback(exploration){
	clearTimeout(playTimerID);

	if (exploration.hasAudio()){
		audioElem.pause();
		audioElem.currentTime = 0; // in seconds
	}

	// update globals
	currentEventIndex = 0;
	elapsedEventTime = 0;
	playing = false;
	paused = false;
	// reset gui/views
	progressBar.resetProgress();
	updatePlaybackStopped();
	if(exploration.hasCityEvents()){
		pathView.reset();
		}
}

//pauses the current playback. cb will happen after progress bar updates
function pausePlayback(exploration, cb){
	elapsedEventTime = new Date() - lastEventTime;
	clearTimeout(playTimerID);
	map.transition().duration(0); // stops any current transitions
	paused = true;

	if (exploration.hasAudio()){
		audioElem.pause();
		el("insert-button").style.display = "block";

	}

	updatePlaybackStopped();
	progressBar.pause(cb);
	if(exploration.hasCityEvents()){
		pathView.pause();
		}
}

//waits until next event before executing playExploration
function resumePlayback(exploration){
	var currentEvent = exploration.getEvent(currentEventIndex);
	var eventDur = exploration.getEvent(currentEventIndex+1).time - currentEvent.time,
	timeTilNextEvent = eventDur - elapsedEventTime,
	// playback position in time
	position = currentEvent.time + elapsedEventTime;

	// skips the rest of the event and goes to the next one.
	// TODO: play the rest of the event, don't skip
	playTimerID = setTimeout(function(){
		launchEvents(exploration, currentEventIndex+1);
	}, timeTilNextEvent);

	if (exploration.hasAudio()){
		resumeAudio(position/1000);
		}

	updatePlaybackStarted();

	progressBar.updateProgress(exploration, position, timeTilNextEvent);
	progressBar.updateButton();

	if(exploration.hasCityEvents()){
		pathView.resumeProgress(eventDur, currentEvent.time);
		}
}

//sets playback position to time parameter, then plays from that position (if was playing before)
function setPlaybackPosition(exploration, time){
	var wasPlaying = playing;

	pausePlayback(exploration, function(){
		var newEvent = exploration.getEventAtTime(time);

		// go to translation and scale of the last event
		transformToAfterEvent(newEvent);

		currentEventIndex = exploration.events.indexOf(newEvent);
		// set the elapsed time since the last event
		elapsedEventTime = time - newEvent.time;

		progressBar.setPosition(time);
		if(exploration.hasCityEvents()){
			pathView.setPausedTime(time);
			if(pathView.progressBarClicked){
				pathView.setPosition(time);
				}
		}

		// if already playing, continue
		if (wasPlaying){
			resumePlayback(exploration);
			}
	});

	// changes (transforms) map to be aftermath of event
	function transformToAfterEvent(event){
		switch (event.type){
		case ("travel"):
			var locationName = event.body;
		// instantly go to location
		goToLoc(locationName, 0.001);
		break;
		case ("movement"):
			var transform = event.body;
		map.attr("transform", transform);
		updateScaleAndTrans();
		break;

		}
	}
}

//inserts 'insertee' into the currently selected exploration at the time of the last pause
function insertIntoSelectedExploration(insertee){

	var exploration = selectedExploration;
	// save the current event before it is reset
	var eventIndex = currentEventIndex;

	// time to insert newly recorded events
	var currentTime = getCurrentPlaybackTime();

	// grab audio
	var newAudio = function(){
		if (!insertee.hasAudio() || !exploration.hasAudio()){
			return null;
			}

		// find the byte position of the current time
		var	sampleRate = 44100,
		bytesPerFrame = 4,
		headerSize = 44;

		var framePosition = (currentTime/1000) * sampleRate;
		var dataBytePos = framePosition * bytesPerFrame;
		// get the last frame before the bytePosition (so bytePosition isn't in middle of sample)
		var lastFrameStart = (dataBytePos - (dataBytePos % bytesPerFrame));
		var bytePosition = headerSize + lastFrameStart;

		var explAudio = exploration.getAudio();
		var inserteeAudio = insertee.getAudio();

		var left = explAudio.slice(0, bytePosition);
		// chop off header
		var insert = inserteeAudio.slice(headerSize, inserteeAudio.size);
		var right = explAudio.slice(bytePosition, explAudio.size);

		// join each of the pieces together
		return new Blob([left, insert, right], {type: "audio/wav"});
	}();

	// insert the events
	exploration.insertEvents(insertee.getEvents(), eventIndex+1, currentTime);
	// replace audio
	if (newAudio){
		exploration.setAudio(newAudio);
		setupAudio(exploration);
	}

	// put the new exploration into currentExporation so it will be saved next
	// TODO: save as the older exploration, not a new one
	currentUser.setCurrentExploration(exploration);

	selectExploration(exploration);

	inserting = false;
}

//loads audio data into the audio element
function setupAudio(exploration){
	if(exploration.audio===""){return;}
	el("has-audio").style.visibility = "visible";
	var audioBlob = exploration.getAudio();
	audioElem.src = (window.URL || window.webkitURL).createObjectURL(audioBlob);
}

function playAudio(){
	audioElem.play();
}

//resumes audio from a position (seconds)
function resumeAudio(position){
	audioElem.currentTime = position;
	playAudio();
}

//updates GUI and globals
function updatePlaybackStopped(){
	playing = false;
	updateExplorationControls();
	progressBar.updateButton();
}

function updatePlaybackStarted(){
	paused = false;
	playing = true;
	inserting = false;
	updateExplorationControls();
	progressBar.updateButton();
	progressBar.hideTimeText();
}

//makes an exploration become selected
function selectExploration(exploration){
	el("has-audio").style.visibility = "hidden";
	if (selectedExploration){
		deselectExploration();
		}

	selectedExploration = exploration;
	setupAudio(exploration);

	// update gui/views
	progressBar.load(exploration);
	if(exploration.hasCityEvents()){
		pathView.load(exploration);


	}else{
		showPathButton.style.visibility = "hidden";
	}
	//$("#share-file").show();
	updateExplorationControls();

	// transitions to the first location in the exploration
	goToFirstLocation(exploration);
}

//deselects current exploration
function deselectExploration(){
	if (!selectedExploration){
		return;
	}
	el("has-audio").style.visibility = "hidden";
	// must do this first to check if there are city events
	if(selectedExploration.hasCityEvents()){
		pathView.unload();
		selectedExploration = null;
	}
	// update GUI/views
	progressBar.unload();
	if (!currentUser || !currentUser.hasExplorations()){
		disableAction(["delete"]);
	}
	// all sharing elements (includes: send to, text message, audio message)
	//$("#share-file").hide();


}

//resets to original state (no explorations selected, no recordings or playbacks in progress)
function resetExplorations() {
	if (playing || paused){
		stopPlayback(selectedExploration);
	}
	if (explRecording){
		stopRecording();
	}
	if (currentUser){
		currentUser.resetCurrentExploration();
	}

	deselectExploration();
	progressBar.unload();
	pathView.unload();
	updateExplorationControls();
}

//PRE: current exploration != null
//save the exploration to server
function saveExploration(exploration) {
	updateExplorationControls("saved");

	// if the exploration has no audio, go ahead and send
	if (!exploration.audio){
		console.log("no audio");
		sendExploration(exploration);
	}
	else { // if the exploration contains audio
		// convert audio from blob to string so it can be sent
		var reader = new FileReader();
		reader.addEventListener("loadend", audioConverted);
		reader.readAsBinaryString(exploration.getAudio());

	}
	function audioConverted(){
		var audioString = reader.result;
		exploration.setAudio(audioString);
		sendExploration(exploration);
	}

	function sendExploration(exploration){
		$.ajax({
			type: 'POST',
			url: "/postExploration",
			data: JSON.stringify(exploration),
			success: function(){
				//TODO: try not load all explorations after send exploration, add this exploration to currentuser's expls
				loadAllExplorations(currentUser.name, gotExplorations);
				enableAction(["delete"]);
				updateExplorationChooser();
			},
			contentType: "application/json"
		});
	}
}

//disables an action (currently button)
function disableAction(names){
	names.forEach(function(name){
		var button = el(name + "-exploration-button");
		button.disabled = true;
		button.style.cursor = "not-allowed";
		changeButtonColour(name, false);
	});
}

//enable an action
function enableAction(names){
	names.forEach(function(name){
		var button = el(name + "-exploration-button");
		button.disabled = false;
		button.style.cursor = "pointer";
		// change the colour if it's not the record button
		if (name.localeCompare("record") !== 0){
			changeButtonColour(name, true);
		}
	});
}

//records an instance of a user action to travel to a place on the map
function recordTravel(cityIndex){
	return function (){
		currentUser.getCurrentExploration().addEvent("travel", cityIndex);
	};
}

//records a user pan or zoom
function recordMovement(){
	currentUser.getCurrentExploration().addEvent("movement", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//removes this exploration from the user's files
function deleteExploration(expl){
	$.ajax({
		type: 'POST',
		url: "deleteExploration",
		data: JSON.stringify({
			userName: currentUser.name,
			timeStamp: expl.timeStamp,
			hasAudio: expl.hasAudio()
		}),
		contentType: "application/json",
		success: deletedExploration
	});

	function deletedExploration(){
		loadAllExplorations(currentUser.name, gotExplorations);

		function gotExplorations(allExplorations){
			currentUser.setExplorations(allExplorations);
			resetExplorations();
			updateExplorationChooser();
		}
	}
}

function updateSelectedExploration(){
	// nothing is selected
	if (explChooser.selectedIndex === -1){
		return;
	}

	var timeStamp = explChooser.options[explChooser.selectedIndex].id;
	var userExpl = currentUser.getExploration(timeStamp);
	resetExplorations();
	selectExploration(userExpl);
}

//ensures that an exploration is selected by selecting the first in the list
function ensureExplorationSelected(){
	if (!selectedExploration && userLoggedOn() && currentUser.explorations.length > 0){

		var explTimeStamp = explChooser.options[0].id;
		var userExpl = currentUser.getExploration(explTimeStamp);
		selectExploration(userExpl);
	}
}

//set selectedExploration isNew === false
function setExplorationIsOld(expl){
	expl.isNew = false;
	$.ajax({
		type: 'POST',
		url: "setExplorationIsOld",
		data: JSON.stringify({
			currentUserName:currentUser.name,
			explUserName:expl.userName, // the user who made the exploration
			timeStamp: expl.timeStamp
		}),
		contentType: "application/json"
	});
}

//returns the time position in the current playback
function getCurrentPlaybackTime(){
	return selectedExploration.getEvent(currentEventIndex).time + elapsedEventTime;
}

//when click the path on the map will trigger this function to set the position at clicked point
//also set the progress bar to the right "time".
function setPositionFromClickedPathLine(cityIndex){
	var currentCityIndex = null;
	pathView.setProgressBarClicked(false,true); // first param: progressBar clicked			second param: pathview clicked
	d3.selectAll("#animationPath").remove();
	if(!cityIndex){ // if argument is null get city index by calling getCityIndexByPoint function
		currentCityIndex = pathView.getCityIndexByPoint(pathView.getPausedX(), pathView.getPausedY());
	}
	else {
		currentCityIndex = cityIndex;
	}

	pathView.setCtx( pathView.getPausedX() );
	pathView.setCty( pathView.getPausedY() );

	d3.selectAll("#circle-move")
	.attr("cx", pathView.getCtx())
	.attr("cy", pathView.getCty());
	var tempTrans =  [];
	if(currentCityIndex < pathView.translates().length - 1){
		pathView.setNcx( pathView.translates()[currentCityIndex+1][ 0 ]);
		pathView.setNcy( pathView.translates()[currentCityIndex+1][ 1 ]);
		for(var i = 0;  i < currentCityIndex+1;  i++ ){
			tempTrans.push(pathView.translates()[ i ] );
		}
		tempTrans.push( [ pathView.getPausedX(), pathView.getPausedY() ] );
	}
	else{
		tempTrans = pathView.translates();
	}
	map.append("path")
	.data( [ tempTrans ] )
	.attr({
		id: "animationPath",
		class: "path-move",
		stroke: "blue",
		"stroke-width": "2",
	})
	.style("fill", "none")
	.attr("d", d3.svg.line()
			.tension(0))
			.on("click", function(){
				pathView.setPausedX(d3.mouse(this)[0]);
				pathView.setPausedY(d3.mouse(this)[1]);
				setPositionFromClickedPathLine();}
			);

	if(currentCityIndex>pathView.translates().length-1){
		return;
	}

	// currentCityIndex is one step behand the progress bar city event
	// distence between paused position to previous city event
	var distToPausedX  = Math.abs(pathView.getPausedX() - pathView.translates()[currentCityIndex][0]),
	nextCityEventTime = pathView.cityEventTimes()[currentCityIndex+2],
	durCityEvents = -1,
	lastCityEventTime = -1;

	//path between last two cities
	if(currentCityIndex === pathView.translates().length-2){
		durCityEvents = pathView.expl.events[pathView.expl.events.length-1].time - pathView.cityEventTimes()[pathView.cityEventTimes().length-1];
		lastCityEventTime = pathView.cityEventTimes()[pathView.cityEventTimes().length-1];
	}
	//path between first two cities
	else if(currentCityIndex === 0){
		durCityEvents = pathView.cityEventTimes()[2]- pathView.cityEventTimes()[1];
		lastCityEventTime = pathView.cityEventTimes()[1];
	}
	//all other path
	else{
		durCityEvents = nextCityEventTime - pathView.cityEventTimes()[currentCityIndex+1];
		lastCityEventTime = pathView.cityEventTimes()[currentCityIndex + 1];
	}
	//x distence between two cities
	var distX = Math.abs((pathView.translates()[currentCityIndex][0] - pathView.translates()[currentCityIndex+1][0]));
	var time = distToPausedX * durCityEvents / distX + lastCityEventTime;
	if(time<pathView.cityEventTimes()[0]){
		time = pathView.cityEventTimes()[0];
	}
	setPlaybackPosition(pathView.expl, time);
}

