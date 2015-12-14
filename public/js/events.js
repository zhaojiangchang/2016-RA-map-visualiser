/* global document, IMAGE_PATH, $, el, currentUser,userLoggedOn,explRecording, userNameInput, passwordInput,
   stopRecording, inserting, startRecording, getCurrentPlaybackTime, audioRecorder, insertIntoSelectedExploration,
   progressBar, paused, selectedExploration, resumePlayback, startPlayback, pausePlayback, stopPlayback, saveExploration,
   deleteExploration, resetExplorations, updateSelectedExploration, explChooser,toggleVisiblePath,
   showPathButton, logonButton, selectedLocation,logout, attemptLogin, window, notificationContainer,updateNotifications,
   showListNotifications, notificationSelector,showNotificationButtons, hideNotificationButtons, removeNotification,
   setExplorationIsOld, checkTextMessages, deselectExploration, quickplayNotification, submitAnnotation, insertButton,
   FileReader, shareExplFile, setTimeout,startAudioRecording, shareTextMessage, shareVoiceMessage,
   stopAudioRecording, makeShortTimeFormat,deleteAudioMessage,resetVisibility, audioElem*/
/* exported onFileSelected, selectedSendInfoOption, selectedMessageSenderOption, selectedAudioMessageSenderOption*/
/*global inserting:true , selectedLocation:true, */

//=================================================================================
//Author: Will Hardwick-Smith & Jacky Chang
//Contains: Event handlers for most GUI elements, including:
//- log in elements
//- exploration control buttons
//- exploration chooser
//- notifications
//- inserting
//=================================================================================
var recordExplButton = el("record-exploration-button"),
playExplButton = $("#play-exploration-button"),
pauseExplButton = $("#pause-exploration-button"),
stopExplButton = $("#stop-exploration-button"),
deleteExplButton = $("#delete-exploration-button"),
saveExplButton = $("#save-exploration-button"),
resetExplButton = $("#reset-exploration-button"),
palyControlButton = el("play-control"),
saveAnnButton = el("save-ann-button"),
stopInsertButton = $("#stop-insert-button"),
removeImgButton  = el("remove-img-button");
//========= guest users =============================

var guestUsers = ["obama", "john", "lorde", "will"],
selectedImgFile = null,
voiceMessageRecording = false,
voiceMessageData = null;

//add onclick listener - when click guest user image to assign predefined user name and password
guestUsers.forEach(function(userName){
	el(userName).onclick= function() {
		userNameInput.value = userName;
		passwordInput.value = "password";
	};
});
//=================================================
//========= exploration controls ==================

//record expl button pressed
//If currently recording -
//If inserting new expl into current selected expl Do: stop recording
//else stop recording
//else stop recording
recordExplButton.addEventListener("click", function(){
	var currentExpl = currentUser.getCurrentExploration();

	if (explRecording){
		if (inserting){
			if (audioRecorder){
				stopRecording(doneRecording);
			}
			else {
				doneRecording();
				stopRecording();
			}
		}
		else{
			stopRecording();
		}

	}
	else{
		startRecording();
	}
	// set progressBar and update selectedExploration
	function doneRecording(){
		inserting = false;
		var insertionDuration = currentExpl.getDuration();
		var currentTime = getCurrentPlaybackTime();

		insertIntoSelectedExploration(currentExpl);

		// gui stuff
		progressBar.hideInsertGraphics();
		progressBar.showInsertedChunk(currentTime, insertionDuration);
		palyControlButton.style.pointerEvents = 'auto';

	}
});

//play button clicked (sidebar)- play selected exploration
playExplButton.on('click', function () {
	if (paused){
		resumePlayback(selectedExploration);
	}
	else {
		startPlayback(selectedExploration);
	}
});

//pause button clicked (sidebar)- pause play selected exploration
pauseExplButton.on('click', function(){
	pausePlayback(selectedExploration);
});

//stop button clicked (sidebar)- stop play selected exploration
stopExplButton.on('click', function(){
	stopPlayback(selectedExploration);
});

//save button clicked (sidebar)- save recorded exploration and set selected exploration as saved
saveExplButton.click(function(){
	saveExploration(currentUser.getCurrentExploration());
});

//delete button clicked (sidebar)- delete exploration from current user,s explorations list
//if selected exploration is not null do: select the next exploraiton from the list.
deleteExplButton.click(function(){
	if (selectedExploration){
		deleteExploration(selectedExploration);
	}
});

