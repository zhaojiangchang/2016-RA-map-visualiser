//=================================================================================
//Author: Will Hardwick-Smith & Jacky Chang
//Contains: Event handlers for most GUI elements, including:
//- log in elements
//- exploration control buttons
//- exploration chooser
//- notifications
//- inserting
//=================================================================================

//========= guest users =============================

var guestUsers = ["obama", "john", "lorde", "will"];
var selectedSendOption = "exploration";
var testMessageToSend = null;

var selectedImgFile = null;

guestUsers.forEach(function(userName){
	el(userName).onclick= function() {
		userNameInput.value = userName;
		passwordInput.value = "password";
	};
});
//=================================================
//========= exploration controls ==================

recordExplButton.addEventListener("click", function(){
	var currentExpl = currentUser.getCurrentExploration();

	if (recording){
		stopRecording();
		if (inserting){
			if (audioRecorder){
				stopRecording(doneRecording);
			}
			else {
				doneRecording();
			}
		}
	}
	else
		startRecording();
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

playExplButton.on('click', function () {
	if (paused)
		resumePlayback(selectedExploration);
	else startPlayback(selectedExploration);
});

pauseExplButton.on('click', function(){
	pausePlayback(selectedExploration);
});

stopExplButton.on('click', function(){
	stopPlayback(selectedExploration);
});

saveExplButton.click(function(){
	saveExploration(currentUser.getCurrentExploration());
});

deleteExplButton.click(function(){
	if (selectedExploration)
		deleteExploration(selectedExploration);
});

resetExplButton.click(resetExplorations);

//==========================================
//======== exploration chooser and login====

explChooser.onclick = updateSelectedExploration;

showPathButton.onclick = toggleVisiblePath;

//submit button
logonButton.onclick = function(){
	// if no one is logged on
	if(userLoggedOn()){
		selectedLocation = null;
		if (!recording)
			logout(currentUser);
	}
	else{
		attemptLogin(userNameInput.value, passwordInput.value);
	}
};

//=========================================
//============= share button ==============

//exploration file sent when button clicked
//userLabelValue: receiver
//if userLabelValue not on the userList on the server will not able to send.
el("submit-shared-file").addEventListener('click',function(){
	var userLabelValue = el("shared-with").value;
	if(userLabelValue==null || userLabelValue==currentUser.name) return;
	if(selectedSendOption === "exploration" && selectedExploration!=null){
		shareExplFile(selectedExploration, userLabelValue);
	}
	else if(selectedSendOption === "text"){
		shareTextMessage(userLabelValue);



	}
});

//==========================================
//============== create new account ========
var myWindow;
var newAccount = el("create-new-account");
newAccount.onclick = function(){
	myWindow = window.open("new-account.html", "_blank", "toolbar=yes, scrollbars=no, resizable=no, top=500, left=800, width=270, height=180");
};

//==========================================
//=============== notifications ============

//notification container clicked - show or hide the selector box
notificationContainer.addEventListener('click',function(){
	stopRecording();
//	checkMessages();
	updateNotifications();
	if(showListNotifications()){
		if(notificationSelector.style.visibility == "hidden"){
			console.log(1)
			showNotificationButtons();
		}

		else hideNotificationButtons();
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
	checkMessages();
	deselectExploration();
});

quickplayNotification.addEventListener("click", function(){
	selected = currentUser.getSharedExploration()[notificationSelector.options[notificationSelector.selectedIndex].value];
	startPlayback(selected);
	selected.isNew = true;
	checkMessages();
});

//===========================================
//=========== annotation ====================

removeImgButton.addEventListener('click', function(){
	var previewImg = el("preview-city-img");
	while(previewImg.firstChild)//remove old labels
		previewImg.removeChild(previewImg.firstChild);
});

saveAnnButton.addEventListener('click', function(){
	var annInput = el('annInput').value;
	if(annInput == "")	return;
	submitAnnotation(annInput);
	selectedImgFile = null;
})

//==========================================
//=========== inserting ====================

insertButton.click(function(){
	inserting = true;
	startRecording();
	insertButton.css("visibility", "hidden");
	palyControlButton.style.pointerEvents = 'none';
	var time = getCurrentPlaybackTime();
	var xpos = progressBar.getXPosOfTime(time);
	progressBar.showInsertGraphics(xpos);

});

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

function onFileSelected(event) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	var imgtag = document.createElement("img");
	imgtag.title = selectedFile.name;

	reader.onload = function(event) {
		imgtag.src = event.target.result;
	};

	reader.readAsDataURL(selectedFile);
	console.log(imgtag)
	var previewImg = el("preview-city-img");
	while(previewImg.firstChild)//remove old labels
		previewImg.removeChild(previewImg.firstChild);
	previewImg.appendChild(imgtag);
	el("location-div").appendChild(previewImg);

	selectedImgFile = imgtag;
	console.log(selectedFile);

}

function selectedOption() {
	var sendOption = el("sendOption");
	for(var i = 0; i<sendOption.options.length; i++){
		sendOption.options[sendOption.selectedIndex].onclick = function(){
			console.log("clicked")
			selectedSendOption = sendOption.options[sendOption.selectedIndex].value;
			if(selectedSendOption === "text"){
				el("text-message-input-div").style.display = "block";


			}
			if(selectedSendOption === "exploration" ||selectedSendOption === "voice"||selectedSendOption === "select"  ){
				el("text-message-input-div").style.display = "none";
			}
			if(selectedSendOption === "exploration"){
				removegroupElem("selectedExplName");
				if(!selectedExploration)return;
				console.log(selectedExploration.name)
				var p = document.createElement("p");
				p.id = "selectedExplName";
				p.className = "selectedExplName";
				var div = el("selectedExplNameDivId");
				div.appendChild(p);
				p.innerHTML= "Selected: "+selectedExploration.name;

			}
			if(selectedSendOption === "voice"){

			}
			if(selectedSendOption === "text" ||selectedSendOption === "voice"||selectedSendOption === "select" ){
				removegroupElem("selectedExplName");
				el("text-message-input").innerHTML = '';
			}
		}
	}
}
function selectedMessageSenderOption(){
	var messageFromOption = el("messageFromOption");
	el("showTextArea").innerHTML = '';

	for(var i = 0; i<messageFromOption.options.length; i++){
		messageFromOption.options[messageFromOption.selectedIndex].onclick = function(){
			selectedMessageFromOption = messageFromOption.options[messageFromOption.selectedIndex].value;
			var messagesFromSender = currentUser.getMessagesBySender(selectedMessageFromOption);
			for(var i = 0; i<messagesFromSender.length; i++){
				el("showTextArea").innerHTML += "\nTime: " + makeShortTimeFormat(new Date(messagesFromSender[i].timeStamp));
				if(messagesFromSender[i].isNew){
					el("showTextArea").innerHTML += "\n"+messagesFromSender[i].from+"(New Message) " + ": "+messagesFromSender[i].message;

				}
				else{
					el("showTextArea").innerHTML += "\n"+messagesFromSender[i].from+": "+messagesFromSender[i].message;

				}

				el("showTextArea").innerHTML += "\n";
			}

		}

	}
	updateNotifications();

}
function removegroupElem(classname) {
	var list = document.getElementsByClassName(classname);
	for(var i=list.length-1; i>=0; i--){
		var elem = list[i];
		if(elem.className === classname){
			console.log(elem.className)
			elem.parentNode.removeChild(elem);
		}
	}
}
//---- INIT
resetExplorations();