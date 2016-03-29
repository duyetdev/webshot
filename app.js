const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('koa')();

var event = require('co-event');
const middlewares = require('koa-middlewares');
var serve = require('koa-static');
const crypto = require('crypto');
var webshot = require('webshot');
var router = require('koa-router')();

router.all('/', function *(next) {
	var result = {};

	var url = this.query.url || '';
	var is_json = !!this.query.json;

	// URL not found or missing
	if (!url.length) return this.body = '[url] param is required. Ex: '+ this.request.origin +'/?url=http://duyetdev.com';

	// URL
	result.url = url;
	
	// Hash
	var hmac = crypto.createHmac('md5', 'a secret');
	result.hash = hmac.update(url).digest("hex");

	// Created time 
	result.time = new Date();

	// Screenshot path
	var shot_path = __dirname + '/shot/'+ result.hash +'.png';
	result.webshot = this.request.origin + '/' + result.hash +'.png';

	if (fs.existsSync(shot_path)) {
		return webshotResult(this, result, is_json);
	}

	webshot(url, shot_path, function(err) {
		// screenshot now saved
	});

	var renderStream = webshot(url);
	var file = fs.createWriteStream(shot_path, {encoding: 'binary'});

	renderStream.on('data', function(data) {
		file.write(data.toString('binary'), 'binary');
	});

	var e;
    while (e = yield event(renderStream)) {
        switch (e.type) {
            case 'end':
            	return webshotResult(this, result, is_json);
                break;

            case 'error':
            default:
            	// Re check 
            	if (fs.existsSync(shot_path)) {
            		return webshotResult(this, result, is_json);
            	} else 
            		return webshotError(this, 'Something went wrong', is_json);
                break;
        }
    }
});

function webshotResult(app, result, is_json) {
	if (is_json) return app.body = result;
	else return app.redirect(result.webshot);
}

function webshotError(app, message, is_json) {
	this.status = 500;

	if (is_json) return app.body = {message: message};
	else return app.body = message;
}

app
  .use(router.routes())
  .use(router.allowedMethods());

// Middlewares
app.use(middlewares.compress());
app.use(middlewares.favicon());
app.use(middlewares.rt());
app.use(middlewares.logger());
app.use(middlewares.conditional());
app.use(middlewares.etag());
app.use(middlewares.bodyParser({
	limit: '5mb'
}));

app.context.assetspath = path.join(__dirname, 'shot');
app.use(serve('./shot'));

// Start application
app = module.exports = http.createServer(app.callback());
if (!module.parent) {
	var port = process.env.PORT || 7899;
	app.listen(port);
	console.info("Listen on http://localhost:%s", port);
}
