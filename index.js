const express = require('express')
const request = require('request')
var bodyParser = require('body-parser')
const WebSocket = require('ws')
const webpush = require('web-push');
const StormDB = require("stormdb");
var lightningPayReq = require('bolt11')

webpush.setVapidDetails('mailto:redphone@pseudozach.com', "BA-QZs7Kv0e-C3F9gZP-que9oPj2nRB1zc9Cb06EZF0vzyHcoXrlmiRZ_HVrnJERnivIVg3A-JufV9HrcVoopk8", "mOc9-0gOwMvhvozXl5dZSHJ_zl-GhvDMeKQEuqBDcLY")

const redphoneport = process.argv.slice(2)[0] || 8888
const imperviousport = process.argv.slice(3)[0] || 8881
// "192.168.0.191" - if you have LN+impervious on another box
// "localhost" - if you have LN+impervious on same box
const impervioushost = "192.168.0.191" 

const defaultringcount = 40 // x3 seconds to wait for answer to a call

const engine = new StormDB.localFileEngine("./"+redphoneport+"db.stormdb");
const db = new StormDB(engine);
// db.default({ activecall: [], callhistory: [], subscriptions:[]});
if(!db.get("callhistory").value()) {
  console.log("first launch, init db")
  db.default({ activecall: [], callhistory: [], subscriptions:[]}).save()
  // db.default({callhistory:[]})
}

let paidcallinterval

