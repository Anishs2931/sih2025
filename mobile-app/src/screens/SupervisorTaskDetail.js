import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';

export default function SupervisorTaskDetail({ navigation, route }) {
  const { user } = useUser();
  const { taskId } = route.params;
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const getValidStatusOptions = (currentStatus) => {
    const allStatusOptions = [
      { value: 'pending', label: 'Pending', color: '#FF9500', icon: '⏳' },
      { value: 'ongoing', label: 'Ongoing', color: '#007AFF', icon: '🔄' },
      { value: 'resolved', label: 'Resolved', color: '#34C759', icon: '✅' },
    ];

    const currentStatusLower = (currentStatus || 'pending').toLowerCase();
    
    switch (currentStatusLower) {
      case 'pending':
        return allStatusOptions.filter(opt => opt.value === 'pending' || opt.value === 'ongoing');
      case 'ongoing':
      case 'assigned':
        return allStatusOptions.filter(opt => opt.value === 'ongoing' || opt.value === 'resolved');
      case 'resolved':
      case 'completed':
        return allStatusOptions.filter(opt => opt.value === 'resolved');
      default:
        return allStatusOptions.filter(opt => opt.value === 'pending' || opt.value === 'ongoing');
    }
  };

  // Fetch task details
  const fetchTaskDetails = async () => {
    try {
      const response = await fetch(`http://192.168.1.4:3000/api/tasks/${taskId}`);
      const data = await response.json();
      
      if (data.success) {
        setTask(data.task);
      } else {
        Alert.alert('Error', 'Failed to load task details');
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  // Photo picker function
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const selectImageSource = () => {
    Alert.alert(
      'Select Image Source',
      'Choose an option to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Upload photo function
  const uploadPhoto = async (imageUri) => {
    try {
      setUploadingPhoto(true);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'status_update_photo.jpg',
      });

      const response = await fetch('http://192.168.1.4:3000/api/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let React Native set it automatically with boundary
      });

      const data = await response.json();
      
      if (data.success) {
        return data.imageId;
      } else {
        throw new Error(data.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Bill upload function
  const pickAndUploadBillImage = async () => {
    Alert.alert(
      'Add Bill/Receipt',
      'Choose how to add the bill or receipt image',
      [
        { text: 'Camera', onPress: takeBillPhoto },
        { text: 'Photo Library', onPress: pickBillImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takeBillPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadBillImage(result.assets[0].uri);
    }
  };

  const pickBillImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Gallery permission is required to pick photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadBillImage(result.assets[0].uri);
    }
  };

  const uploadBillImage = async (imageUri) => {
    try {
      setUploadingPhoto(true);
      
      // First upload the image
      const imageId = await uploadPhoto(imageUri);
      
      // Then upload as bill image for this task
      const billResponse = await fetch(`http://192.168.1.4:3000/api/tasks/${taskId}/bill-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: imageId,
          supervisorEmail: user.email,
        }),
      });

      const billData = await billResponse.json();
      
      if (billData.success) {
        Alert.alert('Success', 'Bill/receipt uploaded successfully!');
        // Refresh task data to show the new bill image
        await fetchTaskDetails();
      } else {
        throw new Error(billData.message || 'Failed to upload bill image');
      }
    } catch (error) {
      console.error('Error uploading bill image:', error);
      Alert.alert('Error', `Failed to upload bill/receipt: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Update task status with photo requirement
  const updateTaskStatus = async (newStatus) => {
    const currentStatusLower = (task.status || 'pending').toLowerCase();
    const newStatusLower = newStatus.toLowerCase();
    
    // Check if photo is required for this status change
    const requiresPhoto = (
      (currentStatusLower === 'pending' && newStatusLower === 'ongoing') ||
      (currentStatusLower === 'ongoing' && newStatusLower === 'resolved') ||
      (currentStatusLower === 'assigned' && newStatusLower === 'ongoing') ||
      (currentStatusLower === 'assigned' && newStatusLower === 'resolved')
    );

    if (requiresPhoto && !selectedImage) {
      Alert.alert(
        'Photo Required',
        `A photo is required to move from ${currentStatusLower} to ${newStatusLower}. Please add a photo first.`,
        [{ text: 'OK', onPress: selectImageSource }]
      );
      return;
    }

    try {
      setUpdating(true);
      let imageId = null;

      // Upload photo if one is selected
      if (selectedImage) {
        imageId = await uploadPhoto(selectedImage.uri);
      }

      const supervisorId = user?.id || user?.userId;
      const response = await fetch(`http://192.168.1.4:3000/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          supervisorId: supervisorId,
          imageId: imageId,
          imageType: newStatusLower === 'ongoing' ? 'initiation' : 'completion'
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchTaskDetails(); // Refresh task details
        setShowStatusModal(false);
        setSelectedImage(null);
        Alert.alert('Success', `Task status updated to ${newStatus}`);
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  // Add supervisor note
  const addSupervisorNote = async () => {
    if (!newNote.trim()) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`http://192.168.1.4:3000/api/tasks/${taskId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote.trim(),
          supervisorId: user.userId,
          supervisorName: user.name,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedNotes = [...(task.supervisorNotes || []), {
          note: newNote.trim(),
          addedBy: user.name,
          addedAt: new Date().toISOString(),
        }];
        setTask({ ...task, supervisorNotes: updatedNotes });
        setNewNote('');
        setShowNotesModal(false);
        Alert.alert('Success', 'Note added successfully');
      } else {
        Alert.alert('Error', 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const getStatusColor = (status) => {
    const allStatusOptions = [
      { value: 'pending', label: 'Pending', color: '#FF9500', icon: '⏳' },
      { value: 'ongoing', label: 'Ongoing', color: '#007AFF', icon: '🔄' },
      { value: 'resolved', label: 'Resolved', color: '#34C759', icon: '✅' },
      { value: 'assigned', label: 'Assigned', color: '#007AFF', icon: '👷' },
    ];
    const option = allStatusOptions.find(opt => opt.value === status?.toLowerCase());
    return option?.color || '#8E8E93';
  };

  const getStatusIcon = (status) => {
    const allStatusOptions = [
      { value: 'pending', label: 'Pending', color: '#FF9500', icon: '⏳' },
      { value: 'ongoing', label: 'Ongoing', color: '#007AFF', icon: '🔄' },
      { value: 'resolved', label: 'Resolved', color: '#34C759', icon: '✅' },
      { value: 'assigned', label: 'Assigned', color: '#007AFF', icon: '👷' },
    ];
    const option = allStatusOptions.find(opt => opt.value === status?.toLowerCase());
    return option?.icon || '📋';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const StatusModal = () => {
    const validStatusOptions = getValidStatusOptions(task?.status);
    const currentStatusLower = (task?.status || 'pending').toLowerCase();

    return (
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowStatusModal(false);
          setSelectedImage(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Task Status</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedImage(null);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Photo requirement info */}
            {((currentStatusLower === 'pending') || (currentStatusLower === 'ongoing') || (currentStatusLower === 'assigned')) && (
              <View style={styles.photoRequirementInfo}>
                <Text style={styles.photoRequirementTitle}>📸 Photo Required</Text>
                <Text style={styles.photoRequirementText}>
                  {currentStatusLower === 'pending' ? 
                    'A photo is required when starting work (Pending → Ongoing)' : 
                    'A photo is required when completing work (Ongoing → Resolved)'}
                </Text>
              </View>
            )}

            {/* Photo selection section */}
            <View style={styles.photoSection}>
              <Text style={styles.photoSectionTitle}>Status Update Photo</Text>
              {selectedImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addPhotoButton}
                  onPress={selectImageSource}
                >
                  <Text style={styles.addPhotoIcon}>📷</Text>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statusOptions}>
              {validStatusOptions.map((option) => {
                const isCurrentStatus = task?.status?.toLowerCase() === option.value.toLowerCase();
                const canSelect = isCurrentStatus || selectedImage || 
                  !((currentStatusLower === 'pending' && option.value === 'ongoing') || 
                    ((currentStatusLower === 'ongoing' || currentStatusLower === 'assigned') && option.value === 'resolved'));

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      isCurrentStatus && styles.statusOptionCurrent,
                      !canSelect && styles.statusOptionDisabled
                    ]}
                    onPress={() => canSelect ? updateTaskStatus(option.value) : null}
                    disabled={updating || !canSelect}
                  >
                    <Text style={styles.statusIcon}>{option.icon}</Text>
                    <Text style={[styles.statusLabel, { color: option.color }]}>
                      {option.label}
                    </Text>
                    {isCurrentStatus && (
                      <Text style={styles.currentText}>(Current)</Text>
                    )}
                    {!canSelect && !isCurrentStatus && (
                      <Text style={styles.disabledText}>(Photo Required)</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {uploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading photo...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const NotesModal = () => (
    <Modal
      visible={showNotesModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowNotesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Supervisor Note</Text>
            <TouchableOpacity 
              onPress={() => setShowNotesModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.noteInput}
            placeholder="Add your note about this task..."
            value={newNote}
            onChangeText={setNewNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <TouchableOpacity 
            style={[styles.addNoteButton, (!newNote.trim() || updating) && styles.addNoteButtonDisabled]}
            onPress={addSupervisorNote}
            disabled={!newNote.trim() || updating}
          >
            <Text style={styles.addNoteButtonText}>
              {updating ? 'Adding...' : 'Add Note'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowStatusModal(true)}
            style={styles.headerActionButton}
            disabled={updating}
          >
            <Text style={styles.headerActionText}>Status</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Task Header Card */}
        <View style={styles.card}>
          <View style={styles.taskHeaderInfo}>
            <Text style={styles.taskTitle}>{task.issueType || task.title || 'Task'}</Text>
            <View style={styles.taskBadges}>
              <View style={[styles.badge, { backgroundColor: getPriorityColor(task.priority) }]}>
                <Text style={styles.badgeText}>{(task.priority || 'medium').toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
                <Text style={styles.badgeText}>{getStatusIcon(task.status)} {(task.status || 'pending').toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.taskId}>Task ID: {task.id}</Text>
        </View>

        {/* Task Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Location:</Text>
            <Text style={styles.infoValue}>{task.userLocation || task.location || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🏛️ Department:</Text>
            <Text style={styles.infoValue}>{task.department || 'General'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🕐 Reported:</Text>
            <Text style={styles.infoValue}>{formatDate(task.createdAt)}</Text>
          </View>
          {task.instructions && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📝 Instructions:</Text>
              <Text style={styles.infoValue}>{task.instructions}</Text>
            </View>
          )}
        </View>

        {/* Report Images */}
        {task.report_images && task.report_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Report Images ({task.report_images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
              {task.report_images.map((imageId, index) => (
                <TouchableOpacity key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Picture IDs (if different from report_images) */}
        {task.pictureIds && task.pictureIds.length > 0 && !task.report_images && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Task Images ({task.pictureIds.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
              {task.pictureIds.map((imageId, index) => (
                <TouchableOpacity key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Initiation Images */}
        {task.initiation_images && task.initiation_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Work Initiation Photos ({task.initiation_images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
              {task.initiation_images.map((imageId, index) => (
                <TouchableOpacity key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Finished Images */}
        {task.finished_images && task.finished_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Work Completion Photos ({task.finished_images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
              {task.finished_images.map((imageId, index) => (
                <TouchableOpacity key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bill Images */}
        {task.bill_images && task.bill_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Bills & Receipts ({task.bill_images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
              {task.bill_images.map((imageId, index) => (
                <TouchableOpacity key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bill Upload Section - Only for supervisors when task is resolved */}
        {user?.role === 'supervisor' && (task.status?.toLowerCase() === 'resolved' || task.status?.toLowerCase() === 'completed') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Upload Bills & Receipts</Text>
            <Text style={styles.cardSubtitle}>Upload bills and receipts for completed work</Text>
            <TouchableOpacity 
              style={styles.uploadBillButton}
              onPress={() => pickAndUploadBillImage()}
              disabled={uploadingPhoto}
            >
              <Text style={styles.uploadBillButtonText}>
                {uploadingPhoto ? '📤 Uploading...' : '📷 Add Bill/Receipt'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assignment Information */}
        {task.assignedTechnician && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Technician</Text>
            <View style={styles.technicianInfo}>
              <Text style={styles.technicianName}>{task.technicianName || 'Technician'}</Text>
              {task.technicianPhone && (
                <Text style={styles.technicianPhone}>📞 {task.technicianPhone}</Text>
              )}
              {task.estimatedTime && (
                <Text style={styles.estimatedTime}>⏱️ ETA: {task.estimatedTime}</Text>
              )}
            </View>
          </View>
        )}

        {/* Supervisor Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Supervisor Notes</Text>
            <TouchableOpacity 
              onPress={() => setShowNotesModal(true)}
              style={styles.addNoteIconButton}
            >
              <Text style={styles.addNoteIcon}>+</Text>
            </TouchableOpacity>
          </View>
          
          {task.supervisorNotes && task.supervisorNotes.length > 0 ? (
            <View style={styles.notesList}>
              {task.supervisorNotes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.noteAuthor}>
                    By {note.addedBy} on {formatDate(note.addedAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noNotesText}>No notes added yet. Tap + to add a note.</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.updateStatusButton]}
            onPress={() => setShowStatusModal(true)}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.addNoteButton]}
            onPress={() => setShowNotesModal(true)}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <StatusModal />
      <NotesModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.gray,
    marginBottom: spacing.lg,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackButton: {
    paddingVertical: spacing.sm,
  },
  headerBackText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taskHeaderInfo: {
    marginBottom: spacing.md,
  },
  taskTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  taskBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  taskId: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontWeight: typography.weights.medium,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    fontWeight: typography.weights.medium,
    width: 120,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.black,
    flex: 1,
    lineHeight: 20,
  },
  imagesList: {
    marginTop: spacing.sm,
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  taskImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
  },
  technicianInfo: {
    gap: spacing.sm,
  },
  technicianName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  technicianPhone: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  estimatedTime: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  addNoteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNoteIcon: {
    fontSize: typography.sizes.lg,
    color: colors.black,
    fontWeight: typography.weights.bold,
  },
  notesList: {
    gap: spacing.md,
  },
  noteItem: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  noteAuthor: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
  },
  noNotesText: {
    fontSize: typography.sizes.md,
    color: colors.gray,
    fontStyle: 'italic',
  },
  actionButtons: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  updateStatusButton: {
    backgroundColor: '#007AFF',
  },
  addNoteButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
  },
  statusOptions: {
    gap: spacing.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  statusOptionCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.black,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  statusLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  currentText: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontStyle: 'italic',
  },
  noteInput: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    minHeight: 100,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addNoteButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addNoteButtonDisabled: {
    backgroundColor: colors.gray,
  },
  addNoteButtonText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  // Photo functionality styles
  photoRequirementInfo: {
    backgroundColor: colors.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  photoRequirementTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  photoRequirementText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
  },
  photoSection: {
    marginBottom: spacing.lg,
  },
  photoSectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  addPhotoButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.tertiary,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  addPhotoText: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    fontWeight: typography.weights.medium,
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  statusOptionDisabled: {
    opacity: 0.5,
  },
  disabledText: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
    fontStyle: 'italic',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  uploadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.gray,
  },
  uploadBillButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  uploadBillButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
});
