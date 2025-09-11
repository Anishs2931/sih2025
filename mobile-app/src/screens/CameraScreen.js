import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ScrollView, 
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { colors, spacing, typography } from '../utils/theme';
import { useUser } from '../contexts/UserContext';
import { useLocation } from '../contexts/LocationContext';
import { locationAPI } from '../utils/api';

// Get the base URL for API calls
const API_BASE_URL = 'http://192.168.1.4:3000/api';

export default function CameraScreen() {
  const { user } = useUser();
  const { municipality, locationData, updateLocation } = useLocation();
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [localMunicipality, setLocalMunicipality] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [textDescription, setTextDescription] = useState('');
  const [recording, setRecording] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [issueResult, setIssueResult] = useState(null);

  useEffect(() => {
    getLocationPermission();
    // If municipality is already available from context, use it
    if (municipality && locationData) {
      setLocalMunicipality(municipality);
      setFullAddress(locationData.fullAddress || '');
    } else {
      // Otherwise, get current location
      getCurrentLocation();
    }
  }, [municipality, locationData]);

  const getLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required for issue reporting.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for issue reporting.');
        setLocalMunicipality('Permission denied');
        setFullAddress('Location permission required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);
      
      // Get municipality from coordinates using Google Maps API
      const response = await locationAPI.getMunicipality({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (response.data.success) {
        const municipalityName = response.data.data.municipality || 'Unknown Municipality';
        const address = response.data.data.fullAddress || 'Address not available';
        setLocalMunicipality(municipalityName);
        setFullAddress(address);
        
        // Update the global context with this location
        updateLocation({
          ...response.data.data,
          coordinates: { 
            latitude: location.coords.latitude, 
            longitude: location.coords.longitude 
          },
          source: 'gps_maps'
        });
      } else {
        setLocalMunicipality('Location detection failed');
        setFullAddress('Address not available');
      }
    } catch (error) {
      console.log('Location error:', error);
      setLocalMunicipality('Location unavailable');
      setFullAddress('Address could not be detected');
      Alert.alert('Location Error', 'Unable to detect location. Please try again or enter manually.');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera roll permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    setAudioUri(uri);
  };

  const submitIssue = async () => {
    if (!image) {
      Alert.alert('Missing Information', 'Please capture or select an image of the issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting issue submission...');
      const formData = new FormData();
      
      // Add image to form data
      formData.append('image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'issue_image.jpg',
      });

      // Prepare location data
      const locationData = {
        location: useManualLocation ? manualLocation : (fullAddress || 'Address not available'),
        municipality: localMunicipality,
        coordinates: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : null,
        instructions: textDescription,
        userEmail: user?.email || user?.uniqueUserId,
        manual: useManualLocation
      };

      console.log('Location data:', locationData);

      formData.append('location', JSON.stringify(locationData));

      // Add audio if available
      if (audioUri) {
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'issue_audio.m4a',
        });
      }

      console.log('Submitting to:', `${API_BASE_URL}/issue/detect`);
      const response = await fetch(`${API_BASE_URL}/issue/detect`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        setIssueResult(result);
        setShowSuccessModal(true);
        // Reset form
        setImage(null);
        setTextDescription('');
        setAudioUri(null);
        setManualLocation('');
        setUseManualLocation(false);
      } else if (result.noIssueDetected) {
        Alert.alert(
          'No Issue Detected', 
          result.message || 'No maintenance problem was detected in the image. Please try again with a clearer image showing the issue.'
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit issue. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit issue. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Report Issue</Text>
          
          {/* Image Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Photo *</Text>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeImageButton} onPress={showImageOptions}>
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={showImageOptions}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>Tap to capture or select image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContainer}>
              <Text style={styles.municipalityText}>Municipality: {localMunicipality}</Text>
              
              <View style={styles.locationToggle}>
                <TouchableOpacity 
                  style={[styles.toggleButton, !useManualLocation && styles.activeToggle]}
                  onPress={() => setUseManualLocation(false)}
                >
                  <Text style={[styles.toggleText, !useManualLocation && styles.activeToggleText]}>
                    Auto Location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleButton, useManualLocation && styles.activeToggle]}
                  onPress={() => setUseManualLocation(true)}
                >
                  <Text style={[styles.toggleText, useManualLocation && styles.activeToggleText]}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {useManualLocation ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter specific location details"
                  value={manualLocation}
                  onChangeText={setManualLocation}
                  multiline
                />
              ) : (
                <Text style={styles.autoLocationText}>
                  {fullAddress || 'Getting location...'}
                </Text>
              )}
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Context (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              placeholder="Describe the issue in detail..."
              value={textDescription}
              onChangeText={setTextDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Audio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Note (Optional)</Text>
            <View style={styles.audioContainer}>
              <TouchableOpacity 
                style={[styles.audioButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isSubmitting}
              >
                <Text style={styles.audioButtonText}>
                  {isRecording ? '🛑 Stop Recording' : '🎤 Record Voice Note'}
                </Text>
              </TouchableOpacity>
              {audioUri && (
                <Text style={styles.audioStatus}>✅ Audio recorded</Text>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, (!image || isSubmitting) && styles.disabledButton]}
            onPress={submitIssue}
            disabled={!image || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Issue Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Issue Reported Successfully!</Text>
            
            {issueResult && (
              <View style={styles.issueDetails}>
                <Text style={styles.issueDetailText}>
                  <Text style={styles.boldText}>Issue Type:</Text> {issueResult.issueDetails?.category}
                </Text>
                <Text style={styles.issueDetailText}>
                  <Text style={styles.boldText}>Task ID:</Text> {issueResult.taskId}
                </Text>
                <Text style={styles.issueDetailText}>
                  <Text style={styles.boldText}>Status:</Text> {issueResult.issueDetails?.status}
                </Text>
                {issueResult.issueDetails?.assigned_supervisor && (
                  <Text style={styles.issueDetailText}>
                    <Text style={styles.boldText}>Supervisor Assigned:</Text> Yes
                  </Text>
                )}
              </View>
            )}
            
            <Text style={styles.modalMessage}>
              Your issue has been submitted and will be addressed soon.
            </Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  // Image Section Styles
  imageContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  changeImageButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  changeImageText: {
    color: colors.black,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  imagePlaceholder: {
    backgroundColor: colors.lightGray,
    borderWidth: 2,
    borderColor: colors.gray,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  imagePlaceholderText: {
    color: colors.darkGray,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  // Location Section Styles
  locationContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  municipalityText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  locationToggle: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.gray,
    marginHorizontal: 2,
  },
  activeToggle: {
    backgroundColor: colors.black,
  },
  toggleText: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  activeToggleText: {
    color: colors.primary,
  },
  autoLocationText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontStyle: 'italic',
    lineHeight: 18,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  // Input Styles
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.black,
    minHeight: 44,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Audio Section Styles
  audioContainer: {
    alignItems: 'center',
  },
  audioButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  audioButtonText: {
    color: colors.black,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  audioStatus: {
    color: '#4CAF50',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  // Submit Button Styles
  submitButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  disabledButton: {
    backgroundColor: colors.gray,
  },
  submitButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  issueDetails: {
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    width: '100%',
  },
  issueDetailText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  modalMessage: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  modalButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});
