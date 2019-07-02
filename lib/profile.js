/**
 * Parse profile.
 *
 * @param {Object|String} json
 * @return {Object}
 * @api private
 */
exports.parse = function(jsonData) {
  let json = jsonData;
  if (typeof jsonData === "string") {
    json = JSON.parse(json);
  }

  const hasMultipleScopes = json.length > 0;

  // display all scopes data as a single object
  if (hasMultipleScopes) {
    json = json.reduce(
      (acc, curr) => ({
        ...acc,
        ...curr
      }),
      {}
    );
  }

  const { iupi } = json;
  const profile = {
    provider: "identityua",
    id: iupi,
    ...json
  };
  return profile;
};
