import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  fixedHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  outerContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  roleText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 0,
  },
  // 🔳 Main container
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },

  // 📝 Greeting
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },

  date: {
    color: '#666',
    marginTop: 4,
    fontSize: 16,
    textAlign: 'center',
  },

  role: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 94,
    width: '100%',
  },

  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },

  // 📊 Stats grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // 📌 Each Tile
  tile: {
    width: '48%',
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 15,
    marginBottom: 14,
  },
  tileLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  tileNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  // Profile card styles (copied from userhome)
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
    marginTop: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  welcomeSection: {
    flex: 1,
    marginRight: 15,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 0,
  },
  profileButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  // Action tile styles (copied from userhome)
  actionButtonsContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
});

export default styles;