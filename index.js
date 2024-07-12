﻿const express = require('express'); //Import the express dependency
const path = require('path');       // Import the path module
const port = 5000;                  //Save the port number where your server will be listening
express.json("Access-Control-Allow-Origin", "*");
var mime = require('mime-types');
var app = express();

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));

// Middleware to inject console log message into HTML
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'client/index.html'), function (err) {
    if (err) {
      res.status(err.status).end();
    } else {
      // Inject the script if HTML is successfully sent
      res.write(`
        <script>
          console.log('This message is sent from the server.');
        </script>
      `);
      res.end();
    }
  });
});

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