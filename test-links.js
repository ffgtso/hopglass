// Run with: node test-links.js (after installing dependencies).
const assert = require("assert")
const fs = require("fs")
const vm = require("vm")
const moment = require("moment")

async function prepare(graph) {
  let main, result
  const nodes = ["a", "b"].map(id => ({
    nodeinfo: {node_id: id, hostname: id}, flags: {online: true},
    firstseen: "2020-01-01T00:00:00Z", lastseen: "2026-10-22T00:00:00Z"
  }))
  const Router = function () { this.setData = function () {}; this.start = function () {} }
  const GUI = function () { this.setData = data => { result = data } }
  vm.runInNewContext(fs.readFileSync("lib/main.js", "utf8"), {
    define: (deps, factory) => { main = factory(moment, Router, {}, GUI, {language() {}}) },
    getJSON: url => Promise.resolve(url === "nodes.json" ? {version: 2, nodes} : graph),
    limit: () => [], sortByKey: (key, values) => values,
    online: node => node.flags.online, offline: node => !node.flags.online,
    window: {setInterval() {}}, document: {body: {}}, console
  })
  main({dataPath: "", maxAge: 14})
  await new Promise(resolve => setImmediate(resolve))
  assert(result, "main must deliver prepared data to GUI")
  return result
}

async function run() {
  const cases = [
    [2412, "WiFi (2G4)"], [2484, "WiFi (2G4)"],
    [5180, "WiFi (5G)"], [5885, "WiFi (5G)"],
    [undefined, "WiFi"], [null, "WiFi"], ["2412", "WiFi"],
    [0, "WiFi"], [2500, "WiFi"], [5900, "WiFi"], [5955, "WiFi"]
  ]
  for (const [frequency, expected] of cases) {
    const data = await prepare({version: 1, batadv: {
      nodes: [{node_id: "a"}, {node_id: "b"}],
      links: [{source: 0, target: 1, type: "wireless", frequency, tq: 1}]
    }})
    assert.strictEqual(data.graph.links[0].type, expected)
    for (const node of data.nodes.all) {
      assert.strictEqual(node.neighbours[0].link.type, expected)
      assert(!node.flags.uplink)
    }
  }
  for (const type of ["tunnel", "fastd", "l2tp", "gre"]) {
    const data = await prepare({version: 1, batadv: {
      nodes: [{id: "aa:bb:cc:dd:ee:ff"}, {node_id: "b"}],
      links: [{source: 0, target: 1, type, tq: 1}]
    }})
    assert(data.nodes.all[1].flags.uplink)
    assert(data.graph.links[0].isVPN)
  }
  console.log("PASS: 11 frequency cases, both neighbour views, 4 VPN types with unknown peer")
}
run().catch(error => { console.error(error); process.exitCode = 1 })
