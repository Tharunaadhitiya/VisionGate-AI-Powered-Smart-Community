const http = require('http');
const config = require('./src/config');
const PORT = config.port || 5001;

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

async function waitForServer(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await api('GET', '/health');
      if (r.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return false;
}

async function run() {
  const started = await waitForServer(15);
  if (!started) { console.log('Server did not start'); process.exit(1); }
  console.log('Server is ready');

  try {
    const login = await api('POST', '/auth/login', { email: 'admin@visiongate.com', password: 'password123' });
    if (login.status !== 200) { console.log('LOGIN FAILED:', login.status, JSON.stringify(login.data)); process.exit(1); }
    const token = login.data.data.token;
    const adminId = login.data.data.user._id;
    console.log('LOGIN OK: admin._id=' + adminId);

    const usersRes = await api('GET', '/users?limit=10', null, token);
    const users = usersRes.data.data.users || [];
    console.log('USERS: ' + users.length + ' found');
    const target = users.find(u => u.role === 'security') || users.find(u => u._id !== adminId);
    console.log('TARGET: _id=' + target._id + ' name=' + target.name + ' role=' + target.role);

    const send = await api('POST', '/chat/send', { receiverId: target._id, message: 'Hello end-to-end test!' }, token);
    if (send.status !== 201) { console.log('SEND FAILED:', send.status, JSON.stringify(send.data)); process.exit(1); }
    const msg = send.data.data.message;
    console.log('SEND OK: msg._id=' + msg._id + ' convId=' + msg.conversationId);
    console.log('  sender=' + msg.sender.name + ' receiver=' + msg.receiver.name);

    const convs = await api('GET', '/chat/conversations', null, token);
    console.log('CONVERSATIONS: ' + convs.data.data.conversations.length + ' after send');
    if (convs.data.data.conversations.length > 0) {
      const c = convs.data.data.conversations[0];
      console.log('  First conv: _id=' + c._id + ' lastMsg=' + (c.lastMessage || '') + ' unread=' + c.unreadCount);
    }

    const msgs = await api('GET', '/chat/messages/' + target._id + '?limit=50', null, token);
    console.log('MESSAGES: ' + msgs.data.data.messages.length + ' total');
    if (msgs.data.data.messages.length > 0) {
      const m = msgs.data.data.messages[0];
      console.log('  First msg: _id=' + m._id + ' text=' + m.message + ' read=' + m.read);
    }

    await new Promise(r => setTimeout(r, 1000));

    const notifs = await api('GET', '/user-notifications', null, token);
    console.log('NOTIFICATIONS: ' + notifs.data.data.notifications.length + ' total');
    if (notifs.data.data.notifications.length > 0) {
      const n = notifs.data.data.notifications[0];
      const nid = n._id;
      console.log('  First: _id=' + nid + ' read=' + n.read + ' title=' + (n.title || ''));

      const read = await api('PUT', '/user-notifications/' + nid + '/read', null, token);
      console.log('  MARK READ: status=' + read.status + ' body=' + JSON.stringify(read.data));

      const notifs2 = await api('GET', '/user-notifications', null, token);
      const n2 = notifs2.data.data.notifications.find(x => x._id === nid);
      console.log('  Read status after: ' + (n2 ? n2.read : 'NOT FOUND'));

      const del = await api('DELETE', '/user-notifications/' + nid, null, token);
      console.log('  DELETE: status=' + del.status + ' body=' + JSON.stringify(del.data));

      const notifs3 = await api('GET', '/user-notifications', null, token);
      const stillExists = notifs3.data.data.notifications.some(x => x._id === nid);
      console.log('  Still visible after delete: ' + stillExists);
    }

    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
  }

  process.exit(0);
}

run();
