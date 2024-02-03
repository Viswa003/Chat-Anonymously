const socket = io();

const notificationElement = document.getElementById('notification');
const chatContainer = document.getElementById('chat-container');
const onlineCountElement = document.getElementById('online-count');

socket.on('connect', () => {
  // console.log(`Socket ${socket.id} connected`);
  socket.emit('pairRequest'); // Emit a pair request event when the socket is connected
});

socket.on('disconnect', () => {
  // console.log(`Socket ${socket.id} disconnected`);
  displayMessage(`You are disconennected!`);

});

let chatId = null;

socket.on('pairSuccess', (data) => {
  // console.log(`Paired with ${data.partnerID} in chat ${data.roomID}`);
  chatId = data.roomID;
  displayNotification(`You are now connected with a random stranger!`);

  while (chatContainer.firstChild) {
    chatContainer.removeChild(chatContainer.firstChild);
  }
});

socket.on('pairDisconnected', () => {
  // console.log('Your partner has disconnected');
  chatId = null;
  displayMessage('Your partner has disconnected');
});

socket.on('message', (data) => {
  const formattedMessage = (data.sender === socket.id) ? 'You:' : 'Stranger:';
  const textColor =  (data.sender === socket.id) ? '#006400' : '#8B2323';
  // console.log('Received Message:', formattedMessage, data.message);
  

  // Determine the alignment and color based on the sender
  const messageAlignment = (data.sender === socket.id) ? 'right' : 'left';
  const messageColor = (data.sender === socket.id) ? 'lightgreen' : 'lightblue';

  // Create a new div for the message
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${messageAlignment}`;
  messageDiv.style.backgroundColor = messageColor;

  // Create a div for the username
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'username';
  usernameDiv.innerText = formattedMessage;
  usernameDiv.style.color = textColor; // Set the text color

  // Create a div for the message text
  const messageTextDiv = document.createElement('div');
  messageTextDiv.className = 'message-text';
  messageTextDiv.innerText = data.message;

  // Append the username and message text to the message div
  messageDiv.appendChild(usernameDiv);
  messageDiv.appendChild(messageTextDiv);

  // Append the message div to the chat container
  const chatContainer = document.getElementById('chat-container');
  chatContainer.appendChild(messageDiv);
});




const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (message !== '' && socket.connected) {
    // console.log('Emitting sendMessage event');
    socket.emit('sendMessage', { message, chatId }, (acknowledgment) => {
      // if (acknowledgment && acknowledgment.error) {
      //   console.error(`Error during sendMessage: ${acknowledgment.error}`);
      // }
    });
    // console.log(message+" "+" "+chatId);
    messageInput.value = '';
  }
});

socket.on('updateCount', (count) => {
  onlineCountElement.innerText = `${count} Online`;
});

function displayMessage(messages) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.innerHTML = messages;
  chatContainer.appendChild(messageElement);
  // console.log(messages);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function displayNotification(message) {
  notificationElement.innerText = message;
}

socket.on('connect_error', (error) => {
  // console.error(error);
  displayNotification('Could not connect to the server.');
});

socket.on('disconnect', () => {
  displayNotification('You have been disconnected from the server.');
});

socket.on('reconnect_error', (error) => {
  // console.error(error);
  displayNotification('Could not reconnect to the server.');
});

socket.on('reconnect_failed', () => {
  displayNotification('Failed to reconnect to the server.');
});

document.getElementById('reconnect-button').addEventListener('click', () => {
  // Emit a 'leave' event to the server to leave the current chat
socket.emit('leave');
  
  // Clear out the chat container and reset the form
  while (chatContainer.firstChild) {
    chatContainer.removeChild(chatContainer.firstChild);
  }
  // Emit a 'pairRequest' event to the server to request a new pair
  socket.emit('pairRequest');
});


// Listen for 'input' event on message input field
let typingTimeout;

messageInput.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  socket.emit('typing');
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping');
  }, 1000);
});


// Listen for 'typing' event from server
socket.on('typing', () => {
  // Display "User is typing..." message
  displayNotification('typing...');
});

socket.on('partnerStopTyping', () => {
  // Hide "User is typing..." message
  displayNotification('');
});
