//=================================================================================
//Author: Will Hardwick-Smith & Jacky Chang
//Contains: Only GUI/view related methods, such as:
//- graphical representations
//- animations
//- disabling/enabling buttons
//- showing/hiding elements
//- reloading data for GUI elements
//=================================================================================

//------ Dom elements --------
var recordExplButton = el("record-exploration-button"),
playExplButton = $("#play-exploration-button"),
pauseExplButton = $("#pause-exploration-button"),
stopExplButton = $("#stop-exploration-button"),
saveExplButton = $("#save-exploration-button"),
deleteExplButton = $("#delete-exploration-button"),
resetExplButton = $("#reset-exploration-button"),
explChooser = el("exploration-selector"),
userNameInput = el("username-input"),
passwordInput = el("password-input"),
logonButton = el("logon-button"),
messageBar = el("percent"),
notificationContainer = el("notification-container"),
removeNotification = el("remove-notification"),
quickplayNotification = el("quickplay-notification"),
notificationSelector = el("notification-selector"),
notificationElements = document.getElementsByClassName("notification-elements")
showPathButton = el("show-path");
insertButton = $("#insert-button"),
stopInsertButton = $("#stop-insert-button"),
explorationTitle = $("#exploration-title"),
timeText = $("#time-text"),
durationText = $("#duration-text"),
hasAudio = $("#has-audio"),
aboveBarDiv = $("#above-bar"),
belowBarDiv = $("#below-bar"),
palyControlButton = el("play-control");
saveAnnButton = el("save-ann-button");
removeImgButton  = el("remove-img-button");


