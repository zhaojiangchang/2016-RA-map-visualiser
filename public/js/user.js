
/*global $, window, selectedExploration, setTimeout, el, alert, updateSideBar,resetExplorations, updateNotifications,
 	Exploration, atob, Uint8Array, Blob, voiceMessageData, FileReader, appendAudioMessageOnSideBar, addAudioMessageDropDownNameList*/
/*exported attemptLogin, logout, userLoggedOn,attemptCreateAccount, shareExplFile, shareTextMessage,
    shareVoiceMessage, deleteAudioMessage, deletedVoiceMessageFromCurrentUser*/
var currentUser = null; // the user who is currently logged in

//user object is created with their name and explorations
function User(name, explorations){
	this.name = name;
	// the user's explorations
	this.explorations = explorations;
	// a recording in progress (none at start)
	this.currentExpl = null;
	// the user's messages
	this.annotations = [];
	this.messages = [];
	this.audioMessages = [];
	this.newMessages = [];
	this.newAudioMessages = [];
	this.selectedAudioMessage = null;
	this.setMessages = function(messages){
		this.messages = messages;
	};
	this.setAudioMessages = function(messages){
		this.audioMessages = messages;
	};
	this.setNewAudioMessages = function(messages){
		this.newAudioMessages = messages;
	};
	this.getMessages = function(){
		return this.messages;
	};
	this.getAudioMessages = function(){
		return this.audioMessage;
	};
	this.setTextMessageIsOld = function(message){
		var m = this.messages.indexOf(message);
		if(m!==-1){
			this.message[m].isNew = false;
		}
		m = this.newMessages.indexOf(message);
		if(m!==-1){
			this.newMessages.splice(m,1);
		}
	};
	this.setAudioMessageIsOld = function(message){

		var m = this.audioMessages.indexOf(message);
		if(m!==-1){
			this.audioMessages[m].isNew = false;
		}
		m = this.newAudioMessages.indexOf(message);
		if(m!==-1){
			this.newAudioMessages.splice(m,1);
		}
	};
	this.haveMessages = function(){
		return this.messages.length === 0;
	};
	this.haveAudioMessages = function(){
		return this.audioMessages.length > 0;
	};
	this.haveNewMessages = function(){
		return this.newMessages.length > 0;
	};
	this.haveNewAudioMessages = function(){
		return this.newAudioMessages.length > 0;

	};
	this.setNewMessages = function(newMessages){
		this.newMessages = newMessages;
	};
	this.getMessagesBySender = function(name){
		var messagesForSelectedSender = [];
		for (var i = 0; i<this.messages.length; i++){
				for (var j = 0; j<this.messages[i].length; j++){
					if(this.messages[i][j].from===name ||this.messages[i][j].to===name){
					messagesForSelectedSender[j] = this.messages[i][j];
				}
			}
		}
		return messagesForSelectedSender;
	};
	this.getAudioMessagesBySender = function(name){
		var audioMessagesForSelectedSender = [];
		for (var i = 0; i<this.audioMessages.length; i++){
			if(this.audioMessages[i][0].from===name){
				for (var j = 0; j<this.audioMessages[i].length; j++){
					audioMessagesForSelectedSender[j] = this.messages[i][j];
				}
			}
		}
		return audioMessagesForSelectedSender;
	};

	this.removeAudioMessageByMessage = function(message){
		var index = this.audioMessages.indexOf(message);
		if(index>-1){
			this.audioMessages.splice(index,1);
		}
		index = this.newAudioMessages.indexOf(message);
		if(index>-1){
			this.newAudioMessages.splice(index,1);
		}

	};
	// add an exploration
	this.addExploration = function (expl){
		this.explorations.push(expl);
	};

	this.setExplorations = function(explorations){
		this.explorations = explorations;
	};

	this.getCurrentExploration = function(){
		return this.currentExpl;
	};
	this.setCurrentExploration = function(expl){
		this.currentExpl = expl;
	};

	this.resetCurrentExploration = function(){
		this.currentExpl = null;
	};
	this.haveExploration = function(expl){
		return (this.explorations.indexOf(expl)>=0);
	};
	// gets an exploration (given a timestamp) from the user's collection of explorations
	this.getExploration = function(timeStamp){
		var userExpl = null;
		this.explorations.forEach(function(expl){
			if (expl.timeStamp.localeCompare(timeStamp)===0){
				userExpl = expl;
			}
		});
		return userExpl;
	};
	this.getSharedExploration = function(){
		var sharedExpl = [];
		this.explorations.forEach(function(expl){
			if(expl.userName.localeCompare(name)!==0){
				sharedExpl.push(expl);
			}
		});
		return sharedExpl;
	};

	this.getExplorationByIndex = function(index){
		return explorations[index];
	};

	this.getExplorations = function(){
		return this.explorations;
	};

	// gets all the explorations which are considered new
	this.getNewExplorations = function(){
		var newExplorations = [];
		this.explorations.forEach(function(exploration){
			if (exploration.isNew){
				newExplorations.push(exploration);
			}
		});
		return newExplorations;
	};

	// removes the first exploration from the user
	this.removeExploration = function(exploration){
		for (var i = 0; i < this.explorations.length; i++){
			if (this.explorations[i].equals(exploration)){
				this.explorations.splice(i, 1);
				}
			return true;
		}
	};
	// has the user got any explorations?
	this.hasExplorations = function(){
		return this.explorations.length > 0;
	};
	//set annotations to null
	this.setAnnotationsToNull = function(){
		this.annotations = [];
	};
	//remove info by annotation
	this.removeInfoByAnnotation = function(annotation, info){
		var index = this.annotations.indexOf(annotation);
		if(index===-1){
			return;
		}
		var indexInfo = this.annotations[index].info.indexOf(info);
		this.annotations[index].info.splice(indexInfo, 1);
	};
}

