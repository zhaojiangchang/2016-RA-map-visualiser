var currentUser = null; // the user who is currently logged in

// user object is created with their name and explorations
function User(name, explorations){
	this.name = name;
	// the user's explorations
	this.explorations = explorations;
	// a recording in progress (none at start)
	this.currentExpl = null;

	// add an exploration
	this.addExploration = function (expl){
		this.explorations.push(expl);
	};

	this.setExplorations = function(explorations){
		this.explorations = explorations;
	}

	this.getCurrentExploration = function(){
		return this.currentExpl;
	}
	this.setCurrentExploration = function(expl){
		this.currentExpl = expl;
	};

	this.resetCurrentExploration = function(){
		this.currentExpl = null;
	};
	this.haveExploration = function(expl){
		if(this.explorations.indexOf(expl)>=0) return true;
		else return false;
	};
	// gets an exploration (given a timestamp) from the user's collection of explorations
	this.getExploration = function(timeStamp){
		var userExpl = null;
		this.explorations.forEach(function(expl){
			if (expl.timeStamp.localeCompare(timeStamp)==0){
				userExpl = expl;
			}
		});
		return userExpl;
	};
	this.getSharedExploration = function(){
		var sharedExpl = [];
		this.explorations.forEach(function(expl){
			if(expl.userName.localeCompare(name)!=0){
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
	}

	// gets all the explorations which are considered new
	this.getNewExplorations = function(){
		var newExplorations = [];
		this.explorations.forEach(function(exploration){
			if (exploration.isNew){
				newExplorations.push(exploration);
			}
		});
		return newExplorations;
	}

	// removes the first exploration from the user
	this.removeExploration = function(exploration){
		for (var i = 0; i < this.explorations.length; i++){
			if (this.explorations[i].equals(exploration))
				this.explorations.splice(i, 1);
				return true;
		}
	}
	// has the user got any explorations?
	this.hasExplorations = function(){
		return this.explorations.length > 0;
	}
}

// asks server if login details are acceptable
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

// logs the user in, makes all of the user's file accessible
function login(name){
	currentUser = new User(name);
	loadAllExplorations(name, gotExplorations);

	function gotExplorations(allExplorations){
		currentUser.setExplorations(allExplorations);
		updateSideBar();
	}
}

// logs the current user out, removes access to the user's files
function logout(){
	currentUser = null;
	resetExplorations();
	updateSideBar();
}

// attempts to create an account. Alerts user if name and pw are unacceptable
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

// downloads all of the user's (specified by userName) explorations
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

		if (explorationCount == 0){
			$("#noOfFilesLoaded").html("no exploration loaded");
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

// shares the exploration with the user
function shareFile(exploration, userName){
	if(userName==currentUser.name) return;
	if(selectedExploration==null) return;
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
				document.getElementById("expl-sent-message").innerHTML = "user does not exist!";
			}
			else {
				var userLabelValue = document.getElementById("shared-with").value;
				document.getElementById("expl-sent-message").innerHTML = "Sent to: "+userLabelValue+ "     ExplName:"+ selectedExploration.name;
			}

		}, //callback when ajax request finishes
		contentType: "application/json" //text/json...
	});
}

// creates an account with this name and pw
function createAccount(name, pw){
	console.log("add new user's name and pw to logonInfo file");

	$.ajax({
		type: 'POST',
		url: "createAccount",
		data: JSON.stringify({userName: name, password: pw}),
		contentType: "application/json",
		success: function(response){ console.log(response); }, //callback when ajax request finishes
	});
	window.document.write("new account created!");
	window.close();
}

// returns true if there is a user currently logged on
function userLoggedOn(){
	return currentUser;
}