// Enable JavaScript strict mode
"use strict";

// ###################################################################
// Audio pool object. Creates and manages a set of <audio> tags.

    // constructor
    var AudioPool = function (PoolID) {
        this.NumPlayers = 0;
        this.NumUsed = 0;
        this.LoopAudio = 0;
        this.LoopFade = false;
        this.ABPos = [0, 100];
        this.PoolID = PoolID;
        this.IDPlaying = -1;
        this.fadeOutTime = 0.03;
        this.positionUpdateInterval = 0.005;

        // web audio is only supported for same origin
        switch(window.location.protocol) {
           case 'http:':
           case 'https:':
            // check web audio support
             try {
               var genContextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
               this.waContext = new genContextClass();
               this.gainNodes = new Array();
             } catch(e) {
               // API not supported
               this.waContext = false;
             }
             break;
           case 'file:':
             this.waContext = false;
             break;
        }

	    // only enable webAudio on Chrome, Safri and Opera.
        if (!(clientIsChrome() || clientIsSafari() || clientIsOpera()))
            this.waContext = false;

        // set to false to manually disable WebAudioAPI support
        //this.waContext = false;

        // setup regular callback timer to check current playback position
        var _this = this;
        setInterval(this.loopCallback, this.positionUpdateInterval*1000, _this);

    }

    // insert audio pool into DOM
    AudioPool.prototype.register = function() {
        $('<div id="'+this.PoolID+'"></div>').appendTo('body');
    }

    // callback for timeUpdate event
    AudioPool.prototype.loopCallback = function(_this) {

        if (_this.IDPlaying!==-1) {

            var audiotag = $('#'+_this.PoolID+' > #audio'+_this.IDPlaying).get(0);

            // calculate progress including a look ahead for fade out or loop
            var progress = 0;
            progress = (audiotag.currentTime+_this.positionUpdateInterval+_this.fadeOutTime) / audiotag.duration * 100.0;

            // if end is reached ...
            if ((progress >= _this.ABPos[1]) && (!_this.LoopFade)) {
                if (_this.LoopAudio == true) {
                    _this.loopReturn();
                } else {
                    _this.pause();
                }
            }
        }
    }

    // ---------------------------------------------------------
    // overwrite these callbacks events after instantiation

    // callback for time update event
    AudioPool.prototype.onTimeUpdate = function(e) {}

    // callback for error event
    AudioPool.prototype.onError = function(e) {}

    // callback for error event
    AudioPool.prototype.onDataLoaded = function(e) {}
    // ---------------------------------------------------------


    // clear all files
    AudioPool.prototype.clear = function(){
        if (this.waContext!==false) {
            this.gainNodes = new Array();
            // maybe we also have to remove the connections?!
        }

        if (clientIsChrome()) {
            //fixes bug in chromium. Otherwise old connections are not freed and maximum number of connections is reached soon
            //https://code.google.com/p/chromium/issues/detail?id=234779
            $('#'+this.PoolID+' >.audiotags').prop('src', false);
        }

        $('#'+this.PoolID+' >.audiotags').remove();
    }

    // add new file to pool
    AudioPool.prototype.addAudio = function(path, ID){

        var audiotag = document.createElement("audio");

        audiotag.setAttribute('src', path);
        audiotag.setAttribute('class', 'audiotags');
        audiotag.setAttribute('id', "audio"+ID)

        if (this.waContext!==false) {
            var gainNode = this.waContext.createGain();
            gainNode.value = 0.00000001;
            var source = this.waContext.createMediaElementSource(audiotag);
            source.connect(gainNode);
            gainNode.connect(this.waContext.destination);
            gainNode.gain.setValueAtTime(0.0000001, 0);
            this.gainNodes[ID] = gainNode;
        }

        $(audiotag).off();

        // external event handlers
        $(audiotag).on("timeupdate", this.onTimeUpdate);
        $(audiotag).on("loadeddata", this.onDataLoaded);
        $(audiotag).on("error", this.onError);

        $('#'+this.PoolID).append(audiotag);

        if (!clientIsChrome()) {
            audiotag.setAttribute('preload', 'auto');
        } else {
            //preload=none fixes bug in chromium. Otherwise old connections are not freed and maximum number of connections is reached soon
            //https://code.google.com/p/chromium/issues/detail?id=234779
            audiotag.setAttribute('preload', 'none');
            audiotag.load();
        }
    }

    // play audio with specified ID
    AudioPool.prototype.play = function(ID){
        var audiotag = $('#'+this.PoolID+' > #audio'+ID).get(0);
        audiotag.currentTime = 0.000001 + this.ABPos[0] / 100.0 * audiotag.duration;

        if (this.waContext!==false) {
            var loopLen = (this.ABPos[1] - this.ABPos[0]) / 100.0 * audiotag.duration;
            if (loopLen > this.fadeOutTime*2 + this.positionUpdateInterval*2) {
                this.gainNodes[ID].gain.cancelScheduledValues(this.waContext.currentTime);
                this.gainNodes[ID].gain.setTargetAtTime(1, this.waContext.currentTime, this.fadeOutTime/1.0 );
                this.LoopFade = false;
                audiotag.play();
            }
        } else {
            audiotag.play();
        }

        this.IDPlaying = ID;
    }

    // return to loop begin
    AudioPool.prototype.loopReturn = function() {

        if (this.waContext!==false) {
            // fade out
            this.gainNodes[this.IDPlaying].gain.cancelScheduledValues(this.waContext.currentTime);
            this.gainNodes[this.IDPlaying].gain.setTargetAtTime(0, this.waContext.currentTime, this.fadeOutTime/8.0 );
            this.LoopFade = true;

            var audiotag = $('#'+this.PoolID+' > #audio'+this.IDPlaying).get(0);
            var currID = this.IDPlaying;
            var _this  = this;
            // wait till fade out is done
            setTimeout( function(){
                    _this.LoopFade = false;
                    audiotag.currentTime = 0.000001 + _this.ABPos[0] / 100.0 * audiotag.duration;
                    _this.gainNodes[_this.IDPlaying].gain.cancelScheduledValues(_this.waContext.currentTime);
                    _this.gainNodes[_this.IDPlaying].gain.setTargetAtTime(1, _this.waContext.currentTime, _this.fadeOutTime/1.0 );
                },
                this.fadeOutTime*1000 + 2
            );
        } else {
            // return to the start marker
            var audiotag = $('#'+this.PoolID+' > #audio'+this.IDPlaying).get(0);
            audiotag.currentTime = 0.000001 + this.ABPos[0] / 100.0 * audiotag.duration;
            audiotag.play();
        }
    }

    // pause currently playing audio
    AudioPool.prototype.pause = function() {

        if (this.IDPlaying!==-1) {

            var audiotag = $('#'+this.PoolID+' > #audio'+this.IDPlaying).get(0);
            if ((this.waContext!==false) && (!audiotag.paused)) {
                this.gainNodes[this.IDPlaying].gain.cancelScheduledValues(this.waContext.currentTime);
                this.gainNodes[this.IDPlaying].gain.setTargetAtTime(0, this.waContext.currentTime, this.fadeOutTime/8.0 );

                var _this  = this;
                var prevID = this.IDPlaying;
                setTimeout( function(){if (_this.IDPlaying!==prevID) audiotag.pause();}, _this.fadeOutTime*1000 + 5);
            } else {
                audiotag.pause();
            }
            this.IDPlaying = -1;
        }
    }

    // set volume of <audio> tags
    AudioPool.prototype.setVolume = function(vol) {
        var vol = $('#VolumeSlider').slider('option', 'value') / 100;

        var audioTags = $('#'+this.PoolID+' > audio');
        for (var i = 0; i<audioTags.length; i++) {
            audioTags[i].volume = vol;
        }
    }

    // set loop mode
    AudioPool.prototype.setLooped = function(loop) {
            this.LoopAudio = loop;
    }

    // toggle loop mode
    AudioPool.prototype.toggleLooped = function() {
        this.LoopAudio = !this.LoopAudio;
    }


