// Hard-coded, replace with your public key
const publicVapidKey = 'BA-QZs7Kv0e-C3F9gZP-que9oPj2nRB1zc9Cb06EZF0vzyHcoXrlmiRZ_HVrnJERnivIVg3A-JufV9HrcVoopk8';

if ('serviceWorker' in navigator) {
  // console.log('Registering service worker');

  run().catch(error => console.error(error));
}

async function run() {
  // console.log('Registering service worker');
  const registration = await navigator.serviceWorker.
    register('/worker.js', {scope: '/'});
  console.log('Registered service worker ', registration);

  // sometimes this doesnt work because mic request + notification request clashes - user needs to refresh page and accept both!
  // console.log('Registering push');
  const subscription = await registration.pushManager.
    subscribe({
      userVisibleOnly: true,
      // The `urlBase64ToUint8Array()` function is the same as in
      // https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
      // applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      applicationServerKey: "BA-QZs7Kv0e-C3F9gZP-que9oPj2nRB1zc9Cb06EZF0vzyHcoXrlmiRZ_HVrnJERnivIVg3A-JufV9HrcVoopk8"
    });
  // console.log('Registered push');

  // console.log('Sending push');
  await fetch('/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: {
      'content-type': 'application/json'
    }
  });
  console.log('Sent push subscription');
}