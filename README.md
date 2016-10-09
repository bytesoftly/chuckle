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

Coming soon:
- Loader elements
- Error handling elements (global)
- Disable element(s) while loading
- Trigger tag for starting endpoint update (data-c-trigger='endpointName', data-c-trigger-* specifies event name). This is shorthand, same thing could be achieved with for example onclick="chuckle.updateEndpoint('endpointName');"

- Custom endpoint loaders (for non http:// requests - e.g. for UIs build in electron with custom data loading)

Coming eventually:
- Websocket support (JSON over a websocket, updating on data receive)
- Unit testing
- bower and npm packages
