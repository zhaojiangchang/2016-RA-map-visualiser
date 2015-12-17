
/* global document, $, currentUser,userLoggedOn,atob,Blob,disableAction,enableAction,playing,
   ensureExplorationSelected,explRecording, height, width, svg, updateLocationInfo, selectedExploration,
   stopRecording, selectExploration, playAudioMessage, pathView, Image, submitAnnotation, selectedImgFile,
   window, loadAllExplorations, selectedLocation, Uint8Array*/
/* exported updateSideBar, showNotificationButtons, toggleVisiblePath,addRecordingGraphics, removeRecordingGraphics,
   displayLocationInfo, setVoiceMessageIsOld, removeAudioGraphic, displayAudioGraphic*/
/*global selectedImgFile:true*/

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

var explChooser = el("exploration-selector"),
userNameInput = el("username-input"),
passwordInput = el("password-input"),
logonButton = el("logon-button"),
notificationContainer = el("notification-container"),
removeNotification = el("remove-notification"),
quickplayNotification = el("quickplay-notification"),
notificationSelector = el("notification-selector"),
showPathButton = el("show-path");

//-------------------------------

var IMAGE_PATH = "data/image/";
var palyExplNotification = false;
//updates elements in the side bar
function updateSideBar(){
	updateUserButtons(currentUser);
	updateExplorationChooser();
	updateExplorationControls();
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
	}else {
		$("#exploration-selector").show();
	}
	explorations.sort(function(b, a){
		return new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime();
	});
	explorations.forEach(function(exploration, index){
		var explOption = document.createElement('option');
		explOption.setAttribute("id", exploration.timeStamp);
		var explorationName = exploration.name
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
	else{
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
			{
				elems[i].style.cursor = cursorP;
			}
			else
			{
				elems[i].style.cursor = cursorD;
			}
		}
		// logoff set value to default
		if (!loggedOn){
			userNameInput.value = "";
			passwordInput.value = "";
		}
	}
}



//=====================================================
//=========== Notification ============================

//updates the notification GUI elements
function updateNotifications(){

	//set visibility to all notification buttons/labels hidden when log on.
	resetVisibility(notificationContainer,"hidden");
	el("audioMessageFromOption").value = "select";
	//resetVisibility(el("audio-messages-list"), "hidden");

	//hideNotificationButtons();
	if (!userLoggedOn()){
		return;
	}

	// all shared exploration from current user exploratin folder (use username to id)

	var sharedExpl = currentUser.getSharedExploration();
	var newMessages = currentUser.newMessages;
	var newAudioMessages = currentUser.newAudioMessages;
	// newCount == the number of nonplayed shared exploration in current user folder
	var newExplCount = 0;
	var newMessageCount = 0;
	var newAudioMessageCount = 0;


	sharedExpl.forEach(function(expl){
		if(expl.isNew){
			newExplCount++;
		}

	});
	newMessages.forEach(function(message){
		if(message.isNew){
			newMessageCount++;
		}
	});
	newAudioMessages.forEach(function(message){
		if(message.isNew){
			newAudioMessageCount++;
		}
	});
	// show notification message
	if(newExplCount>0 ||newMessageCount||newAudioMessageCount>0){
			el("message-menuBar").style.background = "red";
		 resetVisibility(el("notification"),"visible");
		// $("#notification-container").html( "Have new notificaiton.");
		// notificationContainer.style.cursor = "pointer";
	}
	else{
		el("message-menuBar").style.background = "#337ab7";
		 resetVisibility(el("notification"),"hidden");
		// $("#notification-container").html(" No new notification.");
		// notificationContainer.style.cursor = "not-allowed";
	}
	showListNotifications();
}