//reset button clicked (sidebar) - reset to init. SelectedExploration === first exploration in Exploration list
resetExplButton.click(resetExplorations);

//==========================================
//======== exploration chooser and login====

//Explorations dropdown list (sidebar) - click item on the list to set selected exploration
explChooser.onclick = updateSelectedExploration;
//Show and hide path button (on main canvas top-right) - show and hide path view
showPathButton.onclick = toggleVisiblePath;

//submit button
logonButton.onclick = function(){
	// if no one is logged on
	if(userLoggedOn()){
		selectedLocation = null;
		if (!explRecording){
			logout(currentUser);
		}
	}
	else{
		attemptLogin(userNameInput.value, passwordInput.value);
	}
};

//==========================================
//============== create new account ========
var myWindow = null;
var newAccount = el("create-new-account");
newAccount.onclick = function(){
	//open new web browser
	myWindow = window.open("new-account.html", "_blank", "toolbar=yes, scrollbars=no, resizable=no, top=500, left=800, width=270, height=180");
};

//==========================================
//=============== notifications ============

//notification container clicked - show or hide the selector box
notificationContainer.addEventListener('click',function(){
	stopRecording();
	updateNotifications();
	if(showListNotifications()){
		if(notificationSelector.style.visibility === "hidden"){
			showNotificationButtons();
		}

		else {
			hideNotificationButtons();
		}
	}
	else{
		hideNotificationButtons();
	}
});

//remove exploration from selector box, not delete from user's folder
removeNotification.addEventListener("click", function(){
	var selected = currentUser.getSharedExploration()[notificationSelector.options[notificationSelector.selectedIndex].value];
	selected.isNew = false;
	setExplorationIsOld(selected);
	checkTextMessages();
	deselectExploration();
});

//play button for notification - play without set expl to old
quickplayNotification.addEventListener("click", function(){
	var selected = currentUser.getSharedExploration()[notificationSelector.options[notificationSelector.selectedIndex].value];
	startPlayback(selected);
	selected.isNew = true;
	checkTextMessages();
});

//===========================================
//=========== annotation ====================

//remove annotation
removeImgButton.addEventListener('click', function(){
	var previewImg = el("preview-city-img");
	while(previewImg.firstChild)//remove old labels
	{
		previewImg.removeChild(previewImg.firstChild);
	}
});
//save annotation
saveAnnButton.addEventListener('click', function(){
	var annInput = el('annInput').value;
	if(annInput === "")	{
		return;
	}
	submitAnnotation(annInput);
	selectedImgFile = null;
});

//==========================================
//=========== inserting expl ===============

//insert button displayed when paused playback
insertButton.click(function(){
	inserting = true;
	startRecording();
	insertButton.css("visibility", "hidden");
	palyControlButton.style.pointerEvents = 'none';
	var time = getCurrentPlaybackTime();
	var xpos = progressBar.getXPosOfTime(time);
	progressBar.showInsertGraphics(xpos);

});

//stop insert button clicked to add recording to current exploration
stopInsertButton.click( function(){
	var currentExpl = currentUser.getCurrentExploration();

	// if audio, wait for conversion to wav
	if (audioRecorder){
		stopRecording(doneRecording);
	}
	else {
		stopRecording();
		doneRecording();
	}

	function doneRecording(){
		inserting = false;

		var insertionDuration = currentExpl.getDuration();
		var currentTime = getCurrentPlaybackTime();

		insertIntoSelectedExploration(currentExpl);

		// gui stuff
		progressBar.hideInsertGraphics();
		progressBar.showInsertedChunk(currentTime, insertionDuration);
		palyControlButton.style.pointerEvents = 'auto';

	}
});

//==========================================
//=========== inserting image ==============

//file browse for image select
function onFileSelected(event) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	var imgtag = document.createElement("img");
	imgtag.title = selectedFile.name;

	reader.onload = function(event) {
		imgtag.src = event.target.result;
	};

	reader.readAsDataURL(selectedFile);
	var previewImg = el("preview-city-img");
	while(previewImg.firstChild)//remove old labels
	{
		previewImg.removeChild(previewImg.firstChild);
	}
	previewImg.appendChild(imgtag);
	el("location-div").appendChild(previewImg);

	selectedImgFile = imgtag;

}

