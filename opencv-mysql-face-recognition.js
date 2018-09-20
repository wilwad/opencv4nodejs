var mysql = require('mysql');
const cv  = require('opencv4nodejs');

if (!cv.xmodules.face) {
  throw new Error('exiting: opencv4nodejs compiled without face module');
  process.exit();
}

const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

const dim_width  = 80;
const dim_height = 80;

const test_image = "./kavar.jpg";
let buffer = [];

var conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Admin.2015!",
  database: "nampolfrdb"
});

console.log("============== OpenCV Face Recognizer =============");
	
conn.connect(function(err) {
  if (err) throw err;    
  let sql = "SELECT \
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
				d.id = dataset_id AND d.isactive = 1 \
					AND d.sex_id = ls.id \
					AND d.category_id = lc.id \
					AND ls.name = 'female' \
					AND NOT ISNULL(dataset_filename) \
			ORDER BY \
				d.id DESC;";
			
  conn.query(sql, function (err, results, fields) {
    if (err) throw err;

   for(let record of results){
	    //[record.id, record.fullname, record.sex, record.filename];
		
		// limit to 3 images even if dataset has more
		var total = 0;
		
		buffer.forEach(function(elem){
				if (elem.id == record.id)
					total++;
		});
		
		if (total < 3) 
		    buffer.push({id: record.id, 
				         fullname: record.fullname, 
				         sex: record.sex, 
				         category: record.category,
				         filename: '/var/www/html/nampolfrdb/'+record.filename});
   }
   
   if (buffer.length) 
	   recognize_faces();
   else
       console.log("Cannot run Face Recognition: no images");
  });
});

function recognize_faces(){
	const   mat   = cv.imread(test_image);
    const grayImg = mat.bgrToGray();
    const { objects, numDetections } = classifier.detectMultiScale(grayImg);
    
    if (!objects.length){
		console.log('No faces detected in test image!');
		process.exit();
	}

	console.log('[',objects.length,']', 'faces detected in test image');
	
	var testImages = [];
	var idx = 0;
	
	for (let face of objects){
		var filename = test_image;
		let ext      = filename.substr(filename.lastIndexOf('.'));
		
		filename     = filename.replace(ext,'') + "_" + idx + "_cropped_80x80" + ext;
		cv.imwrite(filename, grayImg.getRegion(face).resize(dim_width, dim_height));
		testImages.push( grayImg.getRegion(face).resize(dim_width, dim_height) );
		idx++;
	}

	testImages.forEach(img=>{
		cv.imshowWait('Input image', img);
		cv.destroyAllWindows();
	});
	
	// let us do the recognition
	
	// names
	var nameMappings = {};
	
	buffer.forEach(function(obj){
		nameMappings[obj.id] = {id: obj.id, 
								fullname: obj.fullname, 
								sex: obj.sex, 
								category: obj.category,
								filename: obj.filename};
	});

	var filenames = {};
	var idx = 0;
	
	buffer.forEach(function(obj){
		filenames[idx] = {'id': obj.id, 'filename': obj.filename};
		idx++;
	});


	//console.log(buffer);
	
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
						.map(grayImg => grayImg.resize(dim_width, dim_height));
	} catch (error){
		console.log("Failed to read image:",error);
		return;
	}
				
	// make labels
	var labels = buffer
				// [id1_a, id1_b, id1_c, id2_a, id2_b, id2_c]
				.map(obj=> obj.id);

	console.log("Input file name:", test_image);
	console.log('Recognition dataset: ', buffer.length);
	console.log('Candidates:\n');
	for (var obj in nameMappings)
		 console.log(obj, nameMappings[obj].fullname, '(Sex:',nameMappings[obj].sex, ', Category:',nameMappings[obj].category,')');
		 
	console.log('\n');
	console.log('Labels:');
	console.log('[', labels.join(","),']');
	
	// our 3 face recognizers
	const eigen  = new cv.EigenFaceRecognizer();
	const fisher = new cv.FisherFaceRecognizer();
	const lbph   = new cv.LBPHFaceRecognizer();
	
	// training the face recognizers
	eigen.train(trainImages, labels);
	fisher.train(trainImages, labels);
	lbph.train(trainImages, labels);
	
	let predictions = {};
	
	const runPrediction = (recognizer) => {
	  testImages.forEach((img,idx) => {
		const result = recognizer.predict(img);
		let obj = nameMappings[result.label];

		// don't repeat
		predictions[obj.fullname] = result.confidence;
		
		console.log(`predicted: %s, confidence: %s`, obj.fullname, result.confidence);
		
		let mat = cv.imread(obj.filename);
		cv.imshowWait(obj.fullname, mat);
		cv.destroyAllWindows();
	  });
	};

	console.log('');
	console.log('> Eigen recognizer:');
	var start= new Date();
	runPrediction(eigen);
	console.log('Time taken:', new Date() - start);
	
	console.log('');
	console.log('> Fisher recognizer:');
	
	var start= new Date();
	runPrediction(fisher);
	console.log('Time taken:', new Date() - start);
	
	console.log('');
	console.log('> LBPH recognizer:');
	
	var start= new Date();
	runPrediction(lbph);
	console.log('Time taken:', new Date() - start);
	
	console.log('\n');
	console.log('======= Possible matches =======');

	console.log(predictions);
	
	process.exit();
}
