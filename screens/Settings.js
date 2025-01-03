import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Settings() {
    const { signOut } = useAuth();

    const MenuItem = ({ icon, title, onPress, color = '#2196F3', rightIcon = true }) => (
        <TouchableOpacity 
            style={styles.menuItem}
            onPress={onPress}
        >
            <View style={styles.menuItemLeft}>
                <Ionicons name={icon} size={24} color={color} />
                <Text style={[styles.menuText, color !== '#2196F3' && { color }]}>{title}</Text>
            </View>
            {rightIcon && <Ionicons name="chevron-forward" size={24} color="#757575" />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <MenuItem 
                icon="person-outline" 
                title="Profile" 
                onPress={() => {}} 
            />
            <MenuItem 
                icon="notifications-outline" 
                title="Notifications" 
                onPress={() => {}} 
            />
            <MenuItem 
                icon="information-circle-outline" 
                title="About" 
                onPress={() => {}} 
            />
            <MenuItem 
                icon="log-out-outline" 
                title="Sign Out" 
                onPress={signOut}
                color="#FF5252"
                rightIcon={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        marginLeft: 16,
        fontSize: 16,
        color: '#212121',
        fontWeight: '500',
    },
});