import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import Home from '../screens/home';
import Settings from '../screens/Settings';
import DeviceDetails from '../screens/DeviceDetails';

import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Home Stack Navigator
const HomeStack = () => (
    <Stack.Navigator>
        <Stack.Screen 
            name="HomeScreen" 
            component={Home}
            options={{
                headerShown: false,
                title: 'Home',
                headerStyle: {
                    backgroundColor: '#2196F3',
                },
                headerTintColor: '#fff',
            }}
        />
        <Stack.Screen 
            name="DeviceDetails" 
            component={DeviceDetails}
            options={({ route }) => ({ 
                title: `Gateway ${route.params?.gatewayId || ''}`,
                headerShown: false,
            })}
        />
    </Stack.Navigator>
);

const AuthStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Search') {
                    iconName = focused ? 'search' : 'search-outline';
                } else if (route.name === 'Likes') {
                    iconName = focused ? 'heart' : 'heart-outline';
                } else if (route.name === 'Notifications') {
                    iconName = focused ? 'notifications' : 'notifications-outline';
                } else if (route.name === 'Profile') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return (
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: 5,
                    }}>
                        <Ionicons name={iconName} size={24} color={color} />
                    </View>
                );
            },
            tabBarActiveTintColor: '#549E06',
            tabBarInactiveTintColor: '#A1D8B5',
            tabBarStyle: {
                height: Platform.OS === 'ios' ? 85 : 68,
                position:'absolute',
                bottom:12,
                left:20,
                marginLeft:8,
                marginRight:8,
                right:20,
               
                backgroundColor: '#1E6D31',
                // borderTopWidth: 0,
                // elevation: 15,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                paddingBottom: Platform.OS === 'ios' ? 20 : 10,
                borderRadius:30,
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
                paddingBottom: 5,
                fontFamily: 'Montserrat-Regular',
            },
            tabBarItemStyle: {
                padding: 5,
            },
            headerShown: false
        })}
    >
        <Tab.Screen 
            name="Home" 
            component={HomeStack}
        />
        <Tab.Screen 
            name="Search" 
            component={Settings}
        />
        <Tab.Screen 
            name="Likes" 
            component={Settings}
        />
        <Tab.Screen 
            name="Notifications" 
            component={Settings}
        />
        <Tab.Screen 
            name="Profile" 
            component={Settings}
        />
    </Tab.Navigator>
);

const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <NavigationContainer>
            {user ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;