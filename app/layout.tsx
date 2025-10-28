// app/_layout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TabBarProvider } from '../contexts/TabBarContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <TabBarProvider>
      <View style={styles.container}>{children}</View>
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
