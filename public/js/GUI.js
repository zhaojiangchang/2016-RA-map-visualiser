// =================================================================================
// Author: Will Hardwick-Smith & Jacky Chang
// Contains: Only GUI/view related methods, such as:
// - graphical representations
// - animations
// - disabling/enabling buttons
// - showing/hiding elements
// - reloading data for GUI elements
// =================================================================================

//------ Dom elements --------
var recordExplButton = document.getElementById("record-exploration-button"),
playExplButton = $("#play-exploration-button"),
pauseExplButton = $("#pause-exploration-button"),
stopExplButton = $("#stop-exploration-button"),
saveExplButton = $("#save-exploration-button"),
deleteExplButton = $("#delete-exploration-button"),
resetExplButton = $("#reset-exploration-button"),
explChooser = document.getElementById("exploration-selector"),
userNameInput = document.getElementById("username-input"),
passwordInput = document.getElementById("password-input"),
logonButton = document.getElementById("logon-button"),
messageBar = document.getElementById("percent"),
notificationContainer = document.getElementById("notification-container"),
removeNotification = document.getElementById("remove-notification"),
quickplayNotification = document.getElementById("quickplay-notification"),
notificationSelector = document.getElementById("notification-selector"),
showPathButton = document.getElementById("show-path");
insertButton = $("#insert-button"),
stopInsertButton = $("#stop-insert-button"),
explorationTitle = $("#exploration-title"),
timeText = $("#time-text"),
durationText = $("#duration-text"),
hasAudio = $("#has-audio"),
aboveBarDiv = $("#above-bar"),
belowBarDiv = $("#below-bar");

//updates elements in the side bar
function updateSideBar(){
	updateUserButtons(currentUser);
	updateExplorationChooser();
	updateLocationInfo();
	updateExplorationControls();
	updateNotifications();
	updateLogonElements();
	updateShareExplElements();
}

//updates the exploration chooser (drop down box)
function updateExplorationChooser(){
	// clear all explorations
	while(explChooser.firstChild){
		explChooser.removeChild(explChooser.firstChild);
	}

	var explorations = userLoggedOn() ? currentUser.getExplorations() : [];
	if(explorations.length===0){
		$("#noOfFilesLoaded").html("no explorations loaded");
		$("#exploration-selector").hide();
		return;
	}else $("#exploration-selector").show();

	explorations.forEach(function(exploration, index){
		var explOption = document.createElement('option');
		explOption.setAttribute("id", exploration.timeStamp);
		var explorationName = exploration.name;
		explOption.innerHTML = explorationName;
		explOption.value = index;
		explChooser.appendChild(explOption);
	});

	ensureExplorationSelected();
}

//updates the user buttons to show who is logged in
function updateUserButtons(currentUser){
	var userButtons = document.getElementsByClassName("user-button");
	Array.prototype.forEach.call(userButtons, function(userButton){
		if (currentUser && userButton.id === currentUser.name){
			userButton.classList.remove("other-user-button");
			userButton.classList.add("current-user-button");
		} else {
			userButton.classList.remove("current-user-button");
			userButton.classList.add("other-user-button");
		}
	});
}

//updates the notification GUI elements
function updateNotifications(){
	//set visibility to all notification buttons/labels hidden when log on.
	resetVisibility(notificationContainer,"hidden");
	hideNotificationButtons();

	if (!userLoggedOn()){
		return;
	}
	// all shared exploration from current user exploratin folder (use username to id)
	var sharedExpl = currentUser.getSharedExploration();

	// newCount == the number of nonplayed shared exploration in current user folder
	var newCount = 0;

	sharedExpl.forEach(function(expl){
		if(expl.isNew)
			newCount++;
	});

	// show notification message
	if(newCount>0){
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(newCount + " new explorations.");
		notificationContainer.style.cursor = "pointer";
	}
	else{
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(" No new explorations.");
		notificationContainer.style.cursor = "not-allowed";
	}
}

