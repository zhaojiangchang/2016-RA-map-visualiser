//==================================================================================================
//  Author:Will Hardwick-Smith and Jacky Chang
//
//  Loaded path view:
//		. select an exploration from selector and the selected exploration has city events
//		. user log into the system and first exploration in the selector has city events
//
//  Unload path view:
//		. Remove all path and circles
//		. City names font change back to original size, color and position
//
//  Path view elements:
//  	. Dash line - all city events in selected exploration connect by dash line
//  	. Filled circle (gray and blue): all city event coordinates
//  	. City event names: names will highlighted when selected exploration has city events
//
//  Path view actions:
//		. Progress bar clicked - update both progress bar and path view (append path from frist city
//		  evnets to paused position
//		. Path view lines clicked - update path view line draw from last postion to clicked position
//		  then calculate the time progress bar to update the progres bar position.
//
//==================================================================================================
function PathView(){

	this.expl = null; // value signed when load pathView
	this.progressBarClicked = false;
	this.pathLineClicked = false;
	this.pausedTime = null;  //this variable is for resumeProgress function when click on the progress bar (return clicked event time)

	var pausedX = -1, pausedY = -1; // value signed when pause button or path line clicked.
	var ncx =  -1, ncy =  -1, ctx =  -1, cty =  -1; //ct: current city position, nc: next city position
	var currentCityIndex =  -1;

	// set and get pausedX and pausedY
	this.setPausedX = function(x){
		pausedX = x;
	};
	this.setPausedY = function(y){
		pausedY = y;
	};
	this.getPausedX = function(){
		return pausedX;
	};
	this.getPausedY = function(){
		return pausedY;
	};
	// set and get next city x and y position
	this.setNcx= function(x){
		ncx = x;
	};
	this.setNcy = function(y){
		ncy = y;
	};
	this.getNcx = function(){
		return ncx;
	};
	this.getNcy = function(){
		return ncy;
	};

	// set and get currentCity x and y position
	this.setCtx= function(x){
		ctx = x;
	};
	this.setCty = function(y){
		cty = y;
	};
	this.getCtx = function(){
		return ctx;
	};
	this.getCty= function(){
		return cty;
	};
	// set Exploration when selectExploration called or stop recording
	this.setExploration = function(expl){
		this.expl = expl;
	};

	// pb: progressBar boolean value
	// pl: pathView line on the map boolean value
	this.setProgressBarClicked = function(pb, pl){
		this.progressBarClicked = pb;
		this.pathLineClicked = pl;
	};

	//this function will return set of cityEvents in the exploration.
	this.cityEvents = function(){
		if(this.expl == null)return;
		var citiesEvs =[] ;
		if(this.expl == null)return;
		for(var j = 0;  j < this.expl.events.length; j++ ){
			if(this.expl.events[ j ].type  === "travel"
				&& !checkMatchCity(this.expl.events[ j ] ,citiesEvs)){
				citiesEvs.push(this.expl.events[ j ] );
			}
		}
		return citiesEvs;

		// this function is checking if event already in the cityEvents reject (return true).
		// bug need fixed (when exploration saved same city appear 3 times
		function checkMatchCity(event, cityEvents){
			for(var i = 0;  i < cityEvents.length;  i++ ){
				if(event.body  === cityEvents[ i ].body && event.time == cityEvents[ i ].time) {
					return true;
				}
			}
			return false;
		}
	};

//	get the set of cities in the exploration return list of city names
	this.citiesDisplay = function(){
		if(this.expl == null)return;
		var cities =[] ;
		this.cityEvents().forEach(function(event){
			if(event.type.localeCompare("travel") == 0){
				cities.push(event.body);
			}
		});
		return cities;
	};

	// when pause button or progress bar clicked
	this.setPausedTime = function(time){
		this.pausedTime = time;
	};

	// get the set of citie's x, y coordinates
	this.translates = function(){
		if(this.expl == null)return;
		trans =[];
		this.citiesDisplay().forEach(function(cityName){
			var index = getCityIndex(cityName);
			var paths = document.getElementById(index);
			var data = paths.getAttribute('transform');
			var translate = getTranslate(data);
			trans.push(translate);
		});
		return trans;
	};

	// return: set of cities event time
	this.cityEventTimes = function(){
		times = [] ;
		this.cityEvents().forEach(function(event){
			times.push(event.time);
		});
		return times;
	};

	// show path elems on the map: line, circles
	this.showPathElems = function(){
		this.setText();
		showPathButton.innerHTML="Hide Path";
		showPathButton.style.visibility = "visible";
		var elems = $(".path-move");
		pathView.setText();
		elems.show();
	};

	// hide path elems on the map: line, circles
	this.hidePathElems = function(){
		showPathButton.innerHTML="Show Path";
		var classes = $(".path-move");
		pathView.resetText();
		classes.hide();
	};

	// when click on the pathview line on the map
	// x: clicked point x
	// y: clicked point y
	// return boolean value - turn: on the line   false: not
	this.getCityIndexByPoint = function(x, y){
		for(var i = 0; i< this.translates().length-1; i++){
			var xi = this.translates()[i][0], yi = this.translates()[i][1];
			if( xi === x && yi === y ){
				return i;
			}
			if(isOnLine(xi, yi, this.translates()[i+1][0],this.translates()[i+1][1], x, y, 5)){
				return i;
			}
		}
		// x1, y1: start city point
		// x2, y2: end city point
		// px, py: clicked point x and y
		// tolerance: range with in 5px when clicked
		// return true when on the line
		function isOnLine(x1,y1, x2, y2, px, py, tolerance) {
			var dy = y1 - y2;
			var dx = x1 - x2;
			if(dy == 0) { //horizontal line
				if(py == y1) {
					if(x1 > x2) {
						if(px <= x1 && px >= x2)
							return true;
					}
					else {
						if(px >= x1 && px <= x2)
							return true;
					}
				}
			}
			else if(dx == 0) { //vertical line
				if(px == x1) {
					if(y1 > y2) {
						if(py <= y1 && py >= y2)
							return true;
					}
					else {
						if(py >= y1 && py <= y2)
							return true;
					}
				}
			}
			else { //slope line
				var p = dy/dx;
				var b = y2 - p*x2;
				var y = p * px + b;
				if(y <= py + tolerance && y >= py - tolerance) {
					if(x1 > x2) {
						if(px <= x1 && px >= x2)
							return true;
					}
					else {
						if(px >= x1 && px <= x2)
							return true;
					}
				}
			}
			return false;
		}
	};

	// get current city index when click on the progress bar
	// time: pausedTime
	// return city index   (city event time < pausedTime < next city event time)
	this.getCurrentCityIndex = function(time){
		for(var i = 1;  i < this.cityEventTimes().length;  i++ ){

			if(this.cityEventTimes()[ i - 1 ]  < time && this.cityEventTimes()[ i ]  > time)
				return i - 1;

			if(this.cityEventTimes()[ i ]   === time)
				return i;

			if(time > this.cityEventTimes()[ this.cityEventTimes().length - 1 ] )
				return this.cityEventTimes().length - 1;

			if(time < this.cityEventTimes()[ 0 ] )
				return 0;
		}
	};

	// load called when user select exploration function or stop recording function called.
	this.load = function(expl){
		this.expl = expl;
		if(this.citiesDisplay().length == 0)return;
		// arrowhead markers
		/*map.append("defs")
			.append("marker")
			.attr({
				id: "marker-arrow",
				viewBox: "0 -5 10 10",
				markerWidth: 6,
				markerHeight: 6,
				refX: 0,
				refY: 0,
				orient: "auto"
			})
			.append("path")
				.attr("d", "M0,-5 L10,0 L0,5");*/

		map.append("path")
		.data( [ this.translates() ] )
		.attr({
			id: "path-play",
			class: "path-move",//same calss name with circle and strght line path for hide and show path button
			"stroke-dasharray": "4,4",
			"stroke-opacity": "0.7",// transparency the dash line
			d: d3.svg.line().tension(10),
		})
		/*
		.attr("stroke-width", 1.5)
		.attr("marker-mid", "url(#marker-arrow)")
		.attr("marker-end", "url(#marker-arrow)");*/

		// when path line on the map clicked
		// asign moouse x and y value to pausedX and pausedY
		.on("click", function(){
			pausedX = d3.mouse(this)[0];
			pausedY = d3.mouse(this)[1];
			setPositionFromClickedPathLine(); //append new line from start city to paused point.
		});

		var trans = this.translates();
		map.selectAll(".point")
		.data(trans)
		.enter().append("circle") // change the black dot to circle and filled (white and blue)
		.attr("id", "circle")
		.attr("class","path-move")
		.attr("r",4)
		.attr("transform", function(d) { return "translate("  +  d  +  ")";  })
		.on("click", function(d){ //when click on the circle on the map get the paused x and y position by calling d3.mouse(map.node())
			pausedX = d3.mouse(map.node())[0];
			pausedY = d3.mouse(map.node())[1];
			for(var i = 0; i<trans.length; i++){// go throught the htis.translates() find the matched value and return the index of the value
				if(trans[i][0]===d[0] && trans[i][1]===d[1])
					setPositionFromClickedPathLine(i); // append new line from start to clicked city
			}
		});

		// circle: color(grey and red) moving between citys
		// initial position: first city in the exploration
		map.append("circle")
		.attr("r", 5)
		.attr("class","path-move")
		.style("stroke", "gray")
		.style("fill","red")
		.attr("id", "circle-move")
		.attr("cx", this.translates()[ 0 ][ 0 ] )
		.attr("cy", this.translates()[ 0 ][ 1 ] );
		this.showPathElems(); // show path elems when load the exploration
	};

	//	this function called at launchevents function if it is a travel event then update progress
	this.updateProgress = function(eventTime){
		this.pausedTime = null;
		this.progressBarClicked = false;
		if(this.citiesDisplay().length == 0){
			return;
		}
		currentCityIndex = this.cityEventTimes().indexOf(eventTime);
		if(currentCityIndex  ===  -1){
			return;
		}
		var line =  // return x and y value in the array
			d3.svg.line()
			.x(function(d) {
				return d.x;
			})
			.y(function(d) {
				return d.y;
			});

		// blue progress bar rich to yellow bar means start move to that city
		if(currentCityIndex!== 0){
			ctx = this.translates()[ currentCityIndex - 1 ][ 0 ] ;
			cty = this.translates()[ currentCityIndex - 1 ][ 1 ] ;
			ncx = this.translates()[ currentCityIndex ][ 0 ] ;
			ncy = this.translates()[ currentCityIndex ][ 1 ] ;
			var data =  [ {x:ctx,y:cty},{x:ncx,y:ncy} ] ;
			//var eventDuration = ( eventTime - this.cityEventTimes()[ currentCityIndex + 1 ] );
			var eventDuration = makeZoomInterpolator(this.translates()[currentCityIndex]).duration * ANIMATION_DELAY;
			d3.selectAll("#circle-move")
			.attr("cx", ctx)
			.attr("cy", cty)
			.transition()
			.duration(eventDuration)
			.ease(EASE_FUNCTION)
			.attr("cx", ncx)
			.attr("cy", ncy);
			if(showPathButton.innerHTML==="Hide Path"){ // if innerHTML == "Hide Path", means able to click button to hide path elems
				var pathLineMove= map.append("path")
				.attr({
					id: "animationPath",
					class: "path-move",
					d: line(data),
					stroke: "blue",
					"stroke-width": 2})
					.style("fill", "none")
					.on("click", function(){
						pausedX = d3.mouse(this)[0];
						pausedY = d3.mouse(this)[1];
						setPositionFromClickedPathLine();
					});

				var totalLength = pathLineMove.node().getTotalLength();
				pathLineMove
				.attr("stroke-dasharray", totalLength  +  " "  +  totalLength)
				.attr("stroke-dashoffset", totalLength)
				.transition()
				.duration(eventDuration)
				.ease(EASE_FUNCTION)
				.attr("stroke-dashoffset", 0)
				.attrTween("point", translateAlong(pathLineMove.node()));
			}
		}

		// return a point at each milisecond
		// pausedX and pausedY updated during the movement
		// when pause button clicked pausedX and pausedY value stop updating at paused.
		function translateAlong(path) {
			var l = path.getTotalLength();
			return function(d, i, a) {
				return function(t) {
					var p = path.getPointAtLength(t  *  l);
					pausedX = p.x;
					pausedY = p.y;
					return {x:p.x ,y:p.y};
				};
			};
		}
	};


	// resume from pause
	// pausedTime argument for path Line Clicked
	// when click on the path line on the map,
	this.resumeProgress = function(eventDur, pausedTime){

		if(this.progressBarClicked)
			currentCityIndex = this.getCurrentCityIndex( this.pausedTime );
		else if(this.pathLineClicked)

			currentCityIndex = this.getCurrentCityIndex( pausedTime );
		if( currentCityIndex < 1 ||undefined )
			return;
		//the pathLineMove variable signed when the timeline pass through the fist city
		//if click on the progress bar before the yellow bar(city event).
		//will cause error: undefined is not a function (pathLineMove is undefined)
		var dur =  -1;
		//this.pausedTime set when click on the progress bar.
		if( this.pausedTime >=this.cityEventTimes()[ 1 ]  && this.pausedTime!=null ){
			//case: pausedTime great then first city event time
			//duration from paused point to next city event time
			if( currentCityIndex  === this.citiesDisplay().length - 1 )
				dur = this.expl.events[ this.expl.events.length - 1 ].time  - this.pausedTime;
			else
				dur = this.cityEventTimes()[ currentCityIndex + 1 ]  - this.pausedTime;
		}
		else if(this.pausedTime ==  null){
			if(pausedX  ===  -1)return;  //pausedX  ==   - 1  <  ==  >  paused  ==  false
			dur = eventDur * (lineDistance({x:pausedX,y:pausedY},{x:ncx, y:ncy})/lineDistance({x:ctx,y:cty},{x:ncx,y:ncy}));


			// line distance between two points (paused point and city position
			function lineDistance( point1, point2 ){
				var xs = 0;
				var ys = 0;
				xs = point2.x  -  point1.x;
				xs = xs  *  xs;
				ys = point2.y  -  point1.y;
				ys = ys  *  ys;

				return Math.sqrt( xs  +  ys );
			}
		}

		var line =
			d3.svg.line()
			.x(function(d) {
				return d.x;
			})
			.y(function(d) {
				return d.y;
			});

		// from transition array value to data array(assign value to x and y) for line object to read.
		var data =  [ {x:pausedX,y:pausedY} ,
		              {x:this.translates()[ currentCityIndex ][ 0 ], y:this.translates()[ currentCityIndex ][ 1 ] } ] ;
		if(showPathButton.innerHTML==="Hide Path"){ // if path view elements are not hide\
			//append path from paused point to next city
			var p = map.append("path")
			.attr({
				id: "animationPath",
				class:"path-move",
				d: line(data),
				stroke: "blue",
				"stroke-width": 2})
				.style("fill", "none");

			var totalLength = p.node().getTotalLength();
			p
			.attr("stroke-dasharray", totalLength  +  " "  +  totalLength)
			.attr("stroke-dashoffset", totalLength)
			.transition()
			.duration(dur)
			.ease("cubic-out") // use cubic-out ease function to resume from paused point to next city event
			.attr("stroke-dashoffset", 0);

			// circle use same duration and ease function as path above, move from paused point to next city event
			d3.selectAll("#circle-move")
			.transition()
			.duration(dur)
			.ease("cubic-out")
			.attr("cx", ncx)
			.attr("cy", ncy);
		}
	};

	// set path view position when progress bar clicked
	this.setPosition = function(){
		d3.selectAll("#animationPath").remove();
		if( this.pausedTime <= this.cityEventTimes()[ 1 ] ){//pausedTime less then the first city event time
			d3.select("#circle-move")
			.attr("cx", this.translates()[ 0 ][ 0 ] )
			.attr("cy", this.translates()[ 0 ][ 1 ] );
			ncx = this.translates()[ 1 ][ 0 ];
			ncy = this.translates()[ 1 ][ 1 ];
			dur = 0;
		}
		currentCityIndex = this.getCurrentCityIndex(this.pausedTime);

		if( currentCityIndex < 1 ||undefined){return;}
		//reset circle FROM position and TO position
		var currentCityX = this.translates()[ currentCityIndex ][ 0 ];
		var currentCityY = this.translates()[ currentCityIndex ][ 1 ];
		var lastCityX = this.translates()[ currentCityIndex - 1 ][ 0 ];
		var lastCityY = this.translates()[ currentCityIndex - 1 ][ 1 ];
		// temp is percentage between (pausedTime  -  last CityEvent time) and total time between lastcity events and current city event time
		var nextCityEventTime = -1;
		// if current city index is the last city the sign the end event time to next cityevent time.
		if( currentCityIndex   ===  this.citiesDisplay().length - 1 ) {
			nextCityEventTime = this.expl.events[ this.expl.events.length - 1 ].time;
		}
		// else sign the next city event time
		else{
			nextCityEventTime = this.cityEventTimes()[ currentCityIndex  +  1 ];

		}
		// paused time percentage -  use percentage to calcualate the distance moved for horizontal and vertical
		var temp = (this.pausedTime  -  this.cityEventTimes()[ currentCityIndex ] )	/
					(nextCityEventTime - this.cityEventTimes()[ currentCityIndex ] );

		var xMoved = temp  *  (Math.abs(lastCityX  -  currentCityX)); // horizontal moved
		var yMoved = temp  *  (Math.abs(lastCityY  -  currentCityY)); // vertical moved
		//
		if(lastCityX  >  currentCityX)
			pausedX = lastCityX - xMoved;
		else if(lastCityX  <  currentCityX)
			pausedX = lastCityX + xMoved;
		else if(lastCityX   ===  currentCityX)
			pausedX = currentCityX;

		if(currentCityY < lastCityY)
			pausedY = lastCityY  -  yMoved;
		else if(currentCityY > lastCityY)
			pausedY = lastCityY  +  yMoved;
		else
			pausedY = lastCityY;
		ctx = pausedX;
		cty = pausedY;
		ncx = this.translates()[currentCityIndex][ 0 ];
		ncy = this.translates()[currentCityIndex][ 1 ];

		// set circle to new paused position
		d3.select("#circle-move")
		.attr("cx", ctx)
		.attr("cy", cty);

		// tempTrans: store city coordinates for index = 0 to index = currentCityIndex -1
		// 			  then add paused coordinate (pausedX and pausedY)
		var tempTrans =  [];
		for(var i = 0;  i < currentCityIndex;  i++ ){
			tempTrans.push(this.translates()[ i ] );
		}
		tempTrans.push( [ pausedX , pausedY ] );
		if(showPathButton.innerHTML=="Hide Path"){
			// draw path from first city coordinate to paused coordinate
			map.append("path")
			.data( [ tempTrans ] )
			.attr({
					id: "animationPath",
					class: "path-move",
					stroke: "blue",
					"stroke-width": "2",
			})
			.style("fill", "none")
			.attr("d", d3.svg.line()
					.tension(0))
					.on("click", function(){
						// when clicked on the path set paused coordinate to pausedX and pausedY
						pausedX = d3.mouse(this)[0];
						pausedY = d3.mouse(this)[1];
						// set position
						setPositionFromClickedPathLine();

					});
		}
	};

	// pause transition set duration to 0
	this.pause = function(){
		if(this.citiesDisplay().length == 0)return;
		d3.selectAll("#circle-move").transition()
		.duration(0);

		d3.selectAll("#animationPath").transition()
		.duration(0);
	};
	// reset all value to initial value and remove all path view element
	this.unload = function(){
		this.init();
		$(".path-move").remove();
		this.resetText();
		showPathButton.style.visibility = "hidden";
	};

	// reset all value to initial value
	this.reset = function(){
		this.init();
	};

	// initialize all values
	this.init = function(){
		pausedX =  - 1;
		pausedY =  - 1;
		if(!this.citiesDisplay())return;
		d3.selectAll("#animationPath").remove();
		d3.selectAll("#circle-move")
		.attr("cx", this.translates()[ 0 ][ 0 ] )
		.attr("cy", this.translates()[ 0 ][ 1 ] );
		this.pausedTime = null;
		this.setProgressBarClicked(false,false);

	};

	// return a array of coordinate
	function getTranslate(data){
		var translationX = data.slice(data.indexOf("translate(") + 10, data.indexOf(","));
		var translationY = data.slice(data.indexOf(",") + 1, data.indexOf(")"));
		return  [ parseFloat(translationX), parseFloat(translationY) ];
	}

	// once exploration select and has city events then change the color of the event city name.
	this.setText = function(){
		for(var i = 0;  i < this.citiesDisplay().length;  i++ ){
			var cityNames = this.citiesDisplay();
			var index = getCityIndex( cityNames[ i ] );
			var cityText = document.getElementById(index);
			cityText.setAttribute("font-size","9px");
			cityText.setAttribute("fill",'#FF0000');
			cityText.setAttribute("dy" , "1.6em");
			cityText.setAttribute("dx" , "0.3em");
		}
	};

	// this funciton called by pathView.unload() reset the city name color back to initial value;
	this.resetText = function(){
		$(".place-label").each(function(index , value){
			$(this).attr("font-size","12px");
			$(this).attr("fill" , '#000000');
			$(this).attr("dy" , ".35em");
			$(this).attr("dx" , "0em");
		});
	};
}


