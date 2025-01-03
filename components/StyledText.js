import React from 'react';
import { Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { fonts } from '../theme/fonts';

export const StyledText = ({ style, ...props }) => (
  <Text style={[styles.defaultText, style]} {...props} />
);

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: fonts.regular,
  },
}); 