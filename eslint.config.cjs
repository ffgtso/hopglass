module.exports = [{
  files: ["**/*.js", "**/*.cjs"],
  languageOptions: {ecmaVersion: 2022, sourceType: "script", globals: {"showStat": false, "attributeEntry": false, "dictGet": false, "getJSON": false, "has_location": false, "limit": false, "localStorageTest": false, "offline": false, "one": false, "online": false, "showDistance": false, "showTq": false, "sortByKey": false, "subtract": false, "sum": false, "trueDefault": false, "getClients": false, "getClientColor": false, "escapeHTML": false, "safeWebURL": false}},
  rules: {semi: ["error", "never"], curly: ["error", "multi"], strict: ["error", "never"]}
}]
