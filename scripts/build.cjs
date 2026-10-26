const fs = require("node:fs/promises")
const path = require("node:path")
const {execFileSync} = require("node:child_process")
const sass = require("sass")
const postcss = require("postcss")
const autoprefixer = require("autoprefixer")
const requirejs = require("requirejs")

async function build() {
  // Keep operator-provided build/config.json across rebuilds.
  await fs.mkdir("build", {recursive: true})
  const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {encoding: "utf8"}).trim()
  const date = new Date().toISOString()
  for (const file of await fs.readdir("html")) {
    if (!file.endsWith(".html")) continue
    const html = await fs.readFile(path.join("html", file), "utf8")
    await fs.writeFile(path.join("build", file), html.replace(/#revision#/g, revision).replace(/#build-date#/g, date))
  }
  for (const [source, target] of [
    ["node_modules/roboto-fontface/fonts/roboto", "fonts/roboto"],
    ["node_modules/roboto-fontface/fonts/roboto-slab", "fonts/roboto-slab"],
    ["node_modules/roboto-fontface/css/roboto", "css/roboto"],
    ["node_modules/roboto-fontface/css/roboto-slab", "css/roboto-slab"],
    ["node_modules/ionicons/fonts", "fonts"],
    ["node_modules/ionicons/css/ionicons.min.css", "css/ionicons.min.css"],
    ["node_modules/leaflet/dist/images", "images"]
  ]) await fs.cp(source, path.join("build", target), {recursive: true})
  // Preserve project-owned image assets too.
  for (const directory of ["img"]) {
    try { await fs.access(directory) } catch { continue }
    await fs.cp(directory, path.join("build", directory), {recursive: true})
  }
  const css = sass.compile("scss/main.scss", {style: "compressed"}).css
  const result = await postcss([autoprefixer({overrideBrowserslist: ["last 2 versions"]})])
    .process(css, {from: "scss/main.scss", to: "build/style.css", map: false})
  await fs.writeFile("build/style.css", result.css)
  await new Promise((resolve, reject) => requirejs.optimize({
    baseUrl: "lib", name: "../node_modules/almond/almond", mainConfigFile: "app.js",
    include: "../app", wrap: true, optimize: "uglify", out: "build/app.js"
  }, resolve, reject))
  console.log("Build complete: build/")
}
build().catch(error => { console.error(error); process.exitCode = 1 })
