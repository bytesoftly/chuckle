(function(chuckle, $, ) {
  // dictionary of endpoint
  var endpoints = [];

  function init() {
    
  }

  /* public */

  chuckle.add = function(name, url) {
    // set the endpoint, overwriting
    endpoints[name.toLowerCase()] = url;
  }
}(window.chuckle = window.chuckle || {}, jQuery));
