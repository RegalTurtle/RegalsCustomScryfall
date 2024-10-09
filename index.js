const express = require('express'); //Import the express dependency
const path = require('path');       // Import the path module
const port = 5000;                  //Save the port number where your server will be listening
express.json("Access-Control-Allow-Origin", "*");
var mime = require('mime-types');
var app = express();

// Use the following to handle JSON files specifically if needed
app.get('*/customcards.json', async (req, res) => {
  res.sendFile(path.join(__dirname, 'customcards.json'));
});

app.get('*/style.css', async (req, res) => {
  res.sendFile(path.join(__dirname, 'client/style.css'));
});

// Serve the main index.html file
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.get('/card/*', async (req, res) => {
  res.sendFile(path.join(__dirname, 'client/card.html'));
});

app.get('/search/*', async (req, res) => {
  res.sendFile(path.join(__dirname, 'client/search.html'));
});

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${port}`);
});