require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ImapManager = require('./imapManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Set up IMAP accounts configuration
const imapAccounts = [
  {
    user: process.env.IMAP_ACCOUNT1_USER,
    password: process.env.IMAP_ACCOUNT1_PASSWORD,
    host: process.env.IMAP_ACCOUNT1_HOST,
    port: parseInt(process.env.IMAP_ACCOUNT1_PORT),
    tls: true,
    id: 'account1'
  },
  {
    user: process.env.IMAP_ACCOUNT2_USER,
    password: process.env.IMAP_ACCOUNT2_PASSWORD,
    host: process.env.IMAP_ACCOUNT2_HOST,
    port: parseInt(process.env.IMAP_ACCOUNT2_PORT),
    tls: true,
    id: 'account2'
  }
];

// Initialize IMAP connections when socket connects
io.on('connection', (socket) => {
  console.log('Client connected');
  
  const imapManager = new ImapManager(imapAccounts, socket);
  imapManager.connectAll();
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    imapManager.disconnectAll();
  });
  
  socket.on('fetch-email', ({ accountId, uid }) => {
    imapManager.fetchEmailContent(accountId, uid);
  });

  socket.on('generate-reply', async ({ accountId, uid }) => {
    try {
      console.log(`Generating reply for email ${uid} in account ${accountId}`);
      const replyData = await imapManager.generateEmailReply(accountId, uid);
      
      socket.emit('reply-generated', {
        success: true,
        accountId,
        uid,
        data: replyData
      });
    } catch (error) {
      console.error('Error generating reply:', error.message);
      socket.emit('reply-error', {
        success: false,
        accountId,
        uid,
        error: error.message
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});