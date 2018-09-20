const cv = require('opencv4nodejs');
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

const port = 8099;
var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({ port: port });

wss.on('connection', function connection(ws,req) {
	ws.send(JSON.stringify({'action':'connection',
				'result':true, 
				'message':'OpenCV FaceDetector v0.1'}));

	ws.on('message', function incoming(message) {
               var json = null;

		try {
		    json = JSON.parse(message);        
		} catch (err){
		  console.log("JSON parse error: %s",err);
		  console.log(message);
		}

		if (json){
			switch (json.action){
				case 'facedetect':
					let base64data = json.base64;
					const buffer  = Buffer.from(base64data,'base64');
					const image   = cv.imdecode(buffer); //Image is now represented as Mat
                                	const grayImg = image.bgrToGray();
	                        	const { objects, numDetections } = classifier.detectMultiScale(grayImg);

					console.log(new Date().toLocaleString(),': facedetect (', req.connection.remoteAddress,') =>', objects.length, 'faces detected');

					ws.send(JSON.stringify({'action': 'facedetect', 
								'result': objects.length ? true : false, 
								'faces': objects
                                                                }), 
								function ack(error){
								     if (error) console.log('Send error: %s',error);
								});
				break;

				default:
				console.log('received: normal');
				break;
			}
                }

		//console.log('received: %s', message);
	});

	//ws.send('Websocket Server Listening', function ack(error){
	//	if (error) console.log('Error: %s',error);
	//});
});

wss.broadcast = function broadcast(data) {
		wss.clients.forEach(function each(client) {
				client.send(data);
		});
};

console.log('OpenCV FaceDetector. Listening on ws://127.0.0.1:%s', port);
