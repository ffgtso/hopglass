const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const context = {URL}
vm.runInNewContext(fs.readFileSync("helper.js", "utf8"), context)
assert.equal(context.escapeHTML('<img src=x onerror="alert(1)"> & \'x\''),
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;x&#39;')
for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.test',
  'java\nscript:alert(1)', ' https://example.org', 'https://', null, {}, 42])
  assert.equal(context.safeWebURL(value), null)
assert.equal(context.safeWebURL('https://example.org/path?q=1'), 'https://example.org/path?q=1')
assert.equal(context.safeWebURL('HTTP://example.org'), 'http://example.org/')
console.log('PASS: HTML escaping and web URL protocol allowlist')

// Exercise the actual infobox renderer, exposing its closure only in the test VM.
const element = tag => ({tag, children: [], appendChild(child) { this.children.push(child) }})
context.document = {createElement: element, createTextNode: value => ({textContent: value})}
context.define = (deps, factory) => factory({}, {}, function () {})
vm.runInNewContext(fs.readFileSync("lib/infobox/node.js", "utf8")
  .replace("function showPages(d)", "globalThis.renderPages = showPages; function showPages(d)"), context)
const root = element("div")
context.renderPages({nodeinfo: {pages: ['javascript:alert(1)', null, 'https://example.org/']}})(root)
const anchors = root.children.flatMap(child => child.children).filter(child => child.tag === "a")
assert.equal(anchors.length, 1)
assert.equal(anchors[0].href, "https://example.org/")
assert.equal(context.renderPages({nodeinfo: {pages: "javascript:alert(1)"}}), undefined)
console.log("PASS: infobox rejects unsafe URLs and malformed page lists")
