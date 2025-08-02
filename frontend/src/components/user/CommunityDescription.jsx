import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const CommunityDescription = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const community = location.state?.community;

  if (!community) {
    // If no community info, redirect to dashboard or show error
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-100 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Community Data</h2>
          <p className="mb-6 text-gray-700">No community information found. Please try again or contact support.</p>
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-100 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Details</h2>
        <div className="mb-4">
          <div className="text-lg font-semibold text-blue-700">{community.communityName}</div>
          <div className="text-gray-600">{community.address}</div>
          <span className="inline-block mt-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-sm">
            Status: {community.status || 'requested'}
          </span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
          Your community has been created and is pending admin approval.<br />
          <span className="font-medium">Note:</span> Community will be permitted after admin inspection and approval. You will be notified once approved.
        </div>
        <button
          className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default CommunityDescription;
