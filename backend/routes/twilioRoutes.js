const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { MessagingResponse } = require('twilio').twiml;
const { detect } = require('../issue/detectIssue');
const db = require('../firebase');

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/test', (req, res) => {
  res.json({ message: 'Twilio routes working!', timestamp: new Date().toISOString() });
});

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('Error: Twilio credentials not found!');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
  process.exit(1);
}



const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function formatWhatsAppNumber(phoneNumber) {
  let cleanNumber = phoneNumber.replace('whatsapp:', '');
  if (!cleanNumber.startsWith('+')) {
    cleanNumber = '+' + cleanNumber;
  }
  return cleanNumber;
}

async function downloadImageAsBuffer(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading image:', error.message);
    throw error;
  }
}

async function handleLocationMessage(from, user, latitude, longitude, locationType, addressText = null) {
  try {
    const pendingIssueKey = `pending_${from.replace('whatsapp:', '').replace('+', '')}`;
    const pendingIssue = global.pendingIssues?.[pendingIssueKey];

    if (!pendingIssue) {
      await twilio.messages.create({
        body: `❌ **No Pending Issue Found**\n\n` +
              `I don't have a pending issue report for your number.\n\n` +
              `📸 **To report an issue:**\n` +
              `1. Send a photo of the problem first\n` +
              `2. Then share your location\n\n` +
              `Please send a photo to get started!`,
        from: 'whatsapp:+14155238886',
        to: from
      });
      return;
    }

    if (Date.now() - pendingIssue.timestamp > 30 * 60 * 1000) {
      delete global.pendingIssues[pendingIssueKey];
      await twilio.messages.create({
        body: `⏰ **Session Expired**\n\n` +
              `Your issue report session has expired.\n\n` +
              `📸 Please send a new photo to start over.`,
        from: 'whatsapp:+14155238886',
        to: from
      });
      return;
    }

    let locationData = { userEmail: user.email };
    let locationText = '';

    if (locationType === 'gps' && latitude && longitude) {
      locationData.location = { lat: latitude, lng: longitude };
      locationText = `📍 GPS: ${latitude}, ${longitude}`;
    } else if (locationType === 'coordinates' && latitude && longitude) {
      locationData.location = { lat: latitude, lng: longitude };
      locationText = `📍 Coordinates: ${latitude}, ${longitude}`;
    } else if (locationType === 'address' && addressText) {
      locationData.location = addressText;
      locationText = `📍 Address: ${addressText}`;
    }


    const imageBuffer = Buffer.from(pendingIssue.imageBuffer, 'base64');

    const { detect } = require('../issue/detectIssue');
    const result = await detect(imageBuffer, locationData);

    delete global.pendingIssues[pendingIssueKey];

    if (result && result.success) {
      const responseMessage = `${pendingIssue.emoji} **ISSUE REGISTERED SUCCESSFULLY!**\n\n` +
                            `📋 **Issue ID:** ${result.issueDetails.id}\n` +
                            `🔍 **Category:** ${pendingIssue.categoryName}\n` +
                            `📝 **Description:** ${result.issueDetails.description}\n` +
                            `${locationText}\n\n` +
                            `✅ **Actions Taken:**\n` +
                            `• Issue registered in our system\n` +
                            `• ${result.assignment.assigned ? 'Technician assigned' : 'Technician assignment in progress'}\n` +
                            `• You'll receive updates on progress\n\n` +
                            (result.assignment.assigned ?
                              `👨‍🔧 **Technician:** ${result.assignment.technicianDetails?.name || 'Assigned'}\n` +
                              `⏰ **ETA:** ${result.assignment.eta || 'TBD'}\n\n` :
                              `⏳ **Status:** Your request is queued for assignment\n\n`) +
                            `📱 **Track your issue:** Check the Fixify.AI website for updates\n` +
                            `🆘 **Urgent?** Reply with "URGENT" for priority handling.`;

      await twilio.messages.create({
        body: responseMessage,
        from: 'whatsapp:+14155238886',
        to: from
      });
    } else {
      await twilio.messages.create({
        body: `❌ **Error Creating Issue**\n\n` +
              `Sorry, there was an error registering your issue. Please try again.\n\n` +
              `📸 Send a new photo to start over.`,
        from: 'whatsapp:+14155238886',
        to: from
      });
    }

  } catch (error) {
    console.error('Error handling location message:', error);
    await twilio.messages.create({
      body: `❌ **Error Processing Location**\n\n` +
            `Sorry, there was an error processing your location. Please try again.\n\n` +
            `📸 Send a new photo to start over.`,
      from: 'whatsapp:+14155238886',
      to: from
    });
  }
}

