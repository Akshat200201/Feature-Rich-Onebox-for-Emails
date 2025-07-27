const axios = require('axios');

class SlackNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.enabled = !!webhookUrl;
    
    if (this.enabled) {
      console.log('Slack notifications enabled with webhook URL:', this.webhookUrl);
    } else {
      console.log('Slack notifications disabled - webhook URL not provided');
    }
  }
  
  /**
   * Send a notification to Slack
   * @param {Object} email - The email object that triggered the notification
   * @param {String} classification - The classification of the email
   * @returns {Promise} - A promise that resolves when the notification is sent
   */
  async sendNotification(email, classification) {
    if (!this.enabled) {
      console.log('Slack notification skipped - service disabled');
      return false;
    }
    
    console.log('Attempting to send Slack notification for:', email.subject);
    
    try {
      // Extract email details
      const subject = email.subject || '(No subject)';
      const from = email.from ? (typeof email.from === 'string' ? email.from : email.from.text) : 'Unknown sender';
      const date = email.date ? new Date(email.date).toLocaleString() : new Date().toLocaleString();
      const text = email.text || '';
      const preview = text.substring(0, 150) + (text.length > 150 ? '...' : '');
      
      // Create a message with a formatted payload for Slack
      const message = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `New Interested Email: ${subject}`,
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*From:*\n${from}`
              },
              {
                type: "mrkdwn",
                text: `*Date:*\n${date}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Preview:*\n${preview}`
            }
          },
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Classified as: *${classification}*`
              }
            ]
          }
        ]
      };
      
      console.log('Sending notification to Slack webhook...');
      
      // Send the notification to Slack
      const response = await axios.post(this.webhookUrl, message);
      
      if (response.status === 200) {
        console.log(`✅ Slack notification sent successfully for email: ${subject}`);
        return true;
      } else {
        console.error(`Failed to send Slack notification: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return false;
    }
  }
  
  // Test method to verify Slack integration is working
  async testConnection() {
    if (!this.enabled) {
      console.log('Test skipped - Slack notifications disabled');
      return false;
    }
    
    try {
      const testMessage = {
        text: "🧪 Test notification from Email Classifier app. If you see this, Slack integration is working!"
      };
      
      const response = await axios.post(this.webhookUrl, testMessage);
      
      if (response.status === 200) {
        console.log('✅ Slack test notification sent successfully!');
        return true;
      } else {
        console.error(`❌ Slack test failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending Slack test notification:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return false;
    }
  }
}

module.exports = SlackNotifier;