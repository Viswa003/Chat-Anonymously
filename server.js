const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

const waitingUsers = {};
const activeChats = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log(`Socket ${socket.id} connected`);

  socket.on('pairRequest', () => {
    waitingUsers[socket.id] = socket;
    tryPairingUsers();
  });

  socket.on('leave', () => {
    console.log(`Socket ${socket.id} left the chat`);
  
    const chatId = Object.keys(activeChats).find(key => activeChats[key].includes(socket.id));
  
    if (chatId) {
      const partnerId = getPartnerId(chatId, socket.id);
      io.to(partnerId).emit('pairDisconnected');
      
      delete activeChats[chatId];
    }
  
    delete waitingUsers[socket.id];
    notifyOnlineUsersCount();
    tryPairingUsers();
  });
  
  
  socket.on('typing', () => {
    const chatId = Object.keys(activeChats).find(key => activeChats[key].includes(socket.id));
    if (chatId && activeChats[chatId]) {
      const partnerId = getPartnerId(chatId, socket.id);
      io.to(partnerId).emit('typing');
    }
  });

  socket.on('stopTyping', () => {
    const chatId = Object.keys(activeChats).find(key => activeChats[key].includes(socket.id));
    if (chatId && activeChats[chatId]) {
      const partnerId = getPartnerId(chatId, socket.id);
      io.to(partnerId).emit('partnerStopTyping');
    }
  });
  

  socket.on('sendMessage', (sentMessage) => {
    console.log(`Socket ${socket.id} sent message: ${sentMessage.message}`);

    const chatId = sentMessage.chatId;

    if (chatId && activeChats[chatId]) {
      const [userId1, userId2] = activeChats[chatId];
      io.to(userId1).emit('message', { sender: socket.id, message: sentMessage.message });
      io.to(userId2).emit('message', { sender: socket.id, message: sentMessage.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);

    const chatId = Object.keys(activeChats).find(key => activeChats[key].includes(socket.id));

    if (chatId) {
      const partnerId = getPartnerId(chatId, socket.id);
      io.to(partnerId).emit('pairDisconnected');
      
      delete activeChats[chatId];
    }

    delete waitingUsers[socket.id];
    notifyOnlineUsersCount();
    tryPairingUsers();
  });

  waitingUsers[socket.id] = socket;
  tryPairingUsers();
});

function tryPairingUsers() {
  const waitingUserIds = Object.keys(waitingUsers);

  if (waitingUserIds.length >= 2) {
    const [userId1, userId2] = getRandomPair(waitingUserIds);
    delete waitingUsers[userId1];
    delete waitingUsers[userId2];

    const chatId = generateChatId(userId1, userId2);
    activeChats[chatId] = [userId1, userId2];

    notifyPairing(userId1, userId2, chatId);
    notifyOnlineUsersCount();
  }
}

function getRandomPair(userIds) {
  const shuffled = userIds.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function notifyPairing(userId1, userId2, chatId) {
  io.to(userId1).emit('pairSuccess', { partnerID: userId2, roomID: chatId });
  io.to(userId2).emit('pairSuccess', { partnerID: userId1, roomID: chatId });
}


function notifyOnlineUsersCount() {
  const onlineUsersCount = io.engine.clientsCount;
  io.emit('updateCount', onlineUsersCount);
  console.log(onlineUsersCount);
}


function generateChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

function getPartnerId(chatId, currentUserId) {
  const filteredUsers = activeChats[chatId].filter(userId => userId !== currentUserId);
  if (filteredUsers.length > 0) {
    return filteredUsers[0];
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
