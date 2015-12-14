//run selenium server: java -jar selenium-server-standalone-2.48.2.jar -Dwebdriver.chrome.driver=chromedriver
// node_modules/intern/bin/intern-runner.js config=tests/local_profile reporters=lcovhtml


//define(function(require){
//       var registerSuite = require( 'intern!object');
//       var assert = require('intern/chai!assert');
//	registerSuite({
//		name: 'Test public/js/events',
//		'Exploration control buttons': function(){
//			return this.remote
//			.findAllByClassName('user-button')
//				.then(function(btns){
//					var btnRecord = btns[0];
//					return btnRecord;
//				})
//				.click()
//				.end()
//				.then(function(){
//					assert.equal(explRecording, true);
//				})
//		},
//	});
//});

define(function (require) {
	  var assert = require('intern/chai!assert');
	  var registerSuite = require('intern!object');

	  // Don't put this here! This variable is shared!
	  var counter = 0;

	  registerSuite({
	    name: 'Anti-pattern',

	    setup: function () {
	      app = {
	        id: counter++
	      };
	    },

	    'Test the id': function () {
	      // May or may not be true! The value of `counter`
	      // may have been modified by another suite execution!
	      assert.strictEqual(app.id, counter - 1);
	    }
	  });
	});