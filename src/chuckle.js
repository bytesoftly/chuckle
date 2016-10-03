/**
 * chuckle.js - a minimal library for an asychronously auto updating UI
 * featuring AJAX and a little jQuery.
 *
 * Copyright James Clemoes 2016
 *
 * MIT license.
 */

(function(chuckle, $) {
  // array of endpoint structures. These are kept in a contiguously, numerically
  // indexed array for speed (as this array will be regularly cycled through)
  var endpoints = [];

  // whether or not logging is enabled
  var verbose = false;

  /**
   * init - Performs initialisation after DOM is ready
   * Contains jQuery.
   *
   * @return {undefined}
   */
  function init() {
    $(function (){
      // scan all elements for chuckle tags
      scanElements();

      // start the update loops
      log('Starting update loops');
      updateUI(false);
    });
  }

  /**
   * scanElements - Finds all elements with chuckle tags
   *
   * @return {type}  description
   */
  function scanElements() {
    var all;

    log('Scanning for chuckle c- tags');

    // get all elements ()
    all = document.getElementsByTagName('*');

    // loop through all elements processing each
    for (var i = 0; i < all.length; i++) {
      scanElement(all[i]);
    }
  }

  /**
   * updateUI - Begins the update loops that continue to refresh the UI
   * @param  {Bool} forceOneOff Whether or not to enable a future update loop if required
   * @return {undefined}
   */
  function updateUI(forceOneOff) {
    for (var name in endpoints) {
      updateEndpoint(name, forceOneOff);
    }
  }

  /**
   * updateEndpoint - Updates all UI associated with a single endpoint, setting
   * a timer to trigger the function again in the future if an interval is
   * specified for regular updates.
   *
   * @param  {String} name Endpoint name for updating
   * @param  {Bool} forceOneOff Whether or not to enable a future update loop if required
   * @return {undefined}
   */
  function updateEndpoint(name, forceOneOff) {
    // check if endpoint exists
    if (!(name in endpoints)) {
      console.warn('Endpoint ' + name + ' cannot be found, skipping');
      return;
    }

    var endpoint = endpoints[name];

    // TODO: Add stop check here

    // check not needed but included for performance
    if (verbose)
      log('Updating endpoint ' + name);

    // perform the ajax update or a json update
    if (endpoint.format == null) {
      $.ajax({
        url: endpoint.url,
        method: endpoint.method,
        data: endpoint.data,
        success: function(c) {
          updateEndpointElements(c, endpoint);
        },
        complete: function () {
          if (!forceOneOff) {
            scheduleUpdateEndpoint(name);
          }
        }
      });
    } else if (endpoint.format == 'json') {
      $.getJSON({
        url: endpoint.url,
        method: endpoint.method,
        data: endpoint.data,
        success: function(c) {
          updateEndpointElements(c, endpoint);
        },
        complete: function () {
          if (!forceOneOff) {
            scheduleUpdateEndpoint(name);
          }
        }
      });
    }

     // TODO: Add error case and tags
  }

  function scheduleUpdateEndpoint(name) {
    var interval = endpoints[name].min_update_interval;
    // check whether the update should be one-shot or if another should be
    // scheduled in the future
    if (interval > -1) {
      // using setTimeout to be more asychronous than setInterval, avoids
      // starting a new request to server before previous ui syncing finished.

      // IDEA: Better timing accuracy could be achived by measuring the amount
      // of time elapsed since last update rather than assuming update code
      // takes no time.
      setTimeout(function () { updateEndpoint(name, false) }, interval*1000);
    }
  }

  function updateEndpointElements(c, endpoint) {
    // perform the data setting carefully, logging errors to the console but
    // continuing the page render
    try {
      for (var i = 0; i < endpoint.els.length; i++) {
        // TODO: Add native support for setting more than simply element content
        $(endpoint.els[i]).html(eval(endpoint.el_vals[i]));
      }
    } catch(err) {
      console.error('chuckle: Setting endpoint ' + name + 'failed at some point, raw: ' + err.toString());
    }
  }

  /**
   * scanElement - Scans one element for chuckle tags. This function
   * must be performant.
   *
   * @return {undefined}
   */
  function scanElement(el) {
    // get the element attributes
    var name = el.getAttribute('data-c-endpoint');
    var val = el.getAttribute('data-c-val');
    var interval = el.getAttribute('data-c-interval');

    // process endpoint
    if (name !== null) {
      // find the endpoint, check it's known
      if (name in endpoints) {
        // check the element is registered in the endpoint structure, if so it
        // has already been processed and so can be ignored
        if (endpoints[name].els.indexOf(el) == -1) {
          // check the element has a val tag (if not default to all the data
          // coming back from the endpoint safely escaped to prevent accidental
          // rendering of html)
          if (val === null) {
            val = 'chuckle.makeSafe(c)';
          }

          // add the element and it's val term to numerically indexed lists
          // (again for performance)
          endpoints[name].els.push(el);
          endpoints[name].el_vals.push(val);

          // check whether the element's update interval is more demanding than
          // the previous shortest
          if (interval !== null) {
            interval = parseFloat(interval);
            if (!isNaN(interval)) {
              if (interval < endpoints[name].min_update_interval || endpoints[name].min_update_interval < 0) {
                endpoints[name].min_update_interval = interval;
              }
            }
          }
        }
      }
    }
  }

  /**
   * log - Logs a message to the console if verbose mode enabled
   *
   * @param  {String} msg Message to log
   * @return {undefined}
   */
  function log(msg) {
    if (verbose) {
      console.log('chuckle: ' + msg);
    }
  }

  /* public */

  /**
   * add - Adds a named endpoint
   *
   * @param  {String} name short name of endpoint, used for reference in DOM
   * @param  {String} url url of the endpoint
   * @param  {JSON} options can contain method, format and data. Only supported format (other than plain text, default) currently 'json'
   * @return {undefined}
   */
  chuckle.addEndpoint = function(name, url, options) {
    // process optional arguments
    var method = 'GET';
    var data = {};
    var format = null;
    var form = null;

    if (options !== undefined) {
        method = options.method || method;
        data = options.data || data;
        format = options.format || format;
    }

    // format is case insensitive
    if (format) {
      format = format.toLowerCase();
    }

    // check if the name already exists (throw an error if so)
    if (name in endpoints) {
      throw 'An endpoint named \'' + name + '\' already exists';
    }

    // add the endpoint
    endpoints[name] = {
      url: url,                 // url of the endpoint
      method: method,           // method of the endpoint e.g. GET
      data: data,               // data to be passed as a query string or in headers etc. depending on method
      format: format,             // format
      last_value: null,         // last value retreived from the endpoint
      min_update_interval: -1,  // minimum update interval for pollin the endpoint
      els: [],                  // elements associated with the endpoint
      el_vals: []               // term to evaluate for content to set element with
    };
  }

  /**
   * makeSafe - Returns string safe for rendering in html
   *
   * @param  {String} str raw content to turn into safe text
   * @return {String}     safe to render text
   */
  chuckle.makeSafe = function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * updateAllNow - Runs a one-off complete UI update
   *
   * @return {type}  description
   */
  chuckle.updateAllNow = function () {
    updateUI(true);
  }

  /**
   * updateEndpoint - Performs a one-off update of all elements associated
   * with an endpoint
   *
   * @param  {type} name description
   * @return {type}      description
   */
  chuckle.updateEndpoint = function (name) {
    // find the index of the endpoint name
    if (!(name in endpoints)) {
      throw 'Endpoint \'' + name + '\' not found'
    }

    // update the endpoint as a one-off
    updateEndpoint(name, true);
  }

  /**
   * refresh - Performs a scan of DOM for new elements with chuckle
   * tags
   *
   * @return {type}  description
   */
  chuckle.refresh = function () {
    scanElements();
  }

  /**
   * setVerbose - Sets whether or not verbose debug logging is enabled
   *
   * @param  {Bool} enabled whether or not logging should be enabled
   * @return {undefined}
   */
  chuckle.setVerbose = function (enabled) {
    verbose = enabled;
  }

  // run init function on library load
  init();

}(window.chuckle = window.chuckle || {}, jQuery));
