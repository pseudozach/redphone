const express = require('express')
const request = require('request')
var bodyParser = require('body-parser')
const WebSocket = require('ws')
const webpush = require('web-push');

webpush.setVapidDetails('mailto:redphone@pseudozach.com', "BA-QZs7Kv0e-C3F9gZP-que9oPj2nRB1zc9Cb06EZF0vzyHcoXrlmiRZ_HVrnJERnivIVg3A-JufV9HrcVoopk8", "")

const redphoneport = process.argv.slice(2)[0] || 8888;
const imperviousport = process.argv.slice(3)[0] || 8881;

let activecall = {}
let subscription

var app = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static('public'))
  .post('/subscribe', (req, res) => {
    const sc = req.body;
    subscription = sc
    res.status(201).json({});
    

    // console.log("subscription: ", subscription);
    // const payload = JSON.stringify({ title: 'test', body: 'push body', icon: 'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'});
    // webpush.sendNotification(subscription, payload).catch(error => {
    //   console.error(error.stack);
    // });
  })
  .get('/activecall', (req,res) => {
    return res.send(activecall)
  })
  .get('/redphone', (req,res) => {
    if(activecall.data) {
      console.log("adding activecall ", activecall)
      res.cookie('data', JSON.stringify(activecall))
    }
    res.sendFile(__dirname + '/public/index.html')
    // res.render('public/index.html');
    // return res.send("someone is calling you: "+ JSON.stringify(activecall))
  })
  .post('/callnode', (req,res) => {
    let data = req.body;
    // console.log("1callnode received ", data)
    console.log("2callnode received - sending this to imp ", JSON.stringify(data), JSON.stringify(data).length)
    // console.log("3callnode received ", encodeURI(JSON.stringify(data)))
    request({
      method: 'POST',
      url: "http://localhost:"+imperviousport+"/v1/message/send",
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
    });
  })
  .listen(redphoneport, () => {
    console.log(`redphone listening on `+redphoneport)
  });


const ws = new WebSocket('ws://localhost:'+imperviousport+'/v1/subscribe')

ws.on('open', function open() {
  console.log(`connected to impervious websocket on `+ imperviousport)
  ws.send('something');
});

ws.on('message', function incoming(message) {
  console.log('received: %s', message)
  let messagejson = JSON.parse(message)
  // {"result":{"id":"5fedffdc-c883-4aaf-95bc-358d7a79b7db","replyToId":"","fromPubkey":"027b23318b7fc4b1c9f6b01ab6ab47c5be82e965926a054a298829789097b02019","data":"{\"type\":\"offer\",\"sdp\":\"v=0\\r\\no=- 6576382205388332933 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS\\r\\nm=application 61712 UDP/DTLS/SCTP webrtc-datachannel\\r\\nc=IN IP4 64.187.160.89\\r\\na=candidate:2023879477 1 udp 2113937151 057ad464-e44e-4bba-beeb-8ea208b91a41.local 61712 typ host generation 0 network-cost 999\\r\\na=candidate:842163049 1 udp 1677729535 64.187.160.89 61712 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999\\r\\na=ice-ufrag:b/vD\\r\\na=ice-pwd:puqNVf67ZIVBBP6yJngJRZM6\\r\\na=fingerprint:sha-256 45:08:4E:17:6C:95:10:72:CA:BD:F0:0A:B8:81:6F:62:8E:9C:A5:A6:7B:51:EB:19:F4:2C:77:2C:A1:EA:24:D1\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=sctp-port:5000\\r\\na=max-message-size:262144\\r\\n\"}","serviceType":"message","amount":"1"}}
// imp response body:  {"id":"5fedffdc-c883-4aaf-95bc-358d7a79b7db"}
  console.log("message.result: ", messagejson.result)
  let fromPubkey = messagejson.result.fromPubkey
  let data = JSON.parse(messagejson.result.data)
  console.log("got redphone call with fromPubkey, data ", fromPubkey, data)
  activecall = {fromPubkey: fromPubkey, data: data}
  console.log("activecall set: ", activecall)

  const payload = JSON.stringify({ title: 'Red Phone', body: '*ring* ' + fromPubkey + ' is calling!', icon: 'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'});
  webpush.sendNotification(subscription, payload).catch(error => {
    console.error(error.stack);
  });

  // request({
  //   method: 'POST',
  //   url: "http://localhost:"+imperviousport+"/v1/message/send",
  //   headers: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify(data)
  // }, function (error, response, body) {
  //   if(error) {
  //     console.log("imp error: ", error)
  //     return res.send({status: "error", error: error})
  //   }

  //   console.log("imp response body: ", body)
  //   return res.send({status: "ok", "impres": body})
  // });

});
