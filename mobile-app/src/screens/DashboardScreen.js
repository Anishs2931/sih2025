import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';
import { useLocation } from '../contexts/LocationContext';
import { issueAPI } from '../utils/api';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user } = useUser();
  const { locationData } = useLocation();
  
  // State for filters
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7days');
  const [selectedLocation, setSelectedLocation] = useState('municipality');
  const [showTimePeriodModal, setShowTimePeriodModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // State for analytics data
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filter options
  const timePeriodOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
  ];

  const locationOptions = [
    { value: 'municipality', label: `Current Municipality (${locationData?.municipality || 'Unknown'})` },
    { value: 'state', label: `Current State (${locationData?.state || 'Unknown'})` },
    { value: 'india', label: 'India Wide' },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimePeriod, selectedLocation]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        timePeriod: selectedTimePeriod,
        location: selectedLocation,
        municipality: locationData?.municipality || '',
        state: locationData?.state || ''
      };

      const response = await issueAPI.getAnalytics(params);
      
      if (response.data.success) {
        setAnalytics(response.data.analytics);
        setLastUpdated(new Date());
      } else {
        Alert.alert('Error', 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTimePeriodLabel = () => {
    return timePeriodOptions.find(option => option.value === selectedTimePeriod)?.label || 'Last 7 Days';
  };

  const getLocationLabel = () => {
    return locationOptions.find(option => option.value === selectedLocation)?.label || 'Current Municipality';
  };

  const StatCard = ({ title, value, subtitle, color = colors.black, icon }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon && <Text style={styles.statIcon}>{icon}</Text>}
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const FilterModal = ({ visible, onClose, options, selectedValue, onSelect, title }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                selectedValue === option.value && styles.selectedOption
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[
                styles.modalOptionText,
                selectedValue === option.value && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Municipality Issue Analytics</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowTimePeriodModal(true)}
            >
              <Text style={styles.filterLabel}>Period</Text>
              <Text style={styles.filterValue}>{getTimePeriodLabel()}</Text>
              <Text style={styles.filterArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowLocationModal(true)}
            >
              <Text style={styles.filterLabel}>Location</Text>
              <Text style={styles.filterValue} numberOfLines={1}>
                {selectedLocation === 'municipality' ? (locationData?.municipality || 'Municipality') :
                 selectedLocation === 'state' ? (locationData?.state || 'State') : 'India'}
              </Text>
              <Text style={styles.filterArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalytics}>
            <Text style={styles.refreshIcon}>🔄</Text>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        )}

        {/* Analytics Content */}
        {analytics && !loading && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <Text style={styles.sectionTitle}>Issue Summary</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Issues"
                  value={analytics.totalIssues || 0}
                  subtitle="All reported"
                  icon="📊"
                />
                <StatCard
                  title="Resolved"
                  value={analytics.resolvedIssues || 0}
                  subtitle="Completed"
                  color="#4CAF50"
                  icon="✅"
                />
                <StatCard
                  title="Pending"
                  value={analytics.pendingIssues || 0}
                  subtitle="Awaiting assignment"
                  color="#FF9800"
                  icon="⏳"
                />
                <StatCard
                  title="Ongoing"
                  value={analytics.ongoingIssues || 0}
                  subtitle="In progress"
                  color="#2196F3"
                  icon="🔧"
                />
              </View>
            </View>

            {/* Department Breakdown */}
            {analytics.departmentBreakdown && (
              <View style={styles.departmentContainer}>
                <Text style={styles.sectionTitle}>Issues by Department</Text>
                <View style={styles.departmentList}>
                  {Object.entries(analytics.departmentBreakdown).map(([dept, count]) => (
                    <View key={dept} style={styles.departmentItem}>
                      <Text style={styles.departmentName}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</Text>
                      <Text style={styles.departmentCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Trends */}
            {analytics.trends && (
              <View style={styles.trendsContainer}>
                <Text style={styles.sectionTitle}>Recent Trends</Text>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Average Resolution Time</Text>
                  <Text style={styles.trendValue}>{analytics.trends.avgResolutionTime || 'N/A'}</Text>
                </View>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Most Common Issue Type</Text>
                  <Text style={styles.trendValue}>{analytics.trends.commonIssueType || 'N/A'}</Text>
                </View>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Peak Reporting Day</Text>
                  <Text style={styles.trendValue}>{analytics.trends.peakDay || 'N/A'}</Text>
                </View>
              </View>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <View style={styles.lastUpdatedContainer}>
                <Text style={styles.lastUpdatedText}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Empty State */}
        {!analytics && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📈</Text>
            <Text style={styles.emptyStateText}>No analytics data available</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modals */}
      <FilterModal
        visible={showTimePeriodModal}
        onClose={() => setShowTimePeriodModal(false)}
        options={timePeriodOptions}
        selectedValue={selectedTimePeriod}
        onSelect={setSelectedTimePeriod}
        title="Select Time Period"
      />

      <FilterModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        options={locationOptions}
        selectedValue={selectedLocation}
        onSelect={setSelectedLocation}
        title="Select Location"
      />
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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  filterValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  filterArrow: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    textAlign: 'right',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  refreshIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  refreshText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.black,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    marginTop: spacing.md,
  },
  summaryContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
  },
  statTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
  },
  departmentContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  departmentList: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.tertiary,
  },
  departmentName: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  departmentCount: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.bold,
  },
  trendsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  trendItem: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  trendLabel: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  trendValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.black,
  },
  lastUpdatedContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.darkGray,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  selectedOption: {
    backgroundColor: colors.secondary,
  },
  modalOptionText: {
    fontSize: typography.sizes.md,
    color: colors.black,
  },
  selectedOptionText: {
    fontWeight: typography.weights.bold,
  },
  modalCloseButton: {
    backgroundColor: colors.gray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: typography.weights.medium,
  },
});
