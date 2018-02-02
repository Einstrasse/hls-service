const HLSServer = require('hls-server')
const http = require('http')
const fs = require('fs')
const url = require('url')

const audioPath = __dirname + "/audio/";
const viewPath = __dirname + "/view/";

let PORT = 8000;
let SERVER_ADDR = "127.0.0.1"
var server = http.createServer(function(req, res) {
	var uri = url.parse(req.url).pathname;
	var ext = uri.split('.').pop();
	if (uri == '/') {
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		var stream = fs.createReadStream(viewPath + "index.html");
		stream.pipe(res);
		// var html = [
		// 	'<!doctype html>',
		// 	'<html>',
		// 		'<head>',
		// 			'<title> Einstrasse HLS Audio Live Streaming Player </title>',
		// 		'</head>',
		// 		'<body>',
		// 			'<video src="http://', SERVER_ADDR + ':' + PORT + '/manifest.m3u8" controls autoplay>',
		// 		'</body>',
		// 	'</html>'
		// ].join('');
		// res.write(html);
		// res.end();
		return;
	} else if (ext == 'm3u8') {
		return fs.readFile(audioPath + 'manifest.m3u8', function(err, contents) {
			if (err) {
				res.writeHead(500);
				res.end();
			} else if (contents) {
				res.writeHead(200, {
					'Content-Type': 'application/vnd.apple.mpegurl'
				});
				res.end(contents, 'utf-8');
			}
		});
	} else if (ext == 'ts') {
		var filePath = audioPath + uri;
		var exists = fs.existsSync(filePath);
		if (!exists) {
			res.writeHead(404);
			return res.end();
		}
		res.writeHead(200, {
			'Content-Type': 'video/MP2T'
		});
		var stream = fs.createReadStream(filePath);
		stream.pipe(res);
		return;
	}
	
})
// var hls = new HLSServer(server, {

// 	// path: '/stream',
// 	// dir: 'audio'
// 	provider: {
// 		exists: function(req, cb) {
// 			console.log('exists function called');
// 			cb(null, true);
// 		},
// 		getManifestStream: function(req, cb) { // ~/asdf.m3u8 request handler
// 			console.log('getManifestStream function called')
// 			var manifestStream = fs.createReadStream(audioPath + 'manifest.m3u8');
// 			cb(null, manifestStream);
// 		},
// 		getSegmentStream: function(req, cb) { // ~/asdf.ts request handler
// 			console.log('getSegmentStream function called');
// 			var uri = url.parse(req.url).pathname;
// 			var ext = uri.split('.').pop();
// 			if (ext == 'ts') {
// 				var filePath = audioPath + uri;
// 				var tsFileStream = fs.createReadStream(filePath);
// 				cb(null, tsFileStream);
// 			}
			
// 		}
// 	}
// })

server.listen(PORT)