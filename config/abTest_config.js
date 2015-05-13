// configure the test here
var TestConfig = {
    "TestName": "AB Test",
    "LoopByDefault": true,
    "ShowFileIDs": true,
    "ShowResults": true,
    "EnableABLoop": true,
    "EnableOnlineSubmission": false,
    "BeaqleServiceURL": "",
    "SupervisorContact": "", 
    "Testsets": [
	//    
	{
	    "TestID": "id1",
	    "Files": {
		"A": 'audio/left/tnew01.wav',
		"B": 'audio/right/tnew01.wav',
	    }
	},
	{
	    "TestID": "id2",
	    "Files": {
		"A": 'audio/left/tnew02.wav',
		"B": 'audio/right/tnew02.wav',
	    }
	},
	{
	    "TestID": "id3",
	    "Files": {
		"A": 'audio/left/tnew03.wav',
		"B": 'audio/right/tnew03.wav',
	    }
	}

    ]
}
