//=================================================================================
//Author: Will Hardwick-Smith & Jacky Chang
//Contains: Handlers for client-side requests, such as:
//- retrieving explorations and annotations
//- verifying a username and password
//-
//=================================================================================

var express = require('express');
var bodyParser = require('body-parser');
var btoa = require("btoa");
var fs = require('fs');
var app = express();

app.use(bodyParser.json({limit: '50mb'}));

//listen on port 3000
var server = app.listen(3000, function() {
	console.log('Listening on port %d', server.address().port);
});

app.use(express.static(__dirname + '/public'));

var USER_PATH = "public/data/user/",
ANNOTATION_PATH = "public/data/annotation/",
USER_INFO_FILE_NAME = "usersInfo.json"; // all user information is store in here

//returns whether an account with the username and pw exist
app.post("/checkAuthentication", function(req, res){

	var fields = req.body;
	var userName = fields.userName;
	var pw = fields.password;

	ensureDirExists(USER_PATH);
	var path = USER_PATH + userName + "/";
	// check if user dir exists
	doesUserExist(userName);

	var users = JSON.parse(fs.readFileSync(USER_PATH + USER_INFO_FILE_NAME));

	// check if uname and pw match
	var authenticated = false;

	users.forEach(function(user){
		if (user.userName === userName
				&& user.password === pw){
			authenticated = true;
			console.log("logged in with un: " + user.userName + "\npw: " + user.password);
		}
	});

	res.send(JSON.stringify(authenticated));
});

//sends all explorations which belong to a user
app.get("/getUserExplorations", function(req, res){
	var userName = req._parsedUrl.query; // data is appended to the URL

	console.log("retrieving all explorations for " + userName);

	var userPath = USER_PATH + userName + "/",
	explPath = userPath + "explorations/";

	// ensure all dirs exist.
	ensureDirExists(userPath);
	ensureDirExists(explPath);

	// get user info
	var allExplorations = [];

	fs.readdirSync(explPath).forEach(function(filename){
		var filePath = explPath + filename;
		if (fs.lstatSync(filePath).isDirectory())
			return;
		var exploration = JSON.parse(fs.readFileSync(filePath));

		// if exploration has audio, grab audio and attach to the exploration
		if (exploration.audio){
			var audioPath = exploration.audio;
			var fd = fs.readFileSync(audioPath, "binary");
			var ascii = btoa(fd);
			exploration.audio = ascii;
		}

		allExplorations.push(exploration);
	});

	// sends all and new explorations as separate arrays
	res.send(JSON.stringify(allExplorations));
});

//post exploration on the map for loading
app.post('/postExploration', function(req, res){

	var exploration = req.body;
	var timeStamp = exploration.timeStamp;
	var userName = exploration.userName;
	// makes directory for files if none exist.
	var path = USER_PATH;
	ensureDirExists(path);
	path += userName + "/";
	ensureDirExists(path);
	path += "explorations/";
	ensureDirExists(path);

	// save audio to different file
	if (exploration.audio){
		var audioPath = saveAudio(exploration.audio, path + "audio/", timeStamp);
		// replace audio data with audio file location.
		exploration.audio = audioPath;
	}

	function saveAudio(audioString, path, timeStamp){
		ensureDirExists(path);
		var filename = path + timeStamp + ".wav";
		fs.writeFileSync(filename, new Buffer(audioString, "binary"));

		console.log("wrote audio file "+filename);
		return filename;
	}

	var fileName = userName + " - " + timeStamp + ".json";
	var filePath = path + fileName;

	fs.writeFileSync(filePath, JSON.stringify(exploration, null, 4));
	console.log("wrote exploration file \"" + fileName + "\"");

	res.sendStatus(200);
});

app.post("/deleteExploration", function(req, res){
	console.log("deleting exploration");

	var userName = req.body.userName;
	var timeStamp = req.body.timeStamp;
	var hasAudio = req.body.hasAudio;

	var path = USER_PATH;
	ensureDirExists(path);
	path += userName + "/";
	ensureDirExists(path);
	path += "explorations/";
	ensureDirExists(path);

	var explFiles = fs.readdirSync(path);

	// find and delete the file corresponding to the annotation specified.
	for (var i = 0; i < explFiles.length; i++){
		var filename = explFiles[i];
		var filePath = path + filename;
		if (fs.lstatSync(filePath).isDirectory())
			continue; // if the file is a directory
		var exploration = JSON.parse(fs.readFileSync(filePath));

		// found match
		if (timeStamp.localeCompare(exploration.timeStamp)==0){
			// delete exploration file.
			fs.unlinkSync(filePath);
			// delete audio file if there is one
			if (hasAudio){
				fs.unlinkSync(exploration.audio);
			}
			break;
		}
	}
	res.sendStatus(200);
});