//updates elements in the side bar
function updateSideBar(){
	updateUserButtons(currentUser);
	updateExplorationChooser();
	updateLocationInfo();
	updateExplorationControls();
	checkNotifications();
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

//updates the state of the buttons (record, play, pause, stop, save, delete, reset)
function updateExplorationControls(specialCase){
	if (!selectedExploration){
		disableAction(["save","play","stop","pause","reset","delete"]);
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
	if (explRecording){
		disableAction(["save","play","stop","pause","delete"]);
		enableAction(["record"]);
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
//userLoggedOn funciton return currentUser object
//user loggedOn if not null
function updateLogonElements(){
	// if user is currently logged on, disable all userImage button
	if (userLoggedOn()){
		toggleLogon(true,"not-allowed");
	}
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

//=====================================================
//=========== Notification ============================

function checkNotifications(){
	checkTextMessages();
	checkAudioMessages();
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
	var newMessages = currentUser.newMessages;
	// newCount == the number of nonplayed shared exploration in current user folder
	var newExplCount = 0;
	var newMessageCount = 0;

	sharedExpl.forEach(function(expl){
		if(expl.isNew)
			newExplCount++;

	});
	newMessages.forEach(function(message){
		if(message.isNew)
			newMessageCount++;


	});

	// show notification message
	if(newExplCount>0 && newMessageCount==0){
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(newExplCount + " new expls.");
		notificationContainer.style.cursor = "pointer";
	}
	else if(newExplCount>0 && newMessageCount>0){
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(newMessageCount + " new msgs and "+newExplCount+" expls.");
		notificationContainer.style.cursor = "pointer";
	}
	else if(newExplCount==0 && newMessageCount>0){
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(newMessageCount + " new msgs.");
		notificationContainer.style.cursor = "pointer";
	}
	else{
		resetVisibility(notificationContainer,"visible");
		$("#notification-container").html(" No new notification.");
		notificationContainer.style.cursor = "not-allowed";
	}
	showListNotifications();
}
//function triggered when notification container clicked
//return true - when has new shared exploration
function showListNotifications(){
	while(notificationSelector.firstChild)//remove old labels
		notificationSelector.removeChild(notificationSelector.firstChild);

	var newSharedExpls = currentUser.getSharedExploration();
	var hasNewNoti = false;
	var newMessages = [];
	if(currentUser.haveNewMessages()) {
		newMessages = currentUser.newMessages;
	}

	// if has new shared exploration append to notificationSelector
	if(newSharedExpls.length>0 || newMessages.length>0){

		if(newMessages.length>0){
			newMessages.forEach(function(message, index){
				var newOption = document.createElement('option');
				newOption.setAttribute("id", currentUser.name+"message"+ index);
				newOption.value = index;
				messageName = "Message: "+message.from + " "+makeShortTimeFormat(new Date(message.timeStamp));
				newOption.innerHTML = messageName;
				newOption.onclick  = function(){
					//TODO: show message
					setMessageIsOld(message);
					addOptions(message);
				};
				notificationSelector.appendChild(newOption);
				hasNewNoti = true;
			});
		}

		if(newSharedExpls.length>0){
			newSharedExpls.forEach(function(expl, index){
				if(expl.isNew){
					var newOption = document.createElement('option');
					newOption.setAttribute("id", currentUser.name+index);
					newOption.value = index;
					explorationName = "Expl: "+ expl.name;
					newOption.innerHTML = explorationName;
					newOption.onclick  = function(){
						stopRecording();
						selectExploration(expl);
					};
					notificationSelector.appendChild(newOption);
					hasNewNoti = true;
				}
			}

			);
		}
	}
	return hasNewNoti;

}
function addOptions(message){
	resetVisibility(el("show-messages-div"), "visible");
	el("showTextArea").innerHTML = '';
	for(var i = 0; i<currentUser.messages.length; i++){
		for(var j = 0; j<currentUser.messages[i].length; j++){
			if(currentUser.messages[i][j].from==message.from){
				el("showTextArea").innerHTML += "\nTime: " + makeShortTimeFormat(new Date(currentUser.messages[i][j].timeStamp));
				if(currentUser.messages[i][j].isNew){
					el("showTextArea").innerHTML += "\n"+currentUser.messages[i][j].from+"(New Message): " + currentUser.messages[i][j].message;

				}
				else{
					el("showTextArea").innerHTML += "\n"+currentUser.messages[i][j].from+": " + currentUser.messages[i][j].message;

				}
				el("showTextArea").innerHTML += "\n";
			}

		}
	}
	updateNotifications();
}


function hideNotificationButtons(){
	resetVisibility(notificationSelector, "hidden");
	resetVisibility(removeNotification, "hidden");
	resetVisibility(quickplayNotification, "hidden");
}
function showNotificationButtons(){
	resetVisibility(notificationSelector, "visible");
	resetVisibility(removeNotification, "visible");
	resetVisibility(quickplayNotification, "visible");
}

//this function called once showPathButton clicked (event.js)
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

//init shared element value
function updateShareExplElements(){
	el("shared-with").value = "";
	el("expl-sent-message").innerHTML = "";
}

//=====================================================
//=========== GUI  ====================================

//adds graphics to the map to show that recording is in progress.
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
		width: width - borderWidth*2,
		height:height - bottomPadding - borderWidth*2})
		.style("stroke", "red")
		.style("fill", "none")
		.style("stroke-width", borderWidth);

	svg.append('circle')
	.attr({
		id: "record-circle",
		cx:  circleCX + borderWidth/2,
		cy:  circleCY + borderWidth/2,
		r: 	 circleRadius})
		.style('fill', 'red')
		.transition().duration();
}

//remove recording related graphics
function removeRecordingGraphics(){
	d3.select("#record-border").remove();
	d3.select("#record-circle").remove();
}

//=====================================================
//=========== Annotation  =============================

//displays information about the location selected
function displayLocationInfo(city){


	el("location-title").innerHTML = city.properties.NAME;


	var annotations = el("annotation-container");
	annotations.innerHTML = null; // clear previous annotations

	//remove and add new annotation input
	var annotationInputCont = el("annotation-input-container");
	annotationInputCont.innerHTML = null;
	if (currentUser != null)
		makeAnnotationInput(annotationInputCont);

	getAnnotationFromLocalServer(city);
}

function getAnnotationFromLocalServer(city){
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
		while(el("annotation-container").firstChild)//remove old labels
			el("annotation-container").removeChild(el("annotation-container").firstChild);
		// if response is "no_annotations", no annotations were found, so do nothing
		if (annotations === "no_annotations") return;
		el("file-browse").style.display = "block";
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
			var imgDiv = document.createElement('div');
			var content = document.createElement("p");
			var info = document.createElement("p");

			// set class (styles are applied in styles.css)
			content.className = "annotation-text annotation-content";
			info.className = "annotation-text annotation-info";
			controlsDiv.className = "annotation-inner-container annotation-controls";
			textDiv.className ="annotation-inner-container annotation-text-container";
			rowDiv.className = "annotation-row";
			imgDiv.className = "annotation-image";

			if(annotation.imageData!=null){
				var image = new Image();
				image.src = annotation.imageData;
				image.width = 50;
				image.height = 50;
				imgDiv.appendChild(image);
				image.onclick = function(){
					while(el("preview-city-img").firstChild)//remove old labels
						el("preview-city-img").removeChild(el("preview-city-img").firstChild);
					var img = new Image();
					img.src = annotation.imageData;
					img.width = 250;
					img.height = 300;
					el("preview-city-img").appendChild(img);

				}
			}
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
			container.appendChild(imgDiv);
		});

		// TODO: load all annotations at once
		el("annotation-container")
		.appendChild(container);

	}

}

