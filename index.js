const HLSServer = require('hls-server')
const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')
const Busboy = require('busboy')
const is = require('type-is')
const os = require('os')
const ffmpeg = require('fluent-ffmpeg')

const audioPath = __dirname + "/audio/";
const viewPath = __dirname + "/view/";

let PORT = process.env.PORT || 8000;
let SERVER_ADDR = "127.0.0.1"
var server = http.createServer(function(req, res) {
	var uri = url.parse(req.url).pathname;
	var ext = uri.split('.').pop();
	//hls 미들웨어를 통과한 요청을 처리함. 웹 서버 역할을 함.
	if (uri == '/') {
		console.log(uri);
		res.writeHead(302, {
			'Location': '/play_demo'
		});
		res.end();
		return;
	} else if (uri == '/play_demo') {
		console.log(uri);
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		var stream = fs.createReadStream(viewPath + "play_demo.html");
		stream.pipe(res);
		return;
	} else if (uri == '/capture_audio') {
		console.log(uri);
		res.writeHead(200, {
			'Content-Type': 'text/html'
		})
		var stream = fs.createReadStream(viewPath + "capture_audio.html");
		stream.pipe(res);
		return;
	} else if (uri == '/upload') {
		console.log(uri);
		if (!is(req, ['multipart'])) {
			res.writeHead(404, {
				'Content-Type': 'text/html'
			})
			return res.end();
		}
		var busboy
		var tmpAudioFilePath

		try {
			busboy = new Busboy({
				headers: req.headers
			});
		} catch (err) {
			console.error('header parsing error', err);
			res.writeHead(500);
			return res.end();
		}

		// busboy.on('field', function(fieldName, value, fieldnameTruncated, valueTruncaed) {
		// })

		busboy.on('file', function(fieldName, fileStream, fileName, encoding, mimeType) {
			tmpAudioFilePath = path.join(os.tmpdir(), path.basename(fieldName));
			console.log('saveTo:', tmpAudioFilePath);
			// console.log('encoding:', encoding);
			// console.log('mimeType:', mimeType);
			fileStream.pipe(fs.createWriteStream(tmpAudioFilePath));
		})

		busboy.on('finish', function() {
			console.log('ffmpeg encoding')
			ffmpeg(tmpAudioFilePath, { timeout: 432000 }).addOptions([
				'-profile:v baseline', // baseline profile (level 3.0) for H264 video codec
				'-level 3.0', 
				'-start_number 0',     // start the first .ts segment at index 0
				'-hls_time 1',        // 10 second segment duration
				'-hls_list_size 0',    // Maxmimum number of playlist entries (0 means all entries/infinite)
				'-f hls'               // HLS format
			]).output(audioPath + 'manifest.m3u8')
			.on('end', function() {
				console.log('ffmpeg tranform succesfully finished');
				res.writeHead(201, {
					'Content-Type': 'text/html'
				});
				res.end();
			})
			.on('error', function(err) {
				console.error('Error while ffmpeg processing:', err)
				res.writeHead(500);
				res.end();
			})
			.run()

			// var proc = ffmpeg(tmpAudioFilePath, { timeout: 432000 })
			// .addOption('-hls_time', 1)
			// .addOption('-hls_list_size', 0)
			// .addOption('-f hls')
			// .output(audioPath + '123manifest.m3u8')
			// .on('end', function() {
			// 	console.log('ffmpeg tranform succesfully finished');
			// 	res.writeHead(201, {
			// 		'Content-Type': 'text/html'
			// 	});
			// 	res.end();
			// })
			// .on('error', function(err) {
			// 	console.log('an error occured:', err);
			// })
			
		})
		req.pipe(busboy);
	}
})
var hls = new HLSServer(server, { // hls를 위한 미들웨어가 삽입됨. hls 서버 역할을 함
	provider: {
		exists: function(req, cb) { // 모든 요청에 대해 호출됨
			var uri = url.parse(req.url).pathname
			var extension = path.extname(uri)
			if (extension != '.m3u8' && extension != '.ts') {
				return cb(null, true);
			}
			console.log('exists function called');
			var uri = url.parse(req.url).pathname;
			var fpath = audioPath + uri;
			fs.access(fpath, fs.constants.F_OK, function(err) {
				if (err) {
					console.log('File not exist', fpath);
				}
				cb(null, !err);
			});
		},
		getManifestStream: function(req, cb) { // 확장자가 .m3u8 로 끝나는 경우 호출됨
			var uri = url.parse(req.url).pathname;
			console.log('getManifestStream function called', req.url, uri)
			var manifestStream = fs.createReadStream(audioPath + 'manifest.m3u8');
			cb(null, manifestStream);
		},
		getSegmentStream: function(req, cb) { // 확장자가 .ts 로 끝나는 경우 호출됨
			var uri = url.parse(req.url).pathname;
			console.log('getSegmentStream function called:', req.url, uri);
			var ext = uri.split('.').pop();
			if (ext == 'ts') {
				var filePath = audioPath + uri;
				var tsFileStream = fs.createReadStream(filePath);
				cb(null, tsFileStream);
			}
		}
	}
})

server.listen(PORT, function() {
	console.log('Launching server listening on ... ', SERVER_ADDR + ':' + PORT);
})
