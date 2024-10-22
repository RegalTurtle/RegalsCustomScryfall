import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const express = require('express'); //Import the express dependency
//const path = require('path');       // Import the path module
const port = 5000;                  //Save the port number where your server will be listening
express.json("Access-Control-Allow-Origin", "*");
//var mime = require('mime-types');
var app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.static(path.join(__dirname, 'client')));

// Use the following to handle JSON files specifically if needed
app.get('*/customcards.json', async (req, res) => {
  res.sendFile(path.resolve(__dirname, 'customcards.json'));
});

app.get('*/style.css', async (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client/style.css'));
});

// Serve the main index.html file
app.get('/', async (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client/index.html'));
});

app.get('/card/*', async (req, res) => { /**/
  res.sendFile(path.resolve(__dirname, 'client/card.html'));
});

app.get('/search/*', async (req, res) => { /**/
  res.sendFile(path.resolve(__dirname, 'client/search.html'));
});

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${port}`);
});
