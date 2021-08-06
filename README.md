# Red ☎️

## Telephone service for your lightning node powered by impervious.ai

### Setup
* download, configure and install impervious, follow [instructions here](https://docs.impervious.ai/#downloading-the-impervious-daemon)
* download and install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation#linux) for your environment 
* `git clone https://github.com/pseudozach/redphone`
* `cd redphone && npm i && npm run start -- 8888 8881` (where 8888 is redphone webserver port, 8881 is impervious http/websocket port)
* `cloudflared tunnel --url http://localhost:8888` (where 8888 is redphone webserver port)
> 2021-08-05T06:09:08Z INF +------------------------------------------------------------+  
> 2021-08-05T06:09:08Z INF |  Your free tunnel has started! Visit it:                   |  
> 2021-08-05T06:09:08Z INF |    https://fits-protest-featuring-mpegs.trycloudflare.com  |  
> 2021-08-05T06:09:08Z INF +------------------------------------------------------------+

* go to the provided link to see your LN Phone

### Use
* Dial any Lightning node that has redphone by entering their Node ID into the box.

#### built for Impervious.AI Hackathon - https://www.impervious.ai/hack4freedom by pseudozach

