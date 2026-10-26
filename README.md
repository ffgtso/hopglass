[![Build Status](https://travis-ci.org/hopglass/hopglass.svg?branch=master)](https://travis-ci.org/hopglass/hopglass)

# HopGlass

HopGlass is a frontend for the [HopGlass Server](https://github.com/hopglass/hopglass-server).

# Screenshots

![](doc/mapview.png?raw=true)
![](doc/graphview.png?raw=true)
![](doc/allnodes.png?raw=true)
![](doc/links.png?raw=true)
![](doc/statistics.png?raw=true)

# Build on Debian 13 (trixie)

Install Debian's security updates and build tools:

    sudo apt-get update
    sudo apt-get install nodejs npm git ca-certificates

Node.js >= 20.19.0 is required. Debian 13 supplies Node.js 20.19.2 with
Debian security patches; keep `trixie-security` enabled. Build as an ordinary
user, using the committed npm lockfile:

    git clone https://github.com/ffgtso/hopglass.git
    cd hopglass
    npm ci --ignore-scripts
    npm test
    npm audit
    npm run build

The build produces `build/`. Copy `config.json.example` to `build/config.json`
and adapt it to your community. Subsequent builds preserve that configuration.
Only deploy the contents of `build/` through a maintained static HTTP server
such as Debian's nginx. Node.js and node_modules are build-time requirements;
they do not need to be deployed. Do not expose the repository or node_modules.

For a local preview, install `python3` and run `npm run serve`, then open
http://127.0.0.1:8080/. This loopback-only preview is not a production server.
The former Grunt/Yarn workflow and live reload have been removed.

`package-lock.json` is the authoritative dependency lock. Use `npm ci`, not
Yarn, for reproducible installs. Run `npm audit` again when deploying, because
advisories can change. See `SECURITY-REVIEW.md` for findings and limitations.
A repeatable native Debian build is provided in `Dockerfile.debian13-test`:

    docker build -f Dockerfile.debian13-test .

# Configure

Copy `config.json.example` to `build/config.json` and change it to match your community.

## dataPath (string/array)

`dataPath` can be either a string containing the address of a [HopGlass Server](https://github.com/hopglass/hopglass-server) or an array containing multiple addresses.
Don't forget the trailing slash!
Also, proxying the data through a webserver will allow GZip and thus will greatly reduce bandwidth consumption.
It may help with firewall problems too.

## siteName (string)

Change this to match your communities' name. It will be used in various places.

## mapSigmaScale (float)

This affects the initial scale of the map. Greater values will show a larger
area. Values like 1.0 and 0.5 might be good choices.

## showContact (bool)

Setting this to `false` will hide contact information for nodes.

## maxAge (integer)

Nodes being online for less than maxAge days are considered "new". Likewise,
nodes being offline for more than than maxAge days are considered "lost".

## mapLayers (List)

A list of objects describing map layers. Each object has at least `name`
property and optionally `url` and `config` properties. If no `url` is supplied
`name` is assumed to name a
[Leaflet-provider](http://leaflet-extras.github.io/leaflet-providers/preview/).
If no `maxZoom` was given in the `config` property, the leaflet default `maxZoom` 
of 18 is assumed.

## fixedCenter (array, optional)

This option allows to fix the map at one specific coordinate depending on following case-sensitive parameters:

- `lat` latitude of the center point
- `lng` longitude of the center point
- `radius` visible radius around the center in km

Examples for `fixedCenter`:

    "fixedCenter": {
      "lat": 50.80,
      "lng": 12.07,
      "radius": 30
    }

## nodeInfos (array, optional)

This option allows to show node statistics depending on following case-sensitive parameters:

- `name` caption of statistics segment in infobox
- `href` absolute or relative URL to statistics image
- `thumbnail` absolute or relative URL to thumbnail image,
  can be the same like `href`
- `caption` is shown, if `thumbnail` is not present (no thumbnail in infobox)

To insert current node-id in either `href`, `thumbnail` or `caption`
you can use the case-sensitive template string `{NODE_ID}`.

Examples for `nodeInfos`:

    "nodeInfos": [

      { "name": "Clientstatistik",
        "href": "stats/dashboard/db/node-byid?var-nodeid={NODE_ID}",
        "thumbnail": "stats/render/dashboard-solo/db/node-byid?panelId=1&fullscreen&theme=light&width=600&height=300&var-nodeid={NODE_ID}",
        "caption": "Knoten {NODE_ID}"
      },
      { "name": "Uptime",
        "href": "stats/dashboard/db/node-byid?var-nodeid={NODE_ID}",
        "thumbnail": "stats/render/dashboard-solo/db/node-byid?panelId=2&fullscreen&theme=light&width=600&height=300&var-nodeid={NODE_ID}",
        "caption": "Knoten {NODE_ID}"
      }
    ]

In order to have statistics images available, you have to set up an instance of each [Prometheus](http://prometheus.io/) and [Grafana](http://grafana.org/).

## globalInfos (array, optional)

This option allows to show global statistics on statistics page depending on following case-sensitive parameters:

- `name` caption of statistics segment in infobox
- `href` absolute or relative URL to statistics image
- `thumbnail` absolute or relative URL to thumbnail image,
  can be the same like `href`
- `caption` is shown, if `thumbnail` is not present (no thumbnail in infobox)

In contrast to `nodeInfos` there is no template substitution in  `href`, `thumbnail` or `caption`.

Examples for `globalInfos` using Grafana server rendering:

    "globalInfos": [
      { "name": "Wochenstatistik",
        "href": "stats/render/render/dashboard-solo/db/global?panelId=1&fullscreen&theme=light&width=600&height=300",
        "thumbnail": "nodes/globalGraph.png",
        "caption": "Bild mit Wochenstatistik"
      }
    ]

## linkInfos (array, optional)

This option allows to show link statistics depending on the following case-sensitive parameters:

- `name` caption of statistics segment in infobox
- `href` absolute or relative URL to statistics image
- `thumbnail` absolute or relative URL to thumbnail image,
  can be the same like `href`
- `caption` is shown, if `thumbnail` is not present (no thumbnail in infobox)

To insert the source or target node-id in either `href`, `thumbnail` or `caption`
you can use the case-sensitive template strings `{SOURCE}` and `{TARGET}`.

    "linkInfos": [
      { "href": "stats/dashboard/db/links?var-source={SOURCE}&var-target={TARGET}",
        "thumbnail": "stats/render/dashboard-solo/db/links?panelId=1&fullscreen&theme=light&width=800&height=600&var-source={SOURCE}&var-target={TARGET}"
      }
    ]

## siteNames (array, optional)

In this array name definitions for site statistics and node info can be saved. This requires one object for each site code. This object must contain:

- `site` the site code
- `name` the defined written name for this site code

If `siteNames` is not set, site-related statistics and node info won't be displayed.

Example for `siteNames`:

    "siteNames": [
      { "site": "ffhl", "name": "Lübeck" },
      { "site": "ffeh", "name": "Entenhausen" ),
      { "site": "ffgt", "name": "Gothamcity" },
      { "site": "ffal", "name": "Atlantis" }
    ]

## domainNames (array, optional)

This array contains definitions for [Gluon domains](https://gluon.readthedocs.io/en/v2018.1.x/features/multidomain.html).
This requires one object for each domain code. This object must contain:

- `domain` the domain code
- `name` the defined written name for this domain code

If `domainNames` is not set, domain-related statistics and node info won't be displayed.

Example for `domainNames`:

    "domainNames": [
      { "domain": "ffal-ost", "name": "Atlantis-Ost" },
      { "domain": "ffal-west", "name": "Atlantis-West" }
    ]

## Wireless link frequency

Wireless links may include an optional numeric `frequency` in MHz in
`graph.json` (version 1). HopGlass displays 2400 <= frequency < 2500 as
`WiFi (2,4 GHz)` and 5000 <= frequency < 5900 as `WiFi (5 GHz)`. Missing,
invalid or unsupported frequencies retain the generic `WiFi` label.
The frequency must describe the actual link interface; node-wide radio or
client statistics cannot reliably identify a link on a dual-band node.

The unmodified HopGlass Server does not export this field. The accompanying
server patch forwards `neighbours.wifi[receiving_interface_mac].frequency`
from respondd; the accompanying Gluon patch adds that optional field.
Existing firmware and servers remain compatible, but without this metadata
HopGlass cannot distinguish the bands.

## VPN uplinks on the map

Online nodes with `flags.uplink` have a solid light-blue, four-pixel outline
and a `VPN-Uplink` suffix in their tooltip. New nodes retain their green fill;
offline nodes retain their existing status style. Selecting a node temporarily
uses the existing orange highlight. The topology graph already distinguishes
uplink nodes in light blue. Detection continues to use the existing incoming
VPN-link semantics (including unknown peers); this is a tunnel connection,
not a test of Internet reachability.
