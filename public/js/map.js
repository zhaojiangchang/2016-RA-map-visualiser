/* Copyright (c) 2014, Sivan Fesherman
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. **/

// the location of image files
var IMAGE_PATH = "data/image/";

// width and height of window (TODO: make these update dynamically)
var width = $(window).width() * 0.8,
	height = $(window).height();

//How far we should scale into a selection
var SCALE_FACTOR = 1200;
//How fast we should zoom. Lower numbers zoom faster.
var ANIMATION_DELAY = 0.8;
//How large the ping effect should be, in proportion to the height of the screen.
var PING_SIZE = 0.2;
//The ease function used for transitioning
var EASE_FUNCTION = "cubic-in-out";
//The array of easing functions and zoom speeds to use
var FROM_TEXT_FILE = [];
//The constants for the animation delay function to be used in the set easing function
var FAST = 0.4;
var SLOW = 2.4;
//The path to the easing function text file
var PATH_TO_FILE = "data/functions/easingFunctions20.txt"

// data to be bound to svg elements
var cities, distances, direction, paths;

// location/city that was last selected.
var selectedLocation;

var projection = d3.geo.mercator()
.center([68.0, 48.0])
.scale(2000)
.translate([width/2,height/2]);

var path = d3.geo.path().projection(projection)
.pointRadius(2.5);

