import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  outerContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
    fontSize: 16,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  mapContainer: {
    height: height * 0.65,
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: { 
    flex: 1,
    backgroundColor: 'transparent',
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  locationCoordinates: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  noLocationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 8,
  },
  noLocationSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
