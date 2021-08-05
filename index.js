const express = require('express')
const request = require('request')
var bodyParser = require('body-parser')

var app = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static('public'))
  .post('/callnode', (req,res) => {
    let data = req.body;
    console.log("callnode received ", data)
    request({
      method: 'POST',
      url: "http://localhost:8882/v1/message/send",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }, function (error, response, body) {
      if(error) {
        console.log("imp error: ", error);
        return res.send({status: "error", error: error});
      }

      console.log("imp response body: ", body);
      res.send({status: "ok", "impres": body});
    });

    
  })
  .listen(8888, () => {
    console.log(`redphone listening on 8888`)
  });

