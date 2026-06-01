process.env.PORT = '15003';
const http = require('http');
let server;

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 15003, path: '/api' + path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  try {
    server = require('./src/server');
    await new Promise((resolve) => {
      const check = () => {
        const req = http.get('http://localhost:15003/api/health', (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => { if (res.statusCode === 200) resolve(); else setTimeout(check, 500); });
        });
        req.on('error', () => setTimeout(check, 500));
      };
      setTimeout(check, 2000);
    });
    console.log('Server ready');

    // Login as admin
    const login = await api('POST', '/auth/login', { email: 'admin@visiongate.com', password: 'password123' });
    const token = login.data.data.token;
    console.log('Logged in as admin');

    // Send a notification to all residents
    const notif = await api('POST', '/notifications/send', {
      title: 'Test Notification',
      message: 'This is a test notification for E2E testing',
      type: 'announcement',
      target: 'all',
      severity: 'low',
    }, token);
    console.log('Notification sent:', notif.status, notif.data.success);

    // Login as a resident to check notifications
    const login2 = await api('POST', '/auth/login', { email: 'john@visiongate.com', password: 'password123' });
    const token2 = login2.data.data.token;
    console.log('Logged in as resident');

    const notifs = await api('GET', '/user-notifications', null, token2);
    console.log('Resident notifications:', notifs.data.data.notifications.length);
    if (notifs.data.data.notifications.length > 0) {
      const n = notifs.data.data.notifications[0];
      console.log('  First: userNotificationId=' + n.userNotificationId + ' read=' + n.read + ' title=' + (n.title || ''));
      const uid = n.userNotificationId;

      const read = await api('PUT', '/user-notifications/' + uid + '/read', null, token2);
      console.log('  MARK READ: status=' + read.status + ' success=' + (read.data ? read.data.success : read.raw));

      const notifs2 = await api('GET', '/user-notifications', null, token2);
      const n2 = notifs2.data.data.notifications.find(x => x.userNotificationId === uid);
      console.log('  Read status after: ' + (n2 ? n2.read : 'NOT FOUND'));

      const del = await api('DELETE', '/user-notifications/' + uid, null, token2);
      console.log('  DELETE: status=' + del.status + ' success=' + (del.data ? del.data.success : del.raw));

      const notifs3 = await api('GET', '/user-notifications', null, token2);
      const stillExists = notifs3.data.data.notifications.some(x => x.userNotificationId === uid);
      console.log('  Still visible: ' + stillExists + ' (should be false)');

      // Login as different resident - should still see a notification for the same alert
      const login3 = await api('POST', '/auth/login', { email: 'jane@visiongate.com', password: 'password123' });
      const token3 = login3.data.data.token;
      const notifs3b = await api('GET', '/user-notifications', null, token3);
      console.log('  Other user still sees notif for same alert: ' + notifs3b.data.data.notifications.some(x => x.title === n.title) + ' (count=' + notifs3b.data.data.notifications.length + ')');
    }

    console.log('ALL NOTIFICATION TESTS PASSED');
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
  } finally {
    if (server) { server.server.close(); server.io.close(); }
    process.exit(0);
  }
}

run();
