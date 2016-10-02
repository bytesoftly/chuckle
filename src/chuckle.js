(function(chuckle, $, ) {
  // dictionary of endpoint
  var endpoints = [];


  /**
   * tick - Performs a cycle of updating the UI
   *
   * @return {type}  description
   */
  function tick() {

  }

  /* public */


  /**
   * chuckle - Adds a named endpoint
   *
   * @param  {String} name short name of endpoint, used for reference in DOM
   * @param  {type} url url of the endpoint
   * @param  {String} method request method used (e.g. GET, POST)
   * @return {undefined}
   */
  chuckle.add = function(name, url, method) {
    // set the endpoint, overwriting
    endpoints[name.toLowerCase()] = url;
  }
}(window.chuckle = window.chuckle || {}, jQuery));
