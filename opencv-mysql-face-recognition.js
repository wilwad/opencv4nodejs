var mysql = require('mysql');
const cv  = require('opencv4nodejs');

if (!cv.xmodules.face) {
  throw new Error('exiting: opencv4nodejs compiled without face module');
  process.exit();
}

const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
const test_image = "./xyz.jpg";
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
  /*let sql = "SELECT d.id, ls.name AS sex, CONCAT(first_name, ' ', last_name) fullname, "+
			"dataset_filename filename FROM datasets d, dataset_images di"+
			"WHERE d.id = di.dataset_id AND d.isactive = 1 AND d.sex_id = 1 AND (d.last_name = ? OR d.last_name = ? OR d.last_name = ?)";
  */      
  let sql = "SELECT \
				d.id,\
				ls.name AS sex,\
				CONCAT(first_name, ' ', last_name) fullname,\
				dataset_filename filename\
			FROM\
				datasets d,\
				dataset_images di,\
				list_sex ls\
			WHERE\
				d.id = dataset_id AND d.isactive = 1\
					AND d.sex_id = ls.id\
					AND ls.name = 'female'\
					AND NOT ISNULL(dataset_filename)";
			
  conn.query(sql,/*['Siteketa','Geingob', 'Sengdara'],*/ function (err, results, fields) {
    if (err) throw err;

   // results.forEach((data,idx)=>console.log(idx, data.filename));
   for(let record of results){
	    //console.log(record.id, record.fullname, record.filename);
		
		// we only use max 3 images for now
		var total = 0;
		
		buffer.forEach(function(elem){
				if (elem.id == record.id)
					total++;
		});
		
		if (total < 3) buffer.push({id: record.id, fullname: record.fullname, sex: record.sex, filename: '/var/www/html/nampolfrdb/'+record.filename});
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

	console.log(objects.length, 'faces detected in test image');
	
	var testImages = [];
	
	// we can write the crops
	var idx = 0;
	
	for (let face of objects){
		var filename = test_image;
		let ext      = filename.substr(filename.lastIndexOf('.'));
		filename     = filename.replace(ext,'') + "_" + idx + "_cropped_200x200" + ext;
		cv.imwrite(filename, grayImg.getRegion(face).resize(200,200));
		testImages.push( grayImg.getRegion(face).resize(200,200) );
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
		nameMappings[obj.id] = {id: obj.id, fullname: obj.fullname, sex: obj.sex, filename: obj.filename};
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
						.map(img => img.bgrToGray());
					
	} catch (error){
		console.log("Failed to read image:",error);
		return;
	}
				
	// make labels
	var labels = buffer
				// set the full path
				.map(obj=> obj.id);

	console.log("Input file name:", test_image);
	console.log("\n");
	console.log('Recognition dataset: ', buffer.length);
	//console.log('\n');
	//console.log('Filenames:\n', filenames);
	console.log('\n');
	console.log('Candidates:\n', nameMappings);
	console.log('\n');
	console.log('Labels:\n',labels);
	
	// training
	const eigen  = new cv.EigenFaceRecognizer();
	const fisher = new cv.FisherFaceRecognizer();
	const lbph   = new cv.LBPHFaceRecognizer();
	
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
		
		console.log(obj.filename);
		
		let mat = cv.imread(obj.filename);
		cv.imshowWait('Possible Match', mat);
		cv.destroyAllWindows();
	  });
	};

	console.log('\n\n');
	
	console.log('Eigen recognizer:');
	runPrediction(eigen);
	console.log('\n');
	
	console.log('Fisher recognizer:');
	runPrediction(fisher);
	console.log('\n');
	
	console.log('LBPH recognizer:');
	runPrediction(lbph);
	
	console.log('\n\n');
	console.log('---- done ---- ');	
	console.log(':: Possible matches ::');

	console.log(predictions);
	
	process.exit();
}
