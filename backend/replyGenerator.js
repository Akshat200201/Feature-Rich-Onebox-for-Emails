const OpenAI = require('openai');

class ReplyGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.enabled = !!apiKey;
    
    if (this.enabled) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
      console.log('OpenAI reply generation enabled');
    } else {
      console.log('OpenAI reply generation disabled - API key not provided');
    }
  }

  async generateReply(email, classification) {
    if (!this.enabled) {
      return this.generateFallbackReply(email, classification);
    }

    try {
      const prompt = this.createPrompt(email, classification);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional email assistant. Generate appropriate, concise, and professional email replies based on the content and classification provided. Keep responses under 200 words and maintain a business-appropriate tone."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const reply = completion.choices[0].message.content.trim();
      console.log('Generated AI reply for email:', email.subject);
      
      return {
        success: true,
        reply: reply,
        source: 'OpenAI GPT'
      };

    } catch (error) {
      console.error('Error generating AI reply:', error.message);
      
      if (error.code === 'insufficient_quota' || error.code === 'invalid_api_key') {
        console.log('API key issue detected, falling back to template replies');
      }
      
      return this.generateFallbackReply(email, classification);
    }
  }

  createPrompt(email, classification) {
    const subject = email.subject || 'No subject';
    const from = email.from ? (typeof email.from === 'string' ? email.from : email.from.text) : 'Unknown sender';
    const text = email.text || '';
    const preview = text.substring(0, 500);

    return `
Please generate a professional email reply for the following email:

Classification: ${classification}
From: ${from}
Subject: ${subject}
Content Preview: ${preview}

Based on the classification "${classification}", please generate an appropriate reply that:
1. Acknowledges the email professionally
2. Responds appropriately to the classification type
3. Is concise and business-appropriate
4. Includes a professional closing

Do not include email headers (To:, From:, Subject:) in your response, just the email body content.
`;
  }

  generateFallbackReply(email, classification) {
    console.log('Using fallback reply generation for:', email.subject);
    
    const from = email.from ? (typeof email.from === 'string' ? email.from : email.from.text) : 'Unknown sender';
    const senderName = this.extractFirstName(from);
    
    const templates = {
      'Interested': `Thank you for your interest, ${senderName}.

I appreciate you reaching out regarding our services. I'd be happy to provide you with more detailed information about how we can help meet your needs.

Would you be available for a brief call this week to discuss your requirements in more detail? I can walk you through our solutions and answer any questions you might have.

Please let me know what times work best for you, and I'll send over a calendar invitation.

Best regards,
[Your Name]`,

      'Meeting Booked': `Thank you for confirming our meeting, ${senderName}.

I have this appointment noted in my calendar and look forward to our discussion. I'll make sure to prepare relevant materials and come ready to address your specific needs.

If you need to make any changes to the meeting details or have any questions beforehand, please don't hesitate to reach out.

See you soon!

Best regards,
[Your Name]`,

      'Not Interested': `Thank you for taking the time to respond, ${senderName}.

I completely understand that our solution may not be the right fit at this time. I appreciate your honesty in letting me know.

If circumstances change in the future or if you'd like me to check back in a few months, please feel free to reach out. I'll make sure to remove you from our immediate outreach list.

Wishing you all the best with your current initiatives.

Best regards,
[Your Name]`,

      'Out of Office': `Thank you for the update, ${senderName}.

I hope you have a wonderful time away from the office. I'll make sure to follow up with you after your return date.

Enjoy your time off!

Best regards,
[Your Name]`,

      'Spam': `This appears to be an unsolicited message and will not receive a response.

If this is a legitimate business inquiry, please resend your message with clear identification of your company and the purpose of your communication.`,

      'Uncategorized': `Thank you for your email, ${senderName}.

I've received your message and will review it carefully. I'll get back to you within 1-2 business days with a detailed response.

If this is urgent, please feel free to call me directly.

Best regards,
[Your Name]`
    };

    const reply = templates[classification] || templates['Uncategorized'];
    
    return {
      success: true,
      reply: reply,
      source: 'Template (Fallback)'
    };
  }

  extractFirstName(fromEmail) {
    if (!fromEmail) return 'there';
    
    const nameMatch = fromEmail.match(/^([^<]+)</);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      const firstName = fullName.split(' ')[0];
      return firstName || 'there';
    }
    
    const emailMatch = fromEmail.match(/^([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1);
    }
    
    return 'there';
  }

  async testConnection() {
    if (!this.enabled) {
      console.log('OpenAI test skipped - service disabled');
      return { success: false, message: 'API key not provided' };
    }

    try {
      const testCompletion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Reply with just 'Test successful' if you can read this."
          }
        ],
        max_tokens: 10
      });

      console.log('OpenAI connection test successful');
      return { 
        success: true, 
        message: 'OpenAI API connection successful',
        response: testCompletion.choices[0].message.content
      };

    } catch (error) {
      console.error('OpenAI connection test failed:', error.message);
      return { 
        success: false, 
        message: `API test failed: ${error.message}`,
        error: error.code 
      };
    }
  }
}

module.exports = ReplyGenerator;
