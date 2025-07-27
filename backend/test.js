const axios = require('axios');

// Replace with your actual webhook URL
const webhookUrl = 'https://hooks.slack.com/services/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';

const message = {
  text: '✅ This is a test notification from your webhook!',
  username: 'NotifierBot',
  icon_emoji: ':robot_face:',
};

axios.post(webhookUrl, message)
  .then(response => {
    console.log('Notification sent successfully!');
  })
  .catch(error => {
    console.error('Error sending notification:', error.response?.data || error.message);
  });