//function triggered when notification container clicked
//return true - when has new shared exploration
function showListNotifications(){
	while(notificationSelector.firstChild)//remove old labels
	{
		notificationSelector.removeChild(notificationSelector.firstChild);
	}

	var newSharedExpls = currentUser.getSharedExploration();
	var hasNewNoti = false;
	var newTextMessages = [];
	var newAudioMessages = [];
	if(currentUser.haveNewMessages()) {
		newTextMessages = currentUser.newMessages;
	}
	if(currentUser.haveNewAudioMessages()){
		newAudioMessages = currentUser.newAudioMessages;
	}

	// if has new shared exploration append to notificationSelector
	if(newSharedExpls.length>0 || newTextMessages.length>0 ||newAudioMessages.length>0){

		if(newTextMessages.length>0){
			newTextMessages.forEach(function(message, index){
				var newOption = document.createElement('option');
				newOption.setAttribute("id", currentUser.name+"Message"+ index);
				newOption.value = index;
				var messageName = "Txt Msg: "+message.from + " "+makeShortTimeFormat(new Date(message.timeStamp));
				newOption.innerHTML = messageName;
				newOption.onclick  = function(){
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
					var explorationName = "Expl: "+ expl.name;
					newOption.innerHTML = explorationName;
					newOption.onclick  = function(){
						palyExplNotification = true;
						stopRecording();
						selectExploration(expl);
						startPlayback(selectedExploration);
						updateNotifications();
					};
					notificationSelector.appendChild(newOption);
					hasNewNoti = true;
				}
			}

			);
		}
		if(newAudioMessages.length>0){
			newAudioMessages.forEach(function(message, index){
				var newOption = document.createElement('option');
				newOption.setAttribute("id", currentUser.name+"AudioMessage"+ index);
				newOption.value = index;
				var messageName = "Audio Msgs: "+message.from + " "+makeShortTimeFormat(new Date(message.timeStamp));
				newOption.innerHTML = messageName;
				newOption.onclick  = function(){
					//TODO: show message
					playAudioMessage(message);
					setNewAudioMessageIsOld(message);

				};
				notificationSelector.appendChild(newOption);
				hasNewNoti = true;
			});
		}

	}
	return hasNewNoti;

	function addOptions(message){
		//resetVisibility(el("text-message-div"), "visible");
		el("showTextArea").innerHTML = '';
		for(var i = 0; i<currentUser.messages.length; i++){
			for(var j = 0; j<currentUser.messages[i].length; j++){
				if(currentUser.messages[i][j].from===message.from){
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
}

function updateShareExplElements(){
	el("shared-with").value = "";
	el("message-send-identify").innerHTML = "";
	checkTextMessages();
	checkAudioMessages();
}

//=====================================================
//=========== GUI  ====================================

//adds graphics to the map to show that recording is in progress.
function addRecordingGraphics(){
	// var points = [0, 0, width, height];
	var borderWidth = 10;
	var circleRadius = 20;
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
	if (currentUser !== null){
		makeAnnotationInput(annotationInputCont);
	}

	getAnnotationFromLocalServer(city);
}

function getAnnotationFromLocalServer(city){
	if(city===undefined){
		return;
	}
	var info = city.properties.NAME +" "+city.geometry.coordinates[0].toString()+" "+city.geometry.coordinates[1].toString()
	// get annotations for this location
	$.ajax({
		type: 'GET',
		url: "/getAnnotations",
		//data: info,
		data: JSON.stringify(info),
		contentType: "application/json",
				//complete: updateLocationInfo
		success: displayAnnotations,
		//dataType: "json",
	});
	// displays annotations associated with the current location
	function displayAnnotations(annotations){
		while(el("annotation-container").firstChild){//remove old labels
			el("annotation-container").removeChild(el("annotation-container").firstChild);
		}
		el("location-div").style.display = "block";
		// if response is "no_annotations", no annotations were found, so do nothing
		if(annotations.length>0){
			currentUser.setAnnotationsToNull();
			for(var i= 0; i< annotations.length; i++){
				if(annotations[i].location.properties.NAME === selectedLocation.properties.NAME &&
						annotations[i].userName===currentUser.name && currentUser.annotations.indexOf(annotations[i])<0){
					currentUser.annotations.push(annotations[i]);
				}
			}
			// make a secondary annotation container so that all annotations can be loaded at once
			appendAnnotations(annotations);
			// TODO: load all annotations at once
		}
	}
}
//append annotations
function appendAnnotations(annotations){
	var container = document.createElement("div");
	container.className = "annotation-container-2";

	var infos = [];
	for(var i = 0; i<annotations.length; i++){
		infos.push.apply(infos,annotations[i].info);
	}
	infos.sort(function(b, a){
		return new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime();
	});

	if(infos.length===0){
		return;
	}
	infos.forEach(function(info){
		var userName = info.textAndImg.userName;
		var timeStamp = new Date(info.timeStamp);

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
		var p = document.createElement("p");

		// set class (styles are applied in styles.css)
		content.className = "annotation-text annotation-content";
		p.className = "annotation-text annotation-info";
		controlsDiv.className = "annotation-inner-container annotation-controls";
		textDiv.className ="annotation-inner-container annotation-text-container";
		rowDiv.className = "annotation-row";
		imgDiv.className = "annotation-image";
		imgDiv.id = "annotation-image";
		if(info.textAndImg.imageData!==null){
			var image = new Image();
			image.src = info.textAndImg.imageData;
			image.width = 50;
			image.height = 50;
			imgDiv.appendChild(image);
			image.onclick = function(){
				while(el("preview-city-img").firstChild){//remove old labels
					el("preview-city-img").removeChild(el("preview-city-img").firstChild);
				}
				var img = new Image();
				img.src = info.textAndImg.imageData;
				img.width = 250;
				img.height = 300;
				el("preview-city-img").appendChild(img);
			};
			container.appendChild(imgDiv);
		}
		content.innerHTML = info.textAndImg.text;
		p.innerHTML = annInfo;

		// display delete button if user owns the annotation
		// TODO: more reliable equality check
		if (currentUser !== null && currentUser.name === userName){
			var deleteButton = document.createElement("input");
			deleteButton.type = "image";
			deleteButton.src = IMAGE_PATH + "delete.png";
			deleteButton.id = "delete-button";

			deleteButton.onclick = function () {
				var ann = null;
				for(var i= 0; i<currentUser.annotations.length; i++){
					if(currentUser.annotations[i].info.indexOf(info)>=0){
						ann = currentUser.annotations[i];
						currentUser.removeInfoByAnnotation(ann, info);

						break;
					}
				}
				deleteAnnotation(ann);
			};
			controlsDiv.appendChild(deleteButton);
		}

		// removing an annotation from a location.
		function deleteAnnotation(annotation){
			$.ajax({
				type: 'POST',
				url: "/deleteAnnotation",
				data: JSON.stringify(annotation),
				contentType: "application/json",
				complete: updateLocationInfo
			});
		}
		textDiv.appendChild(content);
		textDiv.appendChild(p);

		rowDiv.appendChild(textDiv);
		rowDiv.appendChild(controlsDiv);
		container.appendChild(rowDiv);
		el("annotation-container").appendChild(container);
	});
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
	};
	container.appendChild(annInput);
	annInput.focus();
}

//=====================================================
//=========== Messages  ==========================
var messageFromNameList = [];
//check local server  - messages
//update the currentUse - assign message and new message to current user
function checkTextMessages(){
	if(currentUser===null){
		return;
	}
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
			for(var j = 0; j< messages[i].length; j++){
				if(messages[i][j].from!==currentUser.name && $.inArray(messages[i][j].from,messageFromNameList[i])===-1){
					messageFromNameList[i] = messages[i][j].from;
				}
				if(messages[i][j].isNew===true && messages[i][j].from!==currentUser.name){
					newMessages.push(messages[i][j]);
				}

			}
		}
		currentUser.newMessages = newMessages;
		updateNotifications();

		if(messageFromNameList.length!==0){
			//el("text-message-div").style.visibility = "visible";
			appendTextMessageNameList(messageFromNameList);
		}
		else{
			//el("text-message-div").style.visibility = "hidden";
		}
	}
	function appendTextMessageNameList(messageFromNameList){
		if(el("messageFrom1")===null){
			var option = document.createElement('option');
			option.setAttribute("id", "messageFrom1");
			option.innerHTML = "Select a sender";
			option.value = "select";
			el("messageFromOption").appendChild(option);
		}
		for(var k = 0; k<messageFromNameList.length;k++){
			var name = messageFromNameList[k];

			if(el(name+"Message")===null){
				var option2 = document.createElement('option');
				option2.setAttribute("id", name+"Message");
				option2.innerHTML = name;
				option2.value = name;
				el("messageFromOption").appendChild(option2);
			}
		}
	}
}
//set local server text message isNew === false
function setMessageIsOld(m){
	currentUser.setTextMessageIsOld(m);
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

//set local server audio message isNew === false
function setNewAudioMessageIsOld(m){
	$.ajax({
		type: 'POST',
		url: "setAudioMessageIsOld",
		data: JSON.stringify({
			mObject: m,
			sender:m.from,
			currentUser:m.to, // the user who made the exploration
			timeStamp: m.timeStamp,
			messageDetial: m.message

		}),
		success:setMessageToOld,
		contentType: "application/json"
	});
	function setMessageToOld(){
		//currentUser.setAudioMessageIsOld(m);
		checkAudioMessages();
	}
}

var audioMessageFromNameList = [];
//check local server  - messages
//if current user's audio message not equals null display audio message drop down to show the messages
function checkAudioMessages(){
	if(currentUser===null){
		return;
	}
	$.ajax({
		type: 'GET',
		url: "/getAudioMessages",
		data: currentUser.name,
		success: setMessage,
		dataType: "json",
	});
	function setMessage(messages){
		audioMessageFromNameList = [];
		currentUser.setAudioMessages(messages);
		if(currentUser.audioMessages.length<1){
			//el("audio-message-div").style.visibility = "hidden";
			return;
		}
		else{
			//el("audio-message-div").style.visibility = "visible";
		}
		currentUser.audioMessages.forEach(function(message){
			if(message.audioData===null){
				return;
			}
			var audioASCII = message.audioData;
			var byteCharacters = atob(audioASCII);
			var byteNumbers = new Array(byteCharacters.length);
			for (var i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			var byteArray = new Uint8Array(byteNumbers);
			message.audioData = new Blob([byteArray], {type: "audio/wav"});
			if($.inArray(message.from,audioMessageFromNameList )===-1){
				audioMessageFromNameList.push(message.from);
			}


		});
		var newAudioMessages = [];
		for (var i = 0; i < messages.length; i++){
			if(messages[i].from!==currentUser.name && messages[i].isNew){
				if(messages[i].from!==currentUser.name){
					newAudioMessages.push(messages[i]);
				}
			}
		}

		currentUser.newAudioMessages = newAudioMessages;
		if(audioMessageFromNameList.length>0){
			///el("audio-message-div").style.display = "block";
			addAudioMessageDropDownNameList(audioMessageFromNameList);
			updateNotifications();
		}
		else{
			//el("audio-message-div").style.display = "none";
		}

	}
}
function addAudioMessageDropDownNameList(audioMessageFromNameList){
	while(el("audioMessageFromOption").firstChild){
		el("audioMessageFromOption").removeChild(el("audioMessageFromOption").firstChild);
	}
	if(el("audio-message-from")===null){
		var option = document.createElement('option');
		option.setAttribute("id", "audio-message-from");
		option.innerHTML = "Select a sender";
		option.value = "select";
		option.disabled = true;
		el("audioMessageFromOption").appendChild(option);
	}
	for(var j = 0; j<audioMessageFromNameList.length;j++){
		var name = audioMessageFromNameList[j];
		if(el(name+"VoiceMessage")===null && name!== currentUser.name){
			var option2 = document.createElement('option');
			option2.setAttribute("id", name+"VoiceMessage");
			option2.innerHTML = name;
			option2.value = name;
			el("audioMessageFromOption").appendChild(option2);
		}
	}


}

//set audio message to old once user played audio message from notification bar
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

//exploration control buttons
function changeButtonColour(name, state){
	var button = el(name + "-exploration-button");

	if (state){
		button.src = IMAGE_PATH + name + "-on.png";
	}
	else{
		button.src = IMAGE_PATH + name + "-off.png";
	}
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
//time format: 10:59 - 30th Mar 2015
function makeShortTimeFormat(date){
	// convert millis to mm:ss
	var hours = date.getHours().toString(),
	minutes = date.getMinutes()<10		? "0" + date.getMinutes().toString() : date.getMinutes(),
			//seconds = date.getSeconds()< 10 	? "0" + date.getSeconds().toString() : date.getSeconds(),
			day = date.getDate(),
			month = monthAsString(date.getMonth()),
			year = date.getYear() + 1900;

	return hours + ":" + minutes + " -" + day + "th " + month +" "+ year;
	function monthAsString(monthIndex){
		return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
	}
}

window.setInterval(function(){
	if(currentUser!==null){
		loadAllExplorations(currentUser.name, gotExplorations);
		enableAction(["delete"]);
		updateExplorationChooser();
	}
	if(selectedLocation!==null){
		//getAnnotationFromLocalServer(selectedLocation);
		selectedLocation=null;
	}
	checkTextMessages();
	checkAudioMessages();
}, 20000);


function gotExplorations(allExplorations){
	currentUser.setExplorations(allExplorations);
	updateExplorationChooser();
}

$("#messageFromOption").html($("#messageFromOption option").sort(function (b, a) {
	return a.text === b.text ? 0 : a.text < b.text ? -1 : 1;
}));

//reset notifications lable when logoff
function resetVisibility(idVar, state){
	idVar.style.visibility = state;
}

function hideNotificationButtons(){
	resetVisibility(notificationSelector, "hidden");
	// resetVisibility(removeNotification, "hidden");
	// resetVisibility(quickplayNotification, "hidden");
}
function showNotificationButtons(){
	resetVisibility(notificationSelector, "visible");
	// resetVisibility(removeNotification, "visible");
	// resetVisibility(quickplayNotification, "visible");
}

//this function called once showPathButton clicked (event.js)
function toggleVisiblePath(){
	if(!selectedExploration){
		return;
	}
	if(selectedExploration.hasCityEvents()){
		if(showPathButton.innerHTML==="Show Path"){
			pathView.showPathElems();
		}
		else if(showPathButton.innerHTML==="Hide Path"){
			pathView.hidePathElems();
		}
	}
}

//init shared element value