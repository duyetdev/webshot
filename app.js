const http = require('http');
const path = require('path');
const app = require('koa')();

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

	webshot(url, shot_path, function(err) {
		// screenshot now saved
	});

	if (is_json) return this.body = result;
	
	// Redirect to screenshot
	this.redirect(result.webshot);
});

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
