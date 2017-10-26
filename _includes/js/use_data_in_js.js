{% assign test = site.data.people | jsonify %}
var test_json = JSON.parse('{{test}}');
console.log("test_json",test_json)