/**
 * Parse profile.
 *
 * @param {Object|String} json
 * @return {Object}
 * @api private
 */
exports.parse = function(results) {
  if (typeof results === "string") {
    results = JSON.parse(results);
  }

  if (!Array.isArray(results)) results = [results];

  const hasMultipleScopes = results.length > 1;

  const jsonAndRaw = results.reduce(
    (acc, curr) => {
      const { scope, _json, _raw } = curr;
      if (hasMultipleScopes) {
        acc._json[scope] = _json;
        acc._raw[scope] = _raw;
      } else {
        acc._json = _json;
        acc._raw = _raw;
      }
      return acc;
    },
    { _json: {}, _raw: {} }
  );

  const data = results.reduce((acc, curr) => {
    const { data: scopeData, scope } = curr;
    let treatedScopeData = scopeData;
    if (scope === "uu") {
      const { iupi, ...rest } = treatedScopeData;
      treatedScopeData = {
        ...rest,
        id: iupi
      };
    }
    return {
      ...acc,
      ...treatedScopeData
    };
  }, {});

  const profile = {
    provider: "identityua",
    ...data,
    ...jsonAndRaw
  };
  return profile;
};
