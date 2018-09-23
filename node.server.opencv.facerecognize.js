const cv         = require('opencv4nodejs');
const mysql      = require('mysql');
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

const port = 8098;
var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({ port: port });

const minimum_images = 3;
const dim_width      = 80;
const dim_height     = 80;
let buffer           = [];

var conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Admin.2015!",
  database: "nampolfrdb"
});

var db_connected = false;

conn.connect(function(err) {
  if (err) throw err;    
  db_connected = true;
});

wss.on('connection', function connection(ws,req) {
	ws.send(JSON.stringify({'action':'connection',
				'result':true, 
				'message':'OpenCV Face Recognizer v0.1'}));

	ws.on('message', function incoming(message) {
               var json = null;

		try {
		    json = JSON.parse(message);        
		} catch (err){
		  console.log("JSON parse error: %s",err);
		  console.log(message);
		}

		if (!db_connected){
			ws.send(JSON.stringify({'action': 'facerecognize', 
						'result': false, 
						'error': 'No connection to database.',
						'faces': null}), 
						function ack(error){
							 if (error) console.log('Send error: %s',error);
						});			
			return false;
		}
		
		if (json){
			switch (json.action){
				case 'facerecognize':
					console.log(new Date().toLocaleString(),': facerecognize (', req.connection.remoteAddress,')\n');
					
					let dataset    = json.dataset  || '';
                    var sex        = parseInt(json.sex);
                    
                    switch (sex){
						 case 3:
								sex = 'Unknown';
								break;
								
						 case 2:
								sex = 'Female';
								break;
								
						 case 1:
                         default: 
								sex = 'male';
								break;
					}
                    let category   = json.category || 'public';

					let base64data = json.base64;
					
					const bufferBase64 = Buffer.from(base64data,'base64');
					const image        = cv.imdecode(bufferBase64); //Image is now represented as Mat
                    const grayImg      = image.bgrToGray();
	                //const { objects, numDetections } = classifier.detectMultiScale(grayImg);

					//console.log('Redetect', objects.length);
					
					//console.log(new Date().toLocaleString(),': facerecognize (', 
					//		req.connection.remoteAddress,') =>', objects.length, 'faces detected');

				  var sql = "SELECT \
								d.id, \
								ls.name AS sex, \
								lc.name AS category, \
								CONCAT(first_name, ' ', last_name) fullname, \
								dataset_filename filename \
							FROM\
								datasets d, \
								dataset_images di, \
								list_sex ls, \
								list_categories lc\
							WHERE\
								d.id = di.dataset_id \
									AND (d.isactive = 1 \
									AND d.sex_id = ls.id \
									AND ls.name = '_sex_' \
									AND d.category_id = lc.id) \
									AND NOT ISNULL(dataset_filename) \
							ORDER BY \
								d.id DESC;";
								
				  sql = sql.replace('_sex_',sex);
							//.replace('%category%',category);
				
				  conn.query(sql, function (err, results, fields) {
							if (err) throw err;
							
							// empty
							buffer           = [];
							
						   for(let record of results){
								// limit to 3 images even if dataset has more
								var total = 0;
								
								buffer.forEach(function(elem){
										if (elem.id == record.id)
											total++;
								});
								
								if (total < minimum_images) 
									buffer.push({id: record.id, 
												 fullname: record.fullname, 
												 sex: record.sex, 
												 category: record.category,
												 filename: '/var/www/html/nampolfrdb/'+record.filename
												});
						   }
						   
						   console.log("Query match:",buffer.length, 'results');
						   
						   if (buffer.length){
							   let start = new Date().getTime();
							   recognize_faces(ws, base64data);
							   let end   = new Date().getTime();
							   let millis = end - start;
							   
							   console.log("Request completed in %s", millisToMinutesAndSeconds(millis));
						   }
						   else {
							   console.log("Cannot run Face Recognition: no images");
							   
								ws.send(JSON.stringify({'action': 'facerecognize', 
											'result': false, 
											'error': 'No images.',
											'faces': null}), 
											function ack(error){
												 if (error) console.log('Send error: %s',error);
								});	
						   }
				   
				  });
				  
					break;
				
				default:
					console.log('received: normal');
					break;
			} // switch (json.action)
        } // (if (json))

		//console.log('received: %s', message);
	}) // ws.on(message
}); // wss.on(

wss.broadcast = function broadcast(data) {
		wss.clients.forEach(function each(client) {
				client.send(data);
		});
};