//makes an annotation text input element.
function makeAnnotationInput(container){
	var annInput = document.createElement("input");
	annInput.id = "annInput";
	annInput.type = "text";
	annInput.placeholder = "Add annotation";

	annInput.onkeydown = function(event) { // if enter is pushed, submit the annotation
		if (event.keyCode === 13) {
			submitAnnotation(annInput.value);
			selectedImgFile = null;
		}
	}
	container.appendChild(annInput);
	annInput.focus();
}

//=====================================================
//=========== Messages  ==========================
var messageFromNameList = [];
//check local server  - messages
function checkTextMessages(){
	if(currentUser==null) return;

	$.ajax({
		type: 'GET',
		url: "/getMessages",
		data: currentUser.name,
		success: setMessage,
		dataType: "json",
	});
	function setMessage(messages){
		messageFromNameList = [];
		currentUser.setMessages(messages);
		var newMessages = [];
		for (var i = 0; i < messages.length; i++){
			messageFromNameList[i] = messages[i][0].from;
			for(var j = 0; j< messages[i].length; j++){
				if(messages[i][j].isNew==true && messages[i][j].from!=currentUser.name){
					newMessages.push(messages[i][j]);
				}

			}
		}
		currentUser.newMessages = newMessages;
		updateNotifications();
		if(messageFromNameList.length!=0){
			el("show-messages-div").style.display = "block";
			if(el("messageFrom1")==null){
				var option = document.createElement('option');
				option.setAttribute("id", "messageFrom1");
				var name = "Select a sender";
				option.innerHTML = name;
				option.value = "select";
				el("messageFromOption").appendChild(option);
			}

			resetVisibility(el("show-messages-div"), "visible");
			for(var j = 0; j<messageFromNameList.length;j++){
				var name = messageFromNameList[j];
				if(el(name+"Message")==null && name!=currentUser.name){
					console.log(name +"    "+currentUser.name)
					option = document.createElement('option');
					option.setAttribute("id", name+"Message");
					option.innerHTML = name;
					option.value = name;
					el("messageFromOption").appendChild(option);
				}
			}
		}
		else{
			el("show-messages-div").style.display = "none";
		}
	}
}

