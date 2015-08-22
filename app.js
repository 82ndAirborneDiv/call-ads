var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');
var config = require('./config');

var app = express();
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({	extended: true	}));
app.use(express.static(__dirname + '/public')); // set the static files location /public/img will be /img for users
 
var port = process.env.PORT || 5000; // set our port

var twilio = require('twilio');
var client = twilio(config.twilio.sid, config.twilio.token);

var flybase = require('flybase');
var leadsRef = flybase.init(config.flybase.app_name, "leads", config.flybase.api_key);

// backend routes =========================================================

//	listen for incoming sms messages
app.post('/voice', function (req, res) {
	leadsRef.trigger("new-caller", {
		item: req.param('item'),
		name:req.param('name')
	});

	res.writeHead(200, {
		'Content-Type':'text/xml'
	});
	
	var resp = new twilio.TwimlResponse();
	resp.dial(function() {
		this.client('Admin');
	});
	
	res.type('text/xml');
	res.end( resp.toString() );
});

var auth = express.basicAuth(config.un, config.pw);

// route to handle all frontend requests, with a password to protect unauthorized access....
app.get('/cc', auth, function(req, res) {
	var capability = new twilio.Capability( config.twilio.sid, config.twilio.token );
	capability.allowClientIncoming( 'Admin' );
	capability.allowClientOutgoing( config.twilio.appid );
    var token = capability.generate();

	res.render('cc', {
		token:token,
		api_key:config.flybase.api_key,
		app_name:config.flybase.app_name
	});
}); 

app.get('/', function(req, res) {
	var client_name = "anonymous";
	if( typeof req.param("client") !== "undefined" ){
		client_name = req.param("client");
	}
	
	var capability = new twilio.Capability( config.twilio.sid, config.twilio.token );
	capability.allowClientIncoming( client_name );
	capability.allowClientOutgoing( config.twilio.appid );
    var token = capability.generate();

	res.render('index', {
		call_token: token,
		client_name: client_name
	});
}); 

var server = app.listen(port, function() {
	console.log('Listening on port %d', server.address().port);
});