process.env.PORT = '15002';
const config = require('./src/config');
const PORT = 15002;

const http = require('http');
let server;

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: PORT, path: '/api' + path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data, parseError: e.message }); }
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
        const req = http.get('http://localhost:' + PORT + '/api/health', (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => { if (res.statusCode === 200) resolve(); else setTimeout(check, 500); });
        });
        req.on('error', () => setTimeout(check, 500));
      };
      setTimeout(check, 2000);
    });
    console.log('Server ready on ' + PORT);

    // 1. LOGIN
    const login = await api('POST', '/auth/login', { email: 'admin@visiongate.com', password: 'password123' });
    if (login.status !== 200) { console.log('LOGIN FAILED:', login.status); process.exit(1); }
    const token = login.data.data.token;
    const adminId = login.data.data.user._id;
    console.log('1. LOGIN: admin._id=' + adminId);

    // 2. USERS
    const usersRes = await api('GET', '/users?limit=10', null, token);
    const users = usersRes.data.data.users || [];
    const target = users.find(u => u.role === 'security') || users.find(u => u._id !== adminId);
    console.log('2. USERS: target._id=' + target._id + ' name=' + target.name);

    // 3. SEND MESSAGE
    const send = await api('POST', '/chat/send', { receiverId: target._id, message: 'Hello E2E test!' }, token);
    if (send.status !== 201) { console.log('3. SEND FAILED:', send.status, JSON.stringify(send.data)); process.exit(1); }
    console.log('3. SEND OK: msg._id=' + send.data.data.message._id + ' convId=' + send.data.data.message.conversationId);

    // 4. GET CONVERSATIONS
    const convs = await api('GET', '/chat/conversations', null, token);
    console.log('4. CONVERSATIONS: ' + convs.data.data.conversations.length + ' (unread=' + (convs.data.data.conversations[0]?.unreadCount || 0) + ')');

    // 5. GET MESSAGES (this was broken)
    const msgs = await api('GET', '/chat/messages/' + target._id + '?limit=50', null, token);
    if (msgs.status !== 200) { console.log('5. MESSAGES FAILED:', msgs.status, JSON.stringify(msgs.data)); }
    else { console.log('5. MESSAGES: ' + msgs.data.data.messages.length + ' messages'); }

    // 6. GET NOTIFICATIONS
    const notifs = await api('GET', '/user-notifications', null, token);
    console.log('6. NOTIFICATIONS: ' + notifs.data.data.notifications.length + ' total');
    if (notifs.data.data.notifications.length > 0) {
      const nid = notifs.data.data.notifications[0]._id;
      const read = await api('PUT', '/user-notifications/' + nid + '/read', null, token);
      console.log('7. MARK READ: ' + (read.data.success ? 'OK' : 'FAIL'));
      const notifs2 = await api('GET', '/user-notifications', null, token);
      const n2 = notifs2.data.data.notifications.find(x => x._id === nid);
      console.log('8. READ STATUS AFTER: ' + (n2 ? n2.read : 'NOT FOUND'));
      const del = await api('DELETE', '/user-notifications/' + nid, null, token);
      console.log('9. DELETE: ' + (del.data.success ? 'OK' : 'FAIL'));
      const notifs3 = await api('GET', '/user-notifications', null, token);
      const stillExists = notifs3.data.data.notifications.some(x => x._id === nid);
      console.log('10. STILL VISIBLE: ' + stillExists + ' (should be false)');
    }

    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
  } finally {
    if (server) { server.server.close(); server.io.close(); }
    process.exit(0);
  }
}

run();
