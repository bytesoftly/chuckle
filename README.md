# chuckle.js
Unopinionated, minimal asynchronous UI library.

"Less code more design"

Features:
- Asynchronous loading of content with data-c-* element attributes
- Regular polling (with data-c-interval attribute)
- Asynchronous form submission
- Middleware (function to transform data before rendering)
- No-JS endpoint creation with form tags (currently requires createEndpoint(...) to create endpoint from form)
- Success handling elements (per endpoint)
- Code error handlers (per endpoint and global)
- Error and success handling elements (per endpoint)
- Loader elements (per endpoint)
- Disable element(s) while loading

Requirements:
- jQuery (2 or 3)
- Browser that doesn't explode with data-* attributes (Chrome 4.0+, IE 5.5+, Firefox 2.0+, Safari 3.1+, Opera 9.6+)

To Test:
- Middleware
- Form submission (with and without tags, methods and data)
- Rescanning page with refresh()
- jQuery 2 support
- Global and endpoint specific success and error handlers
- Endpoint specific element error and success handlers
- Fading on/off switch
- Loader elements
- Disabling of elements during endpoint load

Coming soon:
- Custom endpoint loaders (for non http:// requests - e.g. for UIs build in electron with custom data loading)
- More examples
- Documentation

Coming eventually:
- Trigger tag for starting endpoint update (data-c-trigger='endpointName', data-c-trigger-* specifies event name). This is shorthand, same thing could be achieved with for example onclick="chuckle.updateEndpoint('endpointName');"
- Websocket support (JSON over a websocket, updating on data receive)
- Unit testing
- bower and npm packages

Doc:

*Chuckle lifecycle*
1. Create endpoints via Javascript and <form> elements in DOM.
2. Load endpoints via AJAX, retrying of failure until a success.
3. Update all specified DOM elements for each successful endpoint load. Hide loaders etc.
4. Repeat step 3 indefinitely for elements with a regular update interval specified.

*Custom element attributes*
Chuckle uses modern data-... attributes on elements in DOM to create endpoints
and to determine how elements respond to their loading/errors/data etc.

General approach:
1. Specify the endpoint an element is associated with.
2. Add attributes specifying how the element will behave.

Chuckle custom attributes all start data-c-*
A complete list of chuckle attributes:
- data-c-endpoint
    Specifies a named endpoint the element is associated with. The endpoint must
    already exist (from Javascript or previous DOM).
- data-c-val
    Is evaluated to set the content of the element from data in the endpoint
    response.
    Endpoint data is made accessible through the c object.
      For example, a JSON endpoint might return the following:
        {
          symbol: 'USD',
          price: 645.66,
          stats: {
            high: 651.56,
            low: 456.2
          }
        }
      Showing the 'high' field in a span could be done like so:
      <span data-c-endpoint='ticker' data-c-val='c.stats.high'></span>
      Where an endpoint named 'ticker' has been previously created.
- data-c-interval
    Specifies the element requires regular, indefinite updates from an endpoint
    every n seconds.
    This will cause the endpoint to be loaded on a regular basis.
    All elements associated with the endpoint will also be updated.
    If multiple elements require regular updates from the same endpoint, chuckle
    will update all of them with using the lowest update interval. I.e. the
    most frequently updated element will cause all others to update at the same
    frequency, including elements dependent on the endpoint without an update
    interval specified (nothing is left out of date).

      For example, a live view count could be updated every 1.5 seconds like so:
      <span data-c-endpoint='pageViews' data-c-interval='1.5'></span>
- data-c-error
    Specifies the element should be shown when the specified endpoint encounters
    an error when loaded.

      For example, a user's balance could be shown, an error shown on failure:
      <div data-c-endpoint='balance' data-c-error>
- data-c-success
    Specifies the element should be shown when the specified endpoint loads
    successfully.

      For example user details could be shown on successful load of an endpoint:
      <div data-c-endpoint='userDetails' data-c-success>
        <ul>
          <li data-c-endpoint='userDetails' data-c-val='"Username:" + c.username'></li>          
          <li data-c-endpoint='userDetails' data-c-val='"Last login:" + c.last_login'></li>
        </ul>
      </div>

      ...or on failure the following element could be shown:

      <div data-c-endpoint='userDetails' data-c-error>An error occurred loading your account details.</div>
- data-c-loader
    Specifies the element is a loader to be shown during endpoint load and
    hidden on request completion (success or failure). This can also be used to
    hide UI on endpoint load.

      For example:
      <div data-c-endpoint='userDetails' data-c-loader>Loading...</div>


*Chuckle from Javascript*
Chuckle exposes a few methods from the chuckle global namespace.
