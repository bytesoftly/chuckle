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

  // global event handlers
  var globalHandlers = {
    error: []
  };

  // whether or not logging is enabled
  var verbose = false;

  // whether or not to enable fading of loader/success/error elements
  var fadingOn = false;

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

    // overwrite data field with serialised form data if possible
    var data = endpoint.data;
    if (endpoint.form) {
      var formData = $(endpoint.form).serialize();
      if (length(formData) > 0) {
        data = formData;
        log('Using data serialised from form (rather than data field)');
      }
    }

    // show loader elements
    setLoaderElements(endpoint, true);

    // perform the ajax update or a json update
    if (endpoint.format == null) {
      $.ajax({
        url: endpoint.url,
        method: endpoint.method,
        data: data,
        success: function(c) {
          endpoint.middleware(c, endpoint, updateEndpointElements);
          if (endpoint.success) {
            callHandlerSafe(endpoint.success, c);
          }

          // show status elements
          setStatusElements(endpoint, true);
        },
        complete: function () {
          if (!forceOneOff) {
            scheduleUpdateEndpoint(name);
          }

          // hide loader elements
          setLoaderElements(endpoint, false);
        },
        error: function (jqxhr, textStatus, error) {
          if (verbose) {
            console.error('chuckle: Failed to update endpoint' + error)
          }

          // retry if one off specified - keep going until a success
          if (forceOneOff || endpoint.min_update_interval == -1) {
            setTimeout(function () { updateEndpoint(name, true); }, 200);
          }

          // call error handlers to deal with loading error
          var errorMessage = 'Failed to load endpoint: ' + error.toString();
          callHandlers(globalHandlers['error'], errorMessage);
          if (endpoint.error) {
            callHandlerSafe(endpoint.error, errorMessage);
          }

          // show status elements
          setStatusElements(endpoint, false);
        }
      });
    } else if (endpoint.format == 'json') {
      $.getJSON({
        url: endpoint.url,
        method: endpoint.method,
        data: endpoint.data,
        success: function(c) {
          endpoint.middleware(c, endpoint, updateEndpointElements);
          if (endpoint.success) {
            callHandlerSafe(endpoint.success, c);
          }

          // show status elements
          setStatusElements(endpoint, true);
        },
        complete: function () {
          if (!forceOneOff) {
            scheduleUpdateEndpoint(name);
          }

          // hide loader elements
          setLoaderElements(endpoint, false);
        },
        error: function (jqxhr, textStatus, error) {
          if (verbose) {
            console.error('chuckle: Failed to update endpoint: ' + error);
          }

          // retry if one off specified - keep going until a success
          if (forceOneOff || endpoint.min_update_interval == -1) {
            setTimeout(function () { updateEndpoint(name, true); }, 200);
          }

          // call error handlers to deal with loading error
          var errorMessage = 'Failed to load endpoint: ' + error.toString();
          callHandlers(globalHandlers['error'], errorMessage);
          if (endpoint.error) {
            callHandlerSafe(endpoint.error, errorMessage);
          }

          // show status elements
          setStatusElements(endpoint, false);
        }
      });
    }
  }


  /**
   * scheduleUpdateEndpoint - Schedules an update of an endpoint in the future.
   * Used to run updates in timed loops.
   *
   * @param  {String} name Name of the endpoint to update
   * @return {undefined}
   */
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


  /**
   * updateEndpointElements - Renders elements using endpoint results
   *
   * @param  {Object} c        Endpoint response content
   * @param  {Object} endpoint Endpoint update applies to (exposed to user code
   *                            in c-data-val tag)
   * @return {undefined}
   */
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
   * setLoaderElements - Shows/hides loader elements and disables elements specified to do so during endpoint load
   *
   * @param  {Object} endpoint Endpoint object (either just loaded or started to)
   * @param  {type} showing  Whether or not to show loaders (and disable specific elements)
   * @return {undefined}
   */
  function setLoaderElements(endpoint, showing) {
    // check whether or not element should be shown or hidden to show loading
    for (var i = 0; i < endpoint.loader_els.length; i++) {
      if (showing) {
        if (fadingOn) {
          $(endpoint.loader_els[idx]).fadeIn();
        } else {
          $(endpoint.loader_els[idx]).show();
        }
      } else {
        if (fadingOn) {
          $(endpoint.loader_els[idx]).fadeOut();
        } else {
          $(endpoint.loader_els[idx]).hide();
        }
      }
    }

    // check whether elements should be disabled due to endpoint loading (or
    // finished and so enabled again)
    for (var i = 0; i < endpoint.load_disabled_els.length; i++) {
      if (showing) {
        $(endpoint.load_disabled_els).prop('disabled', true);
      } else {
        // don't disable (enable) because loaders not showing (loading has
        // finished)
        $(endpoint.load_disabled_els).prop('disabled', false);
      }
    }
  }


  /**
   * setStatusElements - Shows/hides success/error elements for and endpoint
   *
   * @param  {Object} endpoint Endpoint object to process
   * @param  {Bool} success  Whether or not the endpoint load succeeded
   * @return {undefined}
   */
  function setStatusElements(endpoint, success) {
    for (var i = 0; i < endpoint.success_els.length; i++) {
      if (success) {
        $(endpoint.error_els[i]).hide();
      } else {
        if (fadingOn) {
          $(endpoint.error_els[i]).fadeIn();
        } else {
          $(endpoint.error_els[i]).show();
        }
      }
    }
    for (var i = 0; i < endpoint.error_els.length; i++) {
      if (success) {
        $(endpoint.success_els[i]).hide();
      } else {
        if (fadingOn) {
          $(endpoint.success_els[i]).fadeIn();
        } else {
          $(endpoint.success_els[i]).show();
        }
      }
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
    var formEndpoint = el.getAttribute('data-c-make-endpoint');
    var formEndpointFormat = el.getAttribute('data-c-format');
    var error = el.getAttribute('data-c-error');
    var success = el.getAttribute('data-c-success');
    var loader = el.getAttribute('data-c-loader');
    var loadDisabled = el.getAttribute('data-c-load-disabled');

    // check if we have a form endpoint to add
    if (formEndpoint !== null) {
      var url = el.getAttribute('action');
      var method = el.getAttribute('method');
      var data = $(el).serialize();

      // validate the endpoint options but continue as usual if not valid
      if (url !== null) {
        if (method !== null) {
          log('Adding endpoint from form ' + formEndpoint);

          // add the endpoint (may fail, log error but continue)
          try {
              chuckle.addEndpoint(formEndpoint, {
                url: url,
                method: method,
                data: data,
                format: formEndpointFormat
              });
          } catch(err) {
            console.error('chuckle: Failed to add endpoint from form: ' + err + ' (ignoring)');
          }
        }
      }
    }

    // everything here onwards needs an endpoint name to continue - so check for
    // one!
    if (name) {
      if (name in endpoints) {
        // check if the element should be disabled whilst the endpoint is loading
        if (loadDisabled) {
          if (!(el in endpoints[name].load_disabled_els)) {
            endpoints[name].load_disabled_els.push(el);
          }
        }

        // check if this element is a pop message for error/success/loading before
        // looking to render it
        if (error) {
          if (!(el in endpoints[name].error_els)) {
            endpoints[name].error_els.push(el);
          }
        } else if (success) {
          if (!(el in endpoints[name].success_els)) {
            endpoints[name].success_els.push(el);
          }
        } else if (loader) {
          if (!(el in endpoints[name].loader_els)) {
            endpoints[name].loader_els.push(el);
          }
        } else {
          // check the element is registered in the endpoint structure, if so it
          // has already been processed and so can be ignored
          if (!(el in endpoints[name].els)) {
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

  /**
   * callErrorHandlers - Calls all global error handlers
   *
   * @param  {type} message Message to pass to handlers
   * @return {undefined}
   */
  function callHandlers(handlerList, message) {
    for (var i = 0; i < handlerList.length; i++) {
      callHandlerSafe(handlerList[i], message);
    }
  }

  /**
   * callHandlerSafe - Calls a custom handler safely
   *
   * @param  {type} handler Callback function to execute
   * @param  {type} arg     Single argument to pass to handler
   * @return {undefined}
   */
  function callHandlerSafe(handler, arg) {
    try {
      handler(arg);
    } catch (err) {
      console.error('chuckle: An error occurred calling a custom handler: ' + err.toString());
    }
  }

  /* public */

  /**
   * add - Adds a named endpoint
   *
   * @param  {String} name short name of endpoint, used for reference in DOM
   * @param  {JSON} options can contain url, method, format, middleware function and data. Only supported format (other than plain text, default) currently 'json'
   * @return {undefined}
   */
  chuckle.addEndpoint = function(name, options) {
    // check we have options
    if (options === undefined) {
      throw 'Options must be specified (see docs for usage)';
    }

    // process options
    var method = options.method || 'GET';
    var data = options.data || {};
    var format = options.format || null;
    var form = options.form || null;
    var url = options.url || null;
    var middleware = options.middleware || (function (c, endpoint, next) { next(c, endpoint); });
    var success = options.success || null;
    var error = options.error || null;

    // validate url
    // todo: change validation for custom endpoints
    if (!url && !form) {
      throw 'url or form field required to endpoint';
    }

    // extract url and method from form if url empty
    if (!url) {
      url = $(form).attr('action');
      method = $(form).attr('action') || method;
      if (url === undefined) {
        throw 'Failed to extract url from form (either url must be specified or action attribute in form)'
      }
      log('Extracted url and method (GET if not present) from form');
    }

    // format is case insensitive
    if (format) {
      format = format.toLowerCase();
    }

    // validate format
    if (format) {
      var supportedFormats = ['json'];
      if (supportedFormats.indexOf(format) < 0) {
        throw 'Unsupported format specified, must be one of: ' + supportedFormats.join(', ');
      }
    }

    // check if the name already exists (throw an error if so)
    if (name in endpoints) {
      throw 'An endpoint named \'' + name + '\' already exists';
    }

    // add the endpoint
    endpoints[name] = {
      name: name,               // endpoint name (stored here for convenient access from middleware)
      url: url,                 // url of the endpoint
      method: method,           // method of the endpoint e.g. GET
      data: data,               // data to be passed as a query string or in headers etc. depending on method
      form: form,               // form selector
      middleware: middleware,   // middleware function (singular!) for data preprocessing (before rendering)
      format: format,           // format
      min_update_interval: -1,  // minimum update interval for pollin the endpoint
      els: [],                  // elements associated with the endpoint
      el_vals: [],              // term to evaluate for content to set element with
      error_handler: error,     // error handlers to be called on failure of endpoint load
      success_handler: success, // success handlers to be called on successful load
      error_els: [],            // list of elements to show on error
      success_els: [],          // list of elements to show on success
      loader_els: [],           // elements to show whilst loading
      load_disabled_els: []     // elements to disable during load
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


  /**
   * chuckle - Adds a chuckle global event handler
   *
   * @param  {type} name    Name of the event to subscribe to
   * @param  {type} handler Handler callback function
   * @return {undefined}
   */
  chuckle.on = function (name, handler) {
    name = name.toLowerCase();
    if (name in handlers) {
      handlers[name].push(handler);
    } else {
      handlers[name] = [handler];
    }
  }


  /**
   * chuckle - Enable or disable loader/error/success element fading animations
   *
   * @param  {Bool} on Whether or not to enable fading
   * @return {undefined}
   */
  chuckle.setFade = function(on) {
    fadingOn = on;
  }

  // run init function on library load
  init();

}(window.chuckle = window.chuckle || {}, jQuery));
