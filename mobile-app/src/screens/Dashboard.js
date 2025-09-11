import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { issueAPI } from '../utils/api';

const { width } = Dimensions.get('window');

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState('overall');
  const [location, setLocation] = useState('india');
  const [selectedState, setSelectedState] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');

  const timePeriodOptions = [
    { label: 'Last 7 Days', value: '7days' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Overall', value: 'overall' }
  ];

  const locationOptions = [
    { label: 'India Wide', value: 'india' },
    { label: 'Select State', value: 'state' },
    { label: 'Specific Municipality', value: 'municipality' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Delhi', 'Unknown/Missing State'
  ];

  const municipalities = [
    'Mumbai', 'Delhi', 
    'Bangalore', 'Chennai', 
    'Kolkata', 'Hyderabad',
    'Pune', 'Ahmedabad',
    'Surat', 'Jaipur'
  ];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Build parameters based on location selection
      const params = {
        timePeriod,
        location: location, // Use the selected location value
      };
      
      // Add state or municipality if specified
      if (location === 'state' && selectedState) {
        params.state = selectedState;
      } else if (location === 'municipality' && selectedMunicipality) {
        params.municipality = selectedMunicipality;
      }

      console.log('Fetching analytics with params:', params);
      const response = await issueAPI.getAnalytics(params);
      setAnalytics(response.data.analytics);
      console.log('Analytics data:', response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Show user-friendly error message
      if (error.response?.status === 500) {
        Alert.alert(
          'Filter Not Available', 
          'State/Municipality filtering requires database setup. Showing India-wide data instead.',
          [{ text: 'OK', onPress: () => setLocation('india') }]
        );
      } else {
        Alert.alert('Error', 'Failed to fetch analytics data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod, location, selectedState, selectedMunicipality]);

  const StatCard = ({ title, value, color = '#007AFF', icon }) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        {icon && <Text style={[styles.statIcon, { color }]}>{icon}</Text>}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const DepartmentCard = ({ department, count, total }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <View style={styles.departmentCard}>
        <View style={styles.departmentHeader}>
          <Text style={styles.departmentName}>{department}</Text>
          <Text style={styles.departmentCount}>{count}</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${percentage}%` }]} 
          />
        </View>
        <Text style={styles.departmentPercentage}>{percentage}%</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Municipality Analytics</Text>
        <Text style={styles.subtitle}>Real-time insights and statistics</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Time Period</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={timePeriod}
              onValueChange={setTimePeriod}
              style={styles.picker}
            >
              {timePeriodOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Coverage Area</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={location}
              onValueChange={setLocation}
              style={styles.picker}
            >
              {locationOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {(location === 'state' || location === 'municipality') && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>
              {location === 'state' ? 'Select State' : 'Select Municipality'}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={location === 'state' ? selectedState : selectedMunicipality}
                onValueChange={location === 'state' ? setSelectedState : setSelectedMunicipality}
                style={styles.picker}
              >
                <Picker.Item 
                  label={location === 'state' ? 'Choose a state...' : 'Choose a municipality...'} 
                  value="" 
                />
                {location === 'state' && indianStates.map(state => (
                  <Picker.Item
                    key={state}
                    label={state}
                    value={state}
                  />
                ))}
                {location === 'municipality' && municipalities.map(municipality => (
                  <Picker.Item
                    key={municipality}
                    label={municipality}
                    value={municipality}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>

      {analytics && (
        <>
          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Issues"
                value={analytics.totalIssues || 0}
                color="#007AFF"
                icon="📊"
              />
              <StatCard
                title="Resolved"
                value={analytics.resolvedIssues || 0}
                color="#34C759"
                icon="✅"
              />
              <StatCard
                title="Pending"
                value={analytics.pendingIssues || 0}
                color="#FF9500"
                icon="⏳"
              />
              <StatCard
                title="Ongoing"
                value={analytics.ongoingIssues || 0}
                color="#FF3B30"
                icon="🔄"
              />
            </View>
          </View>

          {/* Department Breakdown */}
          {analytics.departmentBreakdown && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Department Breakdown</Text>
              <View style={styles.departmentList}>
                {Object.entries(analytics.departmentBreakdown).map(([dept, count]) => (
                  <DepartmentCard
                    key={dept}
                    department={dept}
                    count={count}
                    total={analytics.totalIssues}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Location Summary */}
          {analytics.locationSummary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location Summary</Text>
              <View style={styles.locationCard}>
                <Text style={styles.locationTitle}>Analysis Scope</Text>
                <Text style={styles.locationDetail}>
                  Scope: {analytics.locationSummary.scope}
                </Text>
                <Text style={styles.locationDetail}>
                  Municipality: {analytics.locationSummary.municipality}
                </Text>
                <Text style={styles.locationDetail}>
                  State: {analytics.locationSummary.state}
                </Text>
                {analytics.locationSummary.fallbackUsed && (
                  <View style={styles.fallbackNotice}>
                    <Text style={styles.fallbackTitle}>ℹ️ Alternative Filtering</Text>
                    <Text style={styles.fallbackText}>
                      Using enhanced filtering method for better performance
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  filterGroup: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  departmentList: {
    gap: 15,
  },
  departmentCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  departmentCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  departmentPercentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  locationCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  locationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fallbackNotice: {
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 12,
    color: '#1e40af',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationDisplay: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 5,
  },
  locationSubtext: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default Dashboard;