var app = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static('public'))
  .post('/subscribe', (req, res) => {
    const sc = req.body
    // console.log("/subscribe received sc ", sc)

    // check if subscription already exists
    let allsubs = db.get("subscriptions").value()
    let isfound = false
    for (var i = allsubs.length - 1; i >= 0; i--) {
      if(allsubs[i].endpoint == sc.endpoint) {
        isfound = true
      }
    }
    if(!isfound) {
      db.get("subscriptions").push(sc).save()       
    }
    // subscription = sc
    res.status(201).json({})
  })
  .get('/setprice', (req, res) => {
    const price = req.query.price
    db.get("audioprice").set(price)
    db.save()
    res.status(201).json({})
  })
  .get('/getmyprice', (req, res) => {
    const price = db.get("audioprice").value() || "0"
    res.send(price)
  })
  .get('/getprice', (req, res) => {
    const nodeid = req.query.nodeid
    // console.log("getprice received ", nodeid)

    const data = {"msg": "rppacketpricecheck", "pubkey": nodeid}
    request({
      method: 'POST',
      url: "http://"+impervioushost+":"+imperviousport+"/v1/message/send",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }, function (error, response, body) {
      if(error) {
        console.log("imp error: ", error)
        return res.send({status: "error", error: error})
      }
      console.log("getprice sent ", body)
      return res.send({status: "ok"})
    })  
  })
  .get('/callstarted', (req, res) => {
    let isInitiator = req.query.isInitiator
    let pubkey = req.query.pubkey
    let price = req.query.price
    console.log("callstarted ",isInitiator,pubkey,price)
    if(parseInt(price) > 0) {
      if(isInitiator == true || isInitiator == "true") {
        console.log("isInitiator sending regular payments")
        // start sending regular payments or peer will disconnect
        paidcallinterval = setInterval(function(){
          sendKeepalive(pubkey,price)
        } , 60000) 

      } else {
        console.log("NOT isInitiator checking regular payments")
        //start timer to expect payments every minute or inform frontend to end the call
        const price = db.get("audioprice").value() || "0"
        paidcallinterval = setInterval(function(){
          // check timestamp and amount of most recent keepalive
          const keepalive = db.get("keepalive").value() || {}
          // console.log("checking keepalive: ", keepalive, new Date().getTime(), ((keepalive.timestamp - new Date().getTime()) <= 61000))
          if( (keepalive.amount >= price) && ((new Date().getTime() - keepalive.timestamp) <= 65000)) {
            console.log("received timely payment, no action")
          } else {
            console.log("required payment not received, disconnect call")
            
            let notificationText = "Payment NOT received"
            sendNotifications(notificationText)

            clearInterval(paidcallinterval)
          }
        } , 60000)      
      }      
    }
    res.status(201).json({}) 
  })
  .get('/callended', (req, res) => {
    console.log("clearing let paidcallinterval")
    clearInterval(paidcallinterval)
  })
  .get('/nodeid', (req,res) => {
    const data = {amount: 10, memo: ""}
    request({
      method: 'POST',
      url: "http://"+impervioushost+":"+imperviousport+"/v1/lightning/generateinvoice",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }, function (error, response, body) {
      if(error) {
        console.log("imp error: ", error)
        return res.send({status: "error", error: error})
      }
      console.log("imp generateinvoice response body: ", body)

      // decode invoice to get node id :)
      try {
        let bodyjson = JSON.parse(body)
        var decoded = lightningPayReq.decode(bodyjson.invoice)
        return res.send({status: "ok", "nodeid": decoded.payeeNodeKey})

      } catch(error) {
        console.log("invoice decode error ", error)
        return res.send({status: "error", error: error})
      }

    })
  })  
  .get('/activecall', (req,res) => {
    let activecall
    if(db.get("activecall").value()) {
      activecall = db.get("activecall").get(0).value()      
      // TODO probably need to delete it from db
      db.get("activecall").get(0).delete(true)
      db.save()
    } 
    // console.log("/activecall got activecall ", activecall)
    if(!activecall) activecall={}
    return res.send(activecall)
  })
  .get('/callhistory', (req,res) => {
    let callhistory = db.get("callhistory").value()
    if(!callhistory) callhistory=[]
    // console.log("/callhistory got callhistory ", callhistory)
    return res.send(callhistory)
  })
  .get('/', (req,res) => {
    let activecall
    let currentts = new Date().getTime()
    if(db.get("activecall").value() && db.get("activecall").get(0).value() && db.get("activecall").get(0).value().timestamp) {
      if(currentts - db.get("activecall").get(0).value().timestamp < (defaultringcount*3000)) {
        // console.log("checking timestamp ",currentts, db.get("activecall").get(0).value().timestamp)
        // 1628477936649
        activecall = db.get("activecall").get(0).value()          
      } else {
        // delete these outdated activecalls please!
        console.log("removing old activecall")
        db.get("activecall").get(0).delete(true)
        db.save()
      }
    } 
    console.log("/redphone got activecall ", activecall)
    if(activecall && activecall.data) {
      console.log("adding activecall cookie", activecall)
      res.cookie('data', JSON.stringify(activecall))
      db.get("activecall").get(0).delete(true)
      db.save()
    }
    res.sendFile(__dirname + '/public/redphone.html')
    // res.render('public/index.html');
    // return res.send("someone is calling you: "+ JSON.stringify(activecall))
  })
  .post('/callnode', (req,res) => {
    let data = req.body;
    if(!data.pubkey || !data.msg) {
      return res.send({status:"error", error:"missing required data"})
    }
    // console.log("1callnode received ", data)
    // console.log("callnode received - sending this to imp ", JSON.stringify(data), JSON.stringify(data).length)
    // console.log("3callnode received ", encodeURI(JSON.stringify(data)))

    // flip - I thought send message would be enough but looks like I need sockets :( - nope nevermind
    let fulldata = JSON.stringify(data.msg)+"rppacketend"
    if(fulldata.length > 890) {
      let pieces = Math.floor(fulldata.length / 890)+1
      // let packets = []
      for (var i = 0; i < pieces; i++) {
        // let packet = {id:i, content:fulldata.substring(i*890,(i+1)*890)}
        // "rppacketid"+i+
        let packet = "rppacketcontent"+fulldata.substring(i*890,(i+1)*890)
        let packettosend = {msg:packet,pubkey:data.pubkey}
        // packets.push(packet)

        setTimeout(function(){
          // console.log("sending data: ", packettosend)
          request({
            method: 'POST',
            url: "http://"+impervioushost+":"+imperviousport+"/v1/message/send",
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(packettosend)
          }, function (error, response, body) {
            if(error) {
              console.log("imp error: ", error)
              // return res.send({status: "error", error: error})
            }
          })
        }, i*1000)


      }
      // console.log("prepped packets: ", packets)
      // console.log("imp response body: ", body)
      return res.send({status: "ok", "impres": "sending packets"})
    } else {

      request({
        method: 'POST',
        url: "http://"+impervioushost+":"+imperviousport+"/v1/message/send",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }, function (error, response, body) {
        if(error) {
          console.log("imp error: ", error)
          return res.send({status: "error", error: error})
        }

        console.log("imp response body: ", body)
        return res.send({status: "ok", "impres": body})
      })

    }

  })
  .listen(redphoneport, () => {
    console.log(`redphone listening on `+redphoneport)
  })


