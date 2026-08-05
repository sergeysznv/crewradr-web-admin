const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'src', 'messages');
const enPath = path.join(messagesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const newKeys = {
  // Dashboard KPIs
  webFleetFleetSize: 'Fleet Size',
  webFleetActiveNow: 'Active Now',
  webFleetAlerts24h: 'Alerts (24h)',
  webFleetTripsToday: 'Trips Today',
  webFleetSafetyScore: 'Safety Score',
  webFleetAllClear: 'All clear',
  webFleetGood: 'Good',
  webFleetFair: 'Fair',
  webFleetPoor: 'Poor',
  webFleetOnline: 'Online',
  webFleetAlertsLabel: 'Alerts',
  webFleetRecentActivity: 'Recent Activity',
  webFleetNoRecentTrips: 'No trips in the last 7 days',
  webFleetNoRecentTripsDesc: 'Trip activity will appear here as members start driving.',
  webFleetKm: 'km',
  webFleetMin: 'min',
  webFleetAlertsCount: '{count} alert{plural}',
  webFleetUnknown: 'Unknown',
  webFleetFailedToLoad: 'Failed to load fleet data',

  // Members
  webMembersRoleAll: 'All Roles',
  webMembersRoleCaptainLabel: 'Captain',
  webMembersRoleCoCaptainLabel: 'Co-Captain',
  webMembersRoleMemberLabel: 'Member',
  webMembersColMember: 'Member',
  webMembersColRole: 'Role',
  webMembersColStatus: 'Status',
  webMembersColTrips: 'Trips (30d)',
  webMembersColJoined: 'Joined',
  webMembersStatusActive: 'Active',
  webMembersStatusOffline: 'Offline',
  webMembersSearchPlaceholder: 'Search members…',
  webMembersImportButton: 'Import CSV',
  webMembersLoading: 'Loading…',
  webMembersNoMembersFound: 'No members found',
  webMembersNoMembersHint: 'Try adjusting your search or filters.',
  webMembersRemoveDialogTitle: 'Remove Member',
  webMembersRemoveDialogMessage: 'Remove {name} from the crew? This action cannot be undone.',
  webMembersRemoveFromCrew: 'Remove from Crew',
  webMembersVerifyHint: 'Type {name} to confirm',
  webMembersDetailRole: 'Role',
  webMembersDetailJoined: 'Joined',
  webMembersDetailTrips: 'Trips (30d)',
  webMembersDetailRecentTrips: 'Recent Trips',
  webMembersDetailNoTrips: 'No recent trips',
  webMembersDetailChangeRole: 'Change Role',
  webMembersDetailMin: 'min',
  webMembersDetailKm: 'km',
  webMembersBulkSelected: '{count} selected',
  webMembersBulkRole: 'Role',
  webMembersBulkApply: 'Apply',
  webMembersBulkClear: 'Clear',
  webMembersImportTitle: 'Import Members',
  webMembersImportHint: 'Paste CSV data below',
  webMembersImportFormat: 'Format: email, role (member or co-captain)',
  webMembersImportCancel: 'Cancel',
  webMembersImportImporting: 'Importing…',
  webMembersImportResult: 'Added {added} members',
  webMembersImportErrors: '{errors} errors',
  webMembersFailedToLoad: 'Failed to load members',

  // Audit Log
  webAuditDateRange: 'Date Range',
  webAuditActionLabel: 'Action',
  webAuditLast7d: 'Last 7d',
  webAuditLast30d: 'Last 30d',
  webAuditLast90d: 'Last 90d',
  webAuditAllTime: 'All time',
  webAuditActionAll: 'All Actions',
  webAuditActionMemberAdded: 'Member Added',
  webAuditActionMemberRemoved: 'Member Removed',
  webAuditActionRoleChanged: 'Role Changed',
  webAuditActionBulkImportLabel: 'Bulk Import',
  webAuditColTimestamp: 'Timestamp',
  webAuditColActor: 'Actor',
  webAuditColAction: 'Action',
  webAuditColTarget: 'Target',
  webAuditColDetails: 'Details',
  webAuditSystem: 'System',
  webAuditExport: 'Export',
  webAuditLoading: 'Loading…',
  webAuditNoEvents: 'No audit events',
  webAuditNoEventsHint: 'No events match your current filters.',
  webAuditFailedToLoad: 'Failed to load audit logs',

  // Settings
  webSettingsGeneralTab: 'General',
  webSettingsBrandingTab: 'Branding',
  webSettingsDangerTab: 'Danger Zone',
  webSettingsCrewName: 'Crew Name',
  webSettingsCrewNameHint: 'Crew name can only be changed in the mobile app.',
  webSettingsSubscriptionTier: 'Subscription Tier',
  webSettingsCurrentPlan: 'Current Plan',
  webSettingsStatus: 'Status',
  webSettingsRenews: 'Renews',
  webSettingsBilling: 'Billing',
  webSettingsBillingHint: 'Managed via App Store / Google Play',
  webSettingsPrimaryColor: 'Primary Color',
  webSettingsLogo: 'Logo',
  webSettingsLogoReplace: 'Replace',
  webSettingsLogoRemove: 'Remove',
  webSettingsLogoUploading: 'Uploading…',
  webSettingsLogoHint: 'Upload a PNG or SVG (max 2MB)',
  webSettingsLogoUploadAria: 'Upload logo',
  webSettingsLivePreview: 'Live Preview',
  webSettingsPreviewCard: 'Sample Crew Card',
  webSettingsPreviewCardHint: 'This is how your crew sees the app',
  webSettingsPreviewButton: 'Button',
  webSettingsAdmiralRequired: 'Enterprise branding requires Admiral tier.',
  webSettingsSaved: 'Saved',
  webSettingsSaving: 'Saving…',
  webSettingsSaveBranding: 'Save Branding',
  webSettingsDangerZoneTitle: 'Danger Zone',
  webSettingsTransferOwnership: 'Transfer Ownership',
  webSettingsTransferHint: 'Transfer captaincy to another member',
  webSettingsTransferButton: 'Transfer',
  webSettingsLeaveCrew: 'Leave Crew',
  webSettingsLeaveHint: 'Remove yourself from this crew',
  webSettingsLeaveButton: 'Leave',
  webSettingsDeleteCrew: 'Delete Crew',
  webSettingsDeleteHint: 'Permanently delete this crew and all its data',
  webSettingsDeleteButton: 'Delete',
  webSettingsComingSoon: 'Coming Soon',

  // Compliance
  webComplianceGenerateReport: 'Generate Report',
  webComplianceHide: 'Hide',
  webCompliancePreview: 'Preview ({count} records)',
  webComplianceDownloadCsv: 'Download CSV',
  webComplianceColDate: 'Date',
  webComplianceColType: 'Type',
  webComplianceColSeverity: 'Severity',
  webComplianceColDescription: 'Description',
  webComplianceColDriver: 'Driver',
  webComplianceColHours: 'Hours',
  webComplianceColDistance: 'Distance',
  webComplianceColFatigue: 'Fatigue',
  webComplianceShowingN: 'Showing {shown} of {total} records. Download CSV for full report.',
  webComplianceKm: 'km',

  // Shared
  webSharedCancel: 'Cancel',
  webSharedDismiss: 'Dismiss',
  webSharedClosePanel: 'Close panel',
  webSharedSelectAll: 'Select all',
  webSharedSelectItem: 'Select {id}',
  webSharedShowing: 'Showing {from}–{to} of {total}',
  webSharedPrevPage: 'Previous page',
  webSharedNextPage: 'Next page',
  webSharedErrorTitle: 'Something went wrong',
  webSharedErrorDesc: 'An unexpected error occurred. Please try refreshing the page.',
  webSharedTryAgain: 'Try Again',
  webSharedRetry: 'Retry',

  // Session overlay
  webSessionStillHere: 'Still here?',
  webSessionInactiveWarning: "You've been inactive for a while. You'll be signed out soon.",
  webSessionStaySignedIn: 'Stay Signed In',
  webSessionSignOutNow: 'Sign Out Now',
  webSessionSignedOut: 'Signed Out',
  webSessionInactiveSignedOut: 'You were signed out due to inactivity. Sign in again to continue.',
  webSessionSignInAgain: 'Sign In Again',

  // Shell
  webShellOpenMenu: 'Open menu',
  webShellCloseMenu: 'Close menu',
  webShellExpand: 'Expand',
  webShellCollapse: 'Collapse',
  webShellLightMode: 'Light mode',
  webShellDarkMode: 'Dark mode',
  webShellConnectionError: 'Connection Error',
  webShellConnectionErrorDesc: 'Could not load your account. Check your connection and try again.',
  webShellToggleTheme: 'Toggle theme',

  // 404
  webNotFoundTitle: 'Page not found',
  webNotFoundDesc: "The page you're looking for doesn't exist or has been moved.",
  webNotFoundCta: 'Back to Dashboard',

  // Login remaining
  webLoginPasskeyFailed: 'Passkey sign-in failed',
  webLoginSignedOutInactivity: 'You were signed out due to inactivity. Please sign in again.',
  webLoginSignInPasskey: 'Sign in with passkey',
  webLoginOr: 'or',
  webLogin2faRequiredTitle: '2FA Required',
  webLogin2faRequiredDesc: 'Two-factor authentication is required for web portal access.',
  webLogin2faSetupSteps: 'Set up 2FA in the mobile app:',
  webLogin2faStep1: 'Open CrewRadr on your phone',
  webLogin2faStep2: 'Go to Settings → Account & Security → Protect Your Account with MFA',
  webLogin2faStep3: 'Link your authenticator app and return here',
  webLoginNoCrewTitle: 'No Crew Found',
  webLoginSignOut: 'Sign Out',

  // Mutations
  webMutationRoleChanged: 'Role changed to {role}',
  webMutationMemberRemoved: 'Member removed',
  webMutationMembersImported: '{added} members imported{errors, select, 0 {} other {, {errors} errors}}',

  // Utils
  webTierAdmiral: 'Admiral',
  webTierCaptain: 'Captain',
  webTierFirstMate: 'First Mate',
  webTierDeckhand: 'Deckhand',
  webTimeJustNow: 'Just now',
  webTimeMinAgo: '{n}m ago',
  webTimeHourAgo: '{n}h ago',
  webDistanceKm: 'km',
  webDistanceMi: 'mi',
  webSpeedMph: 'mph',
  webSpeedKmh: 'km/h',

  // Provisioning
  webProvisioningUsageCount: ' · {count} uses',
  webProvisioningClipboardDenied: 'Clipboard access denied',
  webProvisioningFailedToLoad: 'Failed to load provisioning links',
};

// Add keys not already present
let added = 0;
for (const [k, v] of Object.entries(newKeys)) {
  if (!(k in en)) {
    en[k] = v;
    added++;
  }
}

// Sort keys
const sorted = {};
Object.keys(en).sort().forEach(k => sorted[k] = en[k]);
fs.writeFileSync(enPath, JSON.stringify(sorted, null, 2) + '\n');
console.log('Added ' + added + ' new keys to en.json. Total keys: ' + Object.keys(sorted).length);

// Copy new keys to other locales
for (const locale of ['es', 'fr', 'ar', 'zh', 'ru']) {
  const localePath = path.join(messagesDir, locale + '.json');
  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  let localeAdded = 0;
  for (const [k, v] of Object.entries(newKeys)) {
    if (!(k in data)) {
      data[k] = v; // English fallback
      localeAdded++;
    }
  }
  const localeSorted = {};
  Object.keys(data).sort().forEach(k => localeSorted[k] = data[k]);
  fs.writeFileSync(localePath, JSON.stringify(localeSorted, null, 2) + '\n');
  console.log(locale + ': added ' + localeAdded + ' keys. Total: ' + Object.keys(localeSorted).length);
}
