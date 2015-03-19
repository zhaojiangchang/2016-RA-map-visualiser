// =================================================================================
// Author: Will Hardwick-Smith
// Design based on: http://bl.ocks.org/keithcollins/a0564c578b9328fcdcbb
// Contains: Contructor for ProgressBar, definition of the progress bar including
// functionality such as: 
// - load/unload an exploration
// - update, pause, reset, change position
// 
// and other related elements in the same panel:
// - timeText (displays exploration time at cursor position)
// - exploration info text (name, timestamp, duration, has audio)
// - insert/stop inserting buttons and associated animations
// =================================================================================

function ProgressBar() {

	// dimensions and position
	var progressWidth = 910,
		progressHeight = 36,
		progressTop = 0,
		progressLeft = 0;

	// add the progress bar svg
	var progressSVG = d3.select("#bar-container").append("svg")
	.attr("id","play-svg")
	.attr("width", progressWidth)
	.attr("height", progressHeight);
	// append a rect, which will move to the right as the animation plays
	// this creates the progress bar effect
	var bar = progressSVG.append("rect")
	.attr("id","progress-bar")
	.attr("width", progressWidth)
	.attr("height", progressHeight)
	.attr("x",progressLeft)
	.attr("y",progressTop);

	//simple play, pause stuff
	var playControl = d3.select("#play-control");

	// updates the progress of the bar by displaying progression of an event of the exploration.
	// eventTime: timestamp of event
	// eventDuration: duration of the event
	this.updateProgress = function(exploration, eventTime, eventDuration){
		// the next bar position of the progress bar
		var currentPosition = eventTime / exploration.getDuration() * progressWidth,
			nextPosition = ((eventTime + eventDuration) / exploration.getDuration()) * progressWidth;

		// update bar with current position
		bar.attr("x", currentPosition);

		// hide button
		hideInsertButton();

		// start transition
		bar.transition()
		.duration(eventDuration)
		.ease("linear in-out")
		.attr("x", nextPosition);
	}

	// stops moving the bar
	this.pause = function(cb){
		bar.transition()
		.duration(0)
		.each("end.cb", cb);

		showInsertButton();
	}

	// sets the position of the bar
	this.setPosition = function(time){
		// if selectedExploration is null, set position to 0 and return
		if (!selectedExploration){
			bar.attr("x", 0);
		}
		else {
			var progress = time / selectedExploration.getDuration();
			bar.attr("x", progress * progressWidth);
		}
	}

	// brings the bar back to the start
	this.resetProgress = function(){
		var that = this; // store this
		// replace current transition with dummy one to stop it
		bar.transition().duration(0).each("end", function(){
			that.setPosition(0);
		});
	}

	// changes the button based on the state of the program
	this.updateButton = function(){
		if (playing && !paused)
			$("#play-control").removeClass().addClass("pause");
		else if (!playing && !paused)
			$("#play-control").removeClass().addClass("start");
		else
			$("#play-control").removeClass().addClass("resume");
	}

	// updates markers, adds listeners, shows information about exploration
	this.load = function(exploration){
		// get all travel events
		var travelEvents = [];
		var barWidth = 5;

		belowBarDiv.show();

		for (var i = 0; i < exploration.numEvents(); i++){
			var event = exploration.getEvent(i);
			if (event.type == "travel")
				travelEvents.push(event);
		}

		// add event markers
		progressSVG.selectAll(".event-marker")
			.data(travelEvents)
			.enter()
			.append("g")
				.attr({
					// id is city name
					id: function(d){ return d.body; },
					class: "event-marker",
				})
				.append("rect")
					.attr({
						x: function(d){ return getEventPosition(d.time) - barWidth/2; },
						y: 0,
						width: barWidth,
						height: progressHeight,
						fill: "orange"
					})
					.on("mouseover.travelText", showTravelText)
					.on("mouseover.ping", function(d){ ping(d.body); })
					.on("mouseout", removeTravelText);


		function getEventPosition(eventTime){
			return eventTime / exploration.getDuration() * progressWidth;
		}

		function showTravelText(d){
			var travelId = d.body;
			d3.select("#"+travelId)
				.insert("text")
				.attr({
					id: travelId + "-text",
					dx: function(d){ return getEventPosition(d.time); },
					dy: 12,
					fill: "red",
					"text-anchor": "middle"
				})
				.text(travelId);
		}
		function removeTravelText(d){
			d3.select("#" + d.body + "-text").remove();
		}

		// add listener to play control
		playControl.on("click", function() {
			var currentClass = $("#play-control").attr("class");

			if (currentClass == "start") {
				startPlayback(selectedExploration);
			}
			else if (currentClass == "resume"){
				resumePlayback(selectedExploration);
			}
			else if (currentClass == "pause") {
				pausePlayback(selectedExploration);
			}
			else if (currentClass == "replay") {
				startPlayback(selectedExploration);
			}
		});

		// add mouse listener to bar
		progressSVG.on("click", onBarClick);
		// add hover listener
		progressSVG.on("mousemove", function(){ showTimeText(getTimeOfXpos(d3.mouse(this)[0])); });
		// mouseoff listener
		progressSVG.on("mouseout", this.hideTimeText);
		// show bar
		progressSVG.style.visibility = "visible";

		belowBarDiv.show();
		// show title and duration text elements
		explorationTitle.text(exploration.name + ", " + exploration.timeStamp);
		explorationTitle.show();
		// if exploration has audio, show hasAudio
		if (selectedExploration.hasAudio())
			hasAudio.show();
		// duration
		showDurationText();
	}

	// unloads an exploration
	this.unload = function(){
		//progressSVG.style.visibility = "hidden";
		this.resetProgress();
		// remove all event markers
		progressSVG.selectAll(".event-marker").remove();
		// remove mouse event listener
		progressSVG.on("click", null);
		// remove mousemove listener
		progressSVG.on("mousemove", null);
		// remove mouseoff listener
		progressSVG.on("mouseout", null);
		// remove playControl listener
		playControl.on("click", null);
		// hide text and insert button
		this.hideTimeText();
		hideInsertButton();
		//hasAudio.hide();
		belowBarDiv.hide();
	}

	// trigger a playback position change
	function onBarClick(e){
		var rect = d3.select("#play-svg");
		// figure out x position of mouse
      	var offset = $(this).offset();
      	var xpos = d3.mouse(this)[0]; // 36 ?
      	// Pathmove needs to know this for setPosition
		pathView.setProgressBarClicked(true, false);
      	setPlaybackPosition(selectedExploration, getTimeOfXpos(xpos));
	}

	// returns the x position of the bar at a time into the selected exploration
	this.getXPosOfTime = function(time){
		var progress = time / selectedExploration.getDuration();
		return progress * progressWidth;
	}

	// get the time into the exploration given an x position
	function getTimeOfXpos(xpos){
		// what portion (as decimal) across the rect is the mouse?
		var progress = xpos / progressWidth;
		return progress * selectedExploration.getDuration();
	}

	// returns the x position of the bar as it is now
	function getCurrentProgressX(){
		return parseInt(bar.attr("x"));
	}

	// displays insert button above the current playback position
	function showTimeText(millis){

		var formattedTime = formatTime(millis);

		var progressPosition = progressBar.getXPosOfTime(millis);
		var	padding = 10;

		var timePosition = {
			left: (progressPosition - timeText.outerWidth()/2)
		};

		timeText.show();
		timeText.text(formattedTime);
		timeText.css(timePosition); // sets position relative to parent
	}

	// shows the selected exploration's duration
	function showDurationText(){
		var formattedTime = formatTime(selectedExploration.getDuration());
		durationText.text(formattedTime);
		durationText.show();
	}
	// used in explorations
	this.hideTimeText = function(){
		timeText.hide();
	}

	// convert millis to mm:ss
	function formatTime(millis){
		var date = new Date(millis);
		var minutes = date.getMinutes().toString();
		var seconds = date.getSeconds() < 10 	? "0" + date.getSeconds().toString()
												: date.getSeconds();
		return minutes + ":" + seconds;
	}

	function showInsertButton(){
		insertButton.css("visibility", "visible");
	}

	function hideInsertButton(){
		insertButton.css("visibility", "hidden");
	}

	// creates a bar, like the progress bar to show a currently recording exploration
	this.showInsertGraphics = function(insertX){
		// aboveBarDiv.show(); // show parent div
		var insertDiv = d3.select("#above-bar");

		var divHeight = parseInt(insertDiv.style("height"), 10),
			divWidth = parseInt(insertDiv.style("width"), 10),
			barHeight = 36,
			barWidth = 400,
			barLeft = (progressWidth - barWidth) / 2,
			barTop = 0,
			barCurve = 20;

		var insertText = "Inserting";

		var insertSVG = insertDiv.append("svg")
			.attr({
				id: "insert-svg",
				width: divWidth,
				height: divHeight
			});

		var insertGroup = insertSVG.append("g")
			.attr("id", "insert-bar");

		// insert bar
		var insertBar = insertGroup.append("rect")
			.attr({
				x: barLeft,
				y: barTop,
				width: barWidth,
				height: barHeight,
				rx: barCurve,
				ry: barCurve,
				fill: "#28AADE"
			});
		// ** recording ** text
		var insertText = insertGroup.append("text")
			.text(insertText)
			.attr({
				x: barLeft + (barWidth/2),
				y: barTop + barHeight - 10,
				"font-size": "1.5em",
				"text-anchor": "middle"
			});
		// lines from insert point to bottom of insert bar
		var points = [	{x: insertX, y: divHeight},
						{x: barLeft + barCurve, y: barTop + barHeight},
						{x: barLeft + barWidth - barCurve, y: barTop + barHeight}	];

		insertGroup.append("polygon")
			.data([points])
			.attr({
				points: function(d) {
					return d.map(function(d){
						return [d.x, d.y].join(",");
					}).join(" ");
				},
				fill: "grey",
				stroke: "black",
				"stroke-width": "3px"
			})
			.style("opacity", 0.6);
		// record stop button
		$("#stop-insert-button").show();

		// [recording in progress] animation
		changeColour(true);
		// changes to either red or blue depending on 'red' argument
		function changeColour(red){
			insertText.transition()
				.duration(300)
				.attr("fill", function(){
					return red ? "red" : "#28AADE";
				})
				.each("end", function(){
					changeColour(!red);
				});
		}
	}

	this.hideInsertGraphics = function(){
		var insertSVG = d3.select("#insert-svg");
		if (insertSVG){
			insertSVG.select("#insert-bar")
			.attr("fill","28AADE")
			.transition()
				.duration(1000)
				.ease("cubic-in-out")
				.attr("transform", "translate(0, "+(progressHeight + 10)+")")
				.style("opacity", 0)
				.each("end", function() {insertSVG.remove();});
		}
		//aboveBarDiv.hide();
		$("#stop-insert-button").hide();
	}

	// highlights a chunk representing an inserted exploration
	// starting at startTime, for duration
	this.showInsertedChunk = function(startTime, duration){
		var startX = this.getXPosOfTime(startTime);
		var endX = this.getXPosOfTime(startTime + duration);

		var chunk = progressSVG.append("rect")
			.attr({
				x: startX,
				y: 0,
				width: endX - startX,
				height: progressHeight,
				fill: "#28AADE",
				stroke: "black",
				"stroke-width": "3px"
			})
			.style("opacity", 0);

		var fadeOutDelay = 2000; // ms

		fadeIn();

		function fadeIn(){
			chunk.transition()
				.duration(300)
				.ease("cubic-in-out")
				.style("opacity", 0.8)
				.each("end", function(){
					setTimeout( fadeOut, fadeOutDelay);
				});
		}

		function fadeOut(){
			chunk.transition()
				.duration(1000)
				.ease("cubic-in-out")
				.style("opacity", 0);
		}
	}
}