//post file to shared user folder
app.post('/shareExploration', function(req, res){
	var body = req.body;
	var exploration = req.body.exploration;
	var to = req.body.to;
	var from = req.body.from;

	var timeStamp = exploration.timeStamp;

	// makes directory for files if none exist.
	if(!doesUserExist(to)){
		res.send(false);
		return;
	}

	exploration.isNew = true; // the exploration will be new to the person recieving it

	var path = USER_PATH + to+"/";
	ensureDirExists(path);
	path += "explorations/";
	ensureDirExists(path);

	// save audio to different file
	if (exploration.audio){
		var audioPath = saveAudio(exploration.audio, path + "audio/", timeStamp);
		// replace audio data with audio file location.
		exploration.audio = audioPath;
	}

	function saveAudio(audioString, path, timeStamp){
		ensureDirExists(path);
		var filename = path + timeStamp + ".wav";
		fs.writeFileSync(filename, new Buffer(audioString, "binary"));

		console.log("wrote audio file "+filename);
		return filename;
	}
	fs.writeFile(path + from  +"-"+ timeStamp + ".json", JSON.stringify(exploration) +"\n", function(err){
		if(err){
			console.log(err);
		}
	});
	res.send(true);
	console.log("shared exploration to: "+ to + " from: "+ from);
});

//set the "isOld" property of an exploration to true
app.post("/setExplorationIsOld", function(req, res){
	console.log("setting exploration isNew");
	var update = req.body;
	var currentUserName = update.currentUserName;
	var explUserName = update.explUserName;
	var timeStamp = update.timeStamp;
	var path = USER_PATH;
	// ensure both dirs exist.
	path += currentUserName + "/";
	path += "explorations/";

	// find the exploration with the right user and timeStamp, and change the isNew property
	var explFiles = fs.readdirSync(path);
	var found;

	explFiles.forEach(function(filename, index){
		var filePath = path + filename;
		if (fs.lstatSync(filePath).isDirectory())
			return; // if the file is a directory
		var exploration = JSON.parse(fs.readFileSync(filePath));

		if(explUserName === exploration.userName &&
				timeStamp === exploration.timeStamp){
			// set the property
			exploration.isNew = false;
			fs.writeFileSync(filePath, JSON.stringify(exploration, null, 4));
			res.sendStatus(200);
			found = true;
			return;
		}
	});
	if (!found)
		res.sendStatus(404); // not found
});

//check userName if match return true, if not return false
app.post("/checkUsersFile", function(req, res){
	console.log("checking matching user name");
	var fields = req.body;
	var userName = fields.userName;
	var json = fs.readFileSync(USER_PATH + USER_INFO_FILE_NAME);
	eval("var info = "+json);
	var send = 1;
	info.forEach(function(user){
		if (user.userName === userName){
			send = 0;
			res.send(JSON.stringify(true));
		}
	});
	if(send===1){
		res.send(JSON.stringify(false));
	}
});

//add new user's userName and password into logonInfo.json file
app.post("/createAccount", function(req, res){
	var fields = req.body;
	var userName = fields.userName;
	var password = fields.password;
	console.log("adding new user name and password to logonInfo file: "+ userName +"  "+ password);
	var json = fs.readFileSync(USER_PATH + USER_INFO_FILE_NAME);
	eval("var info = "+json);
	var newUser = {"userName":userName, "password":password};
	info.push(newUser);
	fs.writeFileSync(USER_PATH + USER_INFO_FILE_NAME, JSON.stringify(info, null, 4), function(err) {
		if (err){ console.log("errooor: "+err); }
	});
	res.sendStatus(200); // success code
});

//saves a new annotation to file
app.post('/postAnnotation', function(req, res){
	var annotation = req.body;
	var timeStamp = new Date(annotation.timeStamp);
	var location = annotation.location;
	var userName = annotation.userName; // string
	var text = annotation.text;

	var path = "public/data/annotation/";
	// makes annotation path if none exists.
	ensureDirExists(path);
	path += location.properties.NAME + "/";
	ensureDirExists(path);

	var fileName = path + userName + " " + timeStamp.getHours() + ":"
	+ timeStamp.getMinutes() + ":" + timeStamp.getSeconds() + ".json";
	fs.writeFile(fileName, JSON.stringify(annotation, null, 4), function(err) {
		if (err){ console.log("errooor: "+err); }
	});
	console.log(annotation.imageData)
	res.sendStatus(200); // success code
});

