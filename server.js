//  OpenShift sample Node application
var express = require('express'),
    request = require('request'), //for get info from web function
    app     = express(),
    morgan  = require('morgan');
    engines = require('consolidate'),
    bodyParser = require('body-parser'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }));

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    //for web portal use:
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    //for local portal use:
    //mongoURL = 'mongodb://localhost:27017/getinfofromweb',
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};


// LINK REGISTRATION
app.get('/registerlink', function(req, res, next) {
        res.render('registerlink', {});
});
app.post('/registerlink', function(req, res, next) {
        var link = req.body.link;

        if (link == '')  {
            next('Please enter link.');
        } else {
            db.collection('links').insertOne(
                { 'link': link, 'date': new Date() },
                function (err, r) {
                    assert.equal(null, err);
                    res.send("Link registration completed sucessfully for link: " + link + " , linkID " + r.insertedId);
                }
            );
        }


        //
        var query = {"link": link};

        //var website = "https://www.1a.lv/telefoni_plansetdatori/mobilie_telefoni/mobile_phones/samsung_a320f_galaxy_a3_2017_16_gb_black_sky";
        var str1 = "data-sell-price-w-vat='";
        var str1LEN = str1.length;
        var str2 = "'>";
        var result;

        var request = require('request');
        request(link, function (error, response, body) {
                //console.log('startIndex:', body.indexOf(str1)+str1LEN  );
                //console.log('endIndex:', body.indexOf(   str2   ,  body.indexOf(str1)+str1LEN  )  );
                result =  body.substring(body.indexOf(str1)+str1LEN   ,   body.indexOf(   "'>"   ,  body.indexOf(str1)+str1LEN  ) );
                console.log('RESULT: ', result );




          		db.collection('links').find(query).toArray(function(err, docs) {
          			assert.equal(err, null);
          			assert.notEqual(docs.length, 0);

          			docs.forEach(function(doc) {
          					console.log( doc.link );
          					if (doc.link == link) {

          						console.log( "find the link");
                                  try {
                                        db.collection('links').updateOne({
                                              "link" : link
                                        }, {
                                              $push:
                                              {
                                                   "prices" :
                                                        {
                                                             "price": result,
                                                             "date": new Date()
                                                         }
                                              }
                                           }
                                        );
                                  } catch (e) {
                                        print(e);
                                  }


          					};
          			});

          			//db.close();
          		});

        });

});


// REGISTRATION
app.get('/registration', function(req, res, next) {
        res.render('registration', {});
});

app.post('/registration', function(req, res, next) {
        var username = req.body.username;
        var password = req.body.password;
        var password2 = req.body.password2;

        if ((username == '') || (password == '') || (password2 == '')) {
            next('Please provide an entry for all fields.');
        } else if (password != password2)  {
            next('password dont math with password2 ');
        } else {
            db.collection('users').insertOne(
                { 'username': username, 'password': password },
                function (err, r) {
                    assert.equal(null, err);
                    res.send("Registration completed sucessfully for user: " + username + " , userID " + r.insertedId);
                }
            );
        }
});

// LOGIN
app.get('/login', function(req, res, next) {
        res.render('login', {});
});

app.post('/login', function(req, res, next) {
        var username = req.body.username;
        var password = req.body.password;


		var query = {"username": username};
		db.collection('users').find(query).toArray(function(err, docs) {
			assert.equal(err, null);
			assert.notEqual(docs.length, 0);

			docs.forEach(function(doc) {
					console.log( doc.username );
					if (doc.password == password) {

						console.log( "Password is correct!");
						db.collection('sessions').insertOne( { 'username': username },
						function (err, r) {
							assert.equal(null, err);
							res.send("You are welcome Mr." + username );
						}
						);

					};
			});

			//db.close();
		});
});





app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