//=====================================================
//=========== Login logout=============================

//asks server if login details are acceptable
function attemptLogin(name, pw){

	// returns whether logon is approved
	$.ajax({
		type: 'POST',
		url: "/checkAuthentication",
		data : JSON.stringify({userName: name, password: pw}),
		success: gotApprovalResponse,
		contentType: "application/json"
	});

	function gotApprovalResponse(approved){
		if(JSON.parse(approved)){
			login(name);
		}
		else{
			alert("username/password are invalid");
		}
	}
}

//logs the user in, makes all of the user's file accessible
function login(name){
	currentUser = new User(name);
	loadAllExplorations(name, gotExplorations);
	el("share-file").style.display = "block";
	el("location-div").style.display = "none";
	function gotExplorations(allExplorations){
		currentUser.setExplorations(allExplorations);
		updateSideBar();
	}
}

//logs the current user out, removes access to the user's files
function logout(){
	currentUser = null;
	resetExplorations();
	updateNotifications();
	updateSideBar();
	resetShareDiv();
}
//returns true if there is a user currently logged on
function userLoggedOn(){
	return currentUser;
}
//=====================================================
//=========== Account =================================

//creates an account with this name and pw
function createAccount(name, pw){
	$.ajax({
		type: 'POST',
		url: "/createAccount",
		data: JSON.stringify({userName: name, password: pw}),
		contentType: "application/json",
		success: newAccountCreated});

	function newAccountCreated(){
		window.document.write("new account created!"); //callback when ajax request finishes
	}
}

//attempts to create an account. Alerts user if name and pw are unacceptable
function attemptCreateAccount(name, pw){
	$.ajax({
		type: 'POST',
		url: "/checkUsersFile",
		data : JSON.stringify({userName: name}),
		success: gotApproval,
		contentType: "application/json"
	});
	// got approval that the name and pw are acceptable
	function gotApproval(approved){
		if(!JSON.parse(approved)){
			createAccount(name, pw);
		}
		else{
			alert("user name already been used, please choose another name");
		}
	}
}

//=========================================================
//=========== Exploration =================================

