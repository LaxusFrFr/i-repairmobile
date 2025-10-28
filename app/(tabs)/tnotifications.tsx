// TechnicianNotifications.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { auth, db } from '../../firebase/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

interface NotificationItem {
  id: string;
  message: string;
  timestamp: any;
  read?: boolean;
  type?: string;
}

const { width, height } = Dimensions.get('window');

export default function FloatingNotifications({
  visible,
  onClose,
  onMarkRead,
}: {
  visible: boolean;
  onClose: () => void;
  onMarkRead?: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifList: NotificationItem[] = [];
      querySnapshot.forEach((docSnap) => {
        notifList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setNotifications(notifList);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleString();
  };

  const handleDelete = async (notifId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'notifications', user.uid, 'items', notifId));
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      Alert.alert('Error', 'Could not delete notification.');
    }
  };

  const handleMarkRead = async (notifId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'notifications', user.uid, 'items', notifId), {
        read: true,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      // Call the onMarkRead callback to update hasUnread state in parent
      if (onMarkRead) {
        onMarkRead();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return '🎉';
      case 'registration':
        return '📝';
      case 'appointment':
        return '📅';
      case 'system':
        return '⚙️';
      case 'payment':
        return '💰';
      case 'rating':
        return '⭐';
      default:
        return '📢';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.box}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Notifications</Text>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>No notifications yet.</Text>
          ) : (
            notifications.map((notif) => (
              <View
                key={notif.id}
                style={[
                  styles.item,
                  notif.read ? styles.readItem : styles.unreadItem,
                ]}
              >
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationIcon}>
                    {getNotificationIcon(notif.type || 'default')}
                  </Text>
                  <Text style={[styles.message, notif.read ? styles.readMessage : undefined]}>
                    {notif.message}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  {formatTimestamp(notif.timestamp)}
                </Text>

                <View style={styles.actionButtons}>
                  {!notif.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkRead(notif.id)}
                      style={styles.markReadButton}
                    >
                      <Text style={styles.markReadText}>Mark as read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    onPress={() => handleDelete(notif.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  box: {
    width: width * 0.85,
    maxHeight: height * 0.7,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 6,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  scrollContainer: {
    maxHeight: height * 0.55,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  unreadItem: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
  },
  readItem: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  message: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  readMessage: {
    color: '#666',
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  markReadButton: {
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: '#ff3333',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginVertical: 30,
    fontStyle: 'italic',
  },
});