// mousewheel zooming
var zoom = d3.behavior.zoom()
.on("zoom.normal",function() {
	map.attr("transform","translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
});

var svg = d3.select("body").append("svg")
.attr("width", width)
.attr("height", height)
.attr("class", "svg_map")
.attr("id", "svg_map")
.call(zoom) // attach zoom listener
.on("dblclick.zoom", null); // disable double-click zoom

// contains all map graphics
var map = svg.append("g")
	.attr("id","map_area")
	.attr("transform", "translate(0,0)scale(1)");

svg.style('cursor','move');

// Read country outline from file
d3.json("data/map/kaz.json", function(error, json) {
	var subunits = topojson.feature(json, json.objects.kaz_subunits);

	// make outline of land mass
	map.insert("path",":first-child")
	.datum(subunits)
	.attr("d", path)
	.attr("class", "kaz_subunit")
	// set colour
	.attr("fill","#D0FA58")
	.attr("stroke", "#FF0040");
});

// Add cities
d3.json("data/map/kaz_places.json", function(error, json){
	cities = json.features;
	// places group to contain all elements of a place
	var places = map.selectAll(".place")
	.data(cities)
	.enter()
	.append("g")
		.attr("id", function(d, i) { return d.properties.NAME; })
		.on("dblclick.zoom", cityClicked)
		.on("click", selectLocation)
		.attr("class", "place");

	places.append("path")
	.attr("d", path);

	// Assign labels to cities
	places.append("text")
	.attr("class", "place-label")
	.attr("id", function(d, i) { return i;} )
	.attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
	.attr("dy", ".35em")
	.text(function(d) { return d.properties.NAME; });

	places.style('cursor','hand');

	// Align labels to minimize overlaps
	map.selectAll(".place-label")
	.attr("x", function(d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
	.style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });
});

// updates info bar to show information about the location and allows user to add annotations
function selectLocation(city){
	selectedLocation = city;
	displayLocationInfo(city);
}

// adds an annotations to the currently selected location
function submitAnnotation(annotationText){

	var annotation = {
		userName: currentUser.name,
		location: selectedLocation,
		text: annotationText,
		timeStamp: new Date()
	};

	$.ajax({
		type: 'POST',
		url: "/postAnnotation",
		data: JSON.stringify(annotation),
		contentType: "application/json",
		complete: updateLocationInfo
	});
}


// refresh the location info bar
function updateLocationInfo(){
	if (selectedLocation)
		selectLocation(selectedLocation);
}

// removing an annotation from a location.
function deleteAnnotation(annotation){
	$.ajax({
		type: 'POST',
		url: "deleteAnnotation",
		data: JSON.stringify(annotation),
		contentType: "application/json",
		complete: updateLocationInfo
	})
}

//smoothly transitions from current location to a city
function travelToCity(city, duration, elapsedTime) {
	var center = path.centroid(city);
	var scale = 4;

	transitionTo(center, null, duration, elapsedTime);
}

// duration [optional] sets duration of transition
// elapsedTime [optional] makes the transition from elapsedTime to end
function transitionTo(center, scale, duration, elapsedTime){

	var cx = center[0],
		cy = center[1],
		screenWidth = scale ? height / scale : 200;

	var end = [];
	end[0] = cx;
	end[1] = cy;
	end[2] = screenWidth;

	var sb = getRealBounds(),
		start = [sb[0][0], sb[0][1], height / d3.transform(map.attr("transform")).scale[0]];

	var center = [width / 2, height / 2],
		interpolator = d3.interpolateZoom(start, end);

	var duration = duration ? duration : interpolator.duration * ANIMATION_DELAY,
		ease = elapsedTime ? resumed_ease(EASE_FUNCTION, elapsedTime) : EASE_FUNCTION;

	map.transition()
	.duration(duration)
	.ease(ease)
	.attrTween("transform", function() {
		return function(t) { return transformAt(interpolator(t)); };
	})
	.each("end.update", function(){
		updateScaleAndTrans();
	}); // updates global scale and transition variables

	// code from http://bl.ocks.org/mbostock/3828981
	function transformAt(p) {
		//k is the width of the selection we want to end with.
		var k = height / p[2];
		return "translate(" + (center[0] - p[0] * k) + "," + (center[1] - p[1] * k) + ")scale(" + k + ")";
	}
}

function makeZoomInterpolator(translation, scale){
	var sb = getRealBounds(),
		start = [sb[0][0], sb[0][1], height / d3.transform(map.attr("transform")).scale[0]];

	var cx = translation[0],
		cy = translation[1],
		screenWidth = scale ? height / scale : 200;

	var end = [cx, cy, screenWidth];

	return d3.interpolateZoom(start, end);
}

// updates the zoom.scale and zoom.translation properties to the map's current state
function updateScaleAndTrans(){
	var scale = d3.transform(map.attr("transform")).scale[0];
	var translate = [d3.transform(map.attr("transform")).translate[0], d3.transform(map.attr("transform")).translate[1]];
	zoom.scale(scale);
	zoom.translate(translate);
}

// A function to reset the map to the center, zoomed out.
function reset(){
	x = width / 2;
	y = height / 2;
	k = 1;

	map.transition()
	.duration(900 * ANIMATION_DELAY)
	.ease(EASE_FUNCTION)
	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
	.style("stroke-width", 1.5 / k + "px")
	.each("end", function(){
		return updateScaleAndTrans; // updates global scale and transition variables
	});
}

//causes a transition to the exploration's start event
function goToFirstLocation(exploration){
	var firstLocation = exploration.getEvent(0).body;
	var transform = d3.transform(firstLocation);
	var bounds = getRealBounds(transform);
	var center = [bounds[0][0], bounds[0][1]];
	var scale = transform.scale[0];
	transitionTo( [center[0], center[1]], scale );
}

// A function to return the index of a given city
function getCityIndex(name){
	for(j = 0; j < cities.length; j++){
		if(cities[j].properties.NAME == name){
			return j;
		}
	}
}

// when a city is clicked
function cityClicked(d){
	travelToCity(d);
}

// A function that takes you to a city
// location: number (city index) or string (city name)
// duration: duration of transition
// elapsedTime: continue transition from this time
function goToLoc(location, duration, elapsedTime) {
	if (typeof location === "number")
		location = cities[index];
	if (typeof location === "string")
		location = cities[getCityIndex(location)];

	selectLocation(location); // so that information appears in sidebar
	travelToCity(location, duration, elapsedTime);
}

// Pings a country on the scren
function ping(location) {
	var source;
	if (typeof location === "number")
		source = cities[location];
	if (typeof location === "string")
		source = cities[getCityIndex(location)];

	var center = path.centroid(source);
	var screenvars = getAbsoluteBounds();

	var xdist = Math.abs(center[0] - screenvars[0][0]);
	var ydist = Math.abs(center[1] - screenvars[0][1]);

	var startR = 0;

	//Only adjust radius if the target is off the map
	if ((xdist) > (screenvars[1][0]) || (ydist) > (screenvars[1][1])) {
		if (xdist === 0) {
			//Perfectly vertical alignment
			startR = ydist - (screenvars[1][1]);
		}
		else if (ydist === 0) {
			//Perfectly horizontal alignment
			startR = xdist - (screenvars[1][0]);
		}
		else {

			var xdy = (xdist / ydist);
			var screenRatio = width / height;
			var scaleVar = ((xdy) >= screenRatio) ? (xdist / (Math.abs(xdist - screenvars[1][0]))) : (ydist / (Math.abs(ydist - screenvars[1][1])));
			var dist = Math.sqrt(xdist * xdist + ydist * ydist);

			startR = dist / scaleVar;
		}

	}

	var endR = startR + screenvars[1][1] * PING_SIZE;

	map.append("circle")
	.attr({
		class: "ping",
		cx: center[0],
		cy: center[1],
		r: startR
	})
	.transition()
	.duration(750)
	.style("stroke-opacity", 0.25)
	.attr("r", endR)
	.each("end", function() {
		map.select(".ping").remove();
	});

}

//Convert the screen coords into data coords
//gets current screen coords if no arg
function getRealBounds(transform) {
	if (!transform)
		transform = d3.transform(map.attr("transform"));

	var tx = transform.translate[0];
	var ty = transform.translate[1];
	var sc = height / transform.scale[1];

	var xcenter = ((width / 2) - tx) / transform.scale[0];
	var ycenter = ((height / 2) - ty) / transform.scale[0];
	var xspan = width * sc / SCALE_FACTOR;
	var yspan = height * sc / SCALE_FACTOR;

	return [[xcenter, ycenter], [xspan, yspan]];
}


//
function getAbsoluteBounds() {
	var transforms = d3.transform(map.attr("transform"));

	var tx = transforms.translate[0];
	var ty = transforms.translate[1];

	var xcenter = ((width / 2) - tx) / transforms.scale[0];
	var ycenter = ((height / 2) - ty) / transforms.scale[0];

	return [[xcenter, ycenter], [(width / 2) / transforms.scale[1], (height / 2) / transforms.scale[1]]];
}
