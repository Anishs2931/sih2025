import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';

// Enable fast refresh for development
if (__DEV__) {
  require('react-devtools-core').connectToDevTools({
    host: 'localhost',
    port: 8097,
  });
}

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import IssueDetailScreen from './src/screens/IssueDetailScreen';
import Dashboard from './src/screens/Dashboard';

// Import theme and context
import { colors } from './src/utils/theme';
import { UserProvider, useUser } from './src/contexts/UserContext';
import { LocationProvider } from './src/contexts/LocationContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for authenticated users
function MainTabs({ navigation }) {
  const { logout: logoutUser } = useUser();
  
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            // Clear user data from context
            logoutUser();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopColor: colors.tertiary,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray,
        headerStyle: {
          backgroundColor: colors.primary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.black,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          headerTitle: 'QuadraTech',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{
          tabBarLabel: 'Report',
          headerTitle: 'Report Issue',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📷</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          headerTitle: 'Issue History',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={Dashboard}
        options={{
          tabBarLabel: 'Analytics',
          headerTitle: 'Analytics Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          headerTitle: 'Profile',
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleLogout}
              style={{ 
                marginRight: 15, 
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: colors.secondary,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.tertiary
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                color: colors.black,
                fontWeight: '500'
              }}>
                Logout
              </Text>
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <UserProvider>
      <LocationProvider>
        <View style={styles.container}>
          <StatusBar style="dark" backgroundColor={colors.primary} />
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerStyle: {
                  backgroundColor: colors.primary,
                  shadowColor: 'transparent',
                  elevation: 0,
                },
                headerTintColor: colors.black,
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="MainTabs" 
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="IssueDetail" 
                component={IssueDetailScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </LocationProvider>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
});
