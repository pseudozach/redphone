console.log('Loaded service worker!');

self.addEventListener('push', ev => {
  const data = ev.data.json();
  console.log('Got push', data);
  // console.log('Got ev', ev, ev.clientId);
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon
  });
	
	const channel = new BroadcastChannel('sw-messages');
	channel.postMessage({title: 'redphone'});

  // ev.waitUntil(async function() {
  // 	if (!ev.clientId) return;
  //   // Get the client.
  //   const client = await clients.get(ev.clientId);
  //   console.log("got client")
  //   // Exit early if we don't get the client.
  //   // Eg, if it closed.
  //   if (!client) return;

  //   // Send a message to the client.
  //   client.postMessage({
  //     msg: "Hey I just got a fetch from you!",
  //     url: ev.request.url
  //   });
  //  }());
});

// self.clients.matchAll().then(clients => {
// 	console.log("clients: ", clients)
//   	clients.forEach(client => client.postMessage({msg: 'Hello from SW'}));
// })