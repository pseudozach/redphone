# Red ☎️

## Telephone service for your lightning node powered by impervious.ai

### Setup
* prerequisites: Bitcoin + Lightning Node
* download, configure and start impervious, follow [instructions here](https://docs.impervious.ai/#downloading-the-impervious-daemon)
* download and install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation#linux) for your environment 
* clone the repo  
```git clone https://github.com/pseudozach/redphone && cd redphone && npm i```
* start the app  
`npm run start -- 8888 8882` (where 8888 is redphone webserver port, 8882 is impervious http/websocket port)
* expose the app to public internet (optional if you want to access redphone from internet)  
`cloudflared tunnel --url http://localhost:8888` (where 8888 is redphone webserver port)
> 2021-08-05T06:09:08Z INF +------------------------------------------------------------+  
> 2021-08-05T06:09:08Z INF |  Your free tunnel has started! Visit it:                   |  
> 2021-08-05T06:09:08Z INF |    https://fits-protest-featuring-mpegs.trycloudflare.com  |  
> 2021-08-05T06:09:08Z INF +------------------------------------------------------------+
* go to the provided link to see your LN Phone

### Use
* Dial any Lightning node that has redphone by entering their Node ID into the box.
* Receive notifications when another node is calling you, answer the call.
* See call history
* (Optional) Charge for calls (sats/minute)

<p align="center">
  <img width="460" height="300" src="https://raw.githubusercontent.com/pseudozach/redphone/main/demo.gif">
</p>

### How does it work?
* This app allows you to set up a WebRTC connection between two peers on the internet. 
* Normally peers would visit the same website and talk to the server over websockets to setup their p2p webrtc connection, or use STUN/TURN servers. 
* Red Phone allows you to setup webrtc connection with anyone by doing the signaling over impervious which runs on top of Lightning Network.
* And since you run your own bitcoin+lightning+impervious+redphone on your own node/server, no other centralized entity knows about your p2p webrtc connection with your peer.
* If peer has price greater than 0, payment will be sent every 60 seconds, similarly for incoming calls will be checked for last 60 seconds and disconnected if not received. First 60 seconds are free.

<p align="center">
  <img width="460" height="300" src="https://raw.githubusercontent.com/pseudozach/redphone/main/notes.png">
</p>

#### Built for Impervious.AI Hackathon - https://www.impervious.ai/hack4freedom
* demo video: https://www.youtube.com/watch?v=lDii_9ZaiYg