function setMessageIsOld(m){
	currentUser.setIsOld(m);
	$.ajax({
		type: 'POST',
		url: "setMessageIsOld",
		data: JSON.stringify({
			mObject: m,
			sender:m.from,
			currentUser:m.to, // the user who made the exploration
			timeStamp: m.timeStamp,
			messageDetial: m.message

		}),
		contentType: "application/json"
	});
}

var voiceMessageFromNameList = [];
//check local server  - messages
function checkAudioMessages(){
	if(currentUser==null) return;
	$.ajax({
		type: 'GET',
		url: "/getAudioMessages",
		data: currentUser.name,
		success: setMessage,
		dataType: "json",
	});
	function setMessage(messages){
		console.log(messages)
		audioMessageFromNameList = [];
		currentUser.setAudioMessages(messages);
		var newAudioMessages = [];
		for (var i = 0; i < messages.length; i++){
			if(messages[i].isNew==true && messages[i].from!=currentUser.name){
				if(messages[i].from!=currentUser.name)
					newAudioMessages.push(messages[i]);
				if($.inArray(messages[i].from,audioMessageFromNameList )==-1)
					audioMessageFromNameList.push(messages[i].from);

				}
			}
		console.log(audioMessageFromNameList)

		currentUser.newAudioMessages = newAudioMessages;
		updateNotifications();

		if(audioMessageFromNameList.length!=0){
			el("audio-messages-list").style.display = "block";
			if(el("audio-message-from")==null){
				var option = document.createElement('option');
				option.setAttribute("id", "audio-message-from");
				var name = "Select a sender";
				option.innerHTML = name;
				option.value = "select";
				el("audioMessageFromOption").appendChild(option);
			}

			resetVisibility(el("show-messages-div"), "visible");
			for(var j = 0; j<audioMessageFromNameList.length;j++){
				var name = audioMessageFromNameList[j];

				if(el(name+"VoiceMessage")==null){
					option = document.createElement('option');
					option.setAttribute("id", name+"VoiceMessage");
					option.innerHTML = name;
					option.value = name;
					el("audioMessageFromOption").appendChild(option);
				}
			}
		}
		else{
			el("audio-messages-list").style.display = "none";
		}
	}
}

function setVoiceMessageIsOld(m){
	currentUser.setIsOld(m);
	$.ajax({
		type: 'POST',
		url: "setMessageIsOld",
		data: JSON.stringify({
			mObject: m,
			sender:m.from,
			currentUser:m.to, // the user who made the exploration
			timeStamp: m.timeStamp,
			messageDetial: m.message

		}),
		contentType: "application/json"
	});
}





//=====================================================
//=========== functions  ==============================

function changeButtonColour(name, state){
	var button = el(name + "-exploration-button");

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

//removes the mic graphic shown while recording
function removeAudioGraphic(){
	svg.select("#microphone-graphic")
	.remove();
}

function el(id){
	return document.getElementById(id);
}
function makeShortTimeFormat(date){
	// convert millis to mm:ss
	var hours = date.getHours().toString(),
	minutes = date.getMinutes()<10		? "0" + date.getMinutes().toString() : date.getMinutes(),
			seconds = date.getSeconds()< 10 	? "0" + date.getSeconds().toString() : date.getSeconds(),
					day = date.getDate(),
					month = monthAsString(date.getMonth());

			return hours + ":" + minutes + " -" + day + "th " + month;
			function monthAsString(monthIndex){
				return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
			}
}

window.setInterval(function(){
	if(currentUser!=null){
		loadAllExplorations(currentUser.name, gotExplorations);
		enableAction(["delete"]);
		updateExplorationChooser();


	}

	if(selectedLocation!=null){
		getAnnotationFromLocalServer(selectedLocation);
	}
	//updateShareExplElements();
	checkTextMessages();
}, 10000);


function gotExplorations(allExplorations){
	currentUser.setExplorations(allExplorations);
	updateExplorationChooser();
}

$("#messageFromOption").html($("#messageFromOption option").sort(function (a, b) {
	return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
}))

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