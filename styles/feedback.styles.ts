import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    padding: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginVertical: 10,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    height: 100,
    backgroundColor: '#fff',
    color: '#000',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    textAlignVertical: 'top',
    marginVertical: 15,
  },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
  },
  closeText: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
    paddingTop: 16,
  },
});