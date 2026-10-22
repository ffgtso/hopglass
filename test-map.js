// Exercise the public map API with Leaflet doubles, without network tiles.
const assert = require("assert")
const fs = require("fs")
const vm = require("vm")
const moment = require("moment")
let MapView
let markers = []
const element = () => ({classList: {add() {}, toggle() {}}, appendChild() {}})
const map = {stopLocate() {}, on() {}, fitBounds() {}, getZoom() { return 12 }}
function layer() { return {addTo() {}, setZIndex() {}, setData() {}, clearLayers() {}} }
const L = {
  extend: Object.assign,
  Control: {extend: definition => function (...args) {
    Object.assign(this, definition)
    this.initialize(...args)
  }},
  Util: {setOptions() {}}, DomUtil: {create: element},
  DomEvent: {addListener() {}, disableClickPropagation() {}},
  map: () => map, tileLayer: () => layer(),
  control: {layers: () => layer()}, featureGroup: () => layer(),
  latLngBounds: () => ({}), latLng: () => ({}), LatLng: function () {}, circle: () => ({getBounds() { return {} }}),
  circleMarker: (position, style) => {
    const marker = {options: Object.assign({}, style), on() {}, getLatLng() { return {} },
      setStyle(next) { Object.assign(this.options, next) },
      bindLabel(label) { this.label = label }}
    markers.push(marker)
    return marker
  }
}
vm.runInNewContext(fs.readFileSync("lib/map.js", "utf8"), {
  define: (deps, factory) => {
    MapView = factory(layer, layer, {}, L, moment, function () {},
      function () { this.load = function () {} })
  }, document: {createElement: element}, localStorageTest: () => false,
  has_location: () => true, online: n => n.flags.online, offline: n => !n.flags.online,
  subtract: (all, selected) => all.filter(n => selected.indexOf(n) < 0)
})
const view = new MapView({mapLayers: [{name: "test", url: "test", config: {}}],
  fixedCenter: {lat: 0, lng: 0, radius: 1}}, null, () => 0,
  {node: () => function () {}}, element())
const node = (id, online, uplink) => ({nodeinfo: {node_id: id, hostname: id,
  location: {latitude: 0, longitude: 0}}, flags: {online, uplink}})
const a = node("vpn", true, true), b = node("mesh", true, false)
const c = node("new-vpn", true, true), d = node("offline", false, true)
function update() {
  markers = []
  view.setData({graph: {links: []}, nodes: {all: [a, b, c, d], new: [c], lost: []}})
  return Object.fromEntries(markers.map(m => [m.label.split(" ")[0], m]))
}
let actual = update()
assert.strictEqual(actual.vpn.options.color, "#5BAAEB")
assert.strictEqual(actual.vpn.options.weight, 4)
assert.strictEqual(actual.vpn.label, "vpn (VPN-Uplink)")
assert.strictEqual(actual.mesh.options.weight, 2)
assert.strictEqual(actual["new-vpn"].options.fillColor, "#93E929")
assert.strictEqual(actual.offline.options.color, "#D43E2A")
assert.strictEqual(actual.offline.label, "offline")
view.gotoNode(a)
assert.strictEqual(actual.vpn.options.color, "orange")
actual.vpn.resetStyle()
assert.strictEqual(actual.vpn.options.color, "#5BAAEB")
view.resetView()
a.flags.uplink = false
actual = update()
assert.strictEqual(actual.vpn.options.color, "#1566A9")
assert.strictEqual(actual.vpn.label, "vpn")
console.log("PASS: VPN, mesh, new and offline markers; selection reset; data refresh")
