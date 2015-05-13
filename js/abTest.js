
// ###################################################################
// AB test main object

// inherit from ListeningTest
function abTest(TestData) {
    ListeningTest.apply(this, arguments);
}
abTest.prototype = new ListeningTest();
abTest.prototype.constructor = abTest;



// ###################################################################
// create random mapping to test files
abTest.prototype.createFileMapping = function (TestIdx) {
    var NumFiles = $.map(this.TestConfig.Testsets[TestIdx].Files, function(n, i) { return i; }).length;
    var fileMapping = new Array(NumFiles);    

    $.each(this.TestConfig.Testsets[TestIdx].Files, function(index, value) { 

        do {
            var RandFileNumber = Math.floor(Math.random()*(NumFiles));
            if (RandFileNumber>NumFiles-1) RandFileNumber = NumFiles-1;
        } while (typeof fileMapping[RandFileNumber] !== 'undefined');

        if (RandFileNumber<0) alert(fileMapping);
        fileMapping[RandFileNumber] = index;
    });
    
    this.TestState.FileMappings[TestIdx] = fileMapping;
}

// implement specific code
abTest.prototype.createTestDOM = function (TestIdx) {

    // clear old test table
    if ($('#TableContainer > table')) {
        $('#TableContainer > table').remove();
    }

    // create new test table
    var tab = document.createElement('table');
    tab.setAttribute('id','TestTable');
    
    var fileID = "";
    var row = new Array();
    var cell = new Array();

    // create random file mapping if not yet done
    if (!this.TestState.FileMappings[TestIdx]) {
        this.createFileMapping(TestIdx);
    }
    
    // add reference
    fileID = "A";
    row  = tab.insertRow(-1);
    cell[0] = row.insertCell(-1);
    cell[0].innerHTML = '<button id="play'+fileID+'Btn" class="playButton" rel="'+fileID+'">A</button>';
    this.addAudio(TestIdx, fileID, fileID);

    cell[1] = row.insertCell(-1);
    cell[1].innerHTML = '<button id="sameBtn" class="playButton">=</button>';

    fileID = "B";
    cell[2] = row.insertCell(-1);
    cell[2].innerHTML = '<button id="play'+fileID+'Btn" class="playButton" rel="'+fileID+'">B</button>';
    this.addAudio(TestIdx, fileID, fileID);

    cell[3] = row.insertCell(-1);
    cell[3].innerHTML = "<button class='stopButton'>Stop</button>";
    
    cell[4] = row.insertCell(-1);
    cell[4].innerHTML = "Press buttons to start/stop playback."; 
    
    row[1]  = tab.insertRow(-1);
    cell[0] = row[1].insertCell(-1);
    cell[0].innerHTML = "<input type='radio' name='ItemSelection' id='selectA'/>";
    cell[1] = row[1].insertCell(-1);
    cell[1].innerHTML = "<input type='radio' name='ItemSelection' id='selectSame'/>";  
    cell[2] = row[1].insertCell(-1);
    cell[2].innerHTML = "<input type='radio' name='ItemSelection' id='selectB'/>";  
    cell[3] = row[1].insertCell(-1);
    cell[4] = row[1].insertCell(-1);
    cell[4].innerHTML = "Please select the item which is better!";  
    
    // add spacing
    row = tab.insertRow(-1);
    row.setAttribute("height","5");  

    // append the created table to the DOM
    $('#TableContainer').append(tab);	

    // randomly preselect one radio button
    if (typeof this.TestState.Ratings[TestIdx] == 'undefined') {
        /*if (Math.random() > 0.5) {
          $("#selectB").prop("checked", true);
          } else {
          $("#selectA").prop("checked", true);
          }*/
    }
}


abTest.prototype.readRatings = function (TestIdx) {

    if (this.TestState.Ratings[TestIdx] === "A") {
        $("#selectA").prop("checked", true);
    } else if (this.TestState.Ratings[TestIdx] === "B") {
        $("#selectB").prop("checked", true);
    } else if (this.TestState.Ratings[TestIdx] === "=") {
        $("#selectSame").prop("checked", true);
    }

}

abTest.prototype.saveRatings = function (TestIdx) {

    if ($("#selectA").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "A";
    } else if ($("#selectB").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "B";
    } else if ($("#selectSame").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "=";
    }
}

abTest.prototype.formatResults = function () {

    var resultstring = "";
    var tab = document.createElement('table');
    var row;
    var cell;

    var numSame = 0;
    var numA = 0;
    var numB = 0;

    // table head
    row  = tab.insertRow(-1);
    cell = row.insertCell(-1);
    cell.innerHTML = "Test id"
    cell = row.insertCell(-1);
    cell.innerHTML = "Left audio"
    cell = row.insertCell(-1);
    cell.innerHTML = "Right audio"
    cell = row.insertCell(-1);
    cell.innerHTML = "Which one is Better?";

    // evaluate single tests
    for (var i = 0; i < this.TestConfig.Testsets.length; i++) {
        this.TestState.EvalResults[i]        = new Object();
	this.TestState.EvalResults[i].TestID = this.TestConfig.Testsets[i].TestID;

        if (this.TestState.TestSequence.indexOf(i)>=0) {
            row  = tab.insertRow(-1);

	    // test id
            cell = row.insertCell(-1);
            cell.innerHTML = this.TestConfig.Testsets[i].TestID;
	    // left one
            cell = row.insertCell(-1);
            cell.innerHTML = this.TestConfig.Testsets[i].Files["A"];
	    // right one
            cell = row.insertCell(-1);
            cell.innerHTML = this.TestConfig.Testsets[i].Files["B"];
	    // better one
            cell = row.insertCell(-1);
            // cell.innerHTML = this.TestState.Ratings[i];
	    
	    var choice = this.TestState.Ratings[i];
	    // choice = this.TestState.Ratings[i];
	    if (choice === "=" ){
	    	cell.innerHTML = "No prefer";		
		numSame++;
		this.TestState.EvalResults[i].Result = "Prefer:" + "No prefer";
	    } else if (choice === "A"){
	    	cell.innerHTML = this.TestConfig.Testsets[i].Files[choice];
		this.TestState.EvalResults[i].Result = "Prefer:" + this.TestConfig.Testsets[i].Files[choice];
		numA++;
	    } else {
	    	cell.innerHTML = this.TestConfig.Testsets[i].Files[choice];
		this.TestState.EvalResults[i].Result = "Prefer:" + this.TestConfig.Testsets[i].Files[choice];
		numB++;
	    }

        }
    }


    var SummaryObj = new Object();
    SummaryObj.Summary = ""
    
    SummaryObj.Summary += "No prefer: " + (numSame/this.TestConfig.Testsets.length*100).toFixed(2) + " %, ";
    SummaryObj.Summary += "Prefer A: " + (numA/this.TestConfig.Testsets.length*100).toFixed(2) + " %, ";
    SummaryObj.Summary += "Prefer B: " + (numB/this.TestConfig.Testsets.length*100).toFixed(2) + " %";

    this.TestState.EvalResults.push(SummaryObj);

    resultstring += tab.outerHTML;

    resultstring += "<br/><p> [Summary] " + SummaryObj.Summary;

    return resultstring;
}