const ws = new WebSocket('ws://'+impervioushost+':'+imperviousport+'/v1/subscribe')

ws.on('open', function open() {
  console.log(`connected to impervious websocket on `+ imperviousport)
  ws.send('something');
})

let rppacket = ""
ws.on('message', function incoming(message) {
  // console.log('received: %s', message)

  let messagejson = JSON.parse(message)
  // let messagejson = message
  // console.log("message.result: ", messagejson.result)

  // console.log("message.result: ", messagejson.result)
  let fromPubkey = messagejson.result.fromPubkey

  // if(messagejson.result.serviceType == 'socket') {
  //   // data: '{"recordId":"SOCKET", "protocol":"udp", "ip":"127.0.0.1", "port1":":6000", "port2":":9000"}',
  //   // serviceType: 'socket',
  //   console.log("got socket msg")
  // }

  if(messagejson.result.serviceType == 'message') {
  // {"result":{"id":"5fedffdc-c883-4aaf-95bc-358d7a79b7db","replyToId":"","fromPubkey":"027b23318b7fc4b1c9f6b01ab6ab47c5be82e965926a054a298829789097b02019","data":"{\"type\":\"offer\",\"sdp\":\"v=0\\r\\no=- 6576382205388332933 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS\\r\\nm=application 61712 UDP/DTLS/SCTP webrtc-datachannel\\r\\nc=IN IP4 64.187.160.89\\r\\na=candidate:2023879477 1 udp 2113937151 057ad464-e44e-4bba-beeb-8ea208b91a41.local 61712 typ host generation 0 network-cost 999\\r\\na=candidate:842163049 1 udp 1677729535 64.187.160.89 61712 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999\\r\\na=ice-ufrag:b/vD\\r\\na=ice-pwd:puqNVf67ZIVBBP6yJngJRZM6\\r\\na=fingerprint:sha-256 45:08:4E:17:6C:95:10:72:CA:BD:F0:0A:B8:81:6F:62:8E:9C:A5:A6:7B:51:EB:19:F4:2C:77:2C:A1:EA:24:D1\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=sctp-port:5000\\r\\na=max-message-size:262144\\r\\n\"}","serviceType":"message","amount":"1"}}
  // imp response body:  {"id":"5fedffdc-c883-4aaf-95bc-358d7a79b7db"}

    // webrtc signalling over messaging API - worked fine but limited to ~900 bytes - too small for audio
    if(messagejson.result.data.includes("rppacketcontent")) {
      // combine rppackets
      rppacket += messagejson.result.data.split("rppacketcontent")[1] 
      // console.log("its rppacket ", rppacket)
      if(rppacket.includes("rppacketend")) {
        rppacket = rppacket.split("rppacketend")[0]
        // console.log("rppacket combined: ", rppacket)
        savepacket(rppacket, fromPubkey)
        rppacket = ""
      }
    } else if(messagejson.result.data.includes("rppacketkeepalive")) {
      console.log("rppacketkeepalive received")
      let currtime = new Date().getTime()
      db.get("keepalive").set({timestamp:currtime, amount:messagejson.result.amount})
      db.save()
    } else if(messagejson.result.data.includes("rppacketpricecheck")) {
      // peer asking for price
      console.log("rppacketpricecheck received")
      let myaudiocallprice = 0 // free unless set explicitly
      if(db.get("audioprice").value()) {
        myaudiocallprice = db.get("audioprice").value()
      } 
      const data = {"msg": "rppacketpriceresponse"+myaudiocallprice , "pubkey": messagejson.result.fromPubkey}
      console.log("prepped rppacketpriceresponse", data)
      request({
        method: 'POST',
        url: "http://"+impervioushost+":"+imperviousport+"/v1/message/send",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }, function (error, response, body) {
        if(error) {
          console.log("imp error: ", error)
        }
        console.log("rppacketpriceresponse sent to : ", body, messagejson.result.fromPubkey)
      })      

    } else if(messagejson.result.data.includes("rppacketpriceresponse")) {
        let peeraudioprice = messagejson.result.data.split("rppacketpriceresponse")[1]
        console.log("peeraudioprice: ", peeraudioprice)
        let notificationText = "Price: "+peeraudioprice+" sats/min for "+messagejson.result.fromPubkey
        const payload = JSON.stringify({ title: 'Red Phone', body: notificationText, icon: './icon.png'})
        // loop through all subscriptions
        if(db.get("subscriptions").value()) {
          let allsubs = db.get("subscriptions").value()
          // console.log("allsubs ", allsubs, allsubs.length)
          for (var i=0;i<allsubs.length;i++) {
            let subscription = allsubs[i]
            // console.log("got subscription from db pushing to it", subscription)
            webpush.sendNotification(subscription, payload).catch(error => {
              console.error(error.stack)
            })          
          }
        }
    } else  {
      savepacket(messagejson.result.data, fromPubkey)
    }
  }
})

