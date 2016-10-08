var express = require('express');
var app = express();
var requestify = require('requestify');
require('log-timestamp');

var bitcoin = '';

// init routes

app.get('/api/bitcoin.json', function (req, res) {
  console.log('Bitcoin request made')
  res.send(bitcoin);
});

// static files (the examples folder)
app.use('/', express.static('../examples'));
app.use('/src', express.static('../src'));

app.listen(3000, function () {
  console.log('chucklejs examples server started on port 3000');
});

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
