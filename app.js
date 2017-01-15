/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// provide static access for AngularJS and Angular Material.
app.use('/node_modules', express.static(__dirname + '/node_modules'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// body-parser
var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// date-util
var dateutil = require("date-utils");


try {
	
	var ibcCredentials = require("./mycreds.json").credentials;
	console.log("hardcord credentials: ", ibcCredentials);
	console.log("loading hardcoded peers");
	//need to define peers data
	var peers = ibcCredentials.peers;
	var users = null;					// users are only found if security is on
	if(ibcCredentials.users) {
		console.log("loading hardcoded users");
		// need to define users data
		users = ibcCredentials.users;
	}
	// need to define chaincode
	var deployed_cc = ibcCredentials.chaincode;
	console.log(deployed_cc);
} catch (e) {
	console.log("Error - could not find hardcoded peers/users, this is okay if running in bluemix");
}

// load peers from VCAP, VCAP will overwrite hardcoded list!
// ---- Load From VCAP aka Bluemix Services ---- //
if (process.env.VCAP_SERVICES) {
	// load from vcap, search for service, 1 of the 3 should be found...
	var servicesObject = JSON.parse(process.env.VCAP_SERVICES);
	for (var i in servicesObject) {
		if (i.indexOf("ibm-blockchain-5-prod") >= 0) {
			// looks close enough
			if (servicesObject[i][0].credentials.error) {
				console.log("!\n!\n! Error from Bluemix: \n", servicesObject[i][0].credentials.error, "!\n!\n");
				peers = null;
				users = null;
				process.error = {
					type:	"network",
					msg:	"Due to overwhelming demand the IBM Blockchain Network service is at maximum capacity. Please try recreating this service at a later date."
				};
			}
			if (servicesObject[i][0].credentials && servicesObject[i][0].credentials.peers) {
				// found the blob, copy it to 'peers'
				console.log("overwritting peers, loading from a vcap service: ", i);
				peers = servicesObject[i][0].credentials.peers;
				if (servicesObject[i][0].credentials.users) {
					// user field may or maynot exist, depends on if there is membership services or not for the network
					console.log("overwritting users, loading from a vcap service: ", i);
					users = servicesObject[i][0].credentials.users;
				} 
				break;
			}
		}
	}
}

// Blockchain

//cred
var opt = {
	network:{
		peers: [{
			api_host:		peers[0].api_host,			// Validating Peer 0
			api_port:		peers[0].api_port,			// Validating Peer 0
			api_port_tls:	peers[0].api_port_tls,		// Validating Peer 0
			id:				peers[0].id					// Validating Peer 0
		}],
		users: [{
			enrollId:		users[2].enrollId,			// user id
			enrollSecret:	users[2].enrollSecret		// password
		}],
		options: {
			quiet:		true, 	// detailed debug messages on/off true/false
			tls:		true, 	// should app to peer communication use tls?
			maxRetry:	3		// how many times should we retry register before giving up
		}
	},
	chaincode: {
		zip_url:		"https://github.com/yusuke-matsu/testApp/archive/master.zip",
		unzip_dir:		"testApp-master/",		　　　　// subdirectroy name of chaincode after unzipped
		git_url:		"https://github.com/yusuke-matsu/testApp",			// GO get http url
		deployed_name:	deployed_cc
	}
};

var Ibc1 = require("ibm-blockchain-js");
var ibc = new Ibc1();
var chaincode = null;								// sdk will populate this var in time, lets give it high scope by creating it here
ibc.load (opt, function (err, cc) {					// parse/load chaincode, response has chaincode functions!
	console.log("loading chaincode", JSON.stringify(opt));
	if (err != null) {
		console.log("! looks like an error loading the chaincode or network, app will fail\n", err);
		if (!process.error) process.error = {
			type:	"load",
			msg:	err.details
		};				// if it already exist, keep the last error
	} else {
		chaincode = cc;

		// ---- To Deploy or Not to Deploy ---- //
		if (!cc.details.deployed_name || cc.details.deployed_name === "") {
			// yes, go deploy
			cc.deploy("init", [], null, cb_deployed);
			console.log("chaincode deployed: ", cc.details.deployed_name);
		} else {
			// no, already deployed
			console.log("chaincode summary file indicates chaincode has been previously deployed", cc.details.deployed_name);
		}
		
		function cb_deployed(){
		    console.log(JSON.stringify(chaincode));
    		console.log("sdk has deployed code and waited");
		}
	}
});

app.get("/deploy", function(req, res) {
	console.log("call chaincode for /deploy");
	opt.chaincode.deployed_name = "";

	ibc.load (opt, function (err, cc) {					// parse/load chaincode, response has chaincode functions!
		console.log("loading chaincode", JSON.stringify(opt));
		if (err != null) {
			console.log("! looks like an error loading the chaincode or network, app will fail\n", err);
			if (!process.error) process.error = {
				type:	"load",
				msg:	err.details
			};				// if it already exist, keep the last error
			res.sendStatus(500);
		} else {
			chaincode = cc;

			// ---- To Deploy or Not to Deploy ---- //
			if (!cc.details.deployed_name || cc.details.deployed_name === "") {
				// yes, go deploy
				cc.deploy("init", [], null, cb_deployed);
				console.log("chaincode deployed: ", cc.details.deployed_name);
			} else {
				// no, already deployed
				console.log("chaincode summary file indicates chaincode has been previously deployed", cc.details.deployed_name);
			}
			res.sendStatus(200);
		
			function cb_deployed(){
			    console.log(JSON.stringify(chaincode));
    			console.log("sdk has deployed code and waited");
			}
		}
	});
});

app.post("/invoke/issue", function(req, res) {
	console.log("call chaincode for /invoke/issue: " + JSON.stringify(req.body));
	//chaincode = opt.chaincode.deployed_name;
    console.log(chaincode);
	if (!chaincode) {
		console.log(req.body);
		console.log("chaincode has not been prepared");
		res.sendStatus(500);
	} else {
		// invoke.issue
		console.log(chaincode);
		
		
		var data = {};
		data = req.body;
		console.log(req.body);
		console.log("calling invoke.issue: " + data.personName + ", " + data.amount);
		chaincode.invoke.issue([
			data.personName,
			data.amount
			], function(err, result) {
				if (err) {
					// 既にissueが登録済みの場合、エラーが返されるはずだが、正常終了する
					// ただし、ブロックチェーンのログにはエラーが記録されている
					console.log("invoke.issue failed: ", req.params.id, err);
					res.sendStatus(204);
				}
			});
			
		res.json(data);
	}
});

app.post("/invoke/change", function(req, res) {
	console.log("call chaincode for /query/" + JSON.stringify(req.params));
    if (!chaincode) {
		console.log("chaincode has not been prepared");
		res.sendStatus(500);
	} else {
		//query.getIssue		
		chaincode.query.getIssue([req.params.personName],function(err,result){
			if (err !== null){
				console.log("alliss is faild");
				res.sendStatus(204);
			}else{
				console.log("alliss is success");
				res.send(JSON.parse(result));
			}
		});
	}
});



app.get("/query/allissue", function(req, res) {
	console.log("call chaincode for /query/allIssue: " + JSON.stringify(req.body));
    console.log(chaincode);
    if (!chaincode) {
		console.log(req.body);
		console.log("chaincode has not been prepared");
		res.sendStatus(500);
	} else {
		//query.allIssue		
		chaincode.query.getAllIssues([],function(err,result){
			if (err){
				console.log("alliss is faild");
				res.sendStatus(204);
			}else{
				console.log("alliss is success");
				res.send(JSON.parse(result));
			}
		});
	}
});

app.get("/query/:personName", function(req, res) {
	console.log("call chaincode for /query/" + JSON.stringify(req.params));
    if (!chaincode) {
		console.log("chaincode has not been prepared");
		res.sendStatus(500);
	} else {
		//query.getIssue		
		chaincode.query.getIssue([req.params.personName],function(err,result){
			if (err !== null){
				console.log("alliss is faild");
				res.sendStatus(204);
			}else{
				console.log("alliss is success");
				console.log(result);
				
				res.send(JSON.parse(result));
				
			}
		});
	}
});





// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});