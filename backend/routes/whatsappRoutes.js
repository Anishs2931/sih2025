const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const db = require('../firebase');
const axios = require('axios');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('❌ Twilio credentials not found!');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
  process.exit(1);
}

const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const WHATSAPP_FROM = 'whatsapp:+14155238886'; // Twilio Sandbox number

// =====================
// UTILITY FUNCTIONS
// =====================

function formatWhatsAppNumber(phoneNumber) {
  let cleanNumber = phoneNumber.toString().replace(/\D/g, ''); // Remove non-digits
  
  // Add country code if missing (assuming India +91)
  if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  
  return `whatsapp:+${cleanNumber}`;
}

async function sendWhatsAppMessage(to, message, mediaUrl = null) {
  try {
    const messageOptions = {
      body: message,
      from: WHATSAPP_FROM,
      to: formatWhatsAppNumber(to)
    };

    if (mediaUrl) {
      messageOptions.mediaUrl = mediaUrl;
    }

    const result = await twilio.messages.create(messageOptions);
    console.log(`✅ WhatsApp message sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// =====================
// USER NOTIFICATIONS
// =====================

// Notify user when issue is reported
router.post('/notify-issue-created', async (req, res) => {
  try {
    const { userEmail, issueId, category, description, technicianName, eta } = req.body;

    // Get user details
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();
    
    if (!userData.phone) {
      return res.status(400).json({ error: 'User phone number not found' });
    }

    const emoji = category === 'civil' ? '🏗️' : category === 'electrical' ? '⚡' : '💧';
    
    const message = `${emoji} **ISSUE REGISTERED SUCCESSFULLY!**\n\n` +
                   `📋 **Issue ID:** ${issueId}\n` +
                   `🔍 **Category:** ${category.toUpperCase()}\n` +
                   `📝 **Description:** ${description}\n\n` +
                   `👨‍🔧 **Technician Assigned:** ${technicianName}\n` +
                   `⏰ **Estimated Arrival:** ${eta}\n\n` +
                   `✅ **Next Steps:**\n` +
                   `• Technician will contact you shortly\n` +
                   `• You'll receive updates here\n` +
                   `• Track progress on our website\n\n` +
                   `🆘 **Urgent?** Reply "URGENT" for priority handling\n` +
                   `❓ **Questions?** Reply "HELP"`;

    const result = await sendWhatsAppMessage(userData.phone, message);
    res.json({ success: result.success, message: 'Issue notification sent' });

  } catch (error) {
    console.error('Error sending issue notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Notify user when technician starts work
router.post('/notify-work-started', async (req, res) => {
  try {
    const { userEmail, issueId, technicianName, technicianPhone } = req.body;

    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();

    const message = `🔧 **WORK STARTED ON YOUR ISSUE**\n\n` +
                   `📋 **Issue ID:** ${issueId}\n` +
                   `👨‍🔧 **Technician:** ${technicianName}\n` +
                   `📞 **Contact:** ${technicianPhone}\n\n` +
                   `✅ **Status:** Work in progress\n` +
                   `📸 **Documentation:** Photos will be shared upon completion\n\n` +
                   `💬 **Need to contact technician?** Call ${technicianPhone}\n` +
                   `📱 **Track live progress** on our website`;

    const result = await sendWhatsAppMessage(userData.phone, message);
    res.json({ success: result.success, message: 'Work start notification sent' });

  } catch (error) {
    console.error('Error sending work start notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Notify user when work is completed
router.post('/notify-work-completed', async (req, res) => {
  try {
    const { userEmail, issueId, technicianName, completionPhotoUrl, workSummary } = req.body;

    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();

    const message = `✅ **WORK COMPLETED SUCCESSFULLY!**\n\n` +
                   `📋 **Issue ID:** ${issueId}\n` +
                   `👨‍🔧 **Technician:** ${technicianName}\n\n` +
                   `📝 **Work Summary:**\n${workSummary}\n\n` +
                   `📸 **Completion Photo:** See attachment\n\n` +
                   `⭐ **Rate Your Experience:**\n` +
                   `Reply with rating 1-5:\n` +
                   `5⭐ Excellent | 4⭐ Good | 3⭐ Average | 2⭐ Poor | 1⭐ Very Poor\n\n` +
                   `🙏 **Thank you for using Fixify.AI!**`;

    const result = await sendWhatsAppMessage(userData.phone, message, completionPhotoUrl);
    res.json({ success: result.success, message: 'Completion notification sent' });

  } catch (error) {
    console.error('Error sending completion notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// =====================
// TECHNICIAN NOTIFICATIONS
// =====================

// Notify technician about new assignment
router.post('/notify-technician-assignment', async (req, res) => {
  try {
    const { technicianEmail, issueId, category, description, userPhone, address, priority } = req.body;

    // Get technician details
    const techSnapshot = await db.collection('technicians').where('email', '==', technicianEmail).get();
    if (techSnapshot.empty) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const techData = techSnapshot.docs[0].data();
    
    if (!techData.phone) {
      return res.status(400).json({ error: 'Technician phone number not found' });
    }

    const emoji = category === 'civil' ? '🏗️' : category === 'electrical' ? '⚡' : '💧';
    const priorityEmoji = priority === 'urgent' ? '🚨' : '📋';
    
    const message = `${priorityEmoji} **NEW WORK ASSIGNMENT**\n\n` +
                   `${emoji} **Issue ID:** ${issueId}\n` +
                   `🔍 **Category:** ${category.toUpperCase()}\n` +
                   `📝 **Description:** ${description}\n\n` +
                   `📍 **Location:** ${address}\n` +
                   `📞 **Customer:** ${userPhone}\n` +
                   `${priority === 'urgent' ? '🚨 **PRIORITY:** URGENT\n' : ''}\n` +
                   `✅ **Action Required:**\n` +
                   `• Contact customer to schedule\n` +
                   `• Update status when starting work\n` +
                   `• Take before/after photos\n` +
                   `• Mark complete when finished\n\n` +
                   `📱 **Use Fixify.AI app to update status**\n` +
                   `💬 **Reply "ACCEPT" to confirm assignment**`;

    const result = await sendWhatsAppMessage(techData.phone, message);
    res.json({ success: result.success, message: 'Technician notification sent' });

  } catch (error) {
    console.error('Error sending technician notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// =====================
// SUPERVISOR NOTIFICATIONS
// =====================

// Notify supervisor about task assignments and updates
router.post('/notify-supervisor-task', async (req, res) => {
  try {
    const { supervisorEmail, taskId, technicianName, issueCount, area, action } = req.body;

    // Get supervisor details
    const supSnapshot = await db.collection('supervisors').where('email', '==', supervisorEmail).get();
    if (supSnapshot.empty) {
      // Try users collection if supervisor not found
      const userSnapshot = await db.collection('users').where('email', '==', supervisorEmail).get();
      if (userSnapshot.empty) {
        return res.status(404).json({ error: 'Supervisor not found' });
      }
    }

    const supervisorData = supSnapshot.empty ? 
      userSnapshot.docs[0].data() : 
      supSnapshot.docs[0].data();
    
    if (!supervisorData.phone) {
      return res.status(400).json({ error: 'Supervisor phone number not found' });
    }

    let message = '';
    switch (action) {
      case 'created':
        message = `👨‍💼 **NEW SUPERVISOR TASK**\n\n` +
                 `📋 **Task ID:** ${taskId}\n` +
                 `👨‍🔧 **Technician:** ${technicianName}\n` +
                 `📍 **Area:** ${area}\n` +
                 `🔢 **Issues Assigned:** ${issueCount}\n\n` +
                 `✅ **Your Role:**\n` +
                 `• Monitor technician progress\n` +
                 `• Ensure quality standards\n` +
                 `• Approve work completion\n\n` +
                 `📱 **Use Supervisor Dashboard to track progress**`;
        break;
      
      case 'started':
        message = `🔧 **TASK WORK STARTED**\n\n` +
                 `📋 **Task ID:** ${taskId}\n` +
                 `👨‍🔧 **Technician:** ${technicianName} has started work\n` +
                 `📍 **Area:** ${area}\n\n` +
                 `✅ **Status:** In Progress\n` +
                 `📊 **Monitor progress** via Supervisor Dashboard`;
        break;
      
      case 'completed':
        message = `✅ **TASK COMPLETED - APPROVAL NEEDED**\n\n` +
                 `📋 **Task ID:** ${taskId}\n` +
                 `👨‍🔧 **Technician:** ${technicianName}\n` +
                 `📍 **Area:** ${area}\n\n` +
                 `🔍 **Action Required:**\n` +
                 `• Review completion photos\n` +
                 `• Verify work quality\n` +
                 `• Approve or request changes\n\n` +
                 `📱 **Approve via Supervisor Dashboard**`;
        break;
      
      default:
        message = `📋 **TASK UPDATE**\n\n` +
                 `Task ID: ${taskId}\n` +
                 `Technician: ${technicianName}\n` +
                 `Area: ${area}\n\n` +
                 `Check Supervisor Dashboard for details.`;
    }

    const result = await sendWhatsAppMessage(supervisorData.phone, message);
    res.json({ success: result.success, message: 'Supervisor notification sent' });

  } catch (error) {
    console.error('Error sending supervisor notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// =====================
// BULK NOTIFICATIONS
// =====================

// Send maintenance reminders to all users in an area
router.post('/notify-maintenance-reminder', async (req, res) => {
  try {
    const { area, maintenanceType, scheduledDate, contactNumber } = req.body;

    // Get all users in the specified area
    const usersSnapshot = await db.collection('users')
      .where('area', '==', area)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'No users found in specified area' });
    }

    const message = `🔧 **SCHEDULED MAINTENANCE NOTICE**\n\n` +
                   `📍 **Area:** ${area}\n` +
                   `🛠️ **Type:** ${maintenanceType}\n` +
                   `📅 **Date:** ${scheduledDate}\n\n` +
                   `⚠️ **Important:**\n` +
                   `• Brief service interruption expected\n` +
                   `• Keep contact info updated\n` +
                   `• Report any issues immediately\n\n` +
                   `📞 **Contact:** ${contactNumber}\n` +
                   `💬 **Questions?** Reply to this message`;

    const results = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      if (userData.phone) {
        const result = await sendWhatsAppMessage(userData.phone, message);
        results.push({ 
          user: userData.email, 
          success: result.success,
          error: result.error || null 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({ 
      success: true, 
      message: `Notifications sent: ${successCount} successful, ${failCount} failed`,
      details: results 
    });

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// =====================
// STATUS AND UPDATES
// =====================

// Get WhatsApp message delivery status
router.get('/message-status/:messageSid', async (req, res) => {
  try {
    const { messageSid } = req.params;
    
    const message = await twilio.messages(messageSid).fetch();
    
    res.json({
      sid: message.sid,
      status: message.status,
      direction: message.direction,
      from: message.from,
      to: message.to,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    });

  } catch (error) {
    console.error('Error fetching message status:', error);
    res.status(500).json({ error: 'Failed to fetch message status' });
  }
});

// Test WhatsApp connectivity
router.post('/test-connection', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const testMessage = `🧪 **FIXIFY.AI TEST MESSAGE**\n\n` +
                       `✅ WhatsApp integration is working!\n` +
                       `📱 Your number: ${phoneNumber}\n` +
                       `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                       `🚀 **System Status:** Online\n` +
                       `💬 You can now receive notifications via WhatsApp!`;

    const result = await sendWhatsAppMessage(phoneNumber, testMessage);
    
    res.json({ 
      success: result.success, 
      message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
      error: result.error || null,
      sid: result.sid || null
    });

  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Test issue creation via WhatsApp simulation
router.post('/test-issue-creation', async (req, res) => {
  try {
    const { userEmail, category, location } = req.body;
    
    if (!userEmail || !category) {
      return res.status(400).json({ error: 'userEmail and category required' });
    }

    // Simulate WhatsApp issue creation
    const { detect } = require('../issue/detectIssue');
    
    const locationData = {
      userEmail: userEmail,
      email: userEmail,
      location: location || 'Test location via WhatsApp'
    };

    // Create a dummy image buffer for testing
    const dummyImageBuffer = Buffer.from('dummy image data for testing');
    
    const result = await detect(dummyImageBuffer, locationData);
    
    if (result && result.success) {
      res.json({
        success: true,
        message: 'Test issue created successfully via WhatsApp simulation',
        issueDetails: result.issueDetails
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create test issue',
        error: result?.error || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error testing issue creation:', error);
    res.status(500).json({ error: 'Failed to test issue creation', details: error.message });
  }
});

// Get user by phone number (for testing WhatsApp integration)
router.get('/user-by-phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    // Clean the phone number
    let cleanNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // Try exact match first
    let usersSnapshot = await db.collection('users').where('phone', '==', cleanNumber).get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      delete userData.password; // Don't send password
      return res.json({ success: true, user: userData });
    }

    // If no exact match, try without country code (last 10 digits)
    if (cleanNumber.length > 10) {
      const numberWithoutCountryCode = cleanNumber.slice(-10);

      // Get all users and check if any phone ends with these 10 digits
      const allUsers = await db.collection('users').get();
      for (const doc of allUsers.docs) {
        const userData = doc.data();
        if (userData.phone && userData.phone.endsWith(numberWithoutCountryCode)) {
          delete userData.password; // Don't send password
          return res.json({ success: true, user: { id: doc.id, ...userData } });
        }
      }
    }

    res.status(404).json({ success: false, message: 'User not found' });

  } catch (error) {
    console.error('Error finding user by phone:', error);
    res.status(500).json({ error: 'Failed to find user' });
  }
});

// =====================
// WEBHOOK ENHANCEMENT
// =====================

// Enhanced webhook for handling user responses
router.post('/webhook-enhanced', async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const message = req.body.Body?.toLowerCase().trim();
    const from = req.body.From;

    // Handle rating responses
    if (/^[1-5]$/.test(message)) {
      const rating = parseInt(message);
      const stars = '⭐'.repeat(rating);
      
      twiml.message(`${stars} **RATING RECEIVED: ${rating}/5**\n\n` +
                   `🙏 Thank you for your feedback!\n` +
                   `📊 Your rating helps us improve our service.\n\n` +
                   `💪 **We're committed to excellence!**\n` +
                   `📱 Report new issues anytime by sending photos.`);
    }
    // Handle acceptance responses
    else if (message.includes('accept') || message.includes('yes')) {
      twiml.message(`✅ **ASSIGNMENT ACCEPTED**\n\n` +
                   `👍 Thank you for confirming!\n` +
                   `📱 Use the Fixify.AI app to update your progress.\n\n` +
                   `🔧 **Remember to:**\n` +
                   `• Contact customer before starting\n` +
                   `• Take before/after photos\n` +
                   `• Update status regularly`);
    }
    // Handle urgent requests
    else if (message.includes('urgent') || message.includes('emergency')) {
      twiml.message(`🚨 **PRIORITY STATUS UPDATED**\n\n` +
                   `✅ Your request has been marked as urgent.\n` +
                   `⚡ Our team will prioritize your case.\n\n` +
                   `📞 **For immediate emergencies:**\n` +
                   `• Fire: 101 | Police: 100 | Medical: 108\n\n` +
                   `Stay safe! 🙏`);
    }
    // Handle help requests
    else if (message.includes('help') || message.includes('support')) {
      twiml.message(`💬 **FIXIFY.AI HELP CENTER**\n\n` +
                   `📸 **Report Issues:** Send photos of problems\n` +
                   `📍 **Location:** Share for faster response\n` +
                   `⭐ **Rate Service:** Send 1-5 stars\n` +
                   `🚨 **Urgent:** Reply "URGENT" for priority\n\n` +
                   `📞 **Support:** +91-XXXX-XXXX\n` +
                   `🌐 **Website:** https://fixify.ai\n` +
                   `📧 **Email:** support@fixify.ai`);
    }
    else {
      twiml.message(`👋 **Hi there!**\n\n` +
                   `📸 **To report an issue:** Send a photo\n` +
                   `💬 **For help:** Reply "HELP"\n` +
                   `🚨 **Urgent matter:** Reply "URGENT"\n\n` +
                   `We're here to help! 🤝`);
    }

  } catch (error) {
    console.error('Enhanced webhook error:', error);
    twiml.message('❌ Sorry, there was an error. Please try again or contact support.');
  }

  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
