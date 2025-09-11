import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { issueAPI } from '../utils/api';

const IssueCard = ({ issue, onPress, showDate = true }) => {
  // Debug logging
  console.log('IssueCard issue data:', {
    issueType: issue.issueType,
    reportImages: issue.report_images,
    pictureIds: issue.pictureIds,
    hasReportImages: issue.report_images && issue.report_images.length > 0,
    hasPictureIds: issue.pictureIds && issue.pictureIds.length > 0,
    firstImage: issue.report_images?.[0] || issue.pictureIds?.[0]
  });

  // Use report_images first, fall back to pictureIds for legacy support
  const imageIds = issue.report_images && issue.report_images.length > 0 
    ? issue.report_images 
    : issue.pictureIds || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return '#FFA500'; // Orange
      case 'in_progress':
      case 'ongoing':
        return '#2196F3'; // Blue
      case 'completed':
        return '#4CAF50'; // Green
      case 'pending':
      default:
        return '#757575'; // Gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return '👷';
      case 'in_progress':
      case 'ongoing':
        return '🔧';
      case 'completed':
        return '✅';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getLocationText = () => {
    if (typeof issue.userLocation === 'string') {
      return issue.userLocation.length > 40 
        ? issue.userLocation.substring(0, 40) + '...' 
        : issue.userLocation;
    }
    return issue.municipality || 'Unknown location';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.issueInfo}>
            <Text style={styles.issueType}>
              {issue.issueType || issue.department || 'General Issue'}
            </Text>
            <Text style={styles.location}>{getLocationText()}</Text>
          </View>
          {imageIds && imageIds.length > 0 ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: issueAPI.getImageUrl(imageIds[0]) }}
                style={styles.thumbnailImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Error loading image:', imageIds[0], error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', imageIds[0]);
                }}
              />
              {imageIds.length > 1 && (
                <View style={styles.imageCountBadge}>
                  <Text style={styles.imageCountText}>+{imageIds.length - 1}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>{getStatusIcon(issue.status)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
              {issue.status || 'Pending'}
            </Text>
          </View>
          
          {showDate && (
            <Text style={styles.dateText}>
              {formatDate(issue.createdAt || issue.dateReported)}
            </Text>
          )}
        </View>

        {/* Supervisor info if assigned */}
        {issue.supervisorDetails?.name && (
          <View style={styles.supervisorInfo}>
            <Text style={styles.supervisorIcon}>👤</Text>
            <Text style={styles.supervisorText}>
              Assigned to: {issue.supervisorDetails.name}
            </Text>
          </View>
        )}

        {/* Instructions/Description if available */}
        {(issue.instructions || issue.userLocation?.instructions) && (
          <Text style={styles.description} numberOfLines={2}>
            {issue.instructions || issue.userLocation?.instructions}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  issueInfo: {
    flex: 1,
  },
  issueType: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  location: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
  },
  imageContainer: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
    position: 'relative',
    width: 50,
    height: 50,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  imageCountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  imageIcon: {
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
  supervisorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  supervisorIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  supervisorText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    opacity: 0.5,
  },
});

export default IssueCard;