function savepacket(webrtcdata, fromPubkey) {
  try {
    let data = JSON.parse(webrtcdata)
    // console.log("got redphone call with fromPubkey, data ", fromPubkey, data)
    let datajson = JSON.parse(data)

    let activecall = {fromPubkey: fromPubkey, data: datajson, timestamp: new Date().getTime()}
    // console.log("ws.on activecall set: ", activecall)
    let calltype
    let notificationText
    if(activecall.data.type=="answer"){
      notificationText = "*answer* from " + fromPubkey.substring(0,5) + '***'
      calltype="outgoing"
    } else {
      // offer - outgoing call
      calltype="incoming"
      notificationText = '*ring* ' + fromPubkey.substring(0,5) + '*** is calling!'
    }
    db.get("activecall").push(activecall)  
    db.get("callhistory").push({timestamp: new Date().getTime(), fromPubkey: fromPubkey, type:calltype})
    db.save()

    const payload = JSON.stringify({ title: 'Red Phone', body: notificationText, icon: './icon.png'})
    // loop through all subscriptions
    if(db.get("subscriptions").value()) {
      let allsubs = db.get("subscriptions").value()
      // console.log("allsubs ", allsubs, allsubs.length)
      for (var i=0;i<allsubs.length;i++) {
        let subscription = allsubs[i]
        // console.log("got subscription from db pushing to it", subscription)
        webpush.sendNotification(subscription, payload).catch(error => {
          console.error(error.stack)
        })          
      }
    }
     

  } catch (error) {
    console.log("probably some other msg", error)
  }
}

function sendNotifications(notificationText){
  const payload = JSON.stringify({ title: 'Red Phone', body: notificationText, icon: './icon.png'})
  // loop through all subscriptions
  if(db.get("subscriptions").value()) {
    let allsubs = db.get("subscriptions").value()
    // console.log("allsubs ", allsubs, allsubs.length)
    for (var i=0;i<allsubs.length;i++) {
      let subscription = allsubs[i]
      // console.log("got subscription from db pushing to it", subscription)
      webpush.sendNotification(subscription, payload).catch(error => {
        console.error(error.stack)
      })          
    }
  }
}

function sendKeepalive(pubkey,price){
  let packettosend = {msg:"rppacketkeepalive",pubkey:pubkey,amount:price}
  request({
    method: 'POST',
    url: "http://"+impervioushost+":"+imperviousport+"/v1/message/send",
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(packettosend)
  }, function (error, response, body) {
    if(error) {
      console.log("imp error: ", error)
      // return res.send({status: "error", error: error})
    }
    console.log("keepalive sent ", packettosend)
  })
}

