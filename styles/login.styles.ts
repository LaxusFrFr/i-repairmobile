import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: -70,
  },
  technicianImage: {
    position: 'absolute',
    top: '40%',
    width: 250,
    height: 250,
    zIndex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 35,
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    fontFamily: 'System',
    textAlign: 'center',
  },
  formContainer: {
    alignItems: 'center',
    width: '65%',
  },
  emailContainer: {
    width: '100%',
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    marginBottom: 12,
    // Prevent yellow autofill background while keeping autofill functionality
    // @ts-ignore - Web-specific CSS properties
    WebkitBoxShadow: '0 0 0 1000px #333 inset',
    // @ts-ignore
    WebkitTextFillColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  linkText: {
    color: '#ccc',
    marginRight: 5,
    fontSize: 14,
  },
  signUpButton: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  signUpText: {
    color: '#fff',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 15,
    marginBottom: 0,
  },
  forgotPasswordText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  techTextWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  techText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  clickHere: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
    textAlign: 'center',
  },
  footerText: {
    position: 'absolute',
    bottom: 20,
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
  },
    passwordContainer: {
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: '#fff',
    // Prevent yellow autofill background while keeping autofill functionality
    // @ts-ignore - Web-specific CSS properties
    WebkitBoxShadow: '0 0 0 1000px #333 inset',
    // @ts-ignore
    WebkitTextFillColor: '#fff',
  },
  eyeIconButton: {
  padding: 6,        
  justifyContent: 'center',
  alignItems: 'center',
},
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    zIndex: 9999,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    minHeight: 50,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
