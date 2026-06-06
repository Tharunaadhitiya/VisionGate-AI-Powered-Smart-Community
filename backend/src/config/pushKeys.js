const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const KEYS_PATH = path.join(__dirname, '..', '..', 'vapid_keys.json');

let keys;

if (fs.existsSync(KEYS_PATH)) {
  keys = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'));
} else {
  keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
  console.log('Generated new VAPID keys');
}

webpush.setVapidDetails(
  'mailto:admin@visiongate.com',
  keys.publicKey,
  keys.privateKey
);

module.exports = { publicKey: keys.publicKey, privateKey: keys.privateKey };
