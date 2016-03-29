const http = require('http');
const app = require('koa')();

const middlewares = require('koa-middlewares');
const crypto = require('crypto');

var router = require('koa-router')();

router.all('/', function *(next) {
	var result = {};

	var url = this.query.url || '';
	var is_json = !!this.query.json;

	if (!url.length) return this.body = '[url] param is required. Ex: '+ this.request.origin +'/?url=http://duyetdev.com';

	result.url = url;
	var hmac = crypto.createHmac('md5', 'a secret');
	result.hash = hmac.update(url).digest("hex");

	if (is_json) return this.body = result;
	
	this.body = result.hash;
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
app.use(middlewares.session({
	store: middlewares.RedisStore()
}));

// Start application
app = module.exports = http.createServer(app.callback());
if (!module.parent) {
	var port = process.env.PORT || 7899;
	app.listen(port);
	console.info("Listen on http://localhost:%s", port);
}
