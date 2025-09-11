const db = require('../firebase');
const admin = require('firebase-admin');

/**
 * Service for generating analytics and statistics
 */
class AnalyticsService {
  
  /**
   * Get comprehensive analytics based on filters
   */
  async getAnalytics(filters) {
    try {
      const { timePeriod, location, municipality, state } = filters;
      
      // Build base query
      let query = db.collection('tasks');
      let isLocationFiltered = false;
      
      // Apply location filter (but be prepared for index errors)
      if (location === 'municipality' && municipality) {
        query = query.where('municipality', '==', municipality);
        isLocationFiltered = true;
      } else if (location === 'state' && state) {
        if (state === 'Unknown/Missing State') {
          // Special case: this will be handled in the fallback section
          // Set a flag but don't add a where clause yet
          isLocationFiltered = true;
        } else {
          query = query.where('state', '==', state);
          isLocationFiltered = true;
        }
      }
      // For 'india' location, no additional filter needed
      
      // Apply time filter
      const timeFilter = this.getTimeFilter(timePeriod);
      if (timeFilter && isLocationFiltered) {
        // This combination requires composite indexes
        // If it fails, we'll catch and retry with different approach
        query = query.where('createdAt', '>=', timeFilter);
      } else if (timeFilter && !isLocationFiltered) {
        // Time filter only - this works fine
        query = query.where('createdAt', '>=', timeFilter);
      }
      
      let tasks = [];
      let fallbackUsed = false;
      
      try {
        // Special handling for Unknown/Missing State
        if (location === 'state' && state === 'Unknown/Missing State') {
          // Get all tasks and filter for those with missing/unknown state
          const allSnapshot = await db.collection('tasks').get();
          const allTasks = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          tasks = allTasks.filter(task => {
            const taskState = task.state;
            return !taskState || taskState === '' || taskState === 'Unknown' || taskState === null || taskState === undefined;
          });
          
          // Apply time filter if needed
          if (timeFilter) {
            tasks = tasks.filter(task => {
              if (!task.createdAt) return false;
              const taskDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
              const filterDate = timeFilter.toDate ? timeFilter.toDate() : timeFilter;
              return taskDate >= filterDate;
            });
          }
          
          fallbackUsed = true;
        } else {
          const snapshot = await query.get();
          tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (indexError) {
        console.log('⚠️ Composite index not available, falling back to alternative approach');
        
        if (isLocationFiltered && timeFilter) {
          // Fallback: Get all tasks with location filter only, then filter by time in JavaScript
          const locationQuery = location === 'municipality' && municipality
            ? db.collection('tasks').where('municipality', '==', municipality)
            : db.collection('tasks').where('state', '==', state);
          
          const locationSnapshot = await locationQuery.get();
          const allLocationTasks = locationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Filter by time in JavaScript
          tasks = allLocationTasks.filter(task => {
            if (!task.createdAt) return false;
            // Handle both Firestore Timestamp and string dates
            const taskDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
            const filterDate = timeFilter.toDate ? timeFilter.toDate() : timeFilter;
            return taskDate >= filterDate;
          });
          
          fallbackUsed = true;
        } else {
          // Re-throw if it's not the expected index error
          throw indexError;
        }
      }
      
      // Generate analytics
      const analytics = {
        totalIssues: tasks.length,
        resolvedIssues: this.countByStatus(tasks, 'completed'),
        pendingIssues: this.countByStatus(tasks, 'pending'),
        ongoingIssues: this.countByStatus(tasks, 'ongoing') + this.countByStatus(tasks, 'assigned'),
        departmentBreakdown: this.getDepartmentBreakdown(tasks),
        trends: await this.getTrends(tasks, timePeriod),
        locationSummary: {
          municipality: municipality || 'All',
          state: state || 'All',
          scope: location,
          fallbackUsed: fallbackUsed,
          note: fallbackUsed ? 'Data filtered using alternative method due to missing database indexes' : null
        }
      };
      
      return analytics;
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get time filter based on period
   */
  getTimeFilter(timePeriod) {
    const now = new Date();
    
    switch (timePeriod) {
      case '7days':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return admin.firestore.Timestamp.fromDate(sevenDaysAgo);
        
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return admin.firestore.Timestamp.fromDate(monthStart);
        
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return admin.firestore.Timestamp.fromDate(yearStart);
        
      case 'overall':
      default:
        return null; // No time filter
    }
  }
  
  /**
   * Count tasks by status
   */
  countByStatus(tasks, status) {
    return tasks.filter(task => task.status === status).length;
  }
  
  /**
   * Get breakdown by department
   */
  getDepartmentBreakdown(tasks) {
    const breakdown = {};
    
    tasks.forEach(task => {
      const department = task.department || 'unassigned';
      breakdown[department] = (breakdown[department] || 0) + 1;
    });
    
    return breakdown;
  }
  
  /**
   * Get trends and insights
   */
  async getTrends(tasks, timePeriod) {
    try {
      const trends = {};
      
      // Calculate average resolution time
      const completedTasks = tasks.filter(task => task.status === 'completed' && task.completed_at && task.createdAt);
      if (completedTasks.length > 0) {
        const totalResolutionTime = completedTasks.reduce((total, task) => {
          // Handle both Firestore Timestamp and string dates
          const created = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
          const completed = task.completed_at.toDate ? task.completed_at.toDate() : new Date(task.completed_at);
          return total + (completed - created);
        }, 0);
        
        const avgResolutionMs = totalResolutionTime / completedTasks.length;
        const avgResolutionDays = Math.round(avgResolutionMs / (1000 * 60 * 60 * 24));
        trends.avgResolutionTime = `${avgResolutionDays} days`;
      } else {
        trends.avgResolutionTime = 'N/A';
      }
      
      // Find most common issue type/department
      const departmentCounts = this.getDepartmentBreakdown(tasks);
      const mostCommonDept = Object.entries(departmentCounts)
        .sort(([,a], [,b]) => b - a)[0];
      trends.commonIssueType = mostCommonDept ? mostCommonDept[0] : 'N/A';
      
      // Find peak reporting day (day of week)
      if (tasks.length > 0) {
        const dayCount = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        tasks.forEach(task => {
          if (task.createdAt) {
            // Handle both Firestore Timestamp and string dates
            const taskDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
            const day = taskDate.getDay();
            const dayName = dayNames[day];
            dayCount[dayName] = (dayCount[dayName] || 0) + 1;
          }
        });
        
        const peakDay = Object.entries(dayCount)
          .sort(([,a], [,b]) => b - a)[0];
        trends.peakDay = peakDay ? peakDay[0] : 'N/A';
      } else {
        trends.peakDay = 'N/A';
      }
      
      return trends;
    } catch (error) {
      console.error('Error calculating trends:', error);
      return {
        avgResolutionTime: 'N/A',
        commonIssueType: 'N/A',
        peakDay: 'N/A'
      };
    }
  }
  
  /**
   * Get real-time analytics summary (for quick dashboard updates)
   */
  async getQuickSummary(municipality, state) {
    try {
      let query = db.collection('tasks');
      
      if (municipality) {
        query = query.where('municipality', '==', municipality);
      } else if (state) {
        query = query.where('state', '==', state);
      }
      
      const snapshot = await query.get();
      const tasks = snapshot.docs.map(doc => doc.data());
      
      return {
        total: tasks.length,
        pending: this.countByStatus(tasks, 'pending'),
        ongoing: this.countByStatus(tasks, 'ongoing') + this.countByStatus(tasks, 'assigned'),
        completed: this.countByStatus(tasks, 'completed'),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting quick summary:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
