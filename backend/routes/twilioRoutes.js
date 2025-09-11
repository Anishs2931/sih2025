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
    console.log('🔍 Looking for pending issue with key:', pendingIssueKey);
    console.log('🔍 Available pending issues:', Object.keys(global.pendingIssues || {}));
    const pendingIssue = global.pendingIssues?.[pendingIssueKey];

    if (!pendingIssue) {
      console.log('❌ No pending issue found for key:', pendingIssueKey);
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

    let locationData = { 
      userEmail: user.email,
      email: user.email  // Ensure email is available in multiple formats
    };
    let locationText = '';

    if (locationType === 'gps' && latitude && longitude) {
      locationData.location = { lat: latitude, lng: longitude };
      locationText = `📍 GPS: ${latitude}, ${longitude}`;
    } else if (locationType === 'coordinates' && latitude && longitude) {
      locationData.location = { lat: latitude, lng: longitude };
      locationText = `📍 Coordinates: ${latitude}, ${longitude}`;
    } else if (locationType === 'municipality_state' && addressText) {
      // Handle municipality/state format like "Hyderabad, Telangana"
      const parts = addressText.split(',').map(p => p.trim());
      const municipality = parts[0];
      const state = parts[1] || '';
      
      // Create structured location data for direct municipality/state
      locationData.municipality = municipality;
      locationData.state = state;
      locationData.location = addressText; // Keep original text as backup
      locationText = `📍 Location: ${municipality}${state ? ', ' + state : ''}`;
      
      console.log(`📍 Direct municipality/state input: ${municipality}, ${state}`);
    } else if (locationType === 'address' && addressText) {
      locationData.location = addressText;
      locationText = `📍 Address: ${addressText}`;
    } else {
      // Default location if none provided
      locationData.location = 'WhatsApp location (coordinates not shared)';
      locationText = `📍 Location: Via WhatsApp`;
    }

    console.log('🔍 WhatsApp location data being sent to detect:', JSON.stringify(locationData, null, 2));


    const imageBuffer = Buffer.from(pendingIssue.imageBuffer, 'base64');

    const { detect } = require('../issue/detectIssue');
    const result = await detect(imageBuffer, locationData);

    delete global.pendingIssues[pendingIssueKey];

    if (result && result.success) {
      const isAssigned = result.issueDetails?.assigned_supervisor && result.issueDetails.assigned_supervisor.trim() !== '';
      
      const responseMessage = `${pendingIssue.emoji} **ISSUE REGISTERED SUCCESSFULLY!**\n\n` +
                            `📋 **Issue ID:** ${result.issueDetails.id}\n` +
                            `🔍 **Category:** ${pendingIssue.categoryName}\n` +
                            `📝 **Description:** ${result.issueDetails.description}\n` +
                            `📸 **Images:** Image captured and attached\n` +
                            `${locationText}\n\n` +
                            `✅ **Actions Taken:**\n` +
                            `• Issue registered in our system\n` +
                            `• Image uploaded and processed\n` +
                            `• ${isAssigned ? 'Supervisor assigned' : 'Supervisor assignment in progress'}\n` +
                            `• You'll receive updates on progress\n\n` +
                            (isAssigned ?
                              `👨‍� **Supervisor:** ${result.issueDetails.assigned_supervisor}\n` +
                              `📊 **Status:** ${result.issueDetails.status || 'pending'}\n\n` :
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
    console.log('🔍 Looking up user by phone:', phoneNumber);
    
    // Collections to search in (users are stored by role)
    const collections = ['citizens', 'supervisors', 'admins'];
    
    // Clean the incoming phone number (remove whatsapp: and +)
    let cleanNumber = phoneNumber.replace('whatsapp:', '').replace('+', '');
    console.log('🔍 Cleaned number:', cleanNumber);

    // Array of possible number formats to try
    const numbersToTry = [
      cleanNumber,  // e.g., "919502895881"
      cleanNumber.replace(/^91/, ''), // Remove country code: "9502895881"
      cleanNumber.substring(2), // Another way to remove country code
      '91' + cleanNumber, // Add country code if missing
      '+' + cleanNumber, // With plus
      '+91' + cleanNumber.replace(/^91/, '') // Ensure proper +91 format
    ];

    console.log('🔍 Trying these number formats:', numbersToTry);

    // Try each format for exact match in each collection
    for (const collection of collections) {
      console.log(`🔍 Searching in ${collection} collection...`);
      
      for (const numberFormat of numbersToTry) {
        if (numberFormat && numberFormat.length >= 10) {
          console.log(`   Trying exact match for: ${numberFormat}`);
          let usersSnapshot = await db.collection(collection).where('phone', '==', numberFormat).get();
          
          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            console.log(`✅ Found user in ${collection} with exact match:`, numberFormat);
            return { id: userDoc.id, ...userDoc.data(), collection };
          }
        }
      }
    }

    // If no exact match, try fuzzy matching (contains last 10 digits)
    const last10Digits = cleanNumber.slice(-10);
    console.log('🔍 Trying fuzzy match with last 10 digits:', last10Digits);
    
    if (last10Digits.length === 10) {
      for (const collection of collections) {
        console.log(`🔍 Fuzzy search in ${collection} collection...`);
        const allUsers = await db.collection(collection).get();
        
        for (const doc of allUsers.docs) {
          const userData = doc.data();
          if (userData.phone) {
            const userPhone = userData.phone.toString();
            // Check if user's phone contains the last 10 digits
            if (userPhone.includes(last10Digits) || userPhone.endsWith(last10Digits)) {
              console.log(`✅ Found user in ${collection} with fuzzy match:`, userPhone, 'matches', last10Digits);
              return { id: doc.id, ...userData, collection };
            }
          }
        }
      }
    }

    console.log('❌ No user found for phone number:', phoneNumber);
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

    console.log(userEmail)
    // Get user from database
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();

    if (userSnapshot.empty) {
      console.log("EMPTY")
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnapshot.docs[0].data();
    console.log(userData)
    let phoneNumber = userData.phone;


    if (!phoneNumber) {

      return res.status(400).json({ error: 'User phone number not found' });
    }
    console.log(phoneNumber)
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
      // Check if user wants to report as guest
      const messageText = message?.toLowerCase().trim();
      if (messageText && (messageText.includes('guest') || messageText.includes('report') || messageText.includes('issue'))) {
        twiml.message(`🎯 **Guest Reporting Mode**\n\n` +
                     `� **You can report issues as a guest user!**\n\n` +
                     `⚡ **Quick Report Process:**\n` +
                     `1️⃣ Send a photo of the infrastructure problem\n` +
                     `2️⃣ Share your location when prompted\n` +
                     `3️⃣ Get instant issue confirmation\n\n` +
                     `📋 **Your report will be:**\n` +
                     `• Analyzed by AI\n` +
                     `• Assigned to technicians\n` +
                     `• Tracked in our system\n\n` +
                     `📸 **Send a photo now to get started!**\n` +
                     `💡 **Tip:** For full features, consider creating an account later.`);
        return res.type('text/xml').send(twiml.toString());
      }
      
      twiml.message(`�👋 **Welcome to Fixify.AI!**\n\n` +
                   `🔍 **Your phone number needs to be linked to an account.**\n\n` +
                   `📱 **Quick Setup Options:**\n` +
                   `1️⃣ **Download our mobile app** and register with this phone number\n` +
                   `2️⃣ **Visit our website** and create an account\n` +
                   `3️⃣ **Reply "GUEST"** to report issues without registration\n\n` +
                   `📧 **Once registered, you can:**\n` +
                   `• Report issues by sending photos\n` +
                   `• Get instant AI analysis\n` +
                   `• Track technician progress\n` +
                   `• Receive real-time updates\n\n` +
                   `📞 **Need help?** Reply with "HELP"\n` +
                   `� **Want to report now?** Reply "GUEST"`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (numMedia > 0) {
      // Handle image message - support both registered and guest users
      const mediaUrl = req.body.MediaUrl0;
      const mediaContentType = req.body.MediaContentType0;

      if (mediaContentType && mediaContentType.startsWith('image/')) {
        // Handle guest users (unregistered) who send images
        if (!user) {
          try {
            // Download and analyze image for guest users
            const imageBuffer = await downloadImageAsBuffer(mediaUrl);
            
            // Use AI detection to identify issue category
            const { vision } = require('../aiPipeline/vision');
            const analysisResult = await vision(imageBuffer);

            if (!analysisResult || analysisResult.toLowerCase().includes('none') || analysisResult.toLowerCase().includes('no issue')) {
              twiml.message(`✅ **NO ISSUE DETECTED**\n\n` +
                           `📋 **Analysis:** No maintenance problems found in the image\n\n` +
                           `✅ **Good News!** Everything appears normal.\n\n` +
                           `📸 **Need to report a different issue?** Send another photo.\n` +
                           `📱 **Want to register for full features?** Reply "REGISTER"`);
            } else {
              // Issue detected for guest user
              const category = analysisResult.toLowerCase().trim();
              let emoji = '🔧';
              let categoryName = category;

              switch (category) {
                case 'civil': emoji = '🏗️'; categoryName = 'Civil Engineering'; break;
                case 'electrical': emoji = '⚡'; categoryName = 'Electrical'; break;
                case 'plumbing': emoji = '💧'; categoryName = 'Plumbing/Water'; break;
              }

              // Store pending issue for guest user
              const pendingIssueKey = `pending_${from.replace('whatsapp:', '').replace('+', '')}`;
              console.log('💾 Storing GUEST pending issue with key:', pendingIssueKey);
              const pendingIssue = {
                category: category,
                categoryName: categoryName,
                emoji: emoji,
                userEmail: `whatsapp_guest_${from.replace(/\D/g, '')}@guest.fixify.ai`,
                imageBuffer: imageBuffer.toString('base64'),
                timestamp: Date.now(),
                isGuest: true
              };

              global.pendingIssues = global.pendingIssues || {};
              global.pendingIssues[pendingIssueKey] = pendingIssue;
              console.log('💾 GUEST pending issue stored. Total pending issues:', Object.keys(global.pendingIssues).length);

              twiml.message(`${emoji} **${categoryName.toUpperCase()} ISSUE DETECTED**\n\n` +
                           `📋 **Category:** ${categoryName}\n` +
                           `🎯 **Guest Reporting Mode** - Issue will be registered!\n\n` +
                           `📍 **LOCATION NEEDED**\n` +
                           `Please share your location to complete the report:\n\n` +
                           `**Option 1:** Send location as "City, State"\n` +
                           `   Example: "Hyderabad, Telangana" or "Mumbai, Maharashtra"\n` +
                           `**Option 2:** Tap 📎 → Location → Send Current Location\n` +
                           `**Option 3:** Send your full address as text\n\n` +
                           `⏰ **Location required to assign technician**\n` +
                           `📱 **For full features, consider registering later**`);
            }
          } catch (error) {
            console.error('Error processing guest image:', error);
            twiml.message(`❌ **Error Analyzing Image**\n\n` +
                         `Sorry, there was an error analyzing your image.\n\n` +
                         `📸 **Please try again** or reply "HELP" for assistance.\n` +
                         `📱 **Consider registering** for better support.`);
          }
          return res.type('text/xml').send(twiml.toString());
        }

        // Handle registered users (existing code)
        try {
          // Send immediate acknowledgment
          let ackMessage = '📸 Image received! Analyzing the problem... Please wait a moment.';
          if (latitude && longitude) {
            ackMessage += `\n📍 Location captured: ${latitude}, ${longitude}`;
          } else {
            ackMessage += '\n📍 No location shared. Analyzing image first...';
          }
          
          // Don't send acknowledgment yet, we'll send the full result

          // Download image and process through existing detection system
          const imageBuffer = await downloadImageAsBuffer(mediaUrl);

          // Prepare location data
          let locationData = { 
            userEmail: user.email,
            email: user.email
          };
          
          if (latitude && longitude) {
            locationData.location = {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude)
            };
          }

          // Use AI detection to identify issue category
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

          } else if (latitude && longitude) {
            // Location available - create issue immediately
            console.log('🚀 Creating issue immediately with location data');
            
            const { detect } = require('../issue/detectIssue');
            const result = await detect(imageBuffer, locationData);

            if (result && result.success) {
              const emoji = analysisResult === 'civil' ? '🏗️' : analysisResult === 'electrical' ? '⚡' : '💧';
              const categoryName = analysisResult === 'civil' ? 'Civil Engineering' : 
                                 analysisResult === 'electrical' ? 'Electrical' : 'Plumbing/Water';
              
              const responseMessage = `${emoji} **ISSUE REGISTERED SUCCESSFULLY!**\n\n` +
                                    `📋 **Issue ID:** ${result.issueDetails.id}\n` +
                                    `🔍 **Category:** ${categoryName}\n` +
                                    `📝 **Description:** ${result.issueDetails.description}\n` +
                                    `📍 **Location:** GPS coordinates captured\n\n` +
                                    `✅ **Actions Taken:**\n` +
                                    `• Issue registered in our system\n` +
                                    `• Technician assignment in progress\n` +
                                    `• You'll receive updates on progress\n\n` +
                                    `📱 **Track your issue:** Check the Fixify.AI website for updates\n` +
                                    `🆘 **Urgent?** Reply with "URGENT" for priority handling.`;

              await twilio.messages.create({
                body: responseMessage,
                from: 'whatsapp:+14155238886',
                to: from
              });
            } else {
              await twilio.messages.create({
                body: `❌ **Error Creating Issue**\n\nSorry, there was an error registering your issue. Please try again.\n\n📸 Send a new photo to start over.`,
                from: 'whatsapp:+14155238886',
                to: from
              });
            }
          } else {
            // Issue detected but no location - ask for location before creating issue
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
            console.log('💾 Storing pending issue with key:', pendingIssueKey);
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
            console.log('💾 Pending issue stored. Total pending issues:', Object.keys(global.pendingIssues).length);

            const responseMessage = `${emoji} **${categoryName.toUpperCase()} ISSUE DETECTED**\n\n` +
                                  `📋 **Category:** ${categoryName}\n` +
                                  `🔍 **Analysis:** Issue detected and ready to register\n\n` +
                                  `📍 **LOCATION NEEDED**\n` +
                                  `To complete your report, please share your location:\n\n` +
                                  `**Option 1:** Send location as "City, State"\n` +
                                  `   Example: "Hyderabad, Telangana" or "Mumbai, Maharashtra"\n` +
                                  `**Option 2:** Tap 📎 → Location → Send Current Location\n` +
                                  `**Option 3:** Send your full address as text\n\n` +
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
      // Handle location-only messages (GPS coordinates) - support guest users
      const guestUser = user || { 
        email: `whatsapp_guest_${from.replace(/\D/g, '')}@guest.fixify.ai`, 
        name: 'Guest User',
        isGuest: true 
      };
      await handleLocationMessage(from, guestUser, latitude, longitude, 'gps');
    } else if (message) {
      // Handle text messages
      const messageText = message.toLowerCase().trim();

      if (messageText.includes('help') || messageText.includes('start')) {
        const userName = user?.name || 'there';
        twiml.message(`🤖 **Welcome to Fixify.AI WhatsApp Service!**\n\n` +
                     `Hi ${userName}! 👋\n\n` +
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
                     `📷 **Send a photo now to get started!**${!user ? '\n\n🎯 **Note:** You\'re using guest mode. Register for full features!' : ''}`);
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
        // First check for common greetings and non-location messages
        const commonGreetings = ['hi', 'hello', 'hey', 'hii', 'helo', 'hlw', 'good morning', 'good evening', 'namaste'];
        const isGreeting = commonGreetings.some(greeting => 
          messageText.toLowerCase().trim() === greeting || 
          messageText.toLowerCase().includes(greeting) && messageText.length <= 15
        );

        if (isGreeting) {
          const userName = user?.name || 'there';
          twiml.message(`👋 Hello ${userName}!\n\n` +
                       `🔧 **Welcome to Fixify!**\n` +
                       `I help you report infrastructure issues in your community.\n\n` +
                       `📸 **To get started:**\n` +
                       `Send a photo of any problem you want to report (roads, lights, water, etc.)\n\n` +
                       `💬 **Other options:**\n` +
                       `• Reply "HELP" for assistance\n` +
                       `• Reply "REGISTER" to create an account`);
          return res.type('text/xml').send(twiml.toString());
        }

        // Check if this might be a location message (municipality/state, address, or coordinates)
        const locationPattern = /(\d+\.?\d*),\s*(\d+\.?\d*)/; // lat,lng pattern
        const locationMatch = messageText.match(locationPattern);

        // Enhanced municipality and state detection
        const municipalityStatePattern = /^([a-zA-Z\s]+)(?:,\s*([a-zA-Z\s]+))?$/;
        const municipalityStateMatch = messageText.match(municipalityStatePattern);

        // List of common Indian states for validation
        const indianStates = [
          'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
          'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
          'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya',
          'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim',
          'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand',
          'west bengal', 'delhi'
        ];

        // Common Indian cities/municipalities for validation
        const indianCities = [
          'hyderabad', 'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'pune',
          'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore',
          'thane', 'bhopal', 'visakhapatnam', 'pimpri-chinchwad', 'patna', 'vadodara',
          'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot',
          'kalyan-dombivali', 'vasai-virar', 'varanasi', 'srinagar', 'aurangabad',
          'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'ranchi', 'howrah',
          'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai',
          'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur', 'hubli-dharwad'
        ];

        if (locationMatch) {
          // Handle coordinate-based location - support guest users
          const lat = parseFloat(locationMatch[1]);
          const lng = parseFloat(locationMatch[2]);
          const guestUser = user || { 
            email: `whatsapp_guest_${from.replace(/\D/g, '')}@guest.fixify.ai`, 
            name: 'Guest User',
            isGuest: true 
          };
          await handleLocationMessage(from, guestUser, lat, lng, 'coordinates');
        } else if (municipalityStateMatch && messageText.length <= 50) {
          // Handle municipality/state format like "Hyderabad, Telangana" or "Mumbai"
          const parts = messageText.split(',').map(p => p.trim());
          let municipality = parts[0];
          let state = parts[1] || '';

          // Validate if this looks like a municipality/state combination
          const municipalityLower = municipality.toLowerCase();
          const stateLower = state.toLowerCase();
          
          const isMunicipality = indianCities.includes(municipalityLower) || 
                                (municipality.length >= 4 && /^[a-zA-Z\s]+$/.test(municipality));
          
          const isState = !state || indianStates.includes(stateLower);

          if (isMunicipality && isState && municipality.length >= 3) {
            console.log(`📍 Detected municipality/state: ${municipality}, ${state}`);
            const guestUser = user || { 
              email: `whatsapp_guest_${from.replace(/\D/g, '')}@guest.fixify.ai`, 
              name: 'Guest User',
              isGuest: true 
            };
            await handleLocationMessage(from, guestUser, null, null, 'municipality_state', messageText);
          } else {
            // Not a valid municipality/state, treat as regular message
            const userName = user?.name || 'there';
            twiml.message(`👋 Hello ${userName}!\n\n` +
                         `📸 Please send a photo of the problem you want to report.\n\n` +
                         `I can identify infrastructure issues and assign technicians automatically.\n\n` +
                         `📍 **Location Examples:**\n` +
                         `• "Hyderabad, Telangana"\n` +
                         `• "Mumbai, Maharashtra"\n` +
                         `• "Delhi"\n` +
                         `• Share GPS location\n\n` +
                         `Type "HELP" for more information.${!user ? '\n\n🎯 **Guest Mode:** Register for full features!' : ''}`);
          }
        } else if (messageText.length > 10 && (messageText.includes('street') || messageText.includes('road') || messageText.includes('area') || messageText.includes('city'))) {
          // Handle address-based location - support guest users
          const guestUser = user || { 
            email: `whatsapp_guest_${from.replace(/\D/g, '')}@guest.fixify.ai`, 
            name: 'Guest User',
            isGuest: true 
          };
          await handleLocationMessage(from, guestUser, null, null, 'address', messageText);
        } else {
          const userName = user?.name || 'there';
          twiml.message(`👋 Hello ${userName}!\n\n` +
                       `📸 Please send a photo of the problem you want to report.\n\n` +
                       `I can identify infrastructure issues and assign technicians automatically.\n\n` +
                       `📍 **Location Examples:**\n` +
                       `• "Hyderabad, Telangana"\n` +
                       `• "Mumbai, Maharashtra"\n` +
                       `• "Delhi"\n` +
                       `• Share GPS location\n\n` +
                       `Type "HELP" for more information.${!user ? '\n\n🎯 **Guest Mode:** Register for full features!' : ''}`);
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

// Test route to check if a user exists by phone
router.get('/user-by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await getUserByPhone(phone);
    
    if (user) {
      res.json({ 
        success: true, 
        user: { 
          name: user.name, 
          email: user.email, 
          phone: user.phone 
        } 
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Debug route to see all users and their phone numbers
router.get('/debug/all-users', async (req, res) => {
  try {
    const collections = ['citizens', 'supervisors', 'admins'];
    const allUsers = [];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      snapshot.forEach(doc => {
        const userData = doc.data();
        allUsers.push({
          id: doc.id,
          collection: collection,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          phoneType: typeof userData.phone
        });
      });
    }
    
    res.json({ 
      success: true, 
      totalUsers: allUsers.length,
      users: allUsers 
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Test route for coordinate-based location processing
router.post('/debug/test-coordinates', async (req, res) => {
  try {
    const { addIssue } = require('../issue/addIssue');
    const { lat, lng, userEmail } = req.body;
    
    if (!lat || !lng || !userEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'lat, lng, and userEmail are required' 
      });
    }
    
    const locationData = {
      userEmail: userEmail,
      email: userEmail,
      location: { lat: lat, lng: lng }
    };
    
    console.log('🧪 Testing coordinate processing with:', JSON.stringify(locationData, null, 2));
    
    // Test just the location processing by calling addIssue directly
    const result = await addIssue('electrical', locationData, []);
    
    res.json({
      success: true,
      message: 'Coordinate processing test completed',
      taskId: result,
      locationData: locationData
    });
    
  } catch (error) {
    console.error('Coordinate test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Coordinate test failed', 
      error: error.message 
    });
  }
});

module.exports = router;
