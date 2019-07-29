/**
 * Module dependencies.
 */
const { parse } = require("./profile");
const util = require("util");
const XML = require("xtraverse");
const OAuthStrategy = require("passport-oauth1");
const { InternalOAuthError } = OAuthStrategy;

/**
 * `Strategy` constructor.
 *
 * The Identity UA authentication strategy authenticates requests by delegating to
 * IdP using the OAuth protocol.
 *
 * Applications must supply a `verify` callback which accepts a `token`,
 * `tokenSecret` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `consumerKey`     identifies client
 *   - `consumerSecret`  secret used to establish ownership of the consumer key
 *   - `callbackURL`     URL to which will redirect the user after obtaining authorization
 *
 * Examples:
 *
 *     passport.use(new IdentityUaStrategy({
 *         consumerKey: '123-456-789',
 *         consumerSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/callback'
 *       },
 *       function(token, tokenSecret, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {};
  options.requestTokenURL =
    options.requestTokenURL || "http://identity.ua.pt/oauth/request_token";
  options.accessTokenURL =
    options.accessTokenURL || "http://identity.ua.pt/oauth/access_token";
  options.userAuthorizationURL =
    options.userAuthorizationURL || "http://identity.ua.pt/oauth/authorize";

  OAuthStrategy.call(this, options, verify);
  this.name = "identityua";
  this._userProfileURL =
    options.userProfileURL || "http://identity.ua.pt/oauth/get_data";

  this._scope = options.scope || [];
}

/**
 * Inherit from `OAuthStrategy`.
 */
util.inherits(Strategy, OAuthStrategy);

/**
 * Authenticate request by delegating to IdP using OAuth.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  // When a user denies authorization, they are presented with a link
  // to return to the application in the following format (where xxx is the
  // value of the request token):
  //
  //     http://www.example.com/auth/callback?denied=xxx
  //
  // Following the link back to the application is interpreted as an
  // authentication failure.
  if (req.query && req.query.denied) {
    return this.fail();
  }

  // Call the base class for standard OAuth authentication.
  OAuthStrategy.prototype.authenticate.call(this, req, options);
};

/**
 * Retrieve user profile from IdentityUA.
 *
 * This function constructs a normalized profile.
 *
 * @param {String} token
 * @param {String} tokenSecret
 * @param {Object} params
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(token, tokenSecret, params, done) {
  let json;
  let scopes = this._scope.length > 0 ? this._scope : ["uu"];

  const strategy = this;
  const getScopeData = scope =>
    new Promise((resolve, reject) => {
      strategy._oauth.get(
        this._userProfileURL + "?format=json&scope=" + scope,
        token,
        tokenSecret,
        function(err, body, res) {
          if (err) {
            console.error(err);
            reject(new InternalOAuthError("Failed to fetch user profile"), err);
          }
          try {
            json = JSON.parse(body);
            resolve({ scope, data: json, _json: json, _raw: body });
          } catch (err) {
            console.error(err);
            reject(new Error("Failed to parse user profile"));
          }
        }
      );
    });

  const getAllScopesData = scopes.map(scope => getScopeData(scope));

  Promise.all(getAllScopesData)
    .then(results => {
      let profile = parse(results);
      done(null, profile);
    })
    .catch(err => done(new InternalOAuthError(err.message), undefined));
};

/**
 * Parse error response from OAuth endpoint.
 *
 * @param {String} body
 * @param {Number} status
 * @return {Error}
 * @api protected
 */
Strategy.prototype.parseErrorResponse = function(body, status) {
  const xml = XML(body);
  const msg = xml.children("error").t();
  return new Error(msg || body);
};

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