// ###################################################################
// some helper functions

// logarithm to base 10
function log10(val) {
    return Math.log(val) / Math.log(10);
}

// check for Internet Explorer version
function clientIsIE() {
    if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)){ //test for MSIE x.x;
        var ieversion=new Number(RegExp.$1) // capture x.x portion and store as a number
        return ieversion;
    }
    return 0;
}

// check for Google Chrome/Chromium
function clientIsChrome() {
    return !!window.chrome && !clientIsOpera();
}

// check for Apple Safari
function clientIsSafari() {
    return Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
}

// check for Opera
function clientIsOpera() {
    return !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
}

// get date and time formatted as YYYMMDD-hhmmss
function getDateStamp() {
    var date = new Date();
    function pad(num) {
        num = num + '';
        return num.length < 2 ? '0' + num : num;
    }
    return date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) + '-' +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds());
}

// provide a virtual download to text file with a specified file name
function saveTextAsFile(txt, fileName)
{
	var fileBlob = new Blob([txt], {type:'text/plain'});

	var downloadLink = document.createElement("a");
	downloadLink.download = fileName;
	downloadLink.innerHTML = "Download File";

    // safari does not download text files but tries to open them in the browser
    // so let's at least open a new window for that
    if (clientIsSafari())
        downloadLink.target = "_blank";

	downloadLink.href = window.URL.createObjectURL(fileBlob);
	downloadLink.onclick = function (event) {document.body.removeChild(event.target);};
	downloadLink.style.display = "none";

	// Firefox requires the link to be added to the DOM
	// before it can be clicked.
	document.body.appendChild(downloadLink);

	downloadLink.click();
}

