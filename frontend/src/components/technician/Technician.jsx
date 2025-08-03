import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Star, Clock, CheckCircle, Phone, Mail, AlertCircle, Upload, FileImage, Play, Pause, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../contexts/CurrentUserContext';
import { createApiUrl } from '../../utils/api';

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useCurrentUser();

  const [technicianData, setTechnicianData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  const [assignedTasks, setAssignedTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Photo upload states
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoType, setPhotoType] = useState(''); // 'before', 'progress', 'after'
  const [photoDescription, setPhotoDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Task action states
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Check authentication and fetch technician profile
  React.useEffect(() => {
    const checkAuthentication = async () => {
      if (!currentUser) {
        setRedirectToLogin(true);
        return;
      }

      // Check if user is a technician
      if (currentUser.role !== 'technician') {
        alert('Access denied. This page is for technicians only.');
        navigate('/');
        return;
      }

      // Fetch technician profile
      try {
        setIsLoadingProfile(true);
        const response = await fetch(createApiUrl(`api/technician/profile/${currentUser.email}`));
        if (response.ok) {
          const data = await response.json();
          setTechnicianData(data.technician);
        } else {
          // If no profile found, create default profile
          const defaultProfile = {
            id: currentUser.id || 'tech_001',
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone || '+91 9876543210',
            status: 'available',
            skills: ['General Maintenance'],
            location: { lat: 17.4371, lng: 78.4485 },
            rating: 4.0,
            totalTasks: 0,
            completedTasks: 0,
            joinedAt: new Date().toISOString()
          };
          setTechnicianData(defaultProfile);
        }
      } catch (error) {
        console.error('Error fetching technician profile:', error);
        // Use default profile on error
        const defaultProfile = {
          id: currentUser.id || 'tech_001',
          name: currentUser.name,
          email: currentUser.email,
          phone: '+91 9876543210',
          status: 'available',
          skills: ['General Maintenance'],
          location: { lat: 17.4371, lng: 78.4485 },
          rating: 4.0,
          totalTasks: 0,
          completedTasks: 0,
          joinedAt: new Date().toISOString()
        };
        setTechnicianData(defaultProfile);
      }
      setIsLoadingProfile(false);
    };

    checkAuthentication();
  }, [currentUser, navigate]);

  // Fetch assigned tasks from backend
  const fetchAssignedTasks = async () => {
    if (!technicianData?.id) return;
    setIsLoadingTasks(true);
    try {
      const response = await fetch(createApiUrl(`api/technician/tasks/${technicianData.id}`));
      const data = await response.json();
      if (response.ok) {
        // Sort tasks by priority and urgency
        const sortedTasks = sortTasksByPriorityAndUrgency(data.tasks || []);
        setAssignedTasks(sortedTasks);

        // Extract completed tasks for recent history
        const completedTasks = (data.tasks || [])
          .filter(task => task.status === 'completed')
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          .slice(0, 5); // Get last 5 completed tasks
        setRecentTasks(completedTasks);
      } else {
        console.error('Failed to fetch tasks:', data.error);
        setAssignedTasks([]);
        setRecentTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setAssignedTasks([]);
    }
    setIsLoadingTasks(false);
  };

  // Sort tasks by priority and urgency
  const sortTasksByPriorityAndUrgency = (tasks) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    const statusOrder = { 'assigned': 3, 'ongoing': 2, 'pending': 1, 'completed': 0 };

    return tasks.sort((a, b) => {
      // First sort by status (assigned/ongoing tasks first)
      const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // Then by priority
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by creation time (newer first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  // Load tasks when technician data is available
  React.useEffect(() => {
    if (technicianData?.id) {
      fetchAssignedTasks();
    }
  }, [technicianData?.id]);

  // Recent completed tasks will be fetched from the same API
  const [recentTasks, setRecentTasks] = useState([]);

  const handleStatusChange = (newStatus) => {
    setTechnicianData(prev => ({ ...prev, status: newStatus }));
  };

  // Initiate a task
  const handleInitiateTask = async (taskId) => {
    setIsUpdatingTask(true);
    try {
      const response = await fetch(createApiUrl(`api/technician/task/${taskId}/initiate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: technicianData.id })
      });

      if (response.ok) {
        // Update local state
        setAssignedTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, status: 'ongoing', startedAt: new Date().toISOString() } : task
        ));
        alert('Task initiated successfully!');
      } else {
        const data = await response.json();
        alert('Failed to initiate task: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error initiating task:', error);
      alert('Network error. Please try again.');
    }
    setIsUpdatingTask(false);
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setIsUpdatingTask(true);
    try {
      const response = await fetch(createApiUrl(`api/technician/task/${taskId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          technicianId: technicianData.id,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        })
      });

      if (response.ok) {
        // Update local state
        setAssignedTasks(prev => prev.map(task =>
          task.id === taskId ? {
            ...task,
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : task.completedAt
          } : task
        ));

        if (newStatus === 'completed') {
          setTechnicianData(prev => ({
            ...prev,
            completedTasks: prev.completedTasks + 1,
            status: 'available'
          }));
        }

        alert(`Task ${newStatus} successfully!`);
      } else {
        const data = await response.json();
        alert('Failed to update task: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Network error. Please try again.');
    }
    setIsUpdatingTask(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  // AI verification for photos
  const verifyPhotoWithAI = async (file, taskId, photoType) => {
    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('taskId', taskId);
      formData.append('photoType', photoType);
      formData.append('description', photoDescription);

      const response = await fetch(createApiUrl('api/technician/verify-photo'), {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        setVerificationResult(result);
        return result;
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Photo verification error:', error);
      setVerificationResult({ success: false, message: error.message });
      return { success: false, message: error.message };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (selectedFiles.length === 0 || !selectedTask) return;

    setIsVerifying(true);
    try {
      for (const file of selectedFiles) {
        const verification = await verifyPhotoWithAI(file, selectedTask.id, photoType);

        if (verification.success) {
          // Update task status based on photo type and verification
          if (photoType === 'before' && verification.verified) {
            await handleUpdateTaskStatus(selectedTask.id, 'ongoing');
          } else if (photoType === 'after' && verification.verified) {
            await handleUpdateTaskStatus(selectedTask.id, 'completed');
          }

          // Add photo to task
          const newPhoto = {
            id: Date.now(),
            file: file,
            type: photoType,
            description: photoDescription || `${photoType} photo`,
            timestamp: new Date().toISOString(),
            url: URL.createObjectURL(file),
            verified: verification.verified,
            aiAnalysis: verification.analysis
          };

          setAssignedTasks(prev => prev.map(task =>
            task.id === selectedTask.id
              ? { ...task, photos: [...(task.photos || []), newPhoto] }
              : task
          ));
        }
      }

      setSelectedFiles([]);
      setPhotoDescription('');
      setPhotoType('');
      setShowPhotoUpload(false);
      setVerificationResult(null);

    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos. Please try again.');
    }
    setIsVerifying(false);
  };

  const handleTaskStatusUpdate = (status) => {
    setCurrentTask(prev => ({ ...prev, status }));
    if (status === 'completed') {
      setTechnicianData(prev => ({
        ...prev,
        assignedTaskId: null,
        status: 'available',
        totalTasks: prev.totalTasks + 1
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskStatusColor = (status) => {
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
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffHours = Math.floor((now - past) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Redirect to login if not authenticated
  if (redirectToLogin) {
    window.location.href = '/';
    return null;
  }

  // Show loading screen while checking authentication or loading profile
  if (isLoadingProfile || !technicianData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Technician Dashboard</h2>
          <p className="text-gray-600">Please wait while we load your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚡ Fixify.AI
              </h1>
              <span className="ml-4 text-gray-600">Technician Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(technicianData.status)}`}></div>
                <select
                  value={technicianData.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {technicianData.name.charAt(0)}
                </div>
                <span className="font-medium text-gray-800">{technicianData.name}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile & Stats Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {technicianData.name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold text-gray-800">{technicianData.name}</h2>
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-semibold text-gray-800">{technicianData.rating}</span>
                  <span className="text-gray-600">({technicianData.totalTasks} tasks)</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(technicianData.status)} text-white`}>
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  {technicianData.status.charAt(0).toUpperCase() + technicianData.status.slice(1)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{technicianData.phone}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{technicianData.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Hyderabad, Telangana</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {technicianData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{technicianData.totalTasks}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{technicianData.rating}</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-600">15</div>
                  <div className="text-sm text-gray-600">This Month</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">98%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Task Filter */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">My Tasks</h3>
                <div className="flex space-x-2">
                  {['all', 'assigned', 'ongoing', 'completed'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-gray-600 text-sm">
                Tasks are ordered by priority and urgency. High priority and ongoing tasks appear first.
              </p>
            </div>

            {/* Task List */}
            <div className="space-y-4">
              {isLoadingTasks ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading your tasks...</p>
                </div>
              ) : assignedTasks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tasks Assigned</h3>
                  <p className="text-gray-600">You don't have any tasks assigned at the moment.</p>
                </div>
              ) : (
                assignedTasks
                  .filter(task => statusFilter === 'all' || task.status === statusFilter)
                  .map((task) => (
                    <div key={task.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-800">{task.title || task.issueType}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority} Priority
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                              {task.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{task.description || task.instructions}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>📋 {task.category || task.issueType}</span>
                            <span>📍 {task.location || task.userLocation}</span>
                            <span>📅 {formatTimeAgo(task.createdAt || task.assignedAt)}</span>
                            {task.floor && <span>🏢 {task.floor}</span>}
                            {task.sector && <span>🏗️ {task.sector}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Customer Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Email: <span className="font-medium text-gray-800">{task.userEmail}</span></p>
                            {task.customerPhone && (
                              <p className="text-gray-600">Phone: <span className="font-medium text-gray-800">{task.customerPhone}</span></p>
                            )}
                          </div>
                          <div>
                            {task.estimatedTime && (
                              <p className="text-gray-600">Est. Time: <span className="font-medium text-gray-800">{task.estimatedTime}</span></p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Task Actions */}
                      <div className="flex flex-wrap gap-3">
                        {task.status === 'assigned' && (
                          <button
                            onClick={() => handleInitiateTask(task.id)}
                            disabled={isUpdatingTask}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Task</span>
                          </button>
                        )}

                        {task.status === 'assigned' && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setPhotoType('before');
                              setShowPhotoUpload(true);
                            }}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Before Photo</span>
                          </button>
                        )}

                        {task.status === 'ongoing' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setPhotoType('progress');
                                setShowPhotoUpload(true);
                              }}
                              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Progress Photo</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setPhotoType('after');
                                setShowPhotoUpload(true);
                              }}
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Camera className="w-4 h-4" />
                              <span>After Photo</span>
                            </button>
                          </>
                        )}

                        <a
                          href={`mailto:${task.userEmail}`}
                          className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Contact</span>
                        </a>
                      </div>

                      {/* Task Photos */}
                      {task.photos && task.photos.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-semibold text-gray-800 mb-3">Photos ({task.photos.length})</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {task.photos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={photo.description}
                                  className="w-full h-20 object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                                  <div className="text-white text-xs opacity-0 group-hover:opacity-100 text-center p-2">
                                    <p className="font-medium">{photo.type}</p>
                                    <p>{formatTimeAgo(photo.timestamp)}</p>
                                    {photo.verified && <p className="text-green-300">✓ Verified</p>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            {/* Enhanced Photo Upload Modal */}
            {showPhotoUpload && selectedTask && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Upload {photoType.charAt(0).toUpperCase() + photoType.slice(1)} Photo
                    </h3>
                    <button
                      onClick={() => {
                        setShowPhotoUpload(false);
                        setSelectedFiles([]);
                        setPhotoDescription('');
                        setPhotoType('');
                        setVerificationResult(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  {/* Task Info */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-1">{selectedTask.title || selectedTask.issueType}</h4>
                    <p className="text-blue-700 text-sm">{selectedTask.description || selectedTask.instructions}</p>
                  </div>

                  {/* Photo Type Info */}
                  <div className="mb-4">
                    <div className={`p-3 rounded-lg ${
                      photoType === 'before' ? 'bg-purple-50 border border-purple-200' :
                      photoType === 'progress' ? 'bg-blue-50 border border-blue-200' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <p className="text-sm font-medium">
                        {photoType === 'before' && '📸 Take a photo of the issue before starting work'}
                        {photoType === 'progress' && '🔄 Document your progress during the repair'}
                        {photoType === 'after' && '✅ Take a photo after completing the repair'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        AI will verify this photo to update task status automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Photos
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        placeholder={`Describe the ${photoType} state...`}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>

                    {selectedFiles.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Selected files:</p>
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                              <FileImage className="w-4 h-4" />
                              <span>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verification Result */}
                    {verificationResult && (
                      <div className={`p-4 rounded-lg ${
                        verificationResult.success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">
                            {verificationResult.success ? '✅' : '❌'}
                          </span>
                          <span className={`font-medium ${
                            verificationResult.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            AI Verification {verificationResult.success ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <p className={`text-sm ${
                          verificationResult.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {verificationResult.message}
                        </p>
                        {verificationResult.analysis && (
                          <p className="text-xs text-gray-600 mt-2">
                            AI Analysis: {verificationResult.analysis}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowPhotoUpload(false);
                        setSelectedFiles([]);
                        setPhotoDescription('');
                        setPhotoType('');
                        setVerificationResult(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={selectedFiles.length === 0 || isVerifying}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Upload & Verify</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Tasks */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Recent Tasks</h3>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{task.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📋 {task.category}</span>
                          <span>👤 {task.customerName}</span>
                          <span>📅 {formatTimeAgo(task.completedAt)}</span>
                        </div>
                      </div>
                      {task.rating && (
                        <div className="flex items-center space-x-1 ml-4">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-800">{task.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;