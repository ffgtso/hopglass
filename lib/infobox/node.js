define(["moment", "numeral", "tablesort", "tablesort.numeric"],
  function (moment, numeral, Tablesort) {
  function showGeoURI(d) {
    function showLatitude(d) {
      var suffix = Math.sign(d) > -1 ? "' N" : "' S"
      d = Math.abs(d)
      var a = Math.floor(d)
      var min = (d * 60) % 60
      a = (a < 10 ? "0" : "") + a

      return a + "° " + numeral(min).format("0.000") + suffix
    }

    function showLongitude(d) {
      var suffix = Math.sign(d) > -1 ? "' E" : "' W"
      d = Math.abs(d)
      var a = Math.floor(d)
      var min = (d * 60) % 60
      a = (a < 100 ? "0" + (a < 10 ? "0" : "") : "") + a

      return a + "° " + numeral(min).format("0.000") + suffix
    }

    if (!has_location(d))
      return undefined

    return function (el) {
      var latitude = d.nodeinfo.location.latitude
      var longitude = d.nodeinfo.location.longitude
      var a = document.createElement("a")
      a.textContent = showLatitude(latitude) + " " +
                      showLongitude(longitude)

      a.href = "geo:" + latitude + "," + longitude
      el.appendChild(a)
    }
  }

  function showStatus(d) {
    return function (el) {
      el.classList.add(d.flags.unseen ? "unseen" : (d.flags.online ? "online" : "offline"))
      if (d.flags.online)
        el.textContent = "online, letzte Nachricht " + d.lastseen.fromNow() + " (" + d.lastseen.format("DD.MM.YYYY,  H:mm:ss") + ")"
      else
        el.textContent = "offline, letzte Nachricht " + d.lastseen.fromNow() + " (" + d.lastseen.format("DD.MM.YYYY,  H:mm:ss") + ")"
    }
  }

  function showFirmware(d) {
    var release = dictGet(d.nodeinfo, ["software", "firmware", "release"])
    var base = dictGet(d.nodeinfo, ["software", "firmware", "base"])

    if (release === null || base === null)
      return undefined

    return release + " / " + base
  }

  function showSite(d, config) {
    var site = dictGet(d.nodeinfo, ["system", "site_code"])
    var rt = null
    if (config.siteNames) {
      rt = site
      config.siteNames.forEach( function (t) {
        if(site === t.site)
          rt = t.name
      })
    }
    return rt
  }

  function showDomain(d, config) {
    var domain = dictGet(d.nodeinfo, ["system", "domain_code"])
    var rt = null
    if (config.domainNames) {
      rt = domain
      config.domainNames.forEach( function (t) {
        if(domain === t.domain)
          rt = t.name
      })
    }
    return rt
  }

  function showUptime(d) {
    if (!("uptime" in d.statistics))
      return undefined

    return moment.duration(d.statistics.uptime, "seconds").humanize()
  }

  function showFirstseen(d) {
    if (!("firstseen" in d))
      return undefined

    return d.firstseen.fromNow(true)
  }

  function showClients(d) {
    if (!d.flags.online)
      return undefined

    var meshclients = getMeshClients(d)
    resetMeshClients(d)
    var before = "     ("
    var after = " in der lokalen Wolke)"
    return function (el) {
      const totalClients = d.statistics && d.statistics.clients && !Number.isNaN(d.statistics.clients.total) ? d.statistics.clients.total : 0
      el.appendChild(document.createTextNode(totalClients > 0 ? totalClients : "keine"))
      el.appendChild(document.createTextNode(before))
      el.appendChild(document.createTextNode(meshclients > 0 ? meshclients : "keine"))
      el.appendChild(document.createTextNode(after))
      el.appendChild(document.createElement("br"))

      var clientTypes = getClients(d.statistics)
      for (var clientsNum in clientTypes) {
        var clients = clientTypes[clientsNum]
        var span = document.createElement("span")
        span.classList.add("clients")
        span.textContent = " ".repeat(clients.count)
        span.title = clients.label
        span.style.color = clients.color
        el.appendChild(span)
      }

      var spanmesh = document.createElement("span")
      spanmesh.classList.add("clientsMesh")
      spanmesh.textContent = " ".repeat(meshclients - totalClients)
      spanmesh.title = "lokale Wolke"
      el.appendChild(spanmesh)
    }
  }

  function getMeshClients(node) {
    var meshclients = 0
    if (node.statistics && node.statistics.clients && !isNaN(node.statistics.clients.total))
      meshclients = node.statistics.clients.total

    if (!node)
      return 0

    if (node.parsed)
      return 0

    node.parsed = 1
    node.neighbours.forEach(function (neighbour) {
      if (!neighbour.link.isVPN && neighbour.node)
        meshclients += getMeshClients(neighbour.node)
    })

    return meshclients
  }

  function resetMeshClients(node) {
    if (!node.parsed)
      return

    node.parsed = 0

    node.neighbours.forEach(function (neighbour) {
      if (!neighbour.link.isVPN && neighbour.node)
        resetMeshClients(neighbour.node)
    })

    return
  }

  function showMeshClients(d) {
    if (!d.flags.online)
      return undefined

    var meshclients = getMeshClients(d)
    resetMeshClients(d)
    return function (el) {
      el.appendChild(document.createTextNode(meshclients > 0 ? meshclients : "keine"))
      el.appendChild(document.createElement("br"))
    }
  }

  function showIPs(d) {
    var ips = dictGet(d.nodeinfo, ["network", "addresses"])
    if (ips === null)
      return undefined

    ips.sort()

    return function (el) {
      ips.forEach( function (ip, i) {
        var link = !ip.startsWith("fe80:")

        if (i > 0)
          el.appendChild(document.createElement("br"))

        if (link) {
          var a = document.createElement("a")
          if (ip.includes("."))
            a.href = "http://" + ip + "/"
          else
            a.href = "http://[" + ip + "]/"
          a.textContent = ip
          el.appendChild(a)
        } else
          el.appendChild(document.createTextNode(ip))
      })
    }
  }

  function showBar(className, v) {
    var span = document.createElement("span")
    span.classList.add("bar")
    span.classList.add(className)

    var bar = document.createElement("span")
    bar.style.width = (v * 100) + "%"
    span.appendChild(bar)

    var label = document.createElement("label")
    label.textContent = (Math.round(v * 100)) + " %"
    span.appendChild(label)

    return span
  }

  function showLoadBar(className, v) {
    var span = document.createElement("span")
    span.classList.add("bar")
    span.classList.add(className)

    var bar = document.createElement("span")
    if (v  >= 1) {
    bar.style.width = ((v * 100) % 100) + "%"
    bar.style.background = "rgba(255, 50, 50, 0.9)"
    span.style.background = "rgba(255, 50, 50, 0.6)"
    span.appendChild(bar)
    }
    else
    {
      bar.style.width = (v * 100) + "%"
      span.appendChild(bar)
    }

    var label = document.createElement("label")
    label.textContent = +(Math.round(v + "e+2")  + "e-2")
    span.appendChild(label)

    return span
  }

  function showLoad(d) {
    if (!("loadavg" in d.statistics))
      return undefined

    return function (el) {
      el.appendChild(showLoadBar("load-avg", d.statistics.loadavg))
    }
  }

  function showRAM(d) {
    if (!("memory_usage" in d.statistics))
      return undefined

    return function (el) {
      el.appendChild(showBar("memory-usage", d.statistics.memory_usage))
    }
  }

  function showAirtime(v) {
    v.wait = v.busy - v.rx - v.tx

    var span = document.createElement("span")

    span.classList.add("bar")
    span.classList.add("airtime")
    span.setAttribute("title", "RX:" + Math.round(v.rx * 100) + "%, TX:" + Math.round(v.tx * 100) + "%, Wait:" + Math.round(v.wait * 100) + "%")

    var rxbar = document.createElement("span")
    rxbar.style.width = (v.rx * 100) + "%"
    rxbar.style.background = "rgba(85, 128, 32, 0.8)"
    span.appendChild(rxbar)

    var txbar = document.createElement("span")
    txbar.style.width = (v.tx * 100) + "%"
    txbar.style.background = "rgba(233, 85, 32, 1)"
    span.appendChild(txbar)

    var waitbar = document.createElement("span")
    waitbar.style.width = (v.wait * 100) + "%"
    waitbar.style.background = "rgba(32, 85, 128, 1)"
    span.appendChild(waitbar)

    span.style.background = "rgba(85, 128, 32, 0.5)"

    var label = document.createElement("label")
    label.textContent = Math.round(v.busy * 100) + " %"
    span.appendChild(label)

    return function (el) {
      el.appendChild(span)
    }
  }

  function createLink(target, router) {
    if (!target) return document.createTextNode("unknown")
    var unknown = !(target.node)
    var text = unknown ? (target.id ? target.id : target) : target.node.nodeinfo.hostname
    if (!unknown) {
      var link = document.createElement("a")
      link.classList.add("hostname-link")
      link.href = "#"
      link.onclick = router.node(target.node)
      link.textContent = text
      return link
    }
    return document.createTextNode(text)
  }

  function showGateway(d, router) {
    var nh
    if (dictGet(d.statistics, ["nexthop"]))
      nh = dictGet(d.statistics, ["nexthop"])
    if (dictGet(d.statistics, ["gateway_nexthop"]))
      nh = dictGet(d.statistics, ["gateway_nexthop"])
    var gw = dictGet(d.statistics, ["gateway"])

    if (!gw) return null
    return function (el) {
      var num = 0
      while (gw && nh && gw.id !== nh.id && num < 10) {
        if (num !== 0) el.appendChild(document.createTextNode(" -> "))
        el.appendChild(createLink(nh, router))
        num++
        if (!nh.node || !nh.node.statistics) break
        if (!dictGet(nh.node.statistics, ["gateway"]) || !dictGet(nh.node.statistics, ["gateway"]).id) break
        if (dictGet(nh.node.statistics, ["gateway"]).id !== gw.id) break
        if (dictGet(nh.node.statistics, ["gateway_nexthop"]))
          nh = dictGet(nh.node.statistics, ["gateway_nexthop"])
        else if (dictGet(nh.node.statistics, ["nexthop"]))
          nh = dictGet(nh.node.statistics, ["nexthop"])
        else
          break
      }
      if (gw && nh && gw.id !== nh.id) {
        if (num !== 0) el.appendChild(document.createTextNode(" -> "))
        num++
        el.appendChild(document.createTextNode("..."))
      }
      if (num !== 0) el.appendChild(document.createTextNode(" -> "))
      el.appendChild(createLink(gw, router))
    }
  }

  function showPages(d) {
    var webpages = dictGet(d.nodeinfo, ["pages"])
    if (webpages === null)
      return undefined

    webpages.sort()

    return function (el) {
      webpages.forEach( function (webpage, i) {
        if (i > 0)
          el.appendChild(document.createElement("br"))

        var a = document.createElement("span")
        var link = document.createElement("a")
        link.href = webpage
        if (webpage.search(/^https:\/\//i) !== -1) {
          var lock = document.createElement("span")
          lock.className = "ion-android-lock"
          a.appendChild(lock)
          var t1 = document.createTextNode(" ")
          a.appendChild(t1)
          link.textContent = webpage.replace(/^https:\/\//i, "")
          }
        else
          link.textContent = webpage.replace(/^http:\/\//i, "")
        a.appendChild(link)
        el.appendChild(a)
      })
    }
  }

  function showAutoupdate(d) {
    var au = dictGet(d.nodeinfo, ["software", "autoupdater"])
    if (!au)
      return undefined

    return au.enabled ? "aktiviert (" + au.branch + ")" : "deaktiviert"
  }

  function showNodeImg(o, model) {
    if (!model)
      return document.createTextNode("Knotenname")

    var content, caption
    var modelhash = model.split("").reduce(function(a, b) {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)

    content = document.createElement("img")
    content.id = "routerpicture"
    content.classList.add("nodeImg")
    content.src = o.thumbnail.replace("{MODELHASH}", modelhash)
    content.onerror = function() {
      document.getElementById("routerpicdiv").outerHTML = "Knotenname"
    }

    if (o.caption) {
      caption = o.caption.replace("{MODELHASH}", modelhash)

      if (!content)
        content = document.createTextNode(caption)
    }

    var p = document.createElement("p")
    p.appendChild(content)

    return content
  }

  function showStatImg(o, d) {
    var subst = {}
    subst["{NODE_ID}"] = d.nodeinfo.node_id ? d.nodeinfo.node_id : "unknown"
    subst["{NODE_NAME}"] = d.nodeinfo.hostname ? d.nodeinfo.hostname : "unknown"
    return showStat(o, subst)
  }

  return function(config, el, router, d) {
    var attributes = document.createElement("table")
    attributes.classList.add("attributes")

    if (config.hwImg) {
      var top = document.createElement("div")
      top.id = "routerpicdiv"
      try {
        config.hwImg.forEach(function(hwImg) {
          try {
            top.appendChild(showNodeImg(hwImg, dictGet(d, ["nodeinfo", "hardware", "model"])))
          } catch (err) {
            console.log(err.message)
          }
        })
      } catch (err) {
        console.log(err.message)
      }
      attributeEntry(attributes, top, d.nodeinfo.hostname)
    } else {
      var h2 = document.createElement("h2")
      h2.textContent = d.nodeinfo.hostname
      el.appendChild(h2)
    }

    if (config.deprecated)
      if (config.deprecated.includes(dictGet(d, ["nodeinfo", "hardware", "model"])))
        attributeEntry(attributes, "WARNUNG", function(el) {
          el.classList.add("warning")
          var a = document.createElement("a")
          a.href = config.deprecation_url
          a.textContent = config.deprecation_text
          el.appendChild(a)
       })

    attributeEntry(attributes, "Status", showStatus(d))
    attributeEntry(attributes, "Gateway", d.flags.gateway ? "ja" : null)
    attributeEntry(attributes, "Koordinaten", showGeoURI(d))

    if (config.showContact)
      attributeEntry(attributes, "Kontakt", dictGet(d.nodeinfo, ["owner", "contact"]))

    attributeEntry(attributes, "Hardware",  dictGet(d.nodeinfo, ["hardware", "model"]))
    attributeEntry(attributes, "Primäre MAC", dictGet(d.nodeinfo, ["network", "mac"]))
    attributeEntry(attributes, "Node ID", dictGet(d.nodeinfo, ["node_id"]))
    attributeEntry(attributes, "Firmware", showFirmware(d))
    attributeEntry(attributes, "Site", showSite(d, config))
    attributeEntry(attributes, "Domain", showDomain(d, config))
    attributeEntry(attributes, "Uptime", showUptime(d))
    attributeEntry(attributes, "Teil des Netzes", showFirstseen(d))
    if ("airtime" in d.statistics) {
      var channels = d.statistics.airtime.sort(function(a, b) {
        return a.frequency - b.frequency
      })
      for (var channelNum in channels) {
        var channel = channels[channelNum]
        var mode = Math.floor(channel.frequency / 1000)
        var chan

        if (mode === 2)
          chan = "Kanal " + (channel.frequency - 2407) / 5
        else if (mode === 5)
          chan = "Kanal " + (channel.frequency - 5000) / 5
        else
          chan = channel.frequency.toString() + " MHz"

        attributeEntry(attributes, "Airtime " + chan, showAirtime(channel))
      }
    }
    attributeEntry(attributes, "Systemlast", showLoad(d))
    attributeEntry(attributes, "Arbeitsspeicher", showRAM(d))
    attributeEntry(attributes, "IP Adressen", showIPs(d))
    attributeEntry(attributes, "Webseite", showPages(d))
    attributeEntry(attributes, "Gewähltes Gateway", showGateway(d, router))
    attributeEntry(attributes, "Autom. Updates", showAutoupdate(d))
    attributeEntry(attributes, "Clients", showClients(d), showMeshClients(d))

    el.appendChild(attributes)


    if (config.nodeInfos)
      config.nodeInfos.forEach( function (nodeInfo) {
        var h4 = document.createElement("h4")
        h4.textContent = nodeInfo.name
        el.appendChild(h4)
        el.appendChild(showStatImg(nodeInfo, d))
      })

    if (d.neighbours.length > 0) {
      var h3 = document.createElement("h3")
      h3.textContent = "Links (" + d.neighbours.length + ")"
      el.appendChild(h3)

      var table = document.createElement("table")
      var thead = document.createElement("thead")

      var tr = document.createElement("tr")
      var th1 = document.createElement("th")
      th1.textContent = " "
      tr.appendChild(th1)

      var th2 = document.createElement("th")
      th2.textContent = "Knoten"
      th2.classList.add("sort-default")
      tr.appendChild(th2)

      var th3 = document.createElement("th")
      th3.textContent = "TQ"
      tr.appendChild(th3)

      var th4 = document.createElement("th")
      th4.textContent = "Typ"
      tr.appendChild(th4)

      var th5 = document.createElement("th")
      th5.textContent = "Entfernung"
      tr.appendChild(th5)

      thead.appendChild(tr)
      table.appendChild(thead)

      var tbody = document.createElement("tbody")

      d.neighbours.forEach( function (d) {
        var unknown = !(d.node)
        var tr = document.createElement("tr")

        var td1 = document.createElement("td")
        td1.appendChild(document.createTextNode(d.incoming ? " ← " : " → "))
        tr.appendChild(td1)

        var td2 = document.createElement("td")
        td2.appendChild(createLink(d, router))

        if (!unknown && has_location(d.node)) {
          var span = document.createElement("span")
          span.classList.add("icon")
          span.classList.add("ion-location")
          td2.appendChild(span)
        }

        tr.appendChild(td2)

        var td3 = document.createElement("td")
        var a2 = document.createElement("a")
        a2.href = "#"
        a2.textContent = showTq(d.link)
        a2.onclick = router.link(d.link)
        td3.appendChild(a2)
        tr.appendChild(td3)

        var td4 = document.createElement("td")
        var a3 = document.createElement("a")
        a3.href = "#"
        a3.textContent = d.link.type
        a3.onclick = router.link(d.link)
        td4.appendChild(a3)
        tr.appendChild(td4)

        var td5 = document.createElement("td")
        var a4 = document.createElement("a")
        a4.href = "#"
        a4.textContent = showDistance(d.link)
        a4.onclick = router.link(d.link)
        td5.appendChild(a4)
        td5.setAttribute("data-sort", d.link.distance !== undefined ? -d.link.distance : 1)
        tr.appendChild(td5)

        tbody.appendChild(tr)
      })

      table.appendChild(tbody)
      table.className = "node-links"

      new Tablesort(table)

      el.appendChild(table)
    }
  }
})
