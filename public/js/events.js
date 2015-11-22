// =================================================================================
// Author: Will Hardwick-Smith & Jacky Chang
// Contains: Event handlers for most GUI elements, including:
// - log in elements
// - exploration control buttons
// - exploration chooser
// - notifications
// - inserting
// =================================================================================

// ========= guest users =============================

var guestUsers = ["obama", "john", "lorde", "will"];

guestUsers.forEach(function(userName){
	document.getElementById(userName).onclick= function() {
		userNameInput.value = userName;
		passwordInput.value = "password";
	};
});
// =================================================
// ========= exploration controls ==================

recordExplButton.addEventListener("click", function(){
	if (recording){
		stopRecording();
		if (inserting)
			insertIntoSelectedExploration(currentUser.getCurrentExploration());
	}
	else
		startRecording();
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

// ==========================================
// ======== exploration chooser and login====

explChooser.onclick = updateSelectedExploration;

showPathButton.onclick = toggleVisiblePath;

//submit button
logonButton.onclick = function(){
	// if noone is logged on
	if(userLoggedOn()){
		if (!recording)
			logout(currentUser);
	}
	else{
		attemptLogin(userNameInput.value, passwordInput.value);
	}
};

// =========================================
// ============= share button ==============

// exploration file sent when button clicked
// userLabelValue: receiver
// if userLabelValue not on the userList on the server will not able to send.
document.getElementById("submit-shared-file").addEventListener('click',function(){
	var userLabelValue = document.getElementById("shared-with").value;
	if(userLabelValue!=null && userLabelValue!=currentUser.name && selectedExploration!=null){
		shareFile(selectedExploration, userLabelValue);
	}
});

// ==========================================
// ============== create new account ========
var myWindow;
var newAccount = document.getElementById("create-new-account");
newAccount.onclick = function(){
	myWindow = window.open("new-account.html", "_blank", "toolbar=yes, scrollbars=no, resizable=no, top=500, left=800, width=270, height=180");
};

// ==========================================
// =============== notifications ============

// notification container clicked - show or hide the selector box
notificationContainer.addEventListener('click',function(){
	stopRecording();
	if(showListNotifications()){
		if($(".notification-elements").hide())
			$(".notification-elements").show();
		else $(".notification-elements").hide();

	}
	else{
		$(".notification-elements").hide();
	}
});

// remove exploration from selector box, not delete from user's folder
removeNotification.addEventListener("click", function(){
	var selected = currentUser.getSharedExploration()[notificationSelector.options[notificationSelector.selectedIndex].value];
	selected.isNew = false;
	setExplorationIsOld(selected);

	hideNotificationButtons();
	updateNotifications();
	deselectExploration();
});

quickplayNotification.addEventListener("click", function(){
	selected = currentUser.getSharedExploration()[notificationSelector.options[notificationSelector.selectedIndex].value];
	startPlayback(selected);
	selected.isNew = true;
	updateNotifications();
});

// ==========================================
// =========== inserting ====================

insertButton.click(function(){
	inserting = true;
	startRecording();
	insertButton.css("visibility", "hidden");
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
	}
});

// ---- INIT
resetExplorations();