// when click the path on the map will trigger this function to set the position at clicked point
// also set the progress bar to the right "time".
function setPositionFromClickedPathLine(cityIndex){
	pathView.setProgressBarClicked(false,true);
	d3.selectAll("#animationPath").remove();
	if(!cityIndex){ // if argument is null get city index by calling getCityIndexByPoint function
		currentCityIndex = pathView.getCityIndexByPoint(pathView.getPausedX(), pathView.getPausedY());
	}
	else currentCityIndex = cityIndex;

	pathView.setCtx( pathView.getPausedX() );
	pathView.setCty( pathView.getPausedY() );

	d3.selectAll("#circle-move")
	.attr("cx", pathView.getCtx())
	.attr("cy", pathView.getCty());

	if(currentCityIndex < pathView.translates().length - 1){
		pathView.setNcx( pathView.translates()[currentCityIndex+1][ 0 ]);
		pathView.setNcy( pathView.translates()[currentCityIndex+1][ 1 ]);
		var tempTrans =  [];
		for(var i = 0;  i < currentCityIndex+1;  i++ )
			tempTrans.push(pathView.translates()[ i ] );
		tempTrans.push( [ pathView.getPausedX(), pathView.getPausedY() ] );
	}
	else
		tempTrans = pathView.translates();

	map.append("path")
	.data( [ tempTrans ] )
	.attr({
		id: "animationPath",
		class: "path-move",
		stroke: "blue",
		"stroke-width": "2",
	})
	.style("fill", "none")
	.attr("d", d3.svg.line()
			.tension(0))
			.on("click", function(){
				pathView.setPausedX(d3.mouse(this)[0]);
				pathView.setPausedY(d3.mouse(this)[1]);
				setPositionFromClickedPathLine();}
			);

	if(currentCityIndex>pathView.translates().length-1)
		return;

	// currentCityIndex is one step behand the progress bar city event
	// distence between paused position to last city event
	var distToPausedX  = Math.abs(pathView.getPausedX() - pathView.translates()[currentCityIndex][0]),
	nextCityEventTime = pathView.cityEventTimes()[currentCityIndex+2],
	durCityEvents = -1,
	lastCityEventTime = -1;

	//path between last two cities
	if(currentCityIndex === pathView.translates().length-2){
		durCityEvents = pathView.expl.events[pathView.expl.events.length-1].time - pathView.cityEventTimes()[pathView.cityEventTimes().length-1];
		lastCityEventTime = pathView.cityEventTimes()[pathView.cityEventTimes().length-1];
	}
	//path between first two cities
	else if(currentCityIndex === 0){
		durCityEvents = pathView.cityEventTimes()[2]- pathView.cityEventTimes()[1];
		lastCityEventTime = pathView.cityEventTimes()[1];
	}
	//all other path
	else{
		durCityEvents = nextCityEventTime - pathView.cityEventTimes()[currentCityIndex+1];
		lastCityEventTime = pathView.cityEventTimes()[currentCityIndex + 1];
	}
	//x distence between two cities
	var distX = Math.abs((pathView.translates()[currentCityIndex][0] - pathView.translates()[currentCityIndex+1][0]));
	var time = distToPausedX * durCityEvents / distX + lastCityEventTime;
	if(time<pathView.cityEventTimes()[0])
		time = pathView.cityEventTimes()[0];
	setPlaybackPosition(pathView.expl, time);
}