// updates the state of the buttons (record, play, pause, stop, save, delete, reset)
function updateExplorationControls(specialCase){
	if (!selectedExploration){
		disableAction(["save","play","stop","pause","reset","delete"]);
		enableAction(["record"]);

		if (userLoggedOn()){
			enableAction(["record"]);
		}
		else {
			disableAction(["record"]);
		}
	}
	else if (!playing){
		enableAction(["record","play","reset","delete"]);
		disableAction(["stop","pause"]);

		changeButtonColour("record", false);
	}
	else if (playing){
		enableAction(["stop","pause"]);
		disableAction(["record","play","delete"]);
	}
	if (recording){
		disableAction(["save","play","stop","pause","delete"]);
		changeButtonColour("record", true);
	}

	if (specialCase){
		if (specialCase === "stopped-recording"){
			enableAction(["record","play","reset","save"]);
			disableAction(["stop","pause","delete"]);
			changeButtonColour("record", false);
			enableAction(["save"]);
		}
		if (specialCase === "saved"){
			disableAction(["save","delete"]);
		}
	}
}

// userLoggedOn funciton return currentUser object
// user loggedOn if not null
function updateLogonElements(){
	// if user is currently logged on, disable all userImage button
	if (userLoggedOn())
		toggleLogon(true,"not-allowed");
	else
		toggleLogon(false, "default" , "pointer");

}

function toggleLogon(loggedOn, cursorD, cursorP){
	// update logon button and username / password
	logonButton.value = loggedOn ? "Log off" : "Log on";
	userNameInput.disabled = loggedOn;
	passwordInput.disabled = loggedOn;
	userNameInput.style.cursor = cursorD;
	passwordInput.style.cursor = cursorD;
	// update user image
	var elems = document.getElementsByClassName("user-button");
		for(var i = 0; i<elems.length; i++){
			elems[i].disabled = loggedOn;
			if (!loggedOn)
				elems[i].style.cursor = cursorP;
			else
				elems[i].style.cursor = cursorD;
		}
	// logoff set value to default
	if (!loggedOn){
		userNameInput.value = "";
		passwordInput.value = "";
	}
}

// this function called once showPathButton clicked (event.js)
function toggleVisiblePath(){
	if(!selectedExploration) return;
	if(selectedExploration.hasCityEvents()){
		if(showPathButton.innerHTML=="Show Path"){
			pathView.showPathElems();
		}
		else if(showPathButton.innerHTML=="Hide Path"){
			pathView.hidePathElems();
		}
	}
}

// init shared element value
function updateShareExplElements(){
	document.getElementById("shared-with").value = "";
	document.getElementById("expl-sent-message").innerHTML = "";
}

// adds graphics to the map to show that recording is in progress.
function addRecordingGraphics(){
	// var points = [0, 0, width, height];
	var borderWidth = 10;
	var circleRadius = 20;
	var padding = 10;
	var bottomPadding = 10;
	var circleCX = borderWidth + circleRadius;
	var circleCY = borderWidth + circleRadius;

	svg.append("rect")
	.attr({
		id:    "record-border",
		x:     0 + borderWidth/2,
		y:     0 + borderWidth/2,
		width: width - borderWidth,
		height:height - bottomPadding - borderWidth})
		.style("stroke", "red")
		.style("fill", "none")
		.style("stroke-width", borderWidth);

	svg.append('circle')
	.attr({
		id: "record-circle",
		cx:  circleCX,
		cy:  circleCY,
		r: 	 circleRadius})
		.style('fill', 'red')
		.transition().duration();
}

//remove recording related graphics
function removeRecordingGraphics(){
	d3.select("#record-border").remove();
	d3.select("#record-circle").remove();
}

// function triggered when notification container clicked
// return true - when has new shared exploration
function showListNotifications(){

	while(notificationSelector.firstChild)//remove old labels
		notificationSelector.removeChild(notificationSelector.firstChild);

	var newSharedExpls = currentUser.getSharedExploration();
	var hasNewExpl = false;
	// if has new shared exploration append to notificationSelector
	if(newSharedExpls.length>0){
		newSharedExpls.forEach(function(expl, index){
			if(expl.isNew){
				var newOption = document.createElement('option');
				newOption.setAttribute("id", currentUser.name+index);
				newOption.value = index;
				explorationName = expl.name;
				newOption.innerHTML = explorationName;
				newOption.onclick  = function(){
					stopRecording();
					selectExploration(expl);
				};
				notificationSelector.appendChild(newOption);
				hasNewExpl = true;
			}
		});
	}
	return hasNewExpl;
}

