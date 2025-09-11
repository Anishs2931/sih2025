import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { issueAPI } from '../utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const IssueDetailScreen = ({ route, navigation }) => {
  const { issueId } = route.params;
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState([]);

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId]);

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      const response = await issueAPI.getIssueById(issueId);
      if (response.data.success) {
        setIssue(response.data.issue);
      } else {
        Alert.alert('Error', 'Failed to fetch issue details');
      }
    } catch (error) {
      console.error('Error fetching issue details:', error);
      Alert.alert('Error', 'Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const openImageModal = (index, imageArray = null) => {
    const images = imageArray || issue.report_images || issue.pictureIds || [];
    setSelectedImageIndex(index);
    setModalImages(images);
    setImageModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return '#FFA500';
      case 'in_progress':
      case 'ongoing':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'pending':
      default:
        return '#757575';
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'reported', label: 'Reported', icon: '📝' },
      { key: 'assigned', label: 'Assigned', icon: '👷' },
      { key: 'ongoing', label: 'In Progress', icon: '🔧' },
      { key: 'completed', label: 'Completed', icon: '✅' },
    ];

    const currentStatus = issue?.status?.toLowerCase() || 'pending';
    let activeIndex = 0;

    if (currentStatus.includes('assign')) activeIndex = 1;
    else if (currentStatus.includes('progress') || currentStatus.includes('ongoing')) activeIndex = 2;
    else if (currentStatus.includes('complet')) activeIndex = 3;

    return steps.map((step, index) => ({
      ...step,
      isActive: index <= activeIndex,
      isCurrent: index === activeIndex,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const makePhoneCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImageIndex(null);
    setModalImages([]);
  };

  const getLocationText = () => {
    if (typeof issue?.userLocation === 'string') {
      return issue.userLocation;
    }
    if (issue?.userLocation?.location) {
      return issue.userLocation.location;
    }
    return issue?.municipality || 'Unknown location';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading issue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Issue not found</Text>
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

  const statusSteps = getStatusSteps();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Issue Details</Text>
        </View>

        {/* Issue Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.issueType}>
              {issue.issueType || issue.department || 'General Issue'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) }]}>
              <Text style={styles.statusBadgeText}>{issue.status || 'Pending'}</Text>
            </View>
          </View>
          
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.locationText}>{getLocationText()}</Text>
          
          {issue.municipality && (
            <>
              <Text style={styles.sectionLabel}>Municipality</Text>
              <Text style={styles.text}>{issue.municipality}</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Reported Date</Text>
          <Text style={styles.text}>{formatDate(issue.createdAt)}</Text>

          {(issue.instructions || issue.userLocation?.instructions) && (
            <>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descriptionText}>
                {issue.instructions || issue.userLocation?.instructions}
              </Text>
            </>
          )}
        </View>

        {/* Status Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress Status</Text>
          <View style={styles.statusProgress}>
            {statusSteps.map((step, index) => (
              <View key={step.key} style={styles.statusStep}>
                <View style={[
                  styles.statusStepIcon,
                  {
                    backgroundColor: step.isActive ? getStatusColor(issue.status) : '#E0E0E0',
                    borderColor: step.isCurrent ? getStatusColor(issue.status) : 'transparent',
                  }
                ]}>
                  <Text style={[
                    styles.statusStepEmoji,
                    { opacity: step.isActive ? 1 : 0.5 }
                  ]}>
                    {step.icon}
                  </Text>
                </View>
                <Text style={[
                  styles.statusStepText,
                  { 
                    color: step.isActive ? colors.black : colors.darkGray,
                    fontWeight: step.isCurrent ? 'bold' : 'normal'
                  }
                ]}>
                  {step.label}
                </Text>
                {index < statusSteps.length - 1 && (
                  <View style={[
                    styles.statusStepLine,
                    { backgroundColor: step.isActive ? getStatusColor(issue.status) : '#E0E0E0' }
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Supervisor Information */}
        {issue.supervisorDetails && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Supervisor</Text>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{issue.supervisorDetails.name}</Text>
              <Text style={styles.personDepartment}>
                {issue.supervisorDetails.department} Department
              </Text>
              {issue.supervisorDetails.phoneNumber && (
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => makePhoneCall(issue.supervisorDetails.phoneNumber)}
                >
                  <Text style={styles.contactButtonIcon}>📞</Text>
                  <Text style={styles.contactButtonText}>
                    {issue.supervisorDetails.phoneNumber}
                  </Text>
                </TouchableOpacity>
              )}
              {issue.supervisorDetails.email && (
                <Text style={styles.emailText}>{issue.supervisorDetails.email}</Text>
              )}
            </View>
          </View>
        )}

        {/* Technician Information - REMOVED (Only supervisors needed) */}

        {/* Report Images Section */}
        {((issue.report_images && issue.report_images.length > 0) || (issue.pictureIds && issue.pictureIds.length > 0)) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Report Photos ({(issue.report_images || issue.pictureIds || []).length})
            </Text>
            <View style={styles.imagesGrid}>
              {(issue.report_images || issue.pictureIds || []).map((pictureId, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.imageContainer}
                  onPress={() => openImageModal(index)}
                >
                  <Image
                    source={{ uri: issueAPI.getImageUrl(pictureId) }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Initiation Images Section */}
        {issue.initiation_images && issue.initiation_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Work Initiation Photos ({issue.initiation_images.length})
            </Text>
            <View style={styles.imagesGrid}>
              {issue.initiation_images.map((pictureId, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.imageContainer}
                  onPress={() => openImageModal(index, issue.initiation_images)}
                >
                  <Image
                    source={{ uri: issueAPI.getImageUrl(pictureId) }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Completion Images Section */}
        {issue.finished_images && issue.finished_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Work Completion Photos ({issue.finished_images.length})
            </Text>
            <View style={styles.imagesGrid}>
              {issue.finished_images.map((pictureId, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.imageContainer}
                  onPress={() => openImageModal(index, issue.finished_images)}
                >
                  <Image
                    source={{ uri: issueAPI.getImageUrl(pictureId) }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bill Images Section */}
        {issue.bill_images && issue.bill_images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Bills & Receipts ({issue.bill_images.length})
            </Text>
            <View style={styles.imagesGrid}>
              {issue.bill_images.map((pictureId, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.imageContainer}
                  onPress={() => openImageModal(index, issue.bill_images)}
                >
                  <Image
                    source={{ uri: issueAPI.getImageUrl(pictureId) }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bills Section - Future implementation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bills & Documents</Text>
          <View style={styles.emptySection}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>
              Bills and documents will be uploaded by the supervisor during work progress
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.darkGray,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButtonIcon: {
    fontSize: 20,
    color: colors.black,
    marginRight: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  issueType: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    textTransform: 'capitalize',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.darkGray,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.sizes.md,
    color: colors.black,
    lineHeight: 22,
  },
  locationText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    lineHeight: 22,
  },
  descriptionText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  statusProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  statusStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusStepEmoji: {
    fontSize: 16,
  },
  statusStepText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  statusStepLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 3,
    zIndex: -1,
  },
  personInfo: {
    paddingVertical: spacing.sm,
  },
  personName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  personDepartment: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  contactButtonIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  contactButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  emailText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginTop: spacing.xs,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageNumber: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default IssueDetailScreen;