// Function to get user by phone number
async function getUserByPhone(phoneNumber) {
  try {
    // Clean the incoming phone number (remove whatsapp: and +)
    let cleanNumber = phoneNumber.replace('whatsapp:', '').replace('+', '');

    // Try exact match first
    let usersSnapshot = await db.collection('users').where('phone', '==', cleanNumber).get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }

    // If no exact match, try without country code (last 10 digits)
    if (cleanNumber.length > 10) {
      const numberWithoutCountryCode = cleanNumber.slice(-10);

      // Get all users and check if any phone ends with these 10 digits
      const allUsers = await db.collection('users').get();
      for (const doc of allUsers.docs) {
        const userData = doc.data();
        if (userData.phone && userData.phone.endsWith(numberWithoutCountryCode)) {
          return { id: doc.id, ...userData };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user by phone:', error);
    return null;
  }
}

// Route to send WhatsApp message to user
router.post('/send-whatsapp-prompt', async (req, res) => {
  try {
    console.log('🔧 Twilio Environment Variables Check:');
    console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT SET');
    console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
    
    const { userEmail } = req.body;


    // Get user from database
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();

    if (userSnapshot.empty) {

      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();
    let phoneNumber = userData.phone;


    if (!phoneNumber) {

      return res.status(400).json({ error: 'User phone number not found' });
    }

    // Ensure phone number has country code (91 for India)
    if (!phoneNumber.startsWith('91') && !phoneNumber.startsWith('+91')) {
      phoneNumber = '91' + phoneNumber;
    }
    // Remove + if present
    phoneNumber = phoneNumber.replace('+', '');

    console.log('📱 Preparing to send WhatsApp message:');
    console.log('   User:', userData.name);
    console.log('   Email:', userData.email);
    console.log('   Original phone:', userData.phone);
    console.log('   Processed phone:', phoneNumber);
    console.log('   WhatsApp TO:', `whatsapp:+${phoneNumber}`);
    console.log('   WhatsApp FROM:', 'whatsapp:+14155238886');

    
    const message = `🤖 **Fixify.AI - Report Issue via WhatsApp**\n\n` +
                   `Hi ${userData.name}! 👋\n\n` +
                   `You can now report infrastructure issues directly through WhatsApp!\n\n` +
                   `📸 **How to report:**\n` +
                   `1. Take a clear photo of the problem\n` +
                   `2. Enable location sharing (recommended)\n` +
                   `3. Send photo to this WhatsApp number\n` +
                   `4. Get instant AI analysis & technician assignment\n\n` +
                   `📍 **Share location for:**\n` +
                   `• Faster technician dispatch\n` +
                   `• Accurate arrival time estimates\n` +
                   `• Better service quality\n\n` +
                   `🔍 **We detect:**\n` +
                   `• 🏗️ Civil issues (cracks, structural damage)\n` +
                   `• ⚡ Electrical problems (damaged wires, faults)\n` +
                   `• 💧 Plumbing issues (leaks, water damage)\n\n` +
                   `📱 **Send your first photo now to get started!**\n` +
                   `💡 **Tip:** Type "LOCATION" for help sharing your location`;

    console.log('📝 Message content length:', message.length, 'characters');
    console.log('📤 Sending WhatsApp message via Twilio...');

    const result = await twilio.messages.create({
      body: message,
      from: 'whatsapp:+14155238886', // Twilio Sandbox number
      to: `whatsapp:+${phoneNumber}`
    });

    console.log('✅ WhatsApp message sent successfully!');
    console.log('   Message SID:', result.sid);
    console.log('   Status:', result.status);
    console.log('   Date created:', result.dateCreated);
    console.log('   To:', result.to);
    console.log('   From:', result.from);
    console.log('   Price:', result.price);
    console.log('   Price unit:', result.priceUnit);

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      sid: result.sid
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message,
      code: error.code
    });
  }
});

// WhatsApp webhook handler
router.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const message = req.body.Body;
    const from = req.body.From;
    const numMedia = parseInt(req.body.NumMedia) || 0;
    const latitude = req.body.Latitude;
    const longitude = req.body.Longitude;



    // Get user from database
    const user = await getUserByPhone(from);
    
    if (!user) {
      twiml.message(`❌ **User Not Found**\n\nSorry, your phone number is not registered in our system.\n\nPlease register on our website first: https://fixify.ai\n\nOr contact support for assistance.`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (numMedia > 0) {
      // Handle image message
      const mediaUrl = req.body.MediaUrl0;
      const mediaContentType = req.body.MediaContentType0;



      if (mediaContentType && mediaContentType.startsWith('image/')) {
        try {
          // Send immediate acknowledgment with location info
          let ackMessage = '📸 Image received! Analyzing the problem... Please wait a moment.';
          if (latitude && longitude) {
            ackMessage += `\n📍 Location captured: ${latitude}, ${longitude}`;
          } else {
            ackMessage += '\n📍 No location shared. For faster response, share your location with the next photo!';
          }
          twiml.message(ackMessage);

          // Download image and process through existing detection system
          const imageBuffer = await downloadImageAsBuffer(mediaUrl);

          // Prepare location data
          let location = { userEmail: user.email };
          if (latitude && longitude) {
            location.location = {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude)
            };
          } else {
            location.location = 'WhatsApp location not provided';
          }

          // Use AI detection only (without creating issue yet)
          const { vision } = require('../aiPipeline/vision');
          const analysisResult = await vision(imageBuffer);

          if (!analysisResult || analysisResult.toLowerCase().includes('none') || analysisResult.toLowerCase().includes('no issue')) {
            // No issue detected
            const responseMessage = `✅ **NO ISSUE DETECTED**\n\n` +
                                  `📋 **Analysis:** No maintenance problems found in the image\n\n` +
                                  `✅ **Good News!**\n` +
                                  `• Everything appears to be in normal condition\n` +
                                  `• No action required at this time\n\n` +
                                  `📸 **Need to report a different issue?** Send another photo.\n` +
                                  `📞 **Have concerns?** Reply with "HELP" for assistance.`;

            await twilio.messages.create({
              body: responseMessage,
              from: 'whatsapp:+14155238886',
              to: from
            });

          } else {
            // Issue detected - ask for location before creating issue
            const category = analysisResult.toLowerCase().trim();

            let emoji = '🔧';
            let categoryName = category;

            switch (category) {
              case 'civil':
                emoji = '🏗️';
                categoryName = 'Civil Engineering';
                break;
              case 'electrical':
                emoji = '⚡';
                categoryName = 'Electrical';
                break;
              case 'plumbing':
                emoji = '💧';
                categoryName = 'Plumbing/Water';
                break;
            }

            // Store pending issue data temporarily
            const pendingIssueKey = `pending_${from.replace('whatsapp:', '').replace('+', '')}`;
            const pendingIssue = {
              category: category,
              categoryName: categoryName,
              emoji: emoji,
              userEmail: user.email,
              imageBuffer: imageBuffer.toString('base64'), // Store as base64
              timestamp: Date.now()
            };

            // Store in memory (in production, use Redis or database)
            global.pendingIssues = global.pendingIssues || {};
            global.pendingIssues[pendingIssueKey] = pendingIssue;

            const responseMessage = `${emoji} **${categoryName.toUpperCase()} ISSUE DETECTED**\n\n` +
                                  `📋 **Category:** ${categoryName}\n` +
                                  `🔍 **Analysis:** Issue detected and ready to register\n\n` +
                                  `📍 **LOCATION NEEDED**\n` +
                                  `To complete your report, please share your location:\n\n` +
                                  `**Option 1:** Tap 📎 → Location → Send Current Location\n` +
                                  `**Option 2:** Send your address as text\n` +
                                  `**Option 3:** Send coordinates (lat, lng)\n\n` +
                                  `⏰ **This step is required to assign a technician and provide accurate ETA.**\n\n` +
                                  `📱 Share your location now to complete the report!`;

            await twilio.messages.create({
              body: responseMessage,
              from: 'whatsapp:+14155238886',
              to: from
            });
          }

        } catch (error) {
          console.error('Error processing image:', error);
          twiml.message('❌ Sorry, there was an error analyzing your image. Please try again or contact support.');
        }
      } else {
        twiml.message('📷 Please send an image of the problem you want to report.');
      }
    } else if (latitude && longitude && !numMedia) {
      // Handle location-only messages (GPS coordinates)
      await handleLocationMessage(from, user, latitude, longitude, 'gps');
    } else if (message) {
      // Handle text messages
      const messageText = message.toLowerCase().trim();

      if (messageText.includes('help') || messageText.includes('start')) {
        twiml.message(`🤖 **Welcome to Fixify.AI WhatsApp Service!**\n\n` +
                     `Hi ${user.name}! 👋\n\n` +
                     `📸 **How to report issues:**\n` +
                     `1. Send a photo of any infrastructure problem\n` +
                     `2. Share your location (optional but recommended)\n` +
                     `3. Our AI will analyze and categorize the issue\n` +
                     `4. A technician will be assigned automatically\n\n` +
                     `📍 **To share location:**\n` +
                     `• Tap 📎 (attachment) → Location → Send Current Location\n` +
                     `• Or send photo with location enabled\n\n` +
                     `🔍 **We detect:**\n` +
                     `• 🏗️ Civil (construction/structural damage)\n` +
                     `• ⚡ Electrical (power/wiring issues)\n` +
                     `• 💧 Plumbing (water/drainage problems)\n\n` +
                     `📷 **Send a photo now to get started!**`);
      } else if (messageText.includes('location') || messageText.includes('gps')) {
        twiml.message(`📍 **How to Share Your Location:**\n\n` +
                     `**Method 1: With Photo**\n` +
                     `• Take photo of the problem\n` +
                     `• Before sending, enable location sharing\n` +
                     `• Send photo (location included automatically)\n\n` +
                     `**Method 2: Separate Location**\n` +
                     `• Tap attachment button (📎)\n` +
                     `• Select "Location"\n` +
                     `• Choose "Send your current location"\n` +
                     `• Then send your photo\n\n` +
                     `📍 **Why share location?**\n` +
                     `• Faster technician dispatch\n` +
                     `• Accurate ETA estimates\n` +
                     `• Better service quality`);
      } else if (messageText.includes('urgent') || messageText.includes('emergency')) {
        twiml.message(`🚨 **PRIORITY REQUEST NOTED**\n\n` +
                     `Your case will be marked as urgent. Our team will prioritize your request.\n\n` +
                     `📞 **Emergency Contacts:**\n` +
                     `• Fire: 101\n` +
                     `• Police: 100\n` +
                     `• Medical: 108\n\n` +
                     `Stay safe! 🙏`);
      } else {
        // Check if this might be a location message (address or coordinates)
        const locationPattern = /(\d+\.?\d*),\s*(\d+\.?\d*)/; // lat,lng pattern
        const locationMatch = messageText.match(locationPattern);

        if (locationMatch) {
          // Handle coordinate-based location
          const lat = parseFloat(locationMatch[1]);
          const lng = parseFloat(locationMatch[2]);
          await handleLocationMessage(from, user, lat, lng, 'coordinates');
        } else if (messageText.length > 10 && (messageText.includes('street') || messageText.includes('road') || messageText.includes('area') || messageText.includes('city'))) {
          // Handle address-based location
          await handleLocationMessage(from, user, null, null, 'address', messageText);
        } else {
          twiml.message(`👋 Hello ${user.name}!\n\n` +
                       `📸 Please send a photo of the problem you want to report.\n\n` +
                       `I can identify infrastructure issues and assign technicians automatically.\n\n` +
                       `📍 **Tip:** Share your location for faster response!\n` +
                       `Type "HELP" for more information.`);
        }
      }
    } else {
      twiml.message('📷 Please send an image of the problem you want to report, or type "HELP" for assistance.');
    }

  } catch (error) {
    console.error('Webhook error:', error);
    twiml.message('❌ Sorry, there was an error processing your request. Please try again.');
  }

  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