// shuffle array entries using the Fisher-Yates algorithm
// implementation inspired by http://bost.ocks.org/mike/shuffle/
function shuffleArray(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

// jQuery UI based alert() dialog replacement
$.extend({ alert: function (message, title) {
  $("<div></div>").dialog( {
    buttons: { "Close": function () { $(this).dialog("close"); } },
    close: function (event, ui) { $(this).remove(); },
    resizable: false,
    title: title,
    modal: true
  }).text(message);
}
});

// ###################################################################
// Listening test main object


    // ###################################################################
    // constructor and initialization
    var ListeningTest = function (TestData) {

        if (arguments.length == 0) return;

        // check if config file is valid
        if (typeof(TestData) == 'undefined') {
            alert('Config file could not be loaded!');
        }

        // check for IE as it does not support the FileAPI-Blob constructor below version 9
        if ((clientIsIE() > 0) && (clientIsIE() < 9)) {
           $('#LoadOverlay').show();
           $('#LoadOverlay').append('<p class="error">Internet Explorer version 8 and below is unfortunately not supported by BeaqleJS. Please update to a recent release or choose another browser.</p>');
           return;
        }

        this.TestConfig = TestData;

        // some state variables
        this.TestState = {
            "CurrentTest": -1, 		// the current test index
            "TestIsRunning": 0,		// is true if test is running, false when finished or not yet started
            "FileMappings": [],		// json array with random file mappings
            "Ratings": [],			// json array with ratings
            "EvalResults": [],      // json array to store the evaluated test results
            "AudiosInLoadQueue": -1,
            "AudioLoadError": false
        }


        // create and configure audio pool
        this.audioPool = new AudioPool('AudioPool');
        this.audioPool.register();
        this.audioPool.onTimeUpdate = $.proxy(this.audioTimeCallback, this);
        this.audioPool.onError = $.proxy(this.audioErrorCallback, this);
        this.audioPool.onDataLoaded = $.proxy(this.audioLoadedCallback, this);
        this.audioPool.setLooped(this.TestConfig.LoopByDefault);

        this.checkBrowserFeatures();

        // show introduction div
        $('#TestTitle').html(this.TestConfig.TestName);
        $('#TestIntroduction').show();

        // setup buttons and controls
        var handlerObject = this;
        $('#VolumeSlider').slider({
            min:0,
            max:100,
            value:100,
            slide: function( event, ui ) {
                var vol = log10($('#VolumeSlider').slider('option', 'value')) / 2;
                handlerObject.audioPool.setVolume(vol);
            }
        });

        if (this.TestConfig.EnableABLoop==true) {
            $('#ABRange').slider({
                range: true,
                values: [ 0, 100],
                min:0,
                max:100,
                slide: function( event, ui ) {
                        handlerObject.audioPool.ABPos = ui.values;
                }
            });
        } else {
            $('#ABRange').hide();
            $('#ProgressBar').css('margin-top', $('#ProgressBar').height() + 'px');
        }
        $('#PauseButton').button();

        //$('#ChkLoopAudio').button();
        if (this.TestConfig.LoopByDefault) {
            $('#ChkLoopAudio').prop("checked", true);
        } else {
            $('#ChkLoopAudio').prop("checked", false);
        }
        $('#ChkLoopAudio').on('change', $.proxy(handlerObject.toggleLooping, handlerObject));

        $('#ProgressBar').progressbar();
        $('#BtnNextTest').button();
        $('#BtnNextTest').on('click', $.proxy(handlerObject.nextTest, handlerObject));
        $('#BtnPrevTest').button();
        $('#BtnPrevTest').on('click', $.proxy(handlerObject.prevTest, handlerObject));
        $('#BtnStartTest').button();
        $('#BtnSubmitData').button({ icons: { primary: 'ui-icon-signal-diag' }});
        $('#BtnDownloadData').button({ icons: { primary: 'ui-icon-arrowthickstop-1-s' }});


        // install handler to warn user when test is running and he tries to leave the page
        var testHandle = this.TestState
        window.onbeforeunload = function (e) {
            if (testHandle.TestIsRunning==true) {
                return 'The listening test is not yet finished!';
            } else {
                return;
            }
        }


    }

    // ###################################################################
    ListeningTest.prototype.nextTest = function() {

        this.pauseAllAudios();

        // save ratings from last test
        if (this.saveRatings(this.TestState.TestSequence[this.TestState.CurrentTest])==false)
            return;

        // stop time measurement
        var stopTime = new Date().getTime();
        this.TestState.Runtime[this.TestState.TestSequence[this.TestState.CurrentTest]] += stopTime - this.TestState.startTime;

        // go to next test
        if (this.TestState.CurrentTest<this.TestState.TestSequence.length-1) {
            this.TestState.CurrentTest = this.TestState.CurrentTest+1;
        	this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
        } else {
            // if previous test was last one, ask before loading final page and then exit test
            if (confirm('This was the last test. Do you want to finish?')) {

                $('#TableContainer').hide();
                $('#PlayerControls').hide();
                $('#TestControls').hide();
                $('#TestEnd').show();

                $('#ResultsBox').html(this.formatResults());
                if (this.TestConfig.ShowResults)
                    $("#ResultsBox").show();
                else
                    $("#ResultsBox").hide();

                $("#SubmitBox").show();

                $("#SubmitBox > .submitEmail").hide();
                if (this.TestConfig.EnableOnlineSubmission) {
                    $("#SubmitBox > .submitOnline").show();
                    $("#SubmitBox > .submitDownload").hide();
                } else {
                    $("#SubmitBox > .submitOnline").hide();
                    if (this.TestConfig.SupervisorContact) {
                        $("#SubmitBox > .submitEmail").show();
                        $(".supervisorEmail").html(this.TestConfig.SupervisorContact);
                    }
                    if (this.browserFeatures.webAPIs['Blob']) {
                        $("#SubmitBox > .submitDownload").show();
                    } else {
                        $("#SubmitBox > .submitDownload").hide();
                        $("#ResultsBox").show();
                    }
                }
            }
            return;
        }
    }

    // ###################################################################
    ListeningTest.prototype.prevTest = function() {

        this.pauseAllAudios();

        if (this.TestState.CurrentTest>0) {
            // save ratings from last test
            if (this.saveRatings(this.TestState.TestSequence[this.TestState.CurrentTest])==false)
                return;

            // stop time measurement
            var stopTime = new Date().getTime();
            this.TestState.Runtime[this.TestState.TestSequence[this.TestState.CurrentTest]] += stopTime - this.TestState.startTime;
            // go to previous test
            this.TestState.CurrentTest = this.TestState.CurrentTest-1;
        	this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
        }
    }

    // ###################################################################
    ListeningTest.prototype.startTests = function() {

        // init linear test sequence
        this.TestState.TestSequence = Array();
        for (var i = 0; i < this.TestConfig.Testsets.length; i++)
            this.TestState.TestSequence[i] = i;

        // shorten and/or shuffle the sequence
        if ((this.TestConfig.MaxTestsPerRun > 0) && (this.TestConfig.MaxTestsPerRun < this.TestConfig.Testsets.length)) {
            this.TestConfig.RandomizeTestOrder = true;
            this.TestState.TestSequence = shuffleArray(this.TestState.TestSequence);
            this.TestState.TestSequence = this.TestState.TestSequence.slice(0, this.TestConfig.MaxTestsPerRun);
        } else if (this.TestConfig.RandomizeTestOrder == true) {
            this.TestState.TestSequence = shuffleArray(this.TestState.TestSequence);
        }

        this.TestState.Ratings = Array(this.TestConfig.Testsets.length);
        this.TestState.Runtime = new Uint32Array(this.TestConfig.Testsets.length);
//        this.TestState.Runtime.forEach(function(element, index, array){array[index] = 0});
        this.TestState.startTime = 0;

        // run first test
        this.TestState.CurrentTest = 0;
    	this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
    }

    // ###################################################################
    // prepares display to run test with number TestIdx
    ListeningTest.prototype.runTest = function(TestIdx) {

        this.pauseAllAudios();

        if ((TestIdx<0) || (TestIdx>this.TestConfig.Testsets.length)) throw new RangeError("Test index out of range!");

        this.audioPool.clear();
        this.TestState.AudiosInLoadQueue = 0;
        this.TestState.AudioLoadError = false;

        this.createTestDOM(TestIdx);

        // set current test name
        $('#TestHeading').html(this.TestConfig.Testsets[TestIdx].Name + " (" + (this.TestState.CurrentTest+1) + " of " + this.TestState.TestSequence.length + ")");
        $('#TestHeading').show();

        // hide everything instead of load animation
        $('#TestIntroduction').hide();
        $('#TestControls').hide();
        $('#TableContainer').hide();
        $('#PlayerControls').hide();
        $('#LoadOverlay').show();

        // set some state variables
        this.TestState.TestIsRunning = 1;

        var handlerObject = this;
        $('.stopButton').each( function() {
            $(this).button();
            $(this).on('click', $.proxy(handlerObject.pauseAllAudios, handlerObject));
        });

        $('.playButton').each( function() {
            $(this).button();
            var audioID = $(this).attr('rel');
            $(this).on('click', $.proxy(function(event) {handlerObject.playAudio(audioID)}, handlerObject));
        });

        // load and apply already existing ratings
        if (typeof this.TestState.Ratings[TestIdx] !== 'undefined') this.readRatings(TestIdx);

        this.TestState.startTime = new Date().getTime();

    }

    // ###################################################################
    // pause all audios
    ListeningTest.prototype.pauseAllAudios = function () {
        this.audioPool.pause();
        $(".playButton").removeClass('playButton-active');
        $('.rateSlider').parent().css('background-color', 'transparent');
    }

    // ###################################################################
    // read ratings from TestState object
    ListeningTest.prototype.readRatings = function (TestIdx) {
        // overwrite and implement in inherited class
        alert('Function readRatings() has not been implemented in your inherited class!');
    }

    // ###################################################################
    // save ratings to TestState object
    ListeningTest.prototype.saveRatings = function (TestIdx) {
        // overwrite and implement in inherited class
        alert('Function saveRatings() has not been implemented in your inherited class!');
    }

    // ###################################################################
    // evaluate test and format/print the results
    ListeningTest.prototype.formatResults = function () {
        // overwrite and implement in inherited class
        alert('Function formatResults() has not been implemented in your inherited class!');
    }

    // ###################################################################
    // create DOM for test display
    ListeningTest.prototype.createTestDOM = function (TestIdx) {
        // overwrite and implement in inherited class
        alert('Function createTestDOM() has not been implemented in your inherited class!');
    }

    // ###################################################################
    // is called whenever an <audio> tag fires the onDataLoaded event
    ListeningTest.prototype.audioLoadedCallback = function () {
        this.TestState.AudiosInLoadQueue--;

        // show test if all files finished loading and no errors occured
        if ((this.TestState.AudiosInLoadQueue==0) && (this.TestState.AudioLoadError==false)) {
            $('#TestControls').show();
            $('#TableContainer').show();
            $('#PlayerControls').show();
            $('#LoadOverlay').hide();
        }
    }

    // ###################################################################
    // audio loading error callback
    ListeningTest.prototype.audioErrorCallback = function(e) {

        this.TestState.AudioLoadError = true;

        var errorTxt = "<p>ERROR ";

        switch (e.target.error.code) {
         case e.target.error.MEDIA_ERR_NETWORK:
           errorTxt +=  "Network problem, ";
           break;
         case e.target.error.MEDIA_ERR_DECODE:
           errorTxt +=  "File corrupted or unsupported format, ";
           break;
         case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
           errorTxt +=  "Wrong URL or unsupported file format, ";
           break;
         default:
           errorTxt +=  "Unknown error, ";
           break;
        }
        errorTxt +=  e.target.src + "</p>";

        $('#LoadOverlay').append(errorTxt);
    }

    // ###################################################################
    // audio time update callback
    ListeningTest.prototype.audioTimeCallback = function(e) {

        var s = parseInt(e.target.currentTime % 60);
        var m = parseInt((e.target.currentTime / 60) % 60);

        if (m<10) m = "0"+m;
        if (s<10) s = "0"+s;

        $('#duration > span').html( m + ':' + s );

        var progress = e.target.currentTime / e.target.duration * 100;

        $('#ProgressBar').progressbar( "option", "value", progress);
    }


    // ###################################################################
    // enable looping for all audios
    ListeningTest.prototype.toggleLooping = function () {
        this.audioPool.toggleLooped();
    }

    // ###################################################################
    //play audio with specified html ID
    ListeningTest.prototype.playAudio = function (id) {

        this.audioPool.pause();

        // reset all buttons and sliders
        $('.rateSlider').parent().css('background-color', 'transparent');
        $('.playButton').removeClass('playButton-active');

        // highlight active slider and button
        $(".rateSlider[rel="+id+"]").parent().css('background-color', '#D5E5F6');
        $(".playButton[rel="+id+"]").addClass('playButton-active');

        this.audioPool.play(id);
    }

    // ###################################################################
    // add and load audio file with specified ID
    ListeningTest.prototype.addAudio = function (TestIdx, fileID, relID) {
        this.TestState.AudiosInLoadQueue += 1;
        this.audioPool.addAudio(this.TestConfig.Testsets[TestIdx].Files[fileID], relID)
    }

    // ###################################################################
    // submit test results to server
    ListeningTest.prototype.SubmitTestResults = function () {

        var UserObj = new Object();
        UserObj.UserName = $('#UserName').val();
        UserObj.UserEmail = $('#UserEMail').val();
        UserObj.UserComment = $('#UserComment').val();

        var EvalResults = this.TestState.EvalResults;
        EvalResults.push(UserObj)

        var testHandle = this;
        $.ajax({
                    type: "POST",
                    timeout: 5000,
                    url: testHandle.TestConfig.BeaqleServiceURL,
                    data: {'testresults':JSON.stringify(EvalResults), 'username':UserObj.UserName},
                    dataType: 'json'})
            .done( function (response){
                    if (response.error==false) {
                        $('#SubmitBox').html("Your submission was successful.<br/><br/>");
                        testHandle.TestState.TestIsRunning = 0;
                    } else {
                        $('#SubmitError').show();
                        $('#SubmitError > #ErrorCode').html(response.message);
                        $("#SubmitBox > .submitOnline").hide();
                        if (this.TestConfig.SupervisorContact) {
                            $("#SubmitBox > .submitEmail").show();
                            $(".supervisorEmail").html(this.TestConfig.SupervisorContact);
                        }
                        if (testHandle.browserFeatures.webAPIs['Blob']) {
                            $("#SubmitBox > .submitDownload").show();
                        } else {
                            $("#SubmitBox > .submitDownload").hide();
                            $("#ResultsBox").show();
                        }
                        $('#SubmitData').button('option',{ icons: { primary: 'ui-icon-alert' }});
                    }
                })
            .fail (function (xhr, ajaxOptions, thrownError){
                    $('#SubmitError').show();
                    $('#SubmitError > #ErrorCode').html(xhr.status);
                    $("#SubmitBox > .submitOnline").hide();
                    if (this.TestConfig.SupervisorContact) {
                        $("#SubmitBox > .submitEmail").show();
                        $(".supervisorEmail").html(this.TestConfig.SupervisorContact);
                    }
                    if (testHandle.browserFeatures.webAPIs['Blob']) {
                        $("#SubmitBox > .submitDownload").show();
                    } else {
                        $("#SubmitBox > .submitDownload").hide();
                        $("#ResultsBox").show();
                    }
                });
        $('#BtnSubmitData').button('option',{ icons: { primary: 'load-indicator' }});

    }

    // ###################################################################
    // submit test results to server
    ListeningTest.prototype.DownloadTestResults = function () {

        var UserObj = new Object();
        UserObj.UserName = $('#UserName').val();
        UserObj.UserEmail = $('#UserEMail').val();
        UserObj.UserComment = $('#UserComment').val();

        var EvalResults = this.TestState.EvalResults;
        EvalResults.push(UserObj)

        saveTextAsFile(JSON.stringify(EvalResults), getDateStamp() + "_" + UserObj.UserName + ".txt");

        this.TestState.TestIsRunning = 0;
    }

    // ###################################################################
    // Check browser capabilities
    ListeningTest.prototype.checkBrowserFeatures = function () {

        var features = new Object();

        features.webAPIs = new Array();
        features.webAPIs['webAudio'] = this.audioPool.waContext!==false;
        features.webAPIs['Blob']     = !!window.Blob;

        features.audioFormats = new Array();
        var a = document.createElement('audio');
        features.audioFormats['WAV'] = !!(a.canPlayType && a.canPlayType('audio/wav; codecs="1"').replace(/no/, ''));
        features.audioFormats['OGG'] = !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
        features.audioFormats['MP3'] = !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
        features.audioFormats['AAC'] = !!(a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''));

        this.browserFeatures = features;
    }

    // ###################################################################
    // Get browser features formatted as a HTML string
    ListeningTest.prototype.browserFeatureString = function () {
        var featStr = "Available HTML5 browser features:";
        if (this.browserFeatures.webAPIs['webAudio'])
            featStr += " <span class='feature-available'>WebAudioAPI</span>, ";
        else
            featStr += " <span class='feature-not-available'>WebAudioAPI</span>, ";

        if (this.browserFeatures.webAPIs['Blob'])
            featStr += " <span class='feature-available'>BlobAPI</span>, ";
        else
            featStr += " <span class='feature-not-available'>BlobAPI</span>, ";

        if (this.browserFeatures.audioFormats['WAV'])
            featStr += " <span class='feature-available'>WAV</span>, ";
        else
            featStr += " <span class='feature-not-available'>WAV</span>, ";

        if (this.browserFeatures.audioFormats['OGG'])
            featStr += " <span class='feature-available'>Vorbis</span>, ";
        else
            featStr += " <span class='feature-not-available'>Vorbis</span>, ";

        if (this.browserFeatures.audioFormats['MP3'])
            featStr += " <span class='feature-available'>MP3</span>, ";
        else
            featStr += " <span class='feature-not-available'>MP3</span>, ";

        if (this.browserFeatures.audioFormats['AAC'])
            featStr += " <span class='feature-available'>AAC</span>";
        else
            featStr += " <span class='feature-not-available'>AAC</span>";

        return featStr;
    }
