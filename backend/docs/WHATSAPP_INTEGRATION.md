# WhatsApp Integration for Fixify.AI

## Overview
Complete WhatsApp integration has been implemented using Twilio for the Fixify.AI infrastructure issue reporting system. Users can now report issues directly via WhatsApp and receive real-time notifications.

## Features Implemented

### 1. Issue Reporting via WhatsApp
- **Photo Analysis**: Users send photos of infrastructure issues
- **AI Detection**: Automatic categorization (Civil, Electrical, Plumbing)
- **Location Support**: GPS coordinates or manual address entry
- **Immediate Processing**: Issues created instantly when location is provided with image
- **Pending Workflow**: Location requested if not provided with image

### 2. User Authentication
- **Phone Number Matching**: Links WhatsApp messages to registered users
- **Flexible Matching**: Supports various phone number formats
- **Email Integration**: Uses user email from database for issue creation

### 3. Notification System
- **Issue Created**: Notifies user when issue is registered
- **Work Started**: Alerts when technician begins work
- **Work Completed**: Completion notification with photos
- **Technician Assignment**: Notifies technician of new assignments
- **Supervisor Updates**: Task status updates for supervisors

### 4. Workflow Integration
- **Sequential Status**: Pending → Ongoing → Resolved
- **Photo Requirements**: Mandatory photos for status transitions
- **Real-time Updates**: WhatsApp notifications for all status changes

## Technical Implementation

### Backend Routes

#### `/api/twilio/` (Existing Enhanced)
- `POST /webhook` - Main WhatsApp message handler
- `POST /send-whatsapp-prompt` - Send initial WhatsApp prompt to users

#### `/api/whatsapp/` (New)
- `POST /notify-issue-created` - Notify user of issue registration
- `POST /notify-work-started` - Notify user when work begins
- `POST /notify-work-completed` - Notify user of completion
- `POST /notify-technician-assignment` - Notify technician of assignment
- `POST /notify-supervisor-task` - Notify supervisor of task updates
- `POST /notify-maintenance-reminder` - Bulk maintenance notifications
- `POST /test-connection` - Test WhatsApp connectivity
- `POST /test-issue-creation` - Test issue creation simulation
- `GET /user-by-phone/:phoneNumber` - Find user by phone number
- `GET /message-status/:messageSid` - Check message delivery status

### Key Functions

#### `getUserByPhone(phoneNumber)`
- Finds user in database by phone number
- Supports multiple phone number formats
- Returns user object with email for issue creation

#### `sendWhatsAppMessage(to, message, mediaUrl)`
- Sends WhatsApp messages via Twilio
- Handles phone number formatting
- Returns success/failure status

#### `handleLocationMessage(from, user, lat, lng, type, address)`
- Processes location data from users
- Creates issues using the detect() function
- Sends confirmation messages

#### `sendStatusChangeNotifications(taskId, oldStatus, newStatus, taskData)`
- Triggers WhatsApp notifications on task status changes
- Notifies relevant users, technicians, and supervisors
- Integrates with existing workflow system

#### `sendIssueCreatedNotifications(taskId, taskData)`
- Sends notifications when new issues are created
- Notifies user, assigned technician, and supervisor
- Called automatically from addIssue() function

### Message Flow

#### For Users:
1. **Send Photo** → AI Analysis → Category Detection
2. **Share Location** → Issue Created → Confirmation Message
3. **Receive Updates** → Work Started/Completed notifications
4. **Rate Service** → Send 1-5 star rating

#### For Technicians:
1. **Assignment Notification** → Details of new work
2. **Contact Information** → Customer phone/location
3. **Status Updates** → Reminders to update progress

#### For Supervisors:
1. **Task Creation** → New task assignments
2. **Work Progress** → Status change notifications
3. **Completion Approval** → Work ready for review

## Configuration

### Environment Variables (.env)
```
TWILIO_ACCOUNT_SID=ACab7242fe0bd3bb5a4b3988a76e59006e
TWILIO_AUTH_TOKEN=41564f48e998ccfa2a044698ebb2aeeb
```

### Twilio WhatsApp Number
- **From Number**: `whatsapp:+14155238886` (Twilio Sandbox)
- **Production**: Replace with approved Twilio WhatsApp Business number

## Database Integration

### User Matching
- Issues created with correct user email from phone number lookup
- Supports existing user collection structure
- Maintains data consistency across platforms

### Issue Creation
- Uses existing `detect()` function for AI analysis
- Integrates with `addIssue()` for proper task creation
- Maintains supervisor and technician assignment logic

### Notification Tracking
- Messages logged with Twilio SID for delivery tracking
- Error handling for failed notifications
- Graceful degradation if WhatsApp fails

## Testing

### Available Test Endpoints
1. **Test Connection**: Verify WhatsApp number can receive messages
2. **Test Issue Creation**: Simulate issue creation flow
3. **User Lookup**: Test phone number to user matching

### Sample Test Commands
```bash
# Test user lookup
GET /api/whatsapp/user-by-phone/9123456789

# Test connection
POST /api/whatsapp/test-connection
{
  "phoneNumber": "919123456789"
}

# Test issue creation
POST /api/whatsapp/test-issue-creation
{
  "userEmail": "user@example.com",
  "category": "electrical",
  "location": "Test location"
}
```

## Usage Examples

### User Workflow
1. **Start**: User sends photo to WhatsApp number
2. **Detection**: System responds with detected issue category
3. **Location**: User shares location (GPS or address)
4. **Confirmation**: Issue registered with ID and details
5. **Updates**: Receives work start/completion notifications
6. **Feedback**: Can rate service quality

### Message Templates
- **Issue Detected**: "🏗️ CIVIL ISSUE DETECTED - Location needed to complete report"
- **Issue Created**: "✅ ISSUE REGISTERED - ID: #12345, Technician assigned"
- **Work Started**: "🔧 WORK STARTED - Technician: John, Contact: +91xxxxx"
- **Work Completed**: "✅ WORK COMPLETED - Please rate your experience (1-5)"

## Security & Privacy
- Phone numbers used only for user identification
- Personal data not shared between users and technicians
- Messages encrypted by Twilio/WhatsApp
- Failed notifications don't block core functionality

## Integration Points
- **Mobile App**: Supervisor/Technician apps trigger WhatsApp notifications
- **Web Dashboard**: Issue creation sends WhatsApp confirmations
- **AI Pipeline**: Vision analysis results in WhatsApp messages
- **Task Management**: Status changes trigger appropriate notifications

## Future Enhancements
- **Rich Media**: Send completion photos via WhatsApp
- **Interactive Buttons**: Quick response options
- **Bulk Messaging**: Area-wide maintenance notifications
- **Analytics**: WhatsApp engagement metrics
- **Multi-language**: Support for regional languages

This WhatsApp integration provides a complete communication channel for the Fixify.AI system, enabling seamless issue reporting and status updates directly through WhatsApp messaging.
