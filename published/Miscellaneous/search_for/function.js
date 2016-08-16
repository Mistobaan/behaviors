function(
input,
ellipsis
) {

'use strict'

var areIntlLocalesSupported = require('intl-locales-supported');
var localesMyAppSupports = [
    /* list locales here */
];

if (global.Intl) {
    // Determine if the built-in `Intl` has the locale data we need.
    if (!areIntlLocalesSupported(localesMyAppSupports)) {
        // `Intl` exists, but it doesn't have the data we need, so load the
        // polyfill and patch the constructors we need with the polyfill's.
        var IntlPolyfill    = require('intl');
        Intl.NumberFormat   = IntlPolyfill.NumberFormat;
        Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
    }
} else {
    // No `Intl`, so use and load the polyfill.
    global.Intl = require('intl');
}

var Client = require('node-rest-client').Client;
var client = new Client();
const bingSearchApiKey = ellipsis.env.BING_API_KEY;

var args = {
    parameters: {
      q: input,
      count: 5
    },
    headers: {
      "Ocp-Apim-Subscription-Key": bingSearchApiKey
    }
};

client.get("https://api.cognitive.microsoft.com/bing/v5.0/search", args, function (data, response) {
  data.webPages.hits = data.webPages.totalEstimatedMatches.toLocaleString();
  ellipsis.success(data.webPages);
});

}
