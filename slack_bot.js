/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node slack_bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it is running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');
var request = require('request');

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

const port = process.env.VCAP_APP_PORT || 3000;

controller.setupWebserver(port, function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver);
});


//start to say Hello.
controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

// teach your nickname.
controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

// Help your talk. What adam can do.
controller.hears(['Help','help'], 'direct_message,direct_mention,mention', function(bot, message) {

 bot.reply(message,'Search XXX- Search XXX by google custom search.\nCall me XXX - Tell the bot your nickname. Now you are friends.\npay … pay the cryptocrrency to someone.\ngive … give cryptocrrency to someone\nExchange to XXX … Exchage cryptocrenncy to Money ');

});

// give cryptocrrency to someone.
controller.hears(['give','Give'], 'direct_message,direct_mention,mention',function(bot,message) {
  var  giveAmount;
  var  givePerson;
  var  getPerson;

  var askFromPerson = function(err,convo){
   convo.ask('Who are you?\nPlease tell your name.',function(response,convo)[
           {
               pattern: 'quit',
               callback: function(response, convo) {
                   convo.say('OK!');
                   convo.next();
               }
           },
       {
           pattern: 'help',
           callback: function(response, convo) {
               convo.say('this service means to give cryptocrrency to someone. You need to enter your name, amount and person name who you want to give  ');
               convo.next();
           }
       },	{
           default: true,
           callback:function(response, convo) {
             givePerson = response.text;
             console.log(givePerson);
             askAmount(response,convo);
             convo.next();
           }
       }])};
  var askAmount = function(err,convo)  {
     convo.ask('How much do you want to give?',function (response,convo){
      giveAmount = response.text;

      var options ={
        url: 'https://testmatsu.mybluemix.net/query/'+ givePersone,
        json: true
      };

      request.get(options,function(error,response,body){

        if (!error && response.statusCode == 200){
          var currentBalance = body.amount;
          if (parseInt(currentBalance)-parseInt(giveAmount)<0) {
            convo.say('You dont heve enough money!!');
            convo.next();
          }else {
            convo.askToPersonName();
            convo.next();
          }
        }else{
          console.log('error: '+ response.statusCode);
            convo.say('Sorry try again later or You dont have balance');
            convo.next();
        }
      });
    });
};

  var askToPersonName = function(err,convo){
       convo.ask('who do you want to give?',function(response,convo){
         getPerson = response.text;

         var options ={
           url: 'https://testmatsu.mybluemix.net/invoke/XXXX',
           json: true
         };

         request.post(options,function(error,response,body){

           if (!error && response.statusCode == 200){
             convo.say('done');
             convo.next();
           }else{
             console.log('error: '+ response.statusCode);
               convo.say('Sorry try again later');
               convo.next();
           }
         });
       }
     );
  };
  bot.startConversation(message,askFromPerson);
});

// Serch your word by google customsearch
controller.hears(['search (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {

    var apiKey = '';
    var searchEngineId =  '016307541959239107161:cut0vi1hjcm';
    var startNum= 1;
    var item= message.match[1];
    if(item == null){
        	bot.reply(message,'Sorry I dont know about it' );
        }
    console.log(item);

    var option = 'key='+ apiKey + '&cx='+searchEngineId + '&q='+ item +'&alt=json&start=1';
    console.log(option);
    var targetUrl = 'https://www.googleapis.com/customsearch/v1?'+ option;
    console.log(targetUrl);

    var options = {
      url: targetUrl,
      json: true
    };

    request.get(options, function (err,res,body){
    if (!err && res.statusCode == 200) {

        	//var data = JSON.parse(body);
        	console.log(body);
        	var urlArray = new Array() ;
        	urlArray  = body["items"];
        	for(var i = 0; i < urlArray.length; i++){
        	bot.reply(message, urlArray[i].title+'\n'+urlArray[i].link);
        	}
           } else {
       console.log('error: '+ response.statusCode);
      }
     });
});

// Ask your name to adam
controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

//To pay cryptocrrency to someone
controller.hears(['pay','Pay'], 'direct_message,direct_mention,mention', function(bot, message) {
	   var amount;
	   var personName;

	   var askPerson = function(err,convo){
	   	convo.ask('Who do you want to pay?\nPlease tell me person name.If you want to quit, say quit.\nIf you want to know this service detail, say help ', [
	            {
	                pattern: 'quit',
	                callback: function(response, convo) {
	                    convo.say('OK!');
	                    convo.next();
	                }
	            },
	        {
	            pattern: 'help',
	            callback: function(response, convo) {
	                convo.say('this service means to give cryptocrrency to your entered name. If you want to give cryptocrrency, please enter name and amount.');
	                convo.next();
	            }
	        },	{
	            default: true,
	            callback:function(response, convo) {
	              personName = response.text;
	              console.log(personName);
	              //data.personName = personName;
	              askAmount(response,convo);
	              convo.next();
	            }

	        }])};

	    var askAmount = function(response,convo){

	     convo.ask('how much?',function(response, convo) {

	    	if(isNaN(parseInt(response.text))){

	         convo.say('please enter number and start from the begging');
	         convo.next();

	        }else{

	         amount = response.text;
			 //data.amount = amount;
			 console.log('######'+ personName);
			 console.log('######'+ amount);

			 var options ={
			  url:'https://testmatsu.mybluemix.net/invoke/issue',
			  form: { personName: personName,
                       amount: amount
               },
               json: true
			 };

			 request.post(options, function(error, response, body){

			  if (!error && response.statusCode == 200) {
	           convo.say('done');
	           convo.next();
	          } else {
	           console.log('error: '+ response.statusCode);
	           convo.say('sorry try again later');
	           convo.next();
			  }
			 });
			}
	     }
	      );};
	   bot.startConversation(message,askPerson);
	});
//ask adam, how much do someone have cryptocrrency
controller.hears(['query balance'], 'direct_message,direct_mention,mention', function(bot, message) {

	   var queryPersonName;

	   var queryPerson = function(err,convo){
	   	convo.ask('Whose balance do you want to know ?\nPlease tell me person name.If you want to quit, say quit.', [
	            {
	                pattern: 'quit',
	                callback: function(response, convo) {
	                    convo.say('OK!');
	                    convo.next();
	                }
	            },
	       	{
	            default: true,
	            callback:function(response, convo) {
	              queryPersonName = response.text;
	              console.log(queryPersonName);
	              //answerBalance(response,convo);
	              var options ={
	              	url: 'https://testmatsu.mybluemix.net/query/'+queryPersonName,
	                json: true
	              };

	              request.get(options,function(error,response,body){
	              	if (!error && response.statusCode == 200){
	              		console.log(body);
	              		convo.say('personName:'+ queryPersonName+'\nbalance:'+ body.amount);
	              		convo.next();
	              	}else{
	              		console.log('error: '+ response.statusCode);
	                    convo.say('sorry try again later');
	                    convo.next();
	              	}
	              });
	            }
	        }]);};

	   bot.startConversation(message,queryPerson);
	});

// end of conversation
controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});

// ask adam about himself
controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });


function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
