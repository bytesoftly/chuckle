var express = require('express');
var app = express();
var requestify = require('requestify');
require('log-timestamp');

var bitcoin = '';

// init routes

// bitcoin price mirror
app.get('/api/bitcoin.json', function (req, res) {
  console.log('Bitcoin request made');
  res.send(bitcoin);
});

// random number generator (1)
app.get('/api/random1', function (req, res) {
  console.log('Random number 1 requested');
  sendRandomNum(res);
});

// random number generator (2)
app.get('/api/random2', function (req, res) {
  console.log('Random number 2 requested');
  sendRandomNum(res);
});

// html endpoint
app.get('/api/a_link', function (req, res) {
  console.log('Link HTML requested');
  res.send('<a href="/login">Log in</a>');
});

// slow load
app.get('/api/slow_load.json', function (req, res) {
  console.log('Loading something slow');
  setTimeout(function () {
    var result = {
      meaning_of_life: 42,
      certainty: 99.8
    };
    res.json(result);
  })
});

// static files (the examples folder)
app.use('/', express.static('../examples'));
app.use('/src', express.static('../src'));

app.listen(3000, function () {
  console.log('chucklejs examples server started on port 3000');
});

// random number generator
function sendRandomNum(res) {
  res.send(Math.round(Math.random()*100).toString());
}

// bitcoin mirror

// init bitcoin mirror
function updateBitcoin() {
  bitcoin = '';
  requestify.get('http://api.coindesk.com/v1/bpi/currentprice.json').then(function(response) {
    bitcoin = response.getBody();
    setTimeout(updateBitcoin, 500);
  });
}

// run bitcoin updater forever
updateBitcoin();