//retrieves and sends all annotations for a specified location
app.get("/getAnnotations", function(req, res){
	console.log("get")

	var locationName = req._parsedUrl.query; // data is appended to the URL
	console.log("retrieving annotations for: " + locationName);

	var path = "public/data/annotation/";
	// ensure both dirs exist.
	ensureDirExists(path);
	path += locationName + "/";
	ensureDirExists(path);

	var annotationFiles = fs.readdirSync(path);

	// get all annotation objects (1 per file)
	var annotations = [];
	annotationFiles.forEach(function(filename, index){
		annotations.push(JSON.parse(fs.readFileSync(path+filename)));
	});

	annotations.sort(function(a, b){ // by date
		return new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime();
	});

	res.send(JSON.stringify(annotations));

});

app.post("/deleteAnnotation", function(req, res){
	console.log("delete annotation");
	var annotation = req.body;
	var locationName = annotation.location.properties.NAME;
	var path = "public/data/annotation/" + locationName + "/";
	var annotationFiles = fs.readdirSync(path);

	// find and delete the file corresponding to the annotation specified.
	for (var i = 0; i < annotationFiles.length; i++){
		var filename = annotationFiles[i];
		var inputAnnotation = JSON.parse(fs.readFileSync(path + filename));

		// if annotations are equal, delete the file
		if (annotation.userName === inputAnnotation.userName
				&& annotation.timeStamp === inputAnnotation.timeStamp
				&& annotation.text === inputAnnotation.text){
			fs.unlinkSync(path + filename);
			res.sendStatus(200); // success code
			return;
		}
	}
});

//*** BUG ***
app.get("/null", function(req, res){
	console.log("caught null request (bug)");
	res.sendStatus(200);
});

//returns whether the dir existed
function ensureDirExists(path){
	if (!fs.existsSync(path)){
		fs.mkdirSync(path);
	}
}
//return if there exists a user with input userName
function doesUserExist(userName){
	var logonFile = fs.readFileSync(USER_PATH + USER_INFO_FILE_NAME);
	var users = JSON.parse(logonFile);
	var exist = false;

	users.forEach(function(user){
		if (user.userName.localeCompare(userName) === 0){
			exist = true;
		}
	});
	return exist;
}

app.post('/postMessage', function(req, res){

	var Message = req.body;
	var to = Message.to;
	var from = Message.from;
	// makes directory for files if none exist.
	var path = USER_PATH;
	ensureDirExists(path);
	path += from + "/";
	ensureDirExists(path);
	path += "Text Message/";
	ensureDirExists(path);

	var toPath = USER_PATH;
	ensureDirExists(toPath);
	toPath += to + "/";
	ensureDirExists(toPath);
	toPath += "Text Message/";
	ensureDirExists(toPath);

	var fileName = to + ".json";
	var fileSenderName = from + ".json";
	var filePath = path + fileName;
	var fileReceiverPath = toPath + fileSenderName;
	var messageFiles = fs.readdirSync(path);
	var findFile = false;
	for (var i = 0; i < messageFiles.length; i++){
		var fname = messageFiles[i];
		if(fileName===fname){
			findFile = true;
			var messages= [];
			var inputMessage = JSON.parse(fs.readFileSync(path + fileName));
			for(var i =0; i<inputMessage.length; i++){
				messages.push(inputMessage[i]);
			}
			messages.push(Message);

			fs.writeFileSync(filePath, JSON.stringify(messages, null, 4));
			fs.writeFileSync(fileReceiverPath, JSON.stringify(messages, null, 4));
			console.log("wrote message file \"" + fileName + "\"");
			res.sendStatus(200); // success code
			return;
		}
	}
	if(!findFile){
		var m = [];
		m.push(Message);
		fs.writeFileSync(filePath, JSON.stringify(m, null, 4));
		fs.writeFileSync(fileReceiverPath, JSON.stringify(m, null, 4));
		console.log("wrote message file \"" + fileName + "\"");
		res.sendStatus(200); // success code
	}
});

