import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  User as UserIcon, Mail, Layers, LogOut, Edit2, Loader2,
  Lock, Eye, EyeOff, Bell, Monitor, Activity, ShieldAlert, LifeBuoy, Info,
  MapPin, Sparkles, CheckCircle2, ChevronRight, Download, AlertCircle, RefreshCw, Upload, Camera, Trash2, X, ZoomIn
} from 'lucide-react';
import { User, Farm } from '../types';
import { fetch } from '../utils/api';
import { t as tr } from '../utils/i18n';

const profileTrans = {
  en: {
    // Page header
    myAccount: 'My Account',
    accountControl: 'Account Controls',
    // Nav items
    profileSettings: 'Profile Settings',
    accountOverview: 'Account Overview',
    loginSecurity: 'Login & Security',
    exportBackup: 'Export & Backup',
    alertSettings: 'Alert Settings',
    connectedDevices: 'Connected Devices',
    activityLog: 'Activity Log',
    dataPrivacy: 'Data Privacy',
    techSupport: 'Technical Support',
    aboutGateway: 'About Gateway',
    // Profile header
    changePhoto: 'Change Photo',
    uploadProfilePhoto: 'Upload profile photo',
    farms: 'Farms',
    fields: 'Fields',
    scans: 'Scans',
    noOccupation: 'No occupation entered',
    noLocation: 'No location entered',
    at: 'at',
    // Photo modal
    profilePhotoTitle: 'Profile Photo',
    newPhotoReady: '✓ New photo ready to save',
    currentProfilePhoto: 'Current profile photo',
    uploadPhotoHint: 'Upload profile photo',
    photoFormats: 'JPG, JPEG, PNG, WEBP • Max 5 MB',
    autoCrop: 'Auto-cropped to square & compressed',
    processingImage: 'Processing image...',
    clickOrDragDrop: 'Click or drag & drop to upload',
    photoSizeHint: 'JPG, PNG, WEBP — up to 5 MB',
    savePhoto: 'Save Photo',
    cancel: 'Cancel',
    replace: 'Replace',
    removePhoto: 'Remove',
    removePhotoConfirmTitle: 'Remove profile photo?',
    removePhotoConfirmDesc: 'Your default avatar will be restored everywhere in the system.',
    yesRemove: 'Yes, Remove',
    photoUpdatedSuccess: 'Profile photo updated successfully!',
    imageProcessFail: 'Image processing failed. Please try again.',
    // Profile tab
    farmerProfileSettings: 'Farmer Profile Settings',
    profilePhotoLabel: 'Profile Photo',
    photoFormatsLabel: 'JPG, PNG, WEBP — max 5 MB — auto cropped to square',
    farmerName: 'Farmer Name',
    phoneNumber: 'Phone Number',
    occupation: 'Occupation',
    organizationCooperative: 'Organization / Cooperative',
    location: 'Location',
    emailAddress: 'Email Address',
    saveProfile: 'Save Profile',
    enterName: 'Enter name',
    enterPhone: 'Enter phone number',
    occupationPlaceholder: 'e.g. Farmer, Agronomist',
    optional: 'Optional',
    enterCity: 'Enter your city',
    removePhotoConfirmShort: 'Remove profile photo?',
    // Account Overview tab
    accountOverviewTitle: 'Account Overview',
    profileCompletion: 'Profile Completion',
    uploadPhotoToImprove: 'Upload a profile photo to improve your score',
    farmsStat: 'Farms',
    fieldsStat: 'Fields',
    soilTests: 'Soil Tests',
    leafScans: 'Leaf Scans',
    totalAiReports: 'Total AI Reports Generated',
    registryInfo: 'Registry Info',
    memberSince: 'Member Since',
    lastActive: 'Last Active',
    yieldRuns: 'Yield Runs',
    alertsLogged: 'Alerts Logged',
    totalAcreage: 'Total Acreage',
    runs: 'runs',
    alerts: 'alerts',
    signOut: 'Sign Out',
    aiActivitySummary: 'AI Activity Summary',
    aiAccuracyMsg: 'AI Diagnostic accuracy is calibrated at',
    aiNoDataMsg: 'AI Diagnostic accuracy will calibrate as yield predictions are generated.',
    totalAcreageMsg: 'Total registered acreage is',
    acresAcross: 'acres across',
    farmTwins: 'farm twins with',
    activeFields: 'active fields.',
    // Security tab
    credentialsTitle: 'Credentials & Login Security',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    changeCredentials: 'Change Credentials',
    strength: 'Strength',
    weak: 'Weak',
    moderate: 'Moderate',
    strong: 'Strong',
    gatewayToken: 'Gateway token:',
    validActive: 'VALID (ACTIVE)',
    encryption: 'Encryption:',
    // Export tab
    exportBackupTitle: 'Export & Backup Dossier',
    exportData: 'Export Data',
    exportProfile: 'Export Profile',
    exportFarmData: 'Export Farm Data',
    downloadAllReports: 'Download All Reports',
    backupRestore: 'Backup & Restore',
    backupAccountData: 'Backup Account Data',
    restoreBackup: 'Restore Backup',
    selectBackupFile: 'Select Backup File',
    restoreHint: 'Re-calibrates profile parameters upon validation.',
    // Notifications tab
    alertsPushTitle: 'Alerts & Push Toggles',
    emailNotifications: 'Email notifications',
    emailNotificationsDesc: 'Diagnostic digest emails.',
    diseaseSeverityAlerts: 'Disease severity alerts',
    diseaseSeverityDesc: 'Alerts on foliage disease threshold breaches.',
    weatherWarning: 'Weather warning flags',
    weatherWarningDesc: 'Ambient heat stress risk alerts.',
    yieldNotifications: 'Yield model notifications',
    yieldNotificationsDesc: 'Notify on AI yield projection completion.',
    gatewayChecks: 'IoT gateway checks',
    gatewayChecksDesc: 'Battery & sensor connectivity warnings.',
    systemNotifications: 'System push notifications',
    systemNotificationsDesc: 'Desktop push for high-priority reports.',
    alertsUpdated: 'Alert rules updated.',
    // Devices tab
    sessionDeviceHistory: 'Session Device History',
    currentDevice: 'Current Device',
    active: 'ACTIVE',
    revoke: 'Revoke',
    clearOtherSessions: 'Clear Other Sessions',
    sessionRevoked: 'Session revoked.',
    sessionsCleared: 'All other sessions cleared.',
    hoursAgo: 'hours ago',
    // Logs tab
    activityTimeline: 'Activity Timeline',
    loggedIn: 'Logged In',
    loggedInDesc: 'Verified secure authorization session.',
    generatedYield: 'Generated Yield Prediction',
    generatedYieldDesc: 'AI yield assessment for Wheat crop.',
    performedSoil: 'Performed Soil Analysis',
    performedSoilDesc: 'Recorded N/pH levels for Sector B.',
    uploadedLeaf: 'Uploaded Leaf Image',
    uploadedLeafDesc: 'Disease scan for early blight symptoms.',
    createdFarm: 'Created Farm Twin',
    createdFarmDesc: 'Registered North Valley Farm.',
    today: 'Today',
    yesterday: 'Yesterday',
    // Privacy tab
    dataPrivacyTitle: 'Data Privacy',
    quickExport: 'Quick Export',
    dangerousActions: 'Dangerous Actions',
    deleteAccountDesc: 'Deleting your account will schedule all IoT sensors, logs, and reports for database deletion.',
    terminateAccount: 'Terminate Account',
    deleteConfirm: 'Delete account? This cannot be undone.',
    privacyExportProfile: 'profile',
    privacyExportFarm: 'farm',
    privacyExportReports: 'reports',
    // Support tab
    techSupportTitle: 'Tech Support',
    helpCenter: 'Help Center',
    helpCenterDesc: 'Documentation guides for device configs, sensor calibrations, and diagnostics.',
    readDocumentation: 'Read Documentation →',
    reportBug: 'Report a Bug',
    reportBugDesc: 'Found an issue in telemetry, uploads, or exports? File a ticket.',
    reportBugLink: 'Report Bug →',
    ticketLogged: 'Ticket logged in backlog!',
    // About tab
    aboutGatewayTitle: 'About Gateway',
    softwareVersion: 'Software Version',
    buildNumber: 'Build Number',
    apiGateway: 'API Gateway',
    mongodbState: 'MongoDB State',
    aboutDesc: 'Smart Agriculture Digital Twin System — built for premium agronomists and smart farm automation.',
    // AI Insights bar
    aiInsightsTitle: 'AI Twin Account Insights',
    aiInsightsDesc: 'Usage health score:',
    mostUsedModule: 'Most used module:',
    fetchRecommendation: 'Fetch Recommendation',
    aiRecommendationSent: 'AI Recommendation sent to Notification Center.',
    // Toast messages
    profileSaved: 'Profile saved successfully!',
    profileSaveFail: 'Failed to update profile.',
    profileSaveError: 'Error saving profile.',
    nameRequired: 'Name cannot be empty.',
    passwordRequired: 'Current password is required.',
    passwordTooShort: 'New password must be at least 8 characters.',
    passwordComplexity: 'Password must include uppercase, number & special character.',
    passwordMismatch: 'Passwords do not match.',
    passwordChanged: 'Password changed successfully!',
    photoUpdated: 'Profile photo updated!',
    photoRemoved: 'Profile photo removed.',
    backupRestored: 'Backup restored. Click Save Profile to apply.',
    backupParseFail: 'Failed to parse backup.',
    exportedMsg: 'Exported',
    data: 'data.',
    naValue: 'N/A',
    ac: 'ac',
  },
  hi: {
    // Page header
    myAccount: 'मेरा खाता',
    accountControl: 'खाता नियंत्रण',
    // Nav items
    profileSettings: 'प्रोफ़ाइल सेटिंग्स',
    accountOverview: 'खाता अवलोकन',
    loginSecurity: 'लॉगिन और सुरक्षा',
    exportBackup: 'निर्यात और बैकअप',
    alertSettings: 'अलर्ट सेटिंग्स',
    connectedDevices: 'कनेक्टेड डिवाइस',
    activityLog: 'गतिविधि लॉग',
    dataPrivacy: 'डेटा गोपनीयता',
    techSupport: 'तकनीकी सहायता',
    aboutGateway: 'गेटवे के बारे में',
    // Profile header
    changePhoto: 'फ़ोटो बदलें',
    uploadProfilePhoto: 'प्रोफ़ाइल फ़ोटो अपलोड करें',
    farms: 'फार्म',
    fields: 'खेत',
    scans: 'स्कैन',
    noOccupation: 'पेशा दर्ज नहीं',
    noLocation: 'स्थान दर्ज नहीं',
    at: 'में',
    // Photo modal
    profilePhotoTitle: 'प्रोफ़ाइल फ़ोटो',
    newPhotoReady: '✓ नई फ़ोटो सहेजने के लिए तैयार',
    currentProfilePhoto: 'वर्तमान प्रोफ़ाइल फ़ोटो',
    uploadPhotoHint: 'प्रोफ़ाइल फ़ोटो अपलोड करें',
    photoFormats: 'JPG, JPEG, PNG, WEBP • अधिकतम 5 MB',
    autoCrop: 'वर्गाकार में स्वतः क्रॉप और संपीड़ित',
    processingImage: 'छवि प्रोसेस हो रही है...',
    clickOrDragDrop: 'अपलोड करने के लिए क्लिक करें या खींचें',
    photoSizeHint: 'JPG, PNG, WEBP — अधिकतम 5 MB',
    savePhoto: 'फ़ोटो सहेजें',
    cancel: 'रद्द करें',
    replace: 'बदलें',
    removePhoto: 'हटाएं',
    removePhotoConfirmTitle: 'प्रोफ़ाइल फ़ोटो हटाएं?',
    removePhotoConfirmDesc: 'आपका डिफ़ॉल्ट अवतार सिस्टम में सभी जगह पुनर्स्थापित किया जाएगा।',
    yesRemove: 'हाँ, हटाएं',
    photoUpdatedSuccess: 'प्रोफ़ाइल फ़ोटो सफलतापूर्वक अपडेट की गई!',
    imageProcessFail: 'छवि प्रोसेसिंग विफल। कृपया पुनः प्रयास करें।',
    // Profile tab
    farmerProfileSettings: 'किसान प्रोफ़ाइल सेटिंग्स',
    profilePhotoLabel: 'प्रोफ़ाइल फ़ोटो',
    photoFormatsLabel: 'JPG, PNG, WEBP — अधिकतम 5 MB — वर्गाकार में स्वतः क्रॉप',
    farmerName: 'किसान का नाम',
    phoneNumber: 'फ़ोन नंबर',
    occupation: 'पेशा',
    organizationCooperative: 'संगठन / सहकारी',
    location: 'स्थान',
    emailAddress: 'ईमेल पता',
    saveProfile: 'प्रोफ़ाइल सहेजें',
    enterName: 'नाम दर्ज करें',
    enterPhone: 'फ़ोन नंबर दर्ज करें',
    occupationPlaceholder: 'जैसे: किसान, कृषि विशेषज्ञ',
    optional: 'वैकल्पिक',
    enterCity: 'अपना शहर दर्ज करें',
    removePhotoConfirmShort: 'प्रोफ़ाइल फ़ोटो हटाएं?',
    // Account Overview tab
    accountOverviewTitle: 'खाता अवलोकन',
    profileCompletion: 'प्रोफ़ाइल पूर्णता',
    uploadPhotoToImprove: 'स्कोर सुधारने के लिए प्रोफ़ाइल फ़ोटो अपलोड करें',
    farmsStat: 'फार्म',
    fieldsStat: 'खेत',
    soilTests: 'मिट्टी परीक्षण',
    leafScans: 'पत्ती स्कैन',
    totalAiReports: 'कुल AI रिपोर्ट जनरेट',
    registryInfo: 'रजिस्ट्री जानकारी',
    memberSince: 'सदस्य बनने की तिथि',
    lastActive: 'अंतिम सक्रिय',
    yieldRuns: 'उपज भविष्यवाणी',
    alertsLogged: 'दर्ज अलर्ट',
    totalAcreage: 'कुल क्षेत्रफल',
    runs: 'बार',
    alerts: 'अलर्ट',
    signOut: 'साइन आउट',
    aiActivitySummary: 'AI गतिविधि सारांश',
    aiAccuracyMsg: 'AI डायग्नोस्टिक सटीकता अंशांकित है',
    aiNoDataMsg: 'उपज भविष्यवाणी जनरेट होने पर AI डायग्नोस्टिक सटीकता अंशांकित होगी।',
    totalAcreageMsg: 'कुल पंजीकृत क्षेत्रफल',
    acresAcross: 'एकड़ है',
    farmTwins: 'फार्म ट्विन और',
    activeFields: 'सक्रिय खेत हैं।',
    // Security tab
    credentialsTitle: 'क्रेडेंशियल और लॉगिन सुरक्षा',
    currentPassword: 'वर्तमान पासवर्ड',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि',
    changeCredentials: 'क्रेडेंशियल बदलें',
    strength: 'मजबूती',
    weak: 'कमजोर',
    moderate: 'मध्यम',
    strong: 'मजबूत',
    gatewayToken: 'गेटवे टोकन:',
    validActive: 'वैध (सक्रिय)',
    encryption: 'एन्क्रिप्शन:',
    // Export tab
    exportBackupTitle: 'निर्यात और बैकअप',
    exportData: 'डेटा निर्यात',
    exportProfile: 'प्रोफ़ाइल निर्यात',
    exportFarmData: 'फार्म डेटा निर्यात',
    downloadAllReports: 'सभी रिपोर्ट डाउनलोड',
    backupRestore: 'बैकअप और पुनर्स्थापना',
    backupAccountData: 'खाता डेटा बैकअप',
    restoreBackup: 'बैकअप पुनर्स्थापित करें',
    selectBackupFile: 'बैकअप फ़ाइल चुनें',
    restoreHint: 'सत्यापन पर प्रोफ़ाइल पैरामीटर पुनः अंशांकित करता है।',
    // Notifications tab
    alertsPushTitle: 'अलर्ट और पुश टॉगल',
    emailNotifications: 'ईमेल सूचनाएं',
    emailNotificationsDesc: 'डायग्नोस्टिक डाइजेस्ट ईमेल।',
    diseaseSeverityAlerts: 'रोग गंभीरता अलर्ट',
    diseaseSeverityDesc: 'पत्तेदार रोग सीमा उल्लंघन पर अलर्ट।',
    weatherWarning: 'मौसम चेतावनी ध्वज',
    weatherWarningDesc: 'परिवेश गर्मी तनाव जोखिम अलर्ट।',
    yieldNotifications: 'उपज मॉडल सूचनाएं',
    yieldNotificationsDesc: 'AI उपज अनुमान पूर्ण होने पर सूचित करें।',
    gatewayChecks: 'IoT गेटवे जाँच',
    gatewayChecksDesc: 'बैटरी और सेंसर कनेक्टिविटी चेतावनियाँ।',
    systemNotifications: 'सिस्टम पुश सूचनाएं',
    systemNotificationsDesc: 'उच्च-प्राथमिकता रिपोर्ट के लिए डेस्कटॉप पुश।',
    alertsUpdated: 'अलर्ट नियम अपडेट किए गए।',
    // Devices tab
    sessionDeviceHistory: 'सत्र डिवाइस इतिहास',
    currentDevice: 'वर्तमान डिवाइस',
    active: 'सक्रिय',
    revoke: 'रद्द करें',
    clearOtherSessions: 'अन्य सत्र साफ़ करें',
    sessionRevoked: 'सत्र रद्द किया गया।',
    sessionsCleared: 'सभी अन्य सत्र साफ़ किए गए।',
    hoursAgo: 'घंटे पहले',
    // Logs tab
    activityTimeline: 'गतिविधि टाइमलाइन',
    loggedIn: 'लॉग इन किया',
    loggedInDesc: 'सुरक्षित प्राधिकरण सत्र सत्यापित।',
    generatedYield: 'उपज भविष्यवाणी जनरेट की',
    generatedYieldDesc: 'गेहूं फसल के लिए AI उपज मूल्यांकन।',
    performedSoil: 'मिट्टी विश्लेषण किया',
    performedSoilDesc: 'सेक्टर B के लिए N/pH स्तर दर्ज किए।',
    uploadedLeaf: 'पत्ती छवि अपलोड की',
    uploadedLeafDesc: 'प्रारंभिक झुलसा लक्षणों के लिए रोग स्कैन।',
    createdFarm: 'फार्म ट्विन बनाया',
    createdFarmDesc: 'नॉर्थ वैली फार्म पंजीकृत किया।',
    today: 'आज',
    yesterday: 'कल',
    // Privacy tab
    dataPrivacyTitle: 'डेटा गोपनीयता',
    quickExport: 'त्वरित निर्यात',
    dangerousActions: 'खतरनाक क्रियाएं',
    deleteAccountDesc: 'खाता हटाने से सभी IoT सेंसर, लॉग और रिपोर्ट डेटाबेस से हटाने के लिए निर्धारित हो जाएंगे।',
    terminateAccount: 'खाता समाप्त करें',
    deleteConfirm: 'खाता हटाएं? इसे पूर्ववत नहीं किया जा सकता।',
    privacyExportProfile: 'प्रोफ़ाइल',
    privacyExportFarm: 'फार्म',
    privacyExportReports: 'रिपोर्ट',
    // Support tab
    techSupportTitle: 'तकनीकी सहायता',
    helpCenter: 'सहायता केंद्र',
    helpCenterDesc: 'डिवाइस कॉन्फ़िगरेशन, सेंसर कैलिब्रेशन और डायग्नोस्टिक्स के लिए दस्तावेज़ीकरण गाइड।',
    readDocumentation: 'दस्तावेज़ पढ़ें →',
    reportBug: 'बग रिपोर्ट करें',
    reportBugDesc: 'टेलीमेट्री, अपलोड या निर्यात में समस्या मिली? टिकट दर्ज करें।',
    reportBugLink: 'बग रिपोर्ट करें →',
    ticketLogged: 'बैकलॉग में टिकट दर्ज किया गया!',
    // About tab
    aboutGatewayTitle: 'गेटवे के बारे में',
    softwareVersion: 'सॉफ़्टवेयर संस्करण',
    buildNumber: 'बिल्ड नंबर',
    apiGateway: 'API गेटवे',
    mongodbState: 'MongoDB स्थिति',
    aboutDesc: 'स्मार्ट कृषि डिजिटल ट्विन सिस्टम — प्रीमियम कृषि विशेषज्ञों और स्मार्ट फार्म ऑटोमेशन के लिए निर्मित।',
    // AI Insights bar
    aiInsightsTitle: 'AI ट्विन खाता अंतर्दृष्टि',
    aiInsightsDesc: 'उपयोग स्वास्थ्य स्कोर:',
    mostUsedModule: 'सर्वाधिक उपयोग मॉड्यूल:',
    fetchRecommendation: 'अनुशंसा प्राप्त करें',
    aiRecommendationSent: 'AI अनुशंसा अधिसूचना केंद्र में भेजी गई।',
    // Toast messages
    profileSaved: 'प्रोफ़ाइल सफलतापूर्वक सहेजी गई!',
    profileSaveFail: 'प्रोफ़ाइल अपडेट करने में विफल।',
    profileSaveError: 'प्रोफ़ाइल सहेजने में त्रुटि।',
    nameRequired: 'नाम खाली नहीं हो सकता।',
    passwordRequired: 'वर्तमान पासवर्ड आवश्यक है।',
    passwordTooShort: 'नया पासवर्ड कम से कम 8 अक्षर का होना चाहिए।',
    passwordComplexity: 'पासवर्ड में अपरकेस, संख्या और विशेष अक्षर होने चाहिए।',
    passwordMismatch: 'पासवर्ड मेल नहीं खाते।',
    passwordChanged: 'पासवर्ड सफलतापूर्वक बदला गया!',
    photoUpdated: 'प्रोफ़ाइल फ़ोटो अपडेट की गई!',
    photoRemoved: 'प्रोफ़ाइल फ़ोटो हटाई गई।',
    backupRestored: 'बैकअप पुनर्स्थापित। प्रोफ़ाइल सहेजें पर क्लिक करें।',
    backupParseFail: 'बैकअप पार्स करने में विफल।',
    exportedMsg: 'निर्यात किया',
    data: 'डेटा।',
    naValue: 'अनुपलब्ध',
    ac: 'एकड़',
  },
} as const;