//=========================================
//============= share button ==============

//exploration file sent when button clicked
//userLabelValue: receiver
//if userLabelValue not on the userList on the server will not able to send.
el("submit-shared-file").addEventListener('click',function(){
	if(el("shared-with").value==='') {
		return;
	}
	var userLabelValue = el("shared-with").value;
	var sendOptionValue = el("sendOption").value;
	if(sendOptionValue === null){
		return;
	}
	switch(sendOptionValue){
	case "exploration":
		if(!selectedExploration){
			return;
		}
		shareExplFile(selectedExploration, userLabelValue);
		setTimeout(function(){
			resetVisibility(el("selectedExplName"), "hidden");}, 5000);
		break;
	case "text":
		if(el("text-message-input").value === '') {
			return;
		}
		shareTextMessage(userLabelValue);
		el("message-send-identify").innerHTML = "Text message sent to: "+userLabelValue;
		setTimeout(function(){el("message-send-identify").style.display = "none";}, 5000);
		break;
	case "voice":
		if(el("record-voice").value==="Stop Recording" || voiceMessageData === null){
			return;
		}
		else {
			shareVoiceMessage(userLabelValue);

		}
		break;


	}
	el("sendOption").value = "select";
	el("record-voice").value="Start Recording";


});

//==========================================
//=========== select - options (Send to:)===

//on click on select send options (exploration, text, audio)to send to other users
function selectedSendInfoOption() {
	if(el("shared-with").value===''){
		el("sendOption").value = "select";
		return;
	}
	removegroupElem("selectedExplName");
	el("message-send-identify").innerHTML = '';
	el("text-message-input").value = '';
	el("text-message-input-div").style.display = "none";
	el("record-voice").style.display = "none";
	var sendOptionValue = el("sendOption").value;
	switch(sendOptionValue){
	case "exploration":
		if(!selectedExploration){
			return;
		}
		var p = document.createElement("p");
		p.id = "selectedExplName";
		p.className = "selectedExplName";
		var div = el("selectedExplNameDivId");
		div.appendChild(p);
		p.innerHTML= "Selected: "+selectedExploration.name;
		break;
	case "text":
		el("text-message-input-div").style.display = "block";
		break;
	case "voice":
		if(explRecording){
			window.alert('Can Not Record Exploration and Voice Message At Same Time!');
		}
		else{
			el("record-voice").style.display = "block";
		}
		break;

	}
}


//=====================================================
//=========== Send Voice ==============================

// click button to start, stop or reset recording
el("record-voice").onclick = function(){
	if(el("record-voice").value==="Start Recording" && audioRecorder){
		updateRecordVoiceButton();
		startRecordVoiceMessage();

	}else if(el("record-voice").value==="Stop Recording" && audioRecorder){
		updateRecordVoiceButton();
		stopRecordVoiceMessage();
	}
	else if(el("record-voice").value==="Reset Recording" && audioRecorder){
		updateRecordVoiceButton();
	    audioRecorder.clear();
	}
	else{
		window.alert("No voice input device detected");
	}
	//update reocrding voice button
	function updateRecordVoiceButton(){
		// if user is currently logged on, disable all userImage button
		if (el("record-voice").value==="Start Recording"){
			el("record-voice").value="Stop Recording";
		}
		else if(el("record-voice").value==="Stop Recording"){
			el("record-voice").value="Reset Recording";
		}
		else if(el("record-voice").value==="Reset Recording"){
			el("record-voice").value="Start Recording";
		}
	}
	//start recording
	function startRecordVoiceMessage(){
		voiceMessageRecording = false;
		if (audioRecorder){
			voiceMessageRecording = true;
			voiceMessageData = null;
			startAudioRecording();
		}
	}
	//stop recording
	function stopRecordVoiceMessage(){
		stopAudioRecording();
	}
};


//=====================================================
//=========== show messages from all other senders  ===