//retrieves and sends all text message for a current user
app.get("/getMessages", function(req, res){
	var userName = req._parsedUrl.query; // data is appended to the URL
	var path = USER_PATH;
	ensureDirExists(path);
	path += userName + "/";
	ensureDirExists(path);
	path += "Text Message/";
	ensureDirExists(path);
	var messages = [];
	var messageFiles = fs.readdirSync(path);
	messageFiles.forEach(function(filename, index){
		var message = JSON.parse(fs.readFileSync(path+filename));
		messages.push(message);
	});

	res.send(JSON.stringify(messages));

});

//set the "isOld" property of a message to true
app.post("/setMessageIsOld", function(req, res){
	console.log("setting message isOld");
	var update = req.body;
	var mObject = update.mObject;
	var currentUserName = update.currentUser;
	var senderName = update.sender;
	var timeStamp = update.timeStamp;
	var messageDetial = update.messageDetial;

	var path = USER_PATH;
	// ensure both dirs exist.
	path += currentUserName + "/";
	ensureDirExists(path);
	path += "Text Message/";
	ensureDirExists(path);

	// find the exploration with the right user and timeStamp, and change the isNew property
	var msgFiles = fs.readdirSync(path);
	var found;

	msgFiles.forEach(function(filename, index){
		var filePath = path + filename;
		if (fs.lstatSync(filePath).isDirectory())
			return; // if the file is a directory
		var messages = JSON.parse(fs.readFileSync(filePath));
		for(var i = 0; i<messages.length; i++){
			if(messages[i].from==senderName && messages[i].timeStamp==timeStamp &&
					messages[i].message == messageDetial){
				messages[i].isNew = false;
				fs.writeFileSync(filePath, JSON.stringify(messages, null, 4));
				res.sendStatus(200);
				found = true;
				return;
			}
		}

	});
	if (!found)
		res.sendStatus(404); // not found
});

app.post('/postVoiceMessage', function(req, res){

	var voiceMessage = req.body;
	var to = voiceMessage.to;
	var from = voiceMessage.from;
	var timeStamp = voiceMessage.timeStamp;
	var data = voiceMessage.audioData;
	// makes directory for files if none exist.
	var path = USER_PATH;
	ensureDirExists(path);
	path += from + "/";
	ensureDirExists(path);
	path += "Voice Message/";
	ensureDirExists(path);
	path += to + "/";
	ensureDirExists(path);
	var audioPath = path +"voices/";
	ensureDirExists(audioPath);

	var toPath = USER_PATH;
	ensureDirExists(toPath);
	toPath += to + "/";
	ensureDirExists(toPath);
	toPath += "Voice Message/";
	ensureDirExists(toPath);
	toPath += from + "/";
	ensureDirExists(toPath);
	var audioToPath = toPath +"voices/";
	ensureDirExists(audioToPath);


	var fileName = to  + ".json";
	var filePath = path + fileName;
	var audioFileName = from+ timeStamp+ ".wav";

	var currentUserAudioFolder = audioPath+audioFileName;

	var audioSenderMessageFiles = fs.readdirSync(path);

	var findFile = false;
	for (var i = 0; i < audioSenderMessageFiles.length; i++){
		var fname = audioSenderMessageFiles[i];
		if(fileName===fname){
			findFile = true;
			var inputMessage = JSON.parse(fs.readFileSync(filePath));
			voiceMessage.audioData = currentUserAudioFolder;
			inputMessage.push(voiceMessage);
			fs.writeFileSync(filePath, JSON.stringify(inputMessage, null, 4));
		}
	}
	if(!findFile){
		var m = [];
		voiceMessage.audioData = currentUserAudioFolder;
		m.push(voiceMessage);
		fs.writeFileSync(filePath, JSON.stringify(m, null, 4));
	}


	var receiverAudioFolder = audioToPath+audioFileName;



	var fileName = from  + ".json";
	var fileToPath = toPath + fileName;

	var audioMessageReceiverFiles = fs.readdirSync(toPath);
	var findFile2 = false;
	for (var i = 0; i < audioMessageReceiverFiles.length; i++){
		var fname = audioMessageReceiverFiles[i];
		if(fileName===fname){
			findFile2 = true;

			var inputMessage2 = JSON.parse(fs.readFileSync(fileToPath));
			voiceMessage.audioData = receiverAudioFolder
			inputMessage2.push(voiceMessage)
			fs.writeFileSync(fileToPath, JSON.stringify(inputMessage2, null, 4));
		}
	}
	if(!findFile2){
		var m = [];
		voiceMessage.audioData = receiverAudioFolder;
		m.push(voiceMessage);
		fs.writeFileSync(fileToPath, JSON.stringify(m, null, 4));

	}

	//voiceMessage.audioURL = audioFilePath;
	fs.writeFileSync(currentUserAudioFolder, new Buffer(data, "binary"));
	//voiceMessage.audioURL = audioFileReceiverPath;
	fs.writeFileSync(receiverAudioFolder, new Buffer(data, "binary"));
	res.sendStatus(200); // success code
	return;
});