//downloads all of the user's (specified by userName) explorations
function loadAllExplorations(userName, cb){
	$.ajax({
		type: 'GET',
		url: "/getUserExplorations",
		data: userName,
		success: function(data) { dealWithExplorations(data, cb); },
		contentType: "application/json",
	});

	// makes available all explorations receieved
	function dealWithExplorations(explorations, cb){
		// input arrays contain objects with exploration data, but no methods.
		var allExplorationsData = JSON.parse(explorations);
		var explorationCount = allExplorationsData.length;

		if (explorationCount === 0){
			$("#noOfFilesLoaded").html("no notification loaded");
		}
		else {
			$("#noOfFilesLoaded").html("have "+ explorationCount + " explorations loaded");
		}

		// transfer all data into new Exploration objects (so that methods can be used on them).
		var allExplorations = [];

		allExplorationsData.forEach(function(data){
			var exploration = new Exploration();

			// if expl has audio, convert audio arraybuffer to blob
			if (data.audio){
				var audioASCII = data.audio;
				var byteCharacters = atob(audioASCII);
				var byteNumbers = new Array(byteCharacters.length);
				for (var i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				var byteArray = new Uint8Array(byteNumbers);
				data.audio = new Blob([byteArray], {type: "audio/wav"});
			}

			exploration.transferPropertiesFrom(data);
			allExplorations.push(exploration);
		});

		// send back explorations
		cb(allExplorations);
	}
}

//shares the exploration with the user
function shareExplFile(exploration, userName){
	if(userName===currentUser.name ||selectedExploration===null){
		return;
	}
	$.ajax({
		type: 'POST',
		url: "/shareExploration",
		data: JSON.stringify({
			exploration: exploration,
			to: userName,
			from: currentUser.name
		}),
		success: function(response){
			if(!JSON.parse(response)){
				el("message-send-identify").innerHTML = "user does not exist!";
				setTimeout(function(){
					el("message-send-identify").style.display = "none"; }, 5000);
			}
			else {
				var userLabelValue = el("shared-with").value;
				el("message-send-identify").innerHTML = "Sent to: "+userLabelValue+ "     ExplName:"+ selectedExploration.name;
				setTimeout(function(){
					el("message-send-identify").style.display = "none";}, 5000);
			}

		}, //callback when ajax request finishes
		contentType: "application/json" //text/json...
	});
}
//=====================================================
//=========== Message =================================
//share text message to userLabelValue
function shareTextMessage(userLabelValue){
	var testMessageToSend = el("text-message-input").value;
	if(testMessageToSend===null){
		return;
	}
	var Message = {
			timeStamp: new Date(),
			from: currentUser.name,
			to: userLabelValue,
			message: testMessageToSend,
			isNew: true
	};
	$.ajax({
		type: 'POST',
		url: "/postMessage",
		data: JSON.stringify(Message),
		success: function(){
			el("sendOption").value = "select";
			el("text-message-input-div").style.display = "none";
			el("shared-with").value = "";
		},
		contentType: "application/json"
	});
}
// init share div - (city info, text message, audio message and send)
function resetShareDiv(){
	el("showTextArea").innerHTML = '';
	el("share-file").style.display = "none";
	el("messageFromOption").value = 'select';
	el("location-div").style.display = "none";
	while(el("messageFromOption").firstChild){//remove old labels
		//if(el("messageFromOption").value!='select')
		el("messageFromOption").removeChild(el("messageFromOption").firstChild);
	}
	while(el("audio-messages-list").firstChild){
		el("audio-messages-list").removeChild(el("audio-messages-list").firstChild);
	}
}
//share voice message to userLabelValue
function shareVoiceMessage(userLabelValue){
	if(voiceMessageData===null){
		return;
	}
	//converted audio
	var newFormetVoice = null;
	var VoiceMessage = null;
	var reader = new FileReader();
	reader.addEventListener("loadend", audioConverted);
	reader.readAsBinaryString(voiceMessageData);
	function audioConverted(){
		var audioString = reader.result;
		newFormetVoice = audioString;
		VoiceMessage = {
				timeStamp: new Date(),
				from: currentUser.name,
				to: userLabelValue,
				audioData: newFormetVoice,
				isNew: true
		};
		$.ajax({
			type: 'POST',
			url: "/postVoiceMessage",
			data: JSON.stringify(VoiceMessage),
			success: function(){
				el("record-voice").style.display = "none";
				el("shared-with").value = "";
				el("message-send-identify").style.display = "block";
				el("message-send-identify").innerHTML = "Voice message send to "+ userLabelValue;
				setTimeout(function(){
					el("message-send-identify").style.display = "none";}, 5000);},
					contentType: "application/json"
		});
	}

}

//delete voice message
function deleteAudioMessage(message){
	return function(){
		$.ajax({
			type: 'POST',
			url: "deleteAudioMessage",
			data: JSON.stringify({
				message: message,
				currentUser: currentUser.name }),
				contentType: "application/json",
				success: deletedVoiceMessageFromCurrentUser
		});

		function deletedVoiceMessageFromCurrentUser(){
			currentUser.removeAudioMessageByMessage(message);
			while(el("audio-messages-list").firstChild){
				el("audio-messages-list").removeChild(el("audio-messages-list").firstChild);
			}
			if(currentUser.audioMessages.length>0)
				{
				appendAudioMessageOnSideBar();
				}
				else{

				addAudioMessageDropDownNameList();
			}
		}
	};
}