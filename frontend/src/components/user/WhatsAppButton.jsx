import React, { useState } from 'react';
import { MessageCircle, Send, Check, X } from 'lucide-react';
import PhoneSetupModal from './PhoneSetupModal';

const WhatsAppButton = ({ userEmail, onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);

  const handleSendWhatsAppPrompt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/twilio/send-whatsapp-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowModal(true);
        if (onSuccess) onSuccess(result);
      } else {
        // Check if it's a phone number missing error
        if (result.error && result.error.includes('phone number not found')) {
          setShowPhoneSetup(true);
        } else {
          if (onError) onError(result.error || 'Failed to send WhatsApp message');
        }
      }
    } catch (error) {
      console.error('Error sending WhatsApp prompt:', error);
      if (onError) onError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* WhatsApp Button */}
      <button
        onClick={handleSendWhatsAppPrompt}
        disabled={isLoading}
        className="flex items-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-sm font-medium">Sending...</span>
          </>
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Report via WhatsApp</span>
          </>
        )}
      </button>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 animate-zoom-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">WhatsApp Message Sent!</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Great! We've sent you instructions on WhatsApp. You can now report issues directly through WhatsApp.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-800 mb-2">📱 How to use WhatsApp reporting:</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Open WhatsApp and check for our message</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Take a photo of any infrastructure problem</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Send the photo to our WhatsApp number</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Get instant AI analysis and technician assignment</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro Tip:</strong> Share your location with the photo for faster technician dispatch!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  window.open('https://wa.me/', '_blank');
                  setShowModal(false);
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp</span>
              </button>
              
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Setup Modal */}
      <PhoneSetupModal
        isOpen={showPhoneSetup}
        onClose={() => setShowPhoneSetup(false)}
        userEmail={userEmail}
        onSuccess={(phone) => {
          setShowPhoneSetup(false);
          // After phone is set up, try sending WhatsApp message again
          handleSendWhatsAppPrompt();
        }}
      />
    </>
  );
};

export default WhatsAppButton;