//retrieves and sends all audio message for a current user
app.get("/getAudioMessages", function(req, res){
	var userName = req._parsedUrl.query; // data is appended to the URL
	var path = USER_PATH;
	ensureDirExists(path);
	path += userName + "/";
	ensureDirExists(path);
	path += "Voice Message/";
	ensureDirExists(path);

	var messages = [];
	var voiceMessageFoldersForDifferentSender= fs.readdirSync(path);
	voiceMessageFoldersForDifferentSender.forEach(function(filename, index){
		var msgForSender = fs.readdirSync(path+filename+"/");
		//msgForSender.forEach(function(fname,index){
		for(var i = 0; i<msgForSender.length; i++){
			if (fs.lstatSync(path+filename+"/"+msgForSender[i]).isDirectory())
				continue; // if the file is a directory
			var msg = JSON.parse(fs.readFileSync(path+filename+"/"+msgForSender[i]));
			if(msg.length==0){
				res.send(null);
				return;
			}
			for(var i = 0; i<msg.length; i++){
				if (msg[i].audioData){
					var audioPath = msg[i].audioData;
					var fd = fs.readFileSync(audioPath, "binary");
					var ascii = btoa(fd);
					msg[i].audioData = ascii;
				}

				messages.push(msg[i]);
			}
		}


		//})
	});

	res.send(JSON.stringify(messages));

});
//delete audio message
app.post("/deleteAudioMessage", function(req, res){
	console.log("Deleting Audio Message");

	var message = req.body.message;
	var userName = req.body.currentUser;
	var timeStamp = message.timeStamp;
	var fileToDel = function(){
		if(userName==message.from) return message.to;
		else return message.from;
	}


	var path = USER_PATH;
	ensureDirExists(path);
	path += userName + "/";
	ensureDirExists(path);
	path += "Voice Message/";
	ensureDirExists(path);
	path+=fileToDel()+"/";
	ensureDirExists(path);

	var audioMessageFiles = fs.readdirSync(path);

	// find and delete the file corresponding to the annotation specified.
	for (var i = 0; i < audioMessageFiles.length; i++){
		var filename = audioMessageFiles[i];
		if(filename == fileToDel()+".json"){
			var filePath = path + filename;
			var audioMessages = JSON.parse(fs.readFileSync(filePath));
			// found match
			for(var i = 0; i<audioMessages.length; i++){
				if (timeStamp.localeCompare(audioMessages[i].timeStamp)==0){
					// delete audio message file.
					if (audioMessages[i].audioData!=null){
						fs.unlinkSync(audioMessages[i].audioData);
					}
					audioMessages.splice(i,1);
					fs.writeFileSync(filePath, JSON.stringify(audioMessages, null, 4));
					res.sendStatus(200);
					return;
				}
			}
		}
	}

});
//set the "isOld" property of a message to true
//app.post("/setAudioMessageIsOld", function(req, res){
//	console.log("setting audio message isOld");
//	var update = req.body;
//	var mObject = update.mObject;
//	var currentUserName = update.currentUser;
//	var senderName = update.sender;
//	var timeStamp = update.timeStamp;
//	var messageDetial = update.messageDetial;
//
//	var path = USER_PATH;
//	// ensure both dirs exist.
//	path += currentUserName + "/";
//	ensureDirExists(path);
//	path += "Voice Message/";
//	ensureDirExists(path);
//
//	// find the exploration with the right user and timeStamp, and change the isNew property
//	var msgFiles = fs.readdirSync(path);
//	var found;
//
//	msgFiles.forEach(function(filename, index){
//		var filePath = path + filename;
//		if (fs.lstatSync(filePath).isDirectory())
//			return; // if the file is a directory
//		var messages = JSON.parse(fs.readFileSync(filePath));
//		for(var i = 0; i<messages.length; i++){
//			if(messages[i].from==senderName && messages[i].timeStamp==timeStamp &&
//					messages[i].message == messageDetial){
//				messages[i].isNew = false;
//				fs.writeFileSync(filePath, JSON.stringify(messages, null, 4));
//				res.sendStatus(200);
//				found = true;
//				return;
//			}
//		}
//
//	});
//	if (!found)
//		res.sendStatus(404); // not found
//});