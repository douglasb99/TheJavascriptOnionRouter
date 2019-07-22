/*
 * This is only used for testing of the groups module. To test that it works without any wierd algorithmic bugs
 * ect but I left it in here anyway. 
 */

var GroupsTester = (function () {

	// needs to be called. it adds  a testing interface to the program.
	function test() {
		var group1 = ['179798', '1576', '156773', '15679802', '1685475'];
		var group2 = ['279798', '2576', '256773', '25679802', '2685475'];
		var group3 = ['379798', '3576', '356773', '35679802', '3685475'];
		var group4 = ['479798', '4576', '456773', '45679802', '4685475'];
		var key1 = "qwerty";
		var position1 = "first";
		var key2 = "wtf";
		var position2 = "second";
		var key3 = "lekey3";
		var position3 = null;
		var key4 = "lefourth";
		var position4 = null;

		for (var i = 1; i < group1.length; i++) {
			Groups.createIfNew(group1[i], position1);
			Groups.linkUnknowns(group1[0], group1[i]);
		}

		for (var i = 0; i < group2.length; i++) {
			Groups.createIfNew(group2[i], position2);
			Groups.linkUnknowns(group2[0], group2[i]);
		}
		Groups.associateKey(group2[4], "thefirstKey");
		for (var i = 0; i < group3.length; i++) {
			Groups.createIfNew(group3[i], position3);
			Groups.linkUnknowns(group3[0], group3[i]);

		}
		for (var i = 0; i < group4.length; i++) {
			Groups.createIfNew(group4[i], position4);
			Groups.linkUnknowns(group4[0], group4[i]);
		}
		Groups.associateKey(group3[2], "thesecondKey");
		Groups.linkThreeUnknowns(group1[0], group3[1], group3[0]);
		Groups.linkThreeUnknowns(group2[2], group2[3], group2[3]);
	}

	return {
		test: test
	}
})();