//show text messages
function selectedMessageSenderOption(){
	el("showTextArea").innerHTML = '';
	var selectedName = el("messageFromOption").value;
	var messagesFromSender = currentUser.getMessagesBySender(selectedName);
	for(var i = 0; i<messagesFromSender.length; i++){
		el("showTextArea").innerHTML += "\nTime: " + makeShortTimeFormat(new Date(messagesFromSender[i].timeStamp));
		if(messagesFromSender[i].isNew && selectedName!==currentUser.name){
			if(messagesFromSender[i].to===currentUser.name){
				el("showTextArea").innerHTML += "\n"+messagesFromSender[i].from + "(New Message) "  + ": "+messagesFromSender[i].message;

			}else {
				el("showTextArea").innerHTML += "\n"+currentUser.name + ": "+messagesFromSender[i].message;
			}

		}
		else if(!messagesFromSender[i].isNew && selectedName!==currentUser.name){
			el("showTextArea").innerHTML += "\n"+messagesFromSender[i].from+": "+messagesFromSender[i].message;

		}
		else if(selectedName === currentUser.name){
			el("showTextArea").innerHTML += "\n"+ messagesFromSender[i].from +" to "+ messagesFromSender[i].to + ": "+messagesFromSender[i].message;
		}

		el("showTextArea").innerHTML += "\n";
	}
	updateNotifications();


}

//show audio messages
function selectedAudioMessageSenderOption(){
	var selectedName = el("audioMessageFromOption").value;
	if(selectedName === "select"){
		el("audio-messages-list").parentNode.removeChild(el("audio-messages-list"));

	}
	else{
		while(el("audio-messages-list").firstChild){
			el("audio-messages-list").removeChild(el("audio-messages-list").firstChild);
		}
		resetVisibility(el("audio-message-div"), "visible");
		appendAudioMessageOnSideBar(selectedName);
	}

}

//append audio message when select sender from Audio message drop down list
function appendAudioMessageOnSideBar(selectedName){
	var newAudioMessages = [];
	//currentUser.audioMessages.forEach(function(message){
	for(var i = 0; i <currentUser.audioMessages.length; i++){
		var message = currentUser.audioMessages[i];
		if(message.from===selectedName ||message.to===selectedName) {

			//removegroupElem("audio-messages-list");
			var sender = message.from;
			var timeStamp = new Date(message.timeStamp);
			// h:mm format
			var time = 	makeShortTimeFormat(timeStamp);
			// make necessary DOM elements
			var rowDiv = document.createElement("div");
			var textDiv = document.createElement("div");
			var controlsDiv = document.createElement("div");
			var info = document.createElement("p");

			// set class (styles are applied in styles.css)
			info.className = "annotation-text annotation-info";
			info.id = sender + timeStamp+"wav";
			controlsDiv.className = "annotation-inner-container annotation-controls";
			textDiv.className ="annotation-inner-container annotation-text-container";
			rowDiv.className = "annotation-row";

			if(message.isNew && message.to === currentUser.name){
				newAudioMessages.push(message);
				if(currentUser.name===message.to){
					info.innerHTML = "(New) "+ sender +" "+time;
				}
				else{
					info.innerHTML = "(New) "+ sender+" to "+message.to+" "+time;
				}
			}
			else{
				if(currentUser.name===message.to){
					info.innerHTML = sender +" "+time;
				}
				else{
					info.innerHTML = sender+" to "+message.to+" "+time;
				}

			}
			info.onclick = playAudioMessage(message);


			// display delete button if user owns the annotation
			// TODO: more reliable equality check
			if (currentUser !== null){
				var deleteButton = document.createElement("input");
				deleteButton.type = "image";
				deleteButton.src = IMAGE_PATH + "delete.png";
				deleteButton.id = "delete-button";
				deleteButton.onclick = deleteAudioMessage(message);
				controlsDiv.appendChild(deleteButton);
			}

			textDiv.appendChild(info);

			rowDiv.appendChild(textDiv);
			rowDiv.appendChild(controlsDiv);
			var div = document.createElement('div');
			div.id = "audio-messages-list";
			el("audio-message-div").appendChild(div);
			el("audio-messages-list").appendChild(rowDiv);
		}
	}
	resetVisibility(el("audio-messages-list"), "visible");
}
//=====================================================
//=========== functions ===============================

//remove element by classname
function removegroupElem(classname) {
	var list = document.getElementsByClassName(classname);
	for(var i=list.length-1; i>=0; i--){
		var elem = list[i];
		if(elem.className === classname){
			elem.parentNode.removeChild(elem);
		}
	}
}

// play audio message when click message label
function playAudioMessage(message){
	return function(){
		var audioBlob = message.audioData;
		audioElem.src = (window.URL || window.webkitURL).createObjectURL(audioBlob);
		audioElem.play();
	};
}
//---- INIT
resetExplorations();