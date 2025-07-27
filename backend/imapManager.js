const Imap = require('imap');
const { simpleParser } = require('mailparser');
const EmailClassifier = require('./emailClassifier');
const _ = require('lodash');
const SlackNotifier = require('./slackNotifier');
const ReplyGenerator = require('./replyGenerator');
const axios = require('axios');
class ImapManager {
  constructor(accounts, socket) {
    this.accounts = accounts;
    this.connections = {};
    this.socket = socket;
    this.noopIntervals = {};
    this.classifier = new EmailClassifier();
    this.classificationCache = {};
    this.slackNotifier = new SlackNotifier(process.env.SLACK_WEBHOOK_URL);
    this.replyGenerator = new ReplyGenerator(process.env.OPENAI_API_KEY);
  }

  connectAll() {
    this.accounts.forEach(account => {
      this.connectAccount(account);
    });
  }

  disconnectAll() {
    Object.values(this.connections).forEach(conn => {
      if (conn && conn.state !== 'disconnected') {
        conn.end();
      }
    });

    // Clear all intervals
    Object.values(this.noopIntervals).forEach(intervals => {
      if (Array.isArray(intervals)) {
        intervals.forEach(interval => clearInterval(interval));
      }
    });
  }

  connectAccount(account) {
    const imap = new Imap({
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.connections[account.id] = imap;
    this.noopIntervals[account.id] = [];

    imap.once('ready', () => {
      console.log(`Connected to ${account.user}`);
      this.fetchEmails(account.id);
      this.setupPolling(account.id);
    });

    imap.once('error', (err) => {
      console.error(`Error in ${account.id}:`, err);
      // Try to reconnect after a delay
      setTimeout(() => {
        this.connectAccount(account);
      }, 10000);
    });

    imap.once('end', () => {
      console.log(`Connection to ${account.user} ended`);
    });

    imap.connect();
  }

  fetchEmails(accountId) {
    const imap = this.connections[accountId];
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error(`Error opening inbox for ${accountId}:`, err);
        return;
      }

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Search for all emails from the last 30 days
      const searchCriteria = [
        ['SINCE', thirtyDaysAgo.toISOString().split('T')[0]]
      ];

      imap.search(searchCriteria, (err, results) => {
        if (err) {
          console.error(`Error searching emails for ${accountId}:`, err);
          return;
        }

        if (results.length === 0) {
          console.log(`No emails found for ${accountId} in the last 30 days`);
          this.socket.emit('emails-list', { accountId, emails: [] });
          return;
        }

        // Fetch more comprehensive data for classification
        const fetch = imap.fetch(results, {
          bodies: ['HEADER', 'TEXT'],
          struct: true
        });

        const emails = [];

        fetch.on('message', (msg, seqno) => {
          const email = { 
            uid: null, 
            headers: null, 
            preview: '',
            accountId,
            classification: 'Uncategorized' 
          };
          
          let headerBuffer = '';
          let textBuffer = '';
          
          msg.on('body', (stream, info) => {
            let buffer = '';
            
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            
            stream.once('end', () => {
              if (info.which === 'HEADER') {
                headerBuffer = buffer;
                email.headers = Imap.parseHeader(buffer);
              } else if (info.which === 'TEXT') {
                textBuffer = buffer;
                // Get a larger preview of the text for better classification
                email.preview = buffer.substring(0, 2000);
              }
            });
          });
          
          msg.once('attributes', (attrs) => {
            email.uid = attrs.uid;
          });
          
          msg.once('end', () => {
            // Check cache first
            const cachedClassification = this.getClassificationFromCache(accountId, email.uid);
            
            if (cachedClassification) {
             
              email.classification = cachedClassification;
              const slackWebhookUrl = 'https://hooks.slack.com/services/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';
              const slackMessage = {
                    text: `📬 *Cached Classification Used*`,
                    attachments: [
                    {
                        color: "#36a64f",
                        fields: [
                        { title: "Email UID", value: email.uid, short: true },
                        { title: "Classification", value: cachedClassification, short: true }
                        ],
                        ts: Math.floor(Date.now() / 1000)
                    }
                    ]
                };
                if(cachedClassification=="Interested") {
                  axios.post(slackWebhookUrl, slackMessage)
                    .then(() => {
                    console.log('Slack notification sent.');
                    })
                    .catch(error => {
                    console.error('Failed to send Slack notification:', error.response?.data || error.message);
                    });
                }

              console.log(`Using cached classification for ${email.uid}: ${cachedClassification}`);
            } 
            else if (email.headers && email.preview) {
              const subject = email.headers.subject ? email.headers.subject[0] : '';
              
              // Create a comprehensive email object for classification
              const minimalEmail = {
                subject: subject,
                text: email.preview,
                html: ''
              };
                            
              // Classify and store result
              if (this.classifier) {
                email.classification = this.classifier.classify(minimalEmail);
                // Cache the classification
                this.cacheClassification(accountId, email.uid, email.classification);
                console.log(`List classification result: ${email.classification}`);
                if (email.classification === 'Interested') {                  
                    const cachedClassification = this.getClassificationFromCache(accountId, email.uid);
                  if (!cachedClassification) {
                    console.log(`Sending Slack notification for new Interested email: ${subject}`);
                    this.slackNotifier.sendNotification({
                      subject: subject,
                      from: email.headers.from ? email.headers.from[0] : 'Unknown sender',
                      date: email.headers.date ? email.headers.date[0] : new Date().toISOString(),
                      text: email.preview
                    }, email.classification);
                  }
                }
              }
            }
            
            emails.push(email);
          });
        });
        
        fetch.once('error', (err) => {
          console.error(`Fetch error for ${accountId}:`, err);
        });
        
        fetch.once('end', () => {
          console.log(`Fetched ${emails.length} emails for ${accountId}`);
          // Send emails to client with classifications
          this.socket.emit('emails-list', { accountId, emails });
        });
      });
    });
  }

  // Updated method that uses proper callback style for IMAP
  fetchEmailContent(accountId, uid) {
    const connection = this.connections[accountId];
    
    if (!connection) {
      console.error(`No connection for ${accountId}`);
      this.socket.emit('email-content-error', {
        accountId,
        uid,
        error: 'Connection not available'
      });
      return;
    }

    // Check connection state and reconnect if needed
    if (connection.state !== 'authenticated') {
      console.log(`Connection for ${accountId} is not authenticated, reconnecting...`);
      
      // Close any existing connection
      try {
        connection.end();
      } catch (err) {
        console.error(`Error ending connection for ${accountId}:`, err);
      }
      
      // Find the account configuration
      const account = this.accounts.find(acc => acc.id === accountId);
      if (!account) {
        this.socket.emit('email-content-error', {
          accountId,
          uid,
          error: 'Account configuration not found'
        });
        return;
      }
      
      // Set up a new connection
      const imap = new Imap({
        user: account.user,
        password: account.password,
        host: account.host,
        port: account.port,
        tls: account.tls,
        tlsOptions: { rejectUnauthorized: false }
      });
      
      this.connections[accountId] = imap;
      
      imap.once('ready', () => {
        console.log(`Reconnected to ${account.user}`);
        this.fetchEmailContentAfterReconnect(accountId, uid);
      });
      
      imap.once('error', (err) => {
        console.error(`Error reconnecting to ${accountId}:`, err);
        this.socket.emit('email-content-error', {
          accountId,
          uid,
          error: 'Failed to reconnect to email server'
        });
      });
      
      imap.connect();
      return;
    }
    this.fetchEmailContentWithConnection(connection, accountId, uid);
  }
  
  fetchEmailContentAfterReconnect(accountId, uid) {
    const connection = this.connections[accountId];
    
    if (!connection || connection.state !== 'authenticated') {
      this.socket.emit('email-content-error', {
        accountId,
        uid,
        error: 'Could not establish authenticated connection'
      });
      return;
    }
    
    this.fetchEmailContentWithConnection(connection, accountId, uid);
  }
  
  fetchEmailContentWithConnection(connection, accountId, uid) {
    connection.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error(`Error opening inbox for ${accountId}:`, err);
        this.socket.emit('email-content-error', {
          accountId,
          uid,
          error: 'Could not open inbox'
        });
        return;
      }
      
      connection.search([['UID', uid]], (err, results) => {
        if (err) {
          console.error(`Error searching for email ${uid} in ${accountId}:`, err);
          this.socket.emit('email-content-error', {
            accountId,
            uid,
            error: 'Email search failed'
          });
          return;
        }
        
        if (!results || results.length === 0) {
          console.error(`Email with UID ${uid} not found for ${accountId}`);
          this.socket.emit('email-content-error', {
            accountId,
            uid,
            error: 'Email not found'
          });
          return;
        }
        
        const fetch = connection.fetch(results, { bodies: [''] });
        
        let emailContent = null;
        
        fetch.on('message', (msg) => {
          msg.on('body', (stream, info) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error(`Error parsing email for ${accountId}:`, err);
                this.socket.emit('email-content-error', {
                  accountId,
                  uid,
                  error: 'Email parsing failed'
                });
                return;
              }
              
              emailContent = parsed;
            
              
              const classification = this.classifier.classify(parsed);
              
              this.socket.emit('email-content', {
                accountId,
                uid,
                content: parsed,
                classification
              });
              
              this.cacheClassification(accountId, uid, classification);
              
              if (classification === 'Interested') {
                const cachedClassification = this.getClassificationFromCache(accountId, uid);
                if (!cachedClassification || cachedClassification !== 'Interested') {
                  console.log(`Sending Slack notification for Interested email (full content): ${parsed.subject}`);
                  this.slackNotifier.sendNotification(parsed, classification);
                }
              }
            });
          });
        });
        
        fetch.once('error', (err) => {
          console.error(`Error fetching email content for ${accountId}:`, err);
          this.socket.emit('email-content-error', {
            accountId,
            uid,
            error: 'Failed to fetch email content'
          });
        });
      });
    });
  }

  setupPolling(accountId) {
    console.log(`Setting up polling for ${accountId}`);
    
    const pollInterval = setInterval(() => {
      const imap = this.connections[accountId];
      if (imap && imap.state === 'authenticated') {
        this.fetchEmails(accountId);
      }
    }, 30000);
    
    this.noopIntervals[accountId].push(pollInterval);
  }


  reconnectAccount(accountId) {
    console.log(`Manually reconnecting ${accountId}...`);

    if (this.noopIntervals[accountId]) {
      this.noopIntervals[accountId].forEach(interval => clearInterval(interval));
      this.noopIntervals[accountId] = [];
    }

    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) {
      console.error(`Account configuration not found for ${accountId}`);
      return false;
    }
    
    try {
      if (this.connections[accountId]) {
        this.connections[accountId].end();
      }
    } catch (err) {
      console.error(`Error ending connection for ${accountId}:`, err);
    }
    
    delete this.connections[accountId];
    
    this.connectAccount(account);
    return true;
  }

  getEmailKey(accountId, uid) {
    return `${accountId}-${uid}`;
  }

  cacheClassification(accountId, uid, classification) {
    const key = this.getEmailKey(accountId, uid);
    this.classificationCache[key] = classification;
    return classification;
  }

  getClassificationFromCache(accountId, uid) {
    const key = this.getEmailKey(accountId, uid);
    return this.classificationCache[key] || null;
  }

  async generateEmailReply(accountId, uid) {
    try {
      const connection = this.connections[accountId];
      if (!connection) {
        throw new Error('Connection not available');
      }

      if (connection.state !== 'authenticated') {
        throw new Error('Connection not authenticated');
      }

      return new Promise((resolve, reject) => {
        connection.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(new Error(`Error opening inbox: ${err.message}`));
            return;
          }

          connection.search([['UID', uid]], (err, results) => {
            if (err) {
              reject(new Error(`Error searching for email: ${err.message}`));
              return;
            }

            if (!results || results.length === 0) {
              reject(new Error('Email not found'));
              return;
            }

            const fetch = connection.fetch(results, { bodies: [''] });

            fetch.on('message', (msg) => {
              msg.on('body', (stream, info) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    reject(new Error(`Error parsing email: ${err.message}`));
                    return;
                  }

                  try {
                    const classification = this.classifier.classify(parsed);
                    const replyResult = await this.replyGenerator.generateReply(parsed, classification);
                    
                    resolve({
                      success: true,
                      email: {
                        subject: parsed.subject,
                        from: parsed.from ? parsed.from.text : 'Unknown',
                        date: parsed.date
                      },
                      classification: classification,
                      reply: replyResult
                    });
                  } catch (replyError) {
                    reject(new Error(`Error generating reply: ${replyError.message}`));
                  }
                });
              });
            });

            fetch.once('error', (err) => {
              reject(new Error(`Error fetching email: ${err.message}`));
            });
          });
        });
      });

    } catch (error) {
      console.error(`Error generating reply for ${accountId}:${uid}:`, error.message);
      throw error;
    }
  }
}

module.exports = ImapManager;