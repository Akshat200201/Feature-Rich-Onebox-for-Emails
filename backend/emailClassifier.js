class EmailClassifier {
  constructor() {
    this.patterns = {
      interested: [
        'interested', 'tell me more', 'would like to know', 'send more information',
        'sounds good', 'i\'m interested', 'we are interested', 'want to learn more',
        'looking forward', 'would like to discuss', 'when can we', 'next steps',
        'tell me about', 'please share', 'more details', 'consider', 'intrigued by'
      ],
      
      meetingBooked: [
        'meeting confirmed', 'appointment confirmed', 'calendar invite', 'scheduled',
        'meeting booked', 'confirmed for', 'appointment set', 'looking forward to our meeting',
        'meeting details', 'zoom link', 'google meet', 'microsoft teams', 'webex',
        'has been scheduled', 'calendar', 'invitation', 'accepted your invitation',
        'meeting id', 'password', 'agenda', 'conference call', 'call details',
        'meeting date', 'meeting time', 'scheduled for', 'appointment for',
        'join meeting', 'video conference', 'conference', 'session', 'appointment',
        'meeting has been', 'your meeting', 'meeting on', 'date:', 'time:'
      ],
      
      notInterested: [
        'not interested', 'no thanks', 'not at this time', 'pass', 'decline',
        'we\'ll pass', 'don\'t contact', 'remove from list', 'unsubscribe',
        'not a good fit', 'no need', 'don\'t need', 'not looking',
        'no longer interested', 'decided against', 'going with another', 
        'chosen another', 'opted for different', 'pursuing other'
      ],
      
      spam: [
        'viagra', 'lottery', 'won millions', 'nigerian prince', 'bitcoin investment',
        'get rich', 'enlarge', 'pharmacy', 'cheap meds', 'weight loss', 'instant approval',
        'no fee', 'investment opportunity', 'cryptocurrency investment', 'low risk high return',
        'make money fast', 'work from home', 'business proposal', 'urgent business',
        'million dollar', 'free money', 'cash prize', 'congratulations you won',
        'you have won', 'jackpot', 'claim your prize', 'wire transfer', 'overseas',
        'confidential', 'bank details', 'account number'
      ],
      
      outOfOffice: [
        'out of office', 'on vacation', 'on holiday', 'on leave', 'annual leave',
        'away from the office', 'not in office', 'out of town', 'will return on',
        'away until', 'auto-reply', 'automatic reply', 'vacation response',
        'limited access to email', 'will not be checking emails', 'automatic response',
        'vacation notice', 'absence', 'unavailable', 'return to office', 
        'back in office', 'away from my desk', 'temporarily unavailable'
      ]
    };
  }

  classify(email) {
    const subject = email.subject || '';
    const text = email.text || '';
    const html = email.html || '';
    
    const content = (subject + ' ' + text).toLowerCase();
    
    console.log('Classifying email:', {
      subject: subject,
      textLength: text.length,
      contentSample: content.substring(0, 100) + '...',
    });
    
    if (this.matchesPatterns(content, this.patterns.outOfOffice)) {
      console.log('Classified as: Out of Office');
      return 'Out of Office';
    }
    
    if (this.matchesPatterns(content, this.patterns.spam)) {
      console.log('Classified as: Spam');
      return 'Spam';
    }
    
    if (this.matchesPatterns(content, this.patterns.meetingBooked)) {
      console.log('Classified as: Meeting Booked');
      return 'Meeting Booked';
    }
    
    if (this.matchesPatterns(content, this.patterns.notInterested)) {
      console.log('Classified as: Not Interested');
      return 'Not Interested';
    }
    
    if (this.matchesPatterns(content, this.patterns.interested)) {
      console.log('Classified as: Interested');
      return 'Interested';
    }
    
    console.log('Classified as: Uncategorized');
    return 'Uncategorized';
  }
  
  matchesPatterns(content, patterns) {
    const matches = patterns.filter(pattern => content.includes(pattern));
    
    if (matches.length > 0) {
      console.log('Matched patterns:', matches);
    }
    
    return matches.length > 0;
  }
}

module.exports = EmailClassifier;