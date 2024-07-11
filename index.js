const express = require('express'); //Import the express dependency
const path = require('path');       // Import the path module
const port = 5000;                  //Save the port number where your server will be listening
express.json("Access-Control-Allow-Origin", "*");
var mime = require('mime-types');
var app = express();

//Idiomatic expression in express to route and respond to a client request
// app.get('/', (req, res) => {        //get requests to the root ("/") will route here
//   res.sendFile('client/index.html', {root: __dirname});      //server responds by sending the index.html file to the client's browser
//                                                         //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile
// });

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));


// Use the following to handle JSON files specifically if needed
app.get('/customcards.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/customcards.json'));
});

// Serve the main index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

// app.get('/*', (req, res) => { // If a client file is asked for, give it and specify the correct MIME type
//   // Connect to the correct dir of the file hierarchy
//   res.sendFile(__dirname + req.url)
// });

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${port}`); 
});