function recognize_faces(socket, base64data){
	const buff  = Buffer.from(base64data,'base64');
	const mat   = cv.imdecode(buff); //Image is now represented as Mat
					
	//const   mat   = cv.imread(test_image);
    const grayImg = mat.bgrToGray();
    
    /*
    const { objects, numDetections } = classifier.detectMultiScale(grayImg);
    
    if (!objects.length){
		console.log('No faces detected in testing image!');
		
	socket.send(JSON.stringify({
				'action': 'facerecognize', 
				'result': false, 
				'faces': [],
				'error': 'No faces detected in image'
				}), 
				function ack(error){
					 if (error) console.log('Send error: %s',error);
				});
				
		return false;
	}
    
	console.log('[',objects.length,']', 'faces detected in testing image');
	*/
	
	var testImages = [];
	var idx = 0;
	
	let test_img = grayImg.resize(dim_width, dim_height);
	testImages.push( test_img );

	// let us do the recognition
	
	// names
	var nameMappings = {};
	
	buffer.forEach(function(obj){
		nameMappings[obj.id] = {id: obj.id, 
								fullname: obj.fullname, 
								sex: obj.sex, 
								category: obj.category,
								filename: obj.filename
								};
		
		// verify candidates
		/*
		let img = cv.imread( obj.filename )
					.bgrToGray()
					.resize( dim_width, dim_height );
								
		cv.imshowWait('Buffer Image', img);
		cv.destroyAllWindows();
		*/
	});

	var filenames = {};
	var idx = 0;
	
	buffer.forEach(function(obj){
		filenames[idx] = {'id': obj.id, 'filename': obj.filename};
		idx++;
	});
	
	try {
		// make paths
		var trainImages = buffer
						// set the full path
						.map(obj=> obj.filename)
						// read it in
						.map(filePath => cv.imread(filePath))
						// grayscale it
						.map(img => img.bgrToGray())
						// reduce the dimensions
						.map(grayImg =>grayImg.resize(dim_width, dim_height));
	} catch (error){
		console.log("Failed to read image:",error.toString());
		return;
	}
		
		/*
	for(let img1 of trainImages){
		cv.imshowWait('trainImages Image', img1);
		cv.destroyAllWindows();
	}*/
	
	// make labels
	var labels = buffer
				// [id1_a, id1_b, id1_c, id2_a, id2_b, id2_c]
				.map(obj=> obj.id);

	console.log('Recognition dataset: ', buffer.length);
	
	console.log('Candidates:\n');
	for (var obj in nameMappings)
		 console.log(obj, nameMappings[obj].fullname, 
		 '(Sex:',nameMappings[obj].sex, ', Category:',
		 nameMappings[obj].category,')');

	// our 3 face recognizers
	const eigen  = new cv.EigenFaceRecognizer();
	const fisher = new cv.FisherFaceRecognizer();
	const lbph   = new cv.LBPHFaceRecognizer();
	
	// training the face recognizers
	eigen.train(trainImages, labels);
	fisher.train(trainImages, labels);
	lbph.train(trainImages, labels);

	let predictions = {};
	
	const runPrediction = (recognizer, recognizername) => {
		const result = recognizer.predict( test_img );
		let obj      = nameMappings[ result.label ];

		// don't repeat
		predictions[obj.fullname] = {id:         obj.id,
									 fullname:   obj.fullname,
									 confidence: result.confidence,
									 filename:   obj.filename
									 };
		
		console.log(`%s predicted: %s, 
					confidence: %s`,
					recognizername, 
					obj.fullname, 
					result.confidence);
	};

	console.log('\n');
	
	runPrediction(eigen,  'Eigen');
	runPrediction(fisher, 'Fisher');
	runPrediction(lbph,   'LBPH');

	var faces = [];
	
	// const outBase64 =  cv.imencode('.jpg', croppedImage).toString('base64');
	for(var p in predictions ){
		  let p_curr = predictions[p];
		  
		  // returning the full color image
		  let base64image = cv.imencode('.jpg', 
										cv.imread(p_curr.filename)
									).toString('base64');
									
			faces.push({
								id:         p_curr.id, 
								fullname:   p_curr.fullname, 
								confidence: p_curr.confidence, 
								base64:     base64image
								});
	};
	
	socket.send(JSON.stringify({
				'action': 'facerecognize', 
				'result': faces.length ? true : false, 
				'faces': faces}), 
				function ack(error){
					 if (error) console.log('Send error: %s',error);
				});
								
}

function millisToMinutesAndSeconds(millis) { 
		var minutes = Math.floor(millis / 60000); 
		var seconds = ((millis % 60000) / 1000).toFixed(0); 
		return minutes + ":" + (seconds < 10 ? '0' : '') + seconds; 
}

console.log('OpenCV Face Recognizer. Listening on ws://127.0.0.1:%s', port);