function divHideShow(div){
	if (div.style.visibility==="visible"){
		div.style.visibility= "hidden";
	}
	else{
		div.style.visibility = "visible";
		//setTimeout(function () {div.style.display = "none";}, 3000);
	}
}
//reset notifications lable when logoff
function resetVisibility(idVar, state){
	idVar.style.visibility = state;
}

function hideNotificationButtons(){
	resetVisibility(notificationSelector, "hidden");
	resetVisibility(removeNotification, "hidden");
	resetVisibility(quickplayNotification, "hidden");
}

//displays information about the location selected
function displayLocationInfo(city){

	document.getElementById("location-title").innerHTML = city.properties.NAME;

	var annotations = document.getElementById("annotation-container");
	annotations.innerHTML = null; // clear previous annotations

	//remove and add new annotation input
	var annotationInputCont = document.getElementById("annotation-input-container");
	annotationInputCont.innerHTML = null;
	if (currentUser != null)
		makeAnnotationInput(annotationInputCont);

	// get annotations for this location
	$.ajax({
		type: 'GET',
		url: "/getAnnotations",
		data: city.properties.NAME,
		success: displayAnnotations,
		dataType: "json",
	});

	// displays annotations associated with the current location
	function displayAnnotations(annotations){
		// if response is "no_annotations", no annotations were found, so do nothing
		if (annotations === "no_annotations") return;
		// make a secondary annotation container so that all annotations can be loaded at once
		var container = document.createElement("div");
		container.className["annotation-container-2"];

		annotations.forEach(function(annotation){

			var userName = annotation.userName;
			var timeStamp = new Date(annotation.timeStamp);

			// h:mm format
			var time = 	timeStamp.getHours() + ":" +
			(timeStamp.getMinutes().toString().length < 2 ?
					"0" + timeStamp.getMinutes() :
						timeStamp.getMinutes());
			var date = timeStamp.getDate() + "/" + (timeStamp.getMonth()+1) + "/" + timeStamp.getFullYear().toString().substring(2,4);
			var annInfo = "<i> – " + userName + " " + time + " on " + date + "</i>";
			// make necessary DOM elements
			var rowDiv = document.createElement("div");
			var textDiv = document.createElement("div");
			var controlsDiv = document.createElement("div");
			var content = document.createElement("p");
			var info = document.createElement("p");

			// set class (styles are applied in styles.css)
			content.className = "annotation-text annotation-content";
			info.className = "annotation-text annotation-info";
			controlsDiv.className = "annotation-inner-container annotation-controls";
			textDiv.className ="annotation-inner-container annotation-text-container";
			rowDiv.className = "annotation-row";

			content.innerHTML = annotation.text;
			info.innerHTML = annInfo;

			// display delete button if user owns the annotation
			// TODO: more reliable equality check
			if (currentUser != null && currentUser.name === userName){
				var deleteButton = document.createElement("input");
				deleteButton.type = "image";
				deleteButton.src = IMAGE_PATH + "delete.png";
				deleteButton.id = "delete-button";
				deleteButton.onclick = function () { deleteAnnotation(annotation); }
				controlsDiv.appendChild(deleteButton);
			}

			textDiv.appendChild(content);
			textDiv.appendChild(info);

			rowDiv.appendChild(textDiv);
			rowDiv.appendChild(controlsDiv);

			container.appendChild(rowDiv);
		});
		// TODO: load all annotations at once
		document.getElementById("annotation-container")
		.appendChild(container);
	}
}

//makes an annotation text input element.
function makeAnnotationInput(container){
	var annInput = document.createElement("input");
	annInput.type = "text";
	annInput.placeholder = "Add annotation";

	annInput.onkeydown = function(event) { // if enter is pushed, submit the annotation
		if (event.keyCode === 13) submitAnnotation(annInput.value);
	}
	container.appendChild(annInput);
	annInput.focus();
}

function changeButtonColour(name, state){
	var button = document.getElementById(name + "-exploration-button");

	if (state)
		button.src = IMAGE_PATH + name + "-on.png";
	else
		button.src = IMAGE_PATH + name + "-off.png";
}

//displays an image of a microphone
function displayAudioGraphic(){
	svg.append("image")
	.attr({
		x: width*0.9,
		y: 20,
		width: 50,
		height: 50,
		"xlink:href": "data/image/microphone-128.png",
		id: "microphone-graphic"
	});
}

// removes the mic graphic shown while recording
function removeAudioGraphic(){
    svg.select("#microphone-graphic")
        .remove();
}