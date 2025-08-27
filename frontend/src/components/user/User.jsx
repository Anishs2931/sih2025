import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../../contexts/CurrentUserContext';
import CameraCapture from './CameraCapture';
import NotificationToast from './NotificationToast';
import NoIssueDetectedModal from './NoIssueDetectedModal';
import WhatsAppButton from './WhatsAppButton';
import { createApiUrl } from '../../utils/api';

const FixifyUserDashboard = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('active');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showNoIssueModal, setShowNoIssueModal] = useState(false);
  const [notification, setNotification] = useState({ isVisible: false, type: 'info', title: '', message: '' });
  const [latestIssueResult, setLatestIssueResult] = useState(null); // holds assignment result after creation
  const [tempIssuesDB, setTempIssuesDB] = useState([]); // temporary database for created issues
  const [statsUpdated, setStatsUpdated] = useState(false); // for visual feedback when stats update
  const [showStatsToast, setShowStatsToast] = useState(false); // for toast notification
  const [issueForm, setIssueForm] = useState({
    location: '',
    images: [],
    floor: '', // new optional field
    sector: '', // new optional field
    instructions: '' // new optional field
  });
  const [locationPermission, setLocationPermission] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [redirectToLogin, setRedirectToLogin] = useState(false);
  
  // Dynamic data from backend
  const { currentUser, setCurrentUser } = useCurrentUser();

  // Notification helper functions
  const showNotification = (type, title, message, duration = 5000) => {
    setNotification({ isVisible: true, type, title, message, duration });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };
  const [community, setCommunity] = useState(null);
  const [issues, setIssues] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Move fetchUserRelatedData outside useEffect for global access
  const fetchUserRelatedData = async () => {
    console.log('fetchUserRelatedData called with currentUser:', currentUser);
    if (!currentUser?.email) {
      console.log('No current user or email, returning early');
      return;
    }
    setIsLoadingData(true);
    try {
      console.log("Fetching data for user:", currentUser.email)
      const [commRes, issuesRes, notifRes] = await Promise.all([
        fetch(createApiUrl(`api/userData/community/${currentUser.email}`)),
        fetch(createApiUrl(`api/userData/issues/${currentUser.email}`)),
        fetch(createApiUrl(`api/userData/notifications/${currentUser.email}`))
      ]);
      console.log('API Responses:', { commRes, issuesRes, notifRes });
      const commData = await commRes.json();
      console.log('Community data:', commData);
      setCommunity(commData.community);
      const issuesData = await issuesRes.json();
      console.log('Issues data received:', issuesData);
      console.log('Issues array:', issuesData.issues);
      setIssues(issuesData.issues || []);
      const notifData = await notifRes.json();
      console.log('Notifications data:', notifData);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setCommunity(null);
      setIssues([]);
      setNotifications([]);
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    console.log('useEffect triggered with currentUser:', currentUser);
    fetchUserRelatedData();
    // eslint-disable-next-line
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIssueForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Set location as {lat, lng} object for backend
            setIssueForm(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
            setLocationPermission('granted');
          } catch (error) {
            showNotification('warning', 'Location Error', 'Unable to get address. Please enter manually.');
          }
          setIsGettingLocation(false);
        },
        (error) => {
          setLocationPermission('denied');
          setIsGettingLocation(false);
          showNotification('warning', 'Location Access Denied', 'Please enter address manually or grant location permission.');
        }
      );
    } else {
      showNotification('error', 'Location Not Supported', 'Geolocation is not supported by this browser. Please enter address manually.');
      setIsGettingLocation(false);
    }
  };

  // Add this function to handle AI detection and issue creation
  const handleDetectAndCreateIssue = async () => {
    if (!issueForm.location || issueForm.images.length === 0) {
      showNotification('warning', 'Missing Information', 'Please add images and location to report the issue.');
      return;
    }
    try {
      const imageFile = issueForm.images[0].file || null;
      if (!imageFile) {
        showNotification('error', 'Image Error', 'Image file missing. Please re-upload.');
        return;
      }
      const formData = new FormData();
      formData.append('image', imageFile);
      // If location is an object, stringify it for backend and add user email
      if (typeof issueForm.location === 'object') {
        const locationWithEmail = { ...issueForm.location, userEmail: currentUser.email };
        formData.append('location', JSON.stringify(locationWithEmail));
      } else {
        const locationWithEmail = { location: issueForm.location, userEmail: currentUser.email };
        formData.append('location', JSON.stringify(locationWithEmail));
      }
      formData.append('floor', issueForm.floor);
      formData.append('sector', issueForm.sector);
      formData.append('instructions', issueForm.instructions);
      const response = await fetch(createApiUrl('api/issue/detect'), {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      console.log('Issue creation result:', result);
      console.log('Response status:', response.status);

      if (response.status === 422 || result.noIssueDetected) {
        // Handle "no issue detected" case - show modal instead of continuing
        console.log('No issue detected, showing modal');
        setShowNoIssueModal(true);
        return; // Stop processing here
      } else if (response.ok && result.success) {
        setLatestIssueResult(result); // Save assignment result for UI

        // Map backend status to frontend status for proper counting
        const mapBackendStatus = (backendStatus, isAssigned) => {
          const status = backendStatus.toLowerCase();
          if (status === 'reported' && !isAssigned) return 'pending';
          if (status === 'reported' && isAssigned) return 'in-progress';
          if (status === 'assigned') return 'in-progress';
          if (status === 'completed' || status === 'resolved') return 'completed';
          return status;
        };

        // Add to temporary database for immediate display
        const newIssue = {
          id: result.issueDetails.id,
          title: result.issueDetails.title,
          description: result.issueDetails.description,
          category: result.issueDetails.category,
          priority: result.issueDetails.priority,
          status: mapBackendStatus(result.issueDetails.status, result.assignment.assigned),
          location: result.issueDetails.location,
          dateReported: result.issueDetails.dateReported,
          technician: result.assignment.assigned ? result.assignment.technicianDetails?.name : null,
          estimatedTime: result.assignment.eta || null,
          images: issueForm.images || [],
          floor: result.issueDetails.floor,
          sector: result.issueDetails.sector,
          instructions: result.issueDetails.instructions,
          assignmentDetails: result.assignment
        };

        // Add to temporary database and current issues list
        setTempIssuesDB(prev => [newIssue, ...prev]);
        setIssues(prev => [newIssue, ...prev]);

        // Trigger visual feedback for stats update
        setStatsUpdated(true);
        setShowStatsToast(true);
        setTimeout(() => {
          setStatsUpdated(false);
          setShowStatsToast(false);
        }, 2000);

        setShowCreateIssue(false);
        setIssueForm({ location: '', images: [], floor: '', sector: '', instructions: '' });

        // Show success notification with assignment details
        showNotification('success', 'Issue Reported Successfully!', result.message, 7000);

        // Refresh issues list after reporting (to get server data)
        setTimeout(() => fetchUserRelatedData(), 1000);
      } else {
        showNotification('error', 'Detection Failed', result.error || result.message || 'Unknown error occurred');
      }
    } catch (err) {
      showNotification('error', 'Network Error', 'Unable to connect to server. Please check your connection and try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'electrical': return '⚡';
      case 'plumbing': return '🔧';
      case 'cleaning': return '🧹';
      case 'landscaping': return '🌱';
      case 'hvac': return '❄️';
      case 'security': return '🛡️';
      default: return '🔧';
    }
  };

  // Combine server issues with temporary database issues (avoid duplicates)
  const allIssues = [...issues];
  tempIssuesDB.forEach(tempIssue => {
    if (!allIssues.find(issue => issue.id === tempIssue.id)) {
      allIssues.unshift(tempIssue);
    }
  });

  const filteredIssues = allIssues.filter(issue => {
    if (activeTab === 'active') return issue.status !== 'completed';
    if (activeTab === 'completed') return issue.status === 'completed';
    return true;
  });

  // Calculate statistics from combined issues
  const pendingCount = allIssues.filter(i => i.status === 'pending' || i.status === 'reported').length;
  const inProgressCount = allIssues.filter(i => i.status === 'in-progress' || i.status === 'assigned').length;
  const completedCount = allIssues.filter(i => i.status === 'completed' || i.status === 'resolved').length;
  const activeCount = allIssues.filter(i => i.status !== 'completed' && i.status !== 'resolved').length;

  console.log('Current issues state:', issues);
  console.log('Temp issues DB:', tempIssuesDB);
  console.log('All issues combined:', allIssues);
  console.log('Statistics:', { pendingCount, inProgressCount, completedCount, activeCount });
  console.log('Active tab:', activeTab);
  console.log('Filtered issues:', filteredIssues);

  const renderImage = (image, index, showRemove = false, size = 'small') => {
    const sizeClasses = size === 'large' ? 'w-48 h-48' : 'w-16 h-16';
    
    if (image.type === 'image') {
      return (
        <div key={index} className="relative group">
          <img
            src={image.data}
            alt={image.name}
            className={`${sizeClasses} object-cover rounded-lg border border-gray-200`}
          />
          {showRemove && (
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      );
    } else {
      return (
        <div key={index} className="relative group">
          <div className={`${sizeClasses} bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center`}>
            <span className="text-4xl">📷</span>
          </div>
          {showRemove && (
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      );
    }
  };

  // Updated function to handle camera capture with new camera component
  const handleCameraCapture = () => {
    setShowCamera(true);
  };

  // Handle camera capture result
  const handleCameraCaptureResult = (imageData) => {
    setIssueForm(prev => ({
      ...prev,
      images: [...prev.images, imageData]
    }));
    getCurrentLocation();
    setShowCamera(false);
  };

  // Handle no issue detected modal actions
  const handleRetakePhoto = () => {
    setShowNoIssueModal(false);
    // Clear current images and open camera
    setIssueForm(prev => ({ ...prev, images: [] }));
    setShowCamera(true);
  };

  const handleUploadNewImage = () => {
    setShowNoIssueModal(false);
    // Clear current images - user can then use upload button
    setIssueForm(prev => ({ ...prev, images: [] }));
    showNotification('info', 'Upload New Image', 'Please select a different image that clearly shows the maintenance issue.');
  };

  // Add this function to handle gallery upload
  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imageData = {
          type: 'image',
          data: ev.target.result,
          name: file.name,
          file: file // store file object
        };
        setIssueForm(prev => ({
          ...prev,
          images: [...prev.images, imageData]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Add this function to remove an image from the issueForm
  const removeImage = (index) => {
    setIssueForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Redirect to login logic
  if (redirectToLogin) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚡ Fixify.AI
              </h1>
              <span className="hidden sm:inline ml-4 text-gray-500">|</span>
              <span className="hidden sm:inline ml-4 text-gray-700 font-medium">User Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  🔔
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="p-3 sm:p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-3 sm:p-4 text-center text-gray-500">No notifications to show.</div>
                      ) : (
                        notifications.map(notification => (
                          <div key={notification.id || notification.message} className="p-3 sm:p-4 border-b border-gray-50 hover:bg-gray-50">
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Profile */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500">User</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm sm:text-lg">
                  {currentUser?.avatar}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setRedirectToLogin(true);
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingData ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-lg text-gray-500">Loading data...</div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
                  {currentUser?.avatar}
                </div>
                <h3 className="font-semibold text-gray-900">{currentUser?.name}</h3>
                <p className="text-sm text-gray-500">{currentUser?.email}</p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{currentUser?.issuesReported}</div>
                    <div className="text-sm text-gray-600">Issues Reported</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{currentUser?.issuesResolved}</div>
                    <div className="text-sm text-gray-600">Issues Resolved</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowCreateIssue(true)}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all"
              >
                + Report New Issue
              </button>

              {/* WhatsApp Button */}
              <div className="mt-3">
                <WhatsAppButton
                  userEmail={currentUser.email}
                  onSuccess={(result) => showNotification('success', 'WhatsApp Message Sent!', 'Check your WhatsApp for instructions on how to report issues.')}
                  onError={(error) => showNotification('error', 'WhatsApp Error', error)}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 ${statsUpdated ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}`}>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">
                    ⏳
                  </div>
                  <div className="ml-4">
                    <div className={`text-2xl font-bold text-gray-900 transition-all duration-500 ${statsUpdated ? 'scale-110 text-yellow-600' : ''}`}>
                      {pendingCount}
                    </div>
                    <div className="text-sm text-gray-600">Pending Issues</div>
                  </div>
                </div>
              </div>

              <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 ${statsUpdated ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}`}>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    🔄
                  </div>
                  <div className="ml-4">
                    <div className={`text-2xl font-bold text-gray-900 transition-all duration-500 ${statsUpdated ? 'scale-110 text-blue-600' : ''}`}>
                      {inProgressCount}
                    </div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                </div>
              </div>

              <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 ${statsUpdated ? 'ring-2 ring-green-400 ring-opacity-75' : ''}`}>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                    ✅
                  </div>
                  <div className="ml-4">
                    <div className={`text-2xl font-bold text-gray-900 transition-all duration-500 ${statsUpdated ? 'scale-110 text-green-600' : ''}`}>
                      {completedCount}
                    </div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">My Issues</h2>
                  <button
                    onClick={() => setShowCreateIssue(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    + New Issue
                  </button>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Active Issues ({activeCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {filteredIssues.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No issues to show.</div>
                ) : (
                  filteredIssues.map(issue => (
                    <div key={issue.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">{getCategoryIcon(issue.category)}</span>
                            <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                              {issue.status.replace('-', ' ').toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                              {issue.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{issue.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                            {/* Don't display location value, just show captured status and tick */}
                            <span>📍 Location captured <span className="text-green-600">✔️</span></span>
                            <span>📅 {issue.dateReported}</span>
                            {issue.technician && <span>👨‍🔧 {issue.technician}</span>}
                            {issue.estimatedTime && <span>⏱️ {issue.estimatedTime}</span>}
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm text-gray-500">Images:</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {issue.images.map((img, idx) => renderImage(img, idx))}
                          </div>
                        </div>
                        <div className="ml-4">
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Create Issue Modal */}
      {showCreateIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Report Issue</h2>
              <button
                onClick={() => setShowCreateIssue(false)}
                className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl p-1"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {/* Capture Issue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capture Issue</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all min-h-[100px] sm:min-h-[120px]"
                  >
                    <div className="text-3xl sm:text-4xl mb-2">📷</div>
                    <div className="text-sm font-medium text-gray-700">Take Photo</div>
                    <div className="text-xs text-gray-500 text-center">Use camera to capture issue</div>
                  </button>
                  <label className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer min-h-[100px] sm:min-h-[120px]">
                    <div className="text-3xl sm:text-4xl mb-2">🖼️</div>
                    <div className="text-sm font-medium text-gray-700">Upload Photo</div>
                    <div className="text-xs text-gray-500 text-center">Choose from gallery</div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {issueForm.images.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <div className="text-sm font-medium text-gray-700 mb-4 text-center">Selected Images:</div>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {issueForm.images.map((img, idx) => renderImage(img, idx, true, 'large'))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="space-y-3">
                  {!issueForm.location && (
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all disabled:opacity-50"
                    >
                      <span>📍</span>
                      <span>{isGettingLocation ? 'Getting Location...' : 'Auto-detect Location'}</span>
                    </button>
                  )}
                  {!issueForm.location && <div className="text-center text-gray-500 text-sm">or</div>}
                  <input
                    type="text"
                    name="location"
                    value={typeof issueForm.location === 'object' && issueForm.location !== null ? `${issueForm.location.lat}, ${issueForm.location.lng}` : issueForm.location}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter location manually"
                  />
                  {issueForm.location && (
                    <button
                      type="button"
                      onClick={() => setIssueForm(prev => ({ ...prev, location: '' }))}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear and re-enter location
                    </button>
                  )}
                </div>
              </div>

              {/* Floor and Sector - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor (optional)</label>
                  <input
                    type="text"
                    name="floor"
                    value={issueForm.floor}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter floor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sector (optional)</label>
                  <input
                    type="text"
                    name="sector"
                    value={issueForm.sector}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter sector"
                  />
                </div>
              </div>

              {/* Other Instructions (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Instructions (optional)</label>
                <textarea
                  name="instructions"
                  value={issueForm.instructions}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
                  placeholder="Enter any additional details or instructions..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateIssue(false)}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleDetectAndCreateIssue}
                  className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show comprehensive issue result after creation */}
      {latestIssueResult && latestIssueResult.success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Issue Created Successfully!</h2>
              <button
                onClick={() => setLatestIssueResult(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ×
              </button>
            </div>

            {/* Issue Details Section */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Issue Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Issue ID:</span> <span className="text-blue-600">{latestIssueResult.issueDetails?.id}</span></div>
                  <div><span className="font-medium text-gray-700">Type:</span> <span className="capitalize">{latestIssueResult.issueDetails?.category}</span></div>
                  <div><span className="font-medium text-gray-700">Title:</span> {latestIssueResult.issueDetails?.title}</div>
                  <div><span className="font-medium text-gray-700">Priority:</span> <span className="capitalize">{latestIssueResult.issueDetails?.priority}</span></div>
                  <div><span className="font-medium text-gray-700">Status:</span> <span className="capitalize">{latestIssueResult.issueDetails?.status}</span></div>
                  <div><span className="font-medium text-gray-700">Date:</span> {latestIssueResult.issueDetails?.dateReported}</div>
                  {latestIssueResult.issueDetails?.floor && (
                    <div><span className="font-medium text-gray-700">Floor:</span> {latestIssueResult.issueDetails.floor}</div>
                  )}
                  {latestIssueResult.issueDetails?.sector && (
                    <div><span className="font-medium text-gray-700">Sector:</span> {latestIssueResult.issueDetails.sector}</div>
                  )}
                </div>
                {latestIssueResult.issueDetails?.description && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600 mt-1">{latestIssueResult.issueDetails.description}</p>
                  </div>
                )}
              </div>

              {/* Assignment Details Section */}
              <div className={`rounded-xl p-6 ${latestIssueResult.assignment?.assigned ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${latestIssueResult.assignment?.assigned ? 'text-green-900' : 'text-yellow-900'}`}>
                  {latestIssueResult.assignment?.assigned ? '✅ Technician Assigned' : '⏳ Pending Assignment'}
                </h3>

                {latestIssueResult.assignment?.assigned ? (
                  <div className="space-y-3">
                    {latestIssueResult.assignment.technicianDetails && (
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">👨‍🔧 Technician Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium">Name:</span> {latestIssueResult.assignment.technicianDetails.name}</div>
                          <div><span className="font-medium">Phone:</span> {latestIssueResult.assignment.technicianDetails.phone}</div>
                          <div><span className="font-medium">Email:</span> {latestIssueResult.assignment.technicianDetails.email}</div>
                          {latestIssueResult.assignment.eta && (
                            <div><span className="font-medium">ETA:</span> <span className="text-green-600 font-semibold">{latestIssueResult.assignment.eta}</span></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-yellow-700">
                    <p>No technician is currently available for this type of issue. Your request has been queued and will be assigned as soon as a technician becomes available.</p>
                  </div>
                )}
              </div>

              {/* Success Message */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 text-center font-medium">{latestIssueResult.message}</p>
              </div>
            </div>

            <div className="mt-8 flex gap-4 justify-end">
              <button
                onClick={() => setLatestIssueResult(null)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Stats Update */}
      {showStatsToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-in-out">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <span className="font-medium">Statistics updated!</span>
          </div>
        </div>
      )}

      {/* Camera Capture Component */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCaptureResult}
        onClose={() => setShowCamera(false)}
      />

      {/* No Issue Detected Modal */}
      <NoIssueDetectedModal
        isOpen={showNoIssueModal}
        onClose={() => setShowNoIssueModal(false)}
        onRetakePhoto={handleRetakePhoto}
        onUploadNew={handleUploadNewImage}
      />

      {/* Notification Toast */}
      <NotificationToast
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        duration={notification.duration}
        onClose={hideNotification}
      />
    </div>
  );
};

export default FixifyUserDashboard;