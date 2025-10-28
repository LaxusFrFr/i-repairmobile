import { StyleSheet } from 'react-native';

export const aboutStyles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 25,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: 25,
    marginBottom: 15,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  version: {
    fontSize: 15,
    color: '#ddd',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    width: '95%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0c674', // muted gold
    marginBottom: 6,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: '#eee',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  rateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  rateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  noThanksButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  noThanksText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
});