interface ProfileProps {
  user: User;
  farms: Farm[];
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  profileImage: string | null;
  onUpdateProfileImage: (imageDataUrl: string | null) => void;
  language?: 'en' | 'hi';
}

type TabType = 
  | 'profile' 
  | 'overview'
  | 'security' 
  | 'export'
  | 'notifications' 
  | 'devices' 
  | 'logs' 
  | 'privacy' 
  | 'support' 
  | 'about';

// ── Image Processing Utilities ───────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported format "${file.type.split('/')[1].toUpperCase()}". Please upload JPG, JPEG, PNG, or WEBP.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`;
  }
  return null;
}

// Crop to square + compress + return as data URL (Canvas-based)
function processImage(file: File, outputSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = evt.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

// ── Avatar Component ─────────────────────────────────────────────────────────
interface AvatarDisplayProps {
  profileImage: string | null;
  name: string;
  size?: 'sm' | 'lg';
  onClick?: () => void;
  showEditIcon?: boolean;
  uploading?: boolean;
}

function AvatarDisplay({ profileImage, name, size = 'lg', onClick, showEditIcon = false, uploading = false }: AvatarDisplayProps) {
  const dim = size === 'lg' ? 'h-20 w-20' : 'h-10 w-10';
  const iconDim = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  
  return (
    <div className={`relative group ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className={`${dim} rounded-full overflow-hidden border-2 border-[#9333EA] shadow-xl shadow-purple-900/30 transition-transform duration-300 ${onClick ? 'group-hover:scale-105' : ''}`}>
        {profileImage ? (
          <img src={profileImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#D946EF] to-[#9333EA] flex items-center justify-center">
            <UserIcon className={`${iconDim} text-white`} />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>
      {showEditIcon && !uploading && (
        <div className="absolute bottom-0 right-0 bg-[#9333EA] text-white p-1.5 rounded-full border-2 border-[#0B0410] shadow-lg group-hover:bg-purple-500 transition-colors">
          <Camera className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

// ── Photo Upload Modal ────────────────────────────────────────────────────────
interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileImage: string | null;
  onUpdate: (dataUrl: string | null) => void;
  language?: 'en' | 'hi';
}

function PhotoModal({ isOpen, onClose, profileImage, onUpdate, language = 'en' }: PhotoModalProps) {
  const T = profileTrans[language];
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setError(null);
      setSuccess(null);
      setShowRemoveConfirm(false);
      setProgress(0);
    }
  }, [isOpen]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setSuccess(null);

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      // Simulate progress steps
      await new Promise(r => setTimeout(r, 150));
      setProgress(40);
      const processed = await processImage(file, 256);
      setProgress(80);
      await new Promise(r => setTimeout(r, 100));
      setProgress(100);
      setPreview(processed);
    } catch (e: any) {
      setError(e.message || T.imageProcessFail);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (!preview) return;
    onUpdate(preview);
    setSuccess(T.photoUpdatedSuccess);
    setTimeout(onClose, 1200);
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
  };

  const handleRemove = () => {
    onUpdate(null);
    setShowRemoveConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="bg-[#121024] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{T.profilePhotoTitle}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current / Preview */}
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#9333EA] shadow-lg shrink-0">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : profileImage ? (
              <img src={profileImage} alt="Current" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#D946EF] to-[#9333EA] flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 text-xs text-gray-400 leading-relaxed space-y-1">
            {preview && <p className="text-emerald-400 font-semibold">{T.newPhotoReady}</p>}
            {!preview && profileImage && <p className="text-purple-300">{T.currentProfilePhoto}</p>}
            {!preview && !profileImage && <p className="text-gray-400">{T.uploadPhotoHint}</p>}
            <p>{T.photoFormats}</p>
            <p>{T.autoCrop}</p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {T.processingImage}
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#9333EA] to-[#D946EF] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/30 border border-red-500/20 px-3 py-2.5 rounded-xl text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Drop zone */}
        {!preview && !uploading && (
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#9333EA]/40 hover:border-[#9333EA] bg-[#9333EA]/5 hover:bg-[#9333EA]/10 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all text-center"
          >
            <Camera className="h-8 w-8 text-[#9333EA]" />
            <p className="text-xs text-white font-semibold">{T.clickOrDragDrop}</p>
            <p className="text-[10px] text-gray-500">{T.photoSizeHint}</p>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileInput} className="hidden" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {preview ? (
            <>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> {T.savePhoto}
              </button>
              <button onClick={handleCancel} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white rounded-xl cursor-pointer">
                {T.cancel}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white rounded-xl cursor-pointer">
                {T.replace}
              </button>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileInput} className="hidden" />
            </>
          ) : (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                <Upload className="h-4 w-4" /> {profileImage ? T.changePhoto : T.uploadProfilePhoto}
              </button>
              {profileImage && (
                <button onClick={() => setShowRemoveConfirm(true)} className="px-4 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-xs font-bold text-rose-400 rounded-xl cursor-pointer flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> {T.removePhoto}
                </button>
              )}
            </>
          )}
        </div>

        {/* Remove Confirmation */}
        {showRemoveConfirm && (
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 space-y-3 text-xs">
            <p className="text-rose-300 font-semibold">{T.removePhotoConfirmTitle}</p>
            <p className="text-gray-400 leading-relaxed">{T.removePhotoConfirmDesc}</p>
            <div className="flex gap-2">
              <button onClick={handleRemove} className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 font-bold rounded-xl cursor-pointer">
                {T.yesRemove}
              </button>
              <button onClick={() => setShowRemoveConfirm(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl cursor-pointer">
                {T.cancel}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Main Profile Component ────────────────────────────────────────────────────
export default function Profile({ user, farms, onLogout, onUpdateUser, profileImage, onUpdateProfileImage, language = 'en' }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // Stats Counters
  const [fieldsCount, setFieldsCount] = useState(0);
  const [totalArea, setTotalArea] = useState(0);
  const [soilTestsCount, setSoilTestsCount] = useState(0);
  const [leafScansCount, setLeafScansCount] = useState(0);
  const [yieldPredictionsCount, setYieldPredictionsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [latestAccuracy, setLatestAccuracy] = useState<string>('Not Available');

  // Profile Fields
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(() => localStorage.getItem('profile_phone') || '');
  const [location, setLocation] = useState(() => localStorage.getItem('profile_location') || '');
  const [occupation, setOccupation] = useState(() => localStorage.getItem('profile_occupation') || '');
  const [organization, setOrganization] = useState(() => localStorage.getItem('profile_organization') || '');

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notifications preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [diseaseAlerts, setDiseaseAlerts] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [yieldAlerts, setYieldAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [fieldsRes, soilRes, diseaseRes, yieldRes, notifRes] = await Promise.all([
        fetch('/api/fields'),
        fetch('/api/soil-analysis'),
        fetch('/api/disease-history'),
        fetch('/api/yield-predictions'),
        fetch('/api/notifications')
      ]);
      const fiData = await fieldsRes.json();
      const sData = await soilRes.json();
      const dData = await diseaseRes.json();
      const yData = await yieldRes.json();
      const nData = await notifRes.json();
      if (fiData.success) {
        setFieldsCount(fiData.fields?.length || 0);
        setTotalArea((fiData.fields || []).reduce((s: number, f: any) => s + (f.area || 0), 0));
      }
      if (sData.success) setSoilTestsCount(sData.history?.length || 0);
      if (dData.success) setLeafScansCount(dData.history?.length || 0);
      if (yData.success) {
        setYieldPredictionsCount(yData.history?.length || 0);
        if (yData.history?.length > 0) {
          const latest = yData.history[0];
          const report = typeof latest.aiReport === 'string' ? JSON.parse(latest.aiReport) : latest.aiReport;
          const rawAcc = latest.accuracy !== undefined 
            ? latest.accuracy 
            : (latest.errorMargin !== undefined ? (100 - latest.errorMargin) : report?.predictionDetails?.accuracy);
          if (rawAcc !== undefined && rawAcc !== null) {
            const accNum = typeof rawAcc === 'number' ? rawAcc : parseFloat(String(rawAcc).replace(/[^0-9.]/g, ''));
            if (!isNaN(accNum)) {
              setLatestAccuracy(`${accNum.toFixed(1)}%`);
            }
          }
        }
      }
      if (nData.success) setNotificationsCount(nData.notifications?.length || 0);
    } catch (e) { console.error('Stats fetch failed:', e); }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast(profileTrans[language].nameRequired, 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('profile_phone', phone);
        localStorage.setItem('profile_location', location);
        localStorage.setItem('profile_occupation', occupation);
        localStorage.setItem('profile_organization', organization);
        onUpdateUser(data.user);
        showToast(profileTrans[language].profileSaved, 'success');
      } else {
        showToast(data.message || profileTrans[language].profileSaveFail, 'error');
      }
    } catch (e) {
      showToast(profileTrans[language].profileSaveError, 'error');
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = useMemo(() => {
    let s = 0;
    if (name.trim().length >= 3) s += 15;
    if (phone.trim()) s += 10;
    if (location.trim()) s += 10;
    if (occupation.trim()) s += 15;
    if (organization.trim()) s += 10;
    if (profileImage) s += 15;
    if (farms.length > 0) s += 15;
    if (fieldsCount > 0) s += 10;
    return Math.min(s, 100);
  }, [name, phone, location, occupation, organization, profileImage, farms, fieldsCount]);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { textKey: 'weak', color: 'text-red-400 bg-red-500/10' };
    if (score <= 4) return { textKey: 'moderate', color: 'text-amber-400 bg-amber-500/10' };
    return { textKey: 'strong', color: 'text-emerald-400 bg-emerald-500/10' };
  }, [newPassword]);

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    const T = profileTrans[language];
    if (!currentPassword) { showToast(T.passwordRequired, 'error'); return; }
    if (newPassword.length < 8) { showToast(T.passwordTooShort, 'error'); return; }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      showToast(T.passwordComplexity, 'error'); return;
    }
    if (newPassword !== confirmPassword) { showToast(T.passwordMismatch, 'error'); return; }
    showToast(T.passwordChanged, 'success');
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const triggerExport = (type: string) => {
    let dataObj: any = {};
    if (type === 'profile') dataObj = { name, phone, location, occupation, organization, email: user.email };
    else if (type === 'farm') dataObj = { farms, fieldsCount, totalArea };
    else if (type === 'reports') dataObj = { soilTests: soilTestsCount, diseaseScans: leafScansCount, predictions: yieldPredictionsCount };
    else dataObj = { backupVersion: 'v2.4.1', backupDate: new Date().toISOString(), profile: { name, phone, location, occupation, organization }, stats: { farmsCount: farms.length, fieldsCount, soilTestsCount, leafScansCount, yieldPredictionsCount } };
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `twin_${type}_backup.json`;
    link.click();
    showToast(`${profileTrans[language].exportedMsg}: ${type} ${profileTrans[language].data}`, 'success');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.profile) throw new Error('Invalid backup format.');
        const p = json.profile;
        if (p.name) setName(p.name);
        if (p.phone) { setPhone(p.phone); localStorage.setItem('profile_phone', p.phone); }
        if (p.location) { setLocation(p.location); localStorage.setItem('profile_location', p.location); }
        if (p.occupation) { setOccupation(p.occupation); localStorage.setItem('profile_occupation', p.occupation); }
        if (p.organization) { setOrganization(p.organization); localStorage.setItem('profile_organization', p.organization); }
        showToast(profileTrans[language].backupRestored, 'success');
      } catch (err: any) {
        showToast(err.message || profileTrans[language].backupParseFail, 'error');
      }
    };
    reader.readAsText(file);
  };

  const NavBtn = ({ tab, icon: Icon, label }: { tab: TabType; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full h-11 flex items-center justify-between px-4 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${activeTab === tab ? 'bg-[#9333EA] text-white' : 'text-[#A78BFA] hover:bg-white/5'}`}
    >
      <span className="flex items-center gap-2.5"><Icon className="h-4 w-4 shrink-0" /> {label}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">

      {/* Photo Upload Modal */}
      <AnimatePresence>
        {photoModalOpen && (
          <PhotoModal
            isOpen={photoModalOpen}
            onClose={() => setPhotoModalOpen(false)}
            profileImage={profileImage}
            language={language}
            onUpdate={(img) => {
              onUpdateProfileImage(img);
              showToast(img ? profileTrans[language].photoUpdated : profileTrans[language].photoRemoved, 'success');
            }}
          />
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-r from-[#1E1035] via-[#0D041A] to-[#160E2A] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[90px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-5 z-10">
          {/* Clickable avatar with camera icon */}
          <AvatarDisplay
            profileImage={profileImage}
            name={name}
            size="lg"
            showEditIcon
            onClick={() => setPhotoModalOpen(true)}
          />
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-black text-white tracking-tight">{name}</h2>
            <p className="text-xs text-purple-300 font-medium">
              {occupation || profileTrans[language].noOccupation}
              {organization ? ` ${profileTrans[language].at} ${organization}` : ''}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-rose-400" /> {location || profileTrans[language].noLocation}</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-cyan-400" /> {user.email}</span>
            </div>
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-purple-300 hover:text-white bg-[#9333EA]/10 hover:bg-[#9333EA]/20 border border-[#9333EA]/20 px-3 py-1 rounded-full transition-all cursor-pointer"
            >
              <Camera className="h-3 w-3" />
              {profileImage ? profileTrans[language].changePhoto : profileTrans[language].uploadProfilePhoto}
            </button>
          </div>
        </div>

        <div className="flex bg-[#121024]/60 border border-white/10 p-4 rounded-2xl gap-6 z-10 shrink-0 text-center text-xs">
          <div><span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{profileTrans[language].farms}</span><span className="text-base font-black text-purple-400">{farms.length}</span></div>
          <div className="border-l border-white/10"></div>
          <div><span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{profileTrans[language].fields}</span><span className="text-base font-black text-blue-400">{fieldsCount}</span></div>
          <div className="border-l border-white/10"></div>
          <div><span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{profileTrans[language].scans}</span><span className="text-base font-black text-emerald-400">{leafScansCount}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Nav */}
        <div className="bg-[#121024]/60 border border-white/10 rounded-3xl p-4 shadow-lg space-y-1.5 h-fit lg:col-span-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">
            {profileTrans[language].accountControl}
          </p>
          <NavBtn tab="profile" icon={UserIcon} label={profileTrans[language].profileSettings} />
          <NavBtn tab="overview" icon={Activity} label={profileTrans[language].accountOverview} />
          <NavBtn tab="security" icon={Lock} label={profileTrans[language].loginSecurity} />
          <NavBtn tab="export" icon={Download} label={profileTrans[language].exportBackup} />
          <NavBtn tab="notifications" icon={Bell} label={profileTrans[language].alertSettings} />
          <NavBtn tab="devices" icon={Monitor} label={profileTrans[language].connectedDevices} />
          <NavBtn tab="logs" icon={Activity} label={profileTrans[language].activityLog} />
          <NavBtn tab="privacy" icon={ShieldAlert} label={profileTrans[language].dataPrivacy} />
          <NavBtn tab="support" icon={LifeBuoy} label={profileTrans[language].techSupport} />
          <NavBtn tab="about" icon={Info} label={profileTrans[language].aboutGateway} />
        </div>

        {/* Tab Viewport */}
        <div className="lg:col-span-3">
          <div className="bg-[#121024]/80 border border-white/10 rounded-3xl shadow-2xl p-6 relative min-h-[480px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].farmerProfileSettings}</h3>

                {/* Profile Photo Section */}
                <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
                  <AvatarDisplay profileImage={profileImage} name={name} size="lg" showEditIcon onClick={() => setPhotoModalOpen(true)} />
                  <div className="flex-1 text-xs space-y-3 text-center sm:text-left">
                    <div>
                      <p className="font-bold text-white mb-0.5">{profileTrans[language].profilePhotoLabel}</p>
                      <p className="text-[10px] text-gray-400">{profileTrans[language].photoFormatsLabel}</p>
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <button onClick={() => setPhotoModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 text-[11px]">
                        <Camera className="h-3.5 w-3.5" /> {profileImage ? profileTrans[language].changePhoto : profileTrans[language].uploadProfilePhoto}
                      </button>
                      {profileImage && (
                        <button
                          onClick={() => { if (confirm(profileTrans[language].removePhotoConfirmShort)) { onUpdateProfileImage(null); showToast(profileTrans[language].photoRemoved, 'success'); } }}
                          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 text-[11px]"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {profileTrans[language].removePhoto}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].farmerName}</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={profileTrans[language].enterName} className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].phoneNumber}</label>
                      <input type="text" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} placeholder={profileTrans[language].enterPhone} className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].occupation}</label>
                      <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder={profileTrans[language].occupationPlaceholder} className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].organizationCooperative}</label>
                      <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} placeholder={profileTrans[language].optional} className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].location}</label>
                      <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={profileTrans[language].enterCity} className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].emailAddress}</label>
                      <input type="email" disabled value={user.email} className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow hover:shadow-purple-500/20 transition-all disabled:opacity-60">
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} {profileTrans[language].saveProfile}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ACCOUNT OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].accountOverviewTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white">{profileTrans[language].profileCompletion}</span>
                        <span className="font-black text-purple-400">{completionPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-[#9333EA] to-[#D946EF] rounded-full" style={{ width: `${completionPercentage}%` }} />
                      </div>
                      {!profileImage && (
                        <button onClick={() => setPhotoModalOpen(true)} className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer">
                          <Camera className="h-3 w-3" /> {profileTrans[language].uploadPhotoToImprove}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      {[
                        { label: profileTrans[language].farmsStat, value: farms.length, color: 'text-purple-400' },
                        { label: profileTrans[language].fieldsStat, value: fieldsCount, color: 'text-blue-400' },
                        { label: profileTrans[language].soilTests, value: soilTestsCount, color: 'text-emerald-400' },
                        { label: profileTrans[language].leafScans, value: leafScansCount, color: 'text-amber-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-black/35 p-3.5 rounded-2xl border border-white/5">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{label}</span>
                          <span className={`text-base font-black ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-black/35 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300">{profileTrans[language].totalAiReports}</span>
                      <span className="font-black text-[#D946EF]">{soilTestsCount + leafScansCount + yieldPredictionsCount}</span>
                    </div>
                  </div>
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-4">
                    <span className="font-bold text-white block text-[10px] uppercase tracking-wider">{profileTrans[language].registryInfo}</span>
                    <div className="space-y-3 text-xs">
                      {[
                        { 
                          label: profileTrans[language].memberSince, 
                          value: user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
                            : profileTrans[language].naValue
                        },
                        { 
                          label: profileTrans[language].lastActive, 
                          value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        },
                        { label: profileTrans[language].yieldRuns, value: `${yieldPredictionsCount} ${profileTrans[language].runs}` },
                        { label: profileTrans[language].alertsLogged, value: `${notificationsCount} ${profileTrans[language].alerts}` },
                        { label: profileTrans[language].totalAcreage, value: `${totalArea.toFixed(1)} ${profileTrans[language].ac}` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <span className="text-[9px] uppercase text-gray-400 block">{label}</span>
                          <span className="font-semibold text-white">{value}</span>
                        </div>
                      ))}
                      <div className="pt-3.5 border-t border-white/5 mt-2">
                        <button
                          type="button"
                          onClick={onLogout}
                          className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
                        >
                          <LogOut className="h-4 w-4" /> {profileTrans[language].signOut}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-[#9333EA] p-4 rounded-r-2xl text-xs space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-[#9333EA] animate-pulse" /> {profileTrans[language].aiActivitySummary}</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {yieldPredictionsCount > 0 
                      ? `${profileTrans[language].aiAccuracyMsg} ${latestAccuracy}. ` 
                      : `${profileTrans[language].aiNoDataMsg} `}
                    {profileTrans[language].totalAcreageMsg} {totalArea.toFixed(1)} {profileTrans[language].acresAcross} {farms.length} {profileTrans[language].farmTwins} {fieldsCount} {profileTrans[language].activeFields}
                  </p>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].credentialsTitle}</h3>
                <form onSubmit={handlePasswordSave} className="space-y-4 text-xs max-w-md">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].currentPassword}</label>
                    <input type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full h-11 px-4 pr-10 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-8 text-gray-400 hover:text-white cursor-pointer">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].newPassword}</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{profileTrans[language].confirmPassword}</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#9333EA] focus:outline-none" />
                    </div>
                  </div>
                  {passwordStrength && (
                    <div className={`p-2.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1.5 ${passwordStrength.color}`}>
                      <ShieldAlert className="h-4 w-4" /> {profileTrans[language].strength}: {profileTrans[language][passwordStrength.textKey as 'weak' | 'moderate' | 'strong']}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white font-bold rounded-xl cursor-pointer">{profileTrans[language].changeCredentials}</button>
                  </div>
                </form>
                <div className="border-t border-white/5 pt-4 bg-black/35 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400">
                  <p className="flex justify-between"><span>{profileTrans[language].gatewayToken}</span><span className="font-mono text-emerald-400 font-black">{profileTrans[language].validActive}</span></p>
                  <p className="flex justify-between"><span>{profileTrans[language].encryption}</span><span className="font-mono text-white">SHA-256 STATEFUL</span></p>
                </div>
              </div>
            )}

            {/* EXPORT TAB */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].exportBackupTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-3">
                    <span className="font-bold text-white block text-[10px] uppercase">{profileTrans[language].exportData}</span>
                    {[
                      { labelKey: 'exportProfile' as const, icon: UserIcon, type: 'profile', color: 'text-purple-400' },
                      { labelKey: 'exportFarmData' as const, icon: Layers, type: 'farm', color: 'text-blue-400' },
                      { labelKey: 'downloadAllReports' as const, icon: Activity, type: 'reports', color: 'text-emerald-400' },
                    ].map(({ labelKey, icon: Icon, type, color }) => (
                      <button key={type} onClick={() => triggerExport(type)} className="w-full h-11 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /> {profileTrans[language][labelKey]}</span>
                        <Download className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-4">
                    <span className="font-bold text-white block text-[10px] uppercase">{profileTrans[language].backupRestore}</span>
                    <button onClick={() => triggerExport('full_backup')} className="w-full py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                      <RefreshCw className="h-4 w-4" /> {profileTrans[language].backupAccountData}
                    </button>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-300 uppercase block">{profileTrans[language].restoreBackup}</span>
                      <label className="w-full h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer text-white">
                        <Upload className="h-4 w-4" /> {profileTrans[language].selectBackupFile}
                        <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                      </label>
                      <span className="text-[9px] text-gray-500 block">{profileTrans[language].restoreHint}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].alertsPushTitle}</h3>
                <div className="space-y-3 text-xs">
                  {[
                    { state: emailAlerts, set: setEmailAlerts, labelKey: 'emailNotifications' as const, descKey: 'emailNotificationsDesc' as const },
                    { state: diseaseAlerts, set: setDiseaseAlerts, labelKey: 'diseaseSeverityAlerts' as const, descKey: 'diseaseSeverityDesc' as const },
                    { state: weatherAlerts, set: setWeatherAlerts, labelKey: 'weatherWarning' as const, descKey: 'weatherWarningDesc' as const },
                    { state: yieldAlerts, set: setYieldAlerts, labelKey: 'yieldNotifications' as const, descKey: 'yieldNotificationsDesc' as const },
                    { state: systemAlerts, set: setSystemAlerts, labelKey: 'gatewayChecks' as const, descKey: 'gatewayChecksDesc' as const },
                    { state: pushAlerts, set: setPushAlerts, labelKey: 'systemNotifications' as const, descKey: 'systemNotificationsDesc' as const },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 bg-black/20 border border-white/5 p-3.5 rounded-2xl">
                      <div>
                        <span className="font-bold text-white block">{profileTrans[language][item.labelKey]}</span>
                        <span className="text-[10px] text-gray-400">{profileTrans[language][item.descKey]}</span>
                      </div>
                      <button onClick={() => { item.set(!item.state); showToast(profileTrans[language].alertsUpdated, 'success'); }} className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${item.state ? 'bg-[#9333EA]' : 'bg-neutral-800'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow transition-all ${item.state ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEVICES TAB */}
            {activeTab === 'devices' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].sessionDeviceHistory}</h3>
                <div className="space-y-3 text-xs">
                  <div className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="font-bold text-white flex items-center gap-1.5"><Monitor className="h-4 w-4 text-[#9333EA]" /> Chrome on Windows 10</span>
                      <span className="text-[10px] text-gray-400">IP: 192.168.1.15 | Delhi, IN ({profileTrans[language].currentDevice})</span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black uppercase">{profileTrans[language].active}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="font-bold text-white flex items-center gap-1.5"><Monitor className="h-4 w-4 text-gray-400" /> Safari on iPad (iOS)</span>
                      <span className="text-[10px] text-gray-500">IP: 103.88.2.9 | Mumbai, IN | 3 {profileTrans[language].hoursAgo}</span>
                    </div>
                    <button onClick={() => showToast(profileTrans[language].sessionRevoked, 'success')} className="text-[10px] text-rose-400 hover:underline cursor-pointer">{profileTrans[language].revoke}</button>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => showToast(profileTrans[language].sessionsCleared, 'success')} className="px-4 py-2 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[11px] font-bold rounded-xl cursor-pointer">{profileTrans[language].clearOtherSessions}</button>
                  </div>
                </div>
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].activityTimeline}</h3>
                <div className="relative pl-6 border-l border-white/10 space-y-5 text-xs">
                  {[
                    { titleKey: 'loggedIn' as const, descKey: 'loggedInDesc' as const, time: `${profileTrans[language].today} 02:02 AM` },
                    { titleKey: 'generatedYield' as const, descKey: 'generatedYieldDesc' as const, time: `${profileTrans[language].yesterday} 08:30 PM` },
                    { titleKey: 'performedSoil' as const, descKey: 'performedSoilDesc' as const, time: 'July 01, 2026' },
                    { titleKey: 'uploadedLeaf' as const, descKey: 'uploadedLeafDesc' as const, time: 'June 28, 2026' },
                    { titleKey: 'createdFarm' as const, descKey: 'createdFarmDesc' as const, time: 'June 25, 2026' },
                  ].map((log, idx) => (
                    <div key={idx} className="relative space-y-0.5">
                      <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-[#9333EA] border border-black" />
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-bold text-white">{profileTrans[language][log.titleKey]}</span>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">{log.time}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{profileTrans[language][log.descKey]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].dataPrivacyTitle}</h3>
                <div className="space-y-4 text-xs">
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-3">
                    <span className="font-bold text-white block">{profileTrans[language].quickExport}</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'profile', labelKey: 'privacyExportProfile' as const },
                        { key: 'farm', labelKey: 'privacyExportFarm' as const },
                        { key: 'reports', labelKey: 'privacyExportReports' as const },
                      ].map(({ key, labelKey }) => (
                        <button key={key} onClick={() => triggerExport(key)} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer capitalize">
                          <Download className="h-3.5 w-3.5" /> {profileTrans[language][labelKey]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-rose-950/10 border border-rose-500/10 p-4 rounded-2xl space-y-2">
                    <span className="font-bold text-rose-400 block">{profileTrans[language].dangerousActions}</span>
                    <p className="text-[10px] text-rose-300/70 leading-relaxed">{profileTrans[language].deleteAccountDesc}</p>
                    <button onClick={() => { if (confirm(profileTrans[language].deleteConfirm)) onLogout(); }} className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl cursor-pointer">
                      {profileTrans[language].terminateAccount}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].techSupportTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-2">
                    <span className="font-bold text-white block">{profileTrans[language].helpCenter}</span>
                    <p className="text-[10px] text-gray-400">{profileTrans[language].helpCenterDesc}</p>
                    <a href="https://example.com/docs" target="_blank" rel="noreferrer" className="text-purple-400 font-bold hover:underline block">{profileTrans[language].readDocumentation}</a>
                  </div>
                  <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-2">
                    <span className="font-bold text-white block">{profileTrans[language].reportBug}</span>
                    <p className="text-[10px] text-gray-400">{profileTrans[language].reportBugDesc}</p>
                    <button onClick={() => showToast(profileTrans[language].ticketLogged, 'success')} className="text-purple-400 font-bold hover:underline cursor-pointer">{profileTrans[language].reportBugLink}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">{profileTrans[language].aboutGatewayTitle}</h3>
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                  {[
                    { labelKey: 'softwareVersion' as const, value: 'v2.4.1-prod', mono: true },
                    { labelKey: 'buildNumber' as const, value: '2026.07.02-rel', mono: true },
                    { labelKey: 'apiGateway' as const, value: 'ONLINE (SIM)', mono: true, green: true },
                    { labelKey: 'mongodbState' as const, value: 'CONNECTED (ATLAS)', mono: true, green: true },
                  ].map(({ labelKey, value, mono, green }) => (
                    <div key={labelKey}>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{profileTrans[language][labelKey]}</span>
                      <span className={`font-semibold ${green ? 'text-emerald-400' : 'text-white'} ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                  <div className="col-span-2 border-t border-white/5 pt-3">
                    <span className="text-[9px] text-gray-400">{profileTrans[language].aboutDesc}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Bar */}
      <div className="bg-gradient-to-r from-[#9333EA]/10 via-[#C026D3]/10 to-[#9333EA]/5 border border-purple-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="space-y-0.5 text-xs">
            <h4 className="font-black text-white uppercase tracking-wider">{profileTrans[language].aiInsightsTitle}</h4>
            <p className="text-[10px] text-purple-200">{profileTrans[language].aiInsightsDesc} <span className="font-black text-emerald-400">92/100</span>. {profileTrans[language].mostUsedModule} <span className="font-black text-blue-400">Soil Analysis</span>.</p>
          </div>
        </div>
        <button onClick={() => showToast(profileTrans[language].aiRecommendationSent, 'success')} className="px-5 py-2 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold uppercase rounded-xl cursor-pointer">
          {profileTrans[language].fetchRecommendation}
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border bg-black/85 backdrop-blur-xl border-white/10 text-white"
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
