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
    marginTop: 20,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  inProgressLoadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 0,
    marginTop: -10,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 15,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 4,
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
  emptyStateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Notification styles
  notificationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 0,
    alignSelf: 'center',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // No appointment styles
  noAppointmentContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  noAppointmentMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Declined appointment styles
  declinedAppointmentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  declinedAppointmentMessage: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Professional container styles
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  professionalContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    maxWidth: 400,
    marginTop: -20,
  },
  
  // Enhanced Card Styles
  appointmentCard: {
    marginBottom: 15,
  },
  appointmentCardExpanded: {
    marginBottom: -20,
  },
  deviceHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceHeaderExpanded: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  arrowButton: {
    padding: 4,
    marginLeft: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  deviceBrand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
    flexShrink: 0,
    width: '100%',
  },
  deviceCategory: {
    fontSize: 16,
    color: '#666',
    width: '100%',
  },
  repairInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  statusValue: {
    fontWeight: '600',
    color: '#2196f3',
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  deviceSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Repair details styles
  repairDetails: {
    marginBottom: 30,
    marginTop: 15,
  },
  repairDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  
  
  // Rating styles
  ratingSection: {
    marginBottom: 25,
    marginTop: -15,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  starFilled: {
    color: '#ffd700',
  },
  starEmpty: {
    color: '#ddd',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  ratingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ratingActionsVertical: {
    flexDirection: 'row',
    gap: 15,
    marginTop: -10,
    paddingBottom: 15,
    justifyContent: 'center',
  },
  submitRatingButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    width: 140,
  },
  submitRatingButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitRatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    width: 140,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Minimal styles
  minimalContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 12,
  },
  minimalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Progress Bar Styles (Original Design)
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  stageContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 50,
  },
  stageCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stageCompleted: {
    backgroundColor: '#4caf50',
  },
  stageActive: {
    backgroundColor: '#2196f3',
  },
  stagePending: {
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  stageLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  stageLabelActive: {
    color: '#2196f3',
    fontWeight: '600',
  },
  connectingLine: {
    height: 3,
    width: 20,
    marginHorizontal: 2,
    marginTop: -18,
  },
  lineCompleted: {
    backgroundColor: '#4caf50',
  },
  linePending: {
    backgroundColor: '#e0e0e0',
  },
  expandedContent: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  deviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // Repair Details Section
  repairDetailsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  repairDetailsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  technicianInfoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  technicianHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  technicianProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  technicianBasicInfo: {
    flex: 1,
    paddingTop: 4,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  technicianRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontWeight: '500',
  },
  shopName: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  contactInfoSection: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },

  // Technician Information Section
  technicianInfoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },

  // Device Status Container for Completed Stage
  deviceStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 15,
  },
  deviceInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 15,
  },
  deviceTextContainer: {
    marginLeft: 12,
    flex: 1,
    flexShrink: 0,
    minWidth: 200,
  },
  completedStatusBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // View Location Button
  viewLocationButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  viewLocationButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // Location Modal
  locationModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
    minHeight: 300,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  locationLoadingContainer: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  locationLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  locationPhotoContainer: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
  },
  locationPhoto: {
    width: 300,
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
    alignSelf: 'center',
  },
  locationPhotoLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noDataContainer: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  locationModalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  locationModalCloseButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },

  // Technician Address
  technicianAddressContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  technicianAddressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  technicianAddressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

});
