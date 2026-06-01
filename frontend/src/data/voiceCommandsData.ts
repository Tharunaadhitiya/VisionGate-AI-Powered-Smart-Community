import { Home, Users, Shield, AlertTriangle, FileText, Bell, BarChart3, CreditCard, Megaphone, UserPlus, BookUser, Eye, MessageSquare, Search, Activity, Camera, Calendar } from 'lucide-react';

export interface VoiceCommandDef {
  phrase: string;
  action: string;
  description: string;
  example: string;
  category: string;
  icon: string;
}

const ICONS: Record<string, any> = {
  Home, Users, Shield, AlertTriangle, FileText, Bell, BarChart3,
  CreditCard, Megaphone, UserPlus, BookUser, Eye, MessageSquare,
  Search, Activity, Camera, Calendar,
};

function cmd(
  phrase: string,
  action: string,
  description: string,
  example: string,
  category: string,
  icon: string
): VoiceCommandDef {
  return { phrase, action, description, example, category, icon };
}

export const commandsByRole: Record<string, VoiceCommandDef[]> = {
  resident: [
    cmd('add a visitor', 'Open Add Visitor Form', 'Pre-register a new visitor with name and phone', '"Add a visitor" — opens the add visitor form to enter name, phone, and purpose.', 'Visitors', 'UserPlus'),
    cmd('show my visitors', 'Navigate to Visitors', 'View all your registered visitors and their status', '"Show my visitors" — opens the visitors page with full list.', 'Visitors', 'Users'),
    cmd('open notifications', 'Open Notifications', 'View your recent notifications and alerts', '"Open notifications" — shows notification panel.', 'General', 'Bell'),
    cmd('raise a complaint', 'Open Complaint Form', 'Submit a new maintenance or service complaint', '"Raise a complaint" — opens the complaint submission form.', 'Complaints', 'FileText'),
    cmd('contact security', 'Open SOS Emergency', 'Send an emergency alert to security', '"Contact security" — opens the SOS emergency panel.', 'Emergency', 'AlertTriangle'),
    cmd('show pending payments', 'Navigate to Payments', 'Check your pending maintenance and other dues', '"Show pending payments" — goes to your payment dashboard.', 'Payments', 'CreditCard'),
    cmd('pay maintenance', 'Navigate to Payments', 'Make a maintenance fee payment', '"Pay maintenance" — opens the payment section.', 'Payments', 'CreditCard'),
    cmd('open notice board', 'Navigate to Notices', 'View community announcements and notices', '"Open notice board" — opens the Notice Board page.', 'General', 'Megaphone'),
    cmd('show upcoming events', 'Navigate to Amenities', 'View upcoming community events and amenity bookings', '"Show upcoming events" — opens the amenities/events page.', 'General', 'Calendar'),
    cmd('open directory', 'Open User Directory', 'Search for residents, security, and staff', '"Open directory" — opens the user directory.', 'General', 'BookUser'),
    cmd('open AI assistant', 'Open AI Assistant', 'Launch the AI-powered chatbot assistant', '"Open AI assistant" — activates the chatbot.', 'General', 'MessageSquare'),
    cmd('show dashboard', 'Go to Dashboard', 'Return to your main dashboard', '"Show dashboard" — navigates back to home.', 'General', 'Home'),
  ],

  security: [
    cmd('verify visitor', 'Open Verify Entry', 'Verify a visitor identity via OTP', '"Verify visitor" — opens the OTP verification modal.', 'Visitors', 'Shield'),
    cmd('show today visitors', 'Navigate to Visitors', 'View all visitors checked in today', '"Show today visitors" — opens the visitors list.', 'Visitors', 'Users'),
    cmd('view alerts', 'Navigate to Alerts', 'View active security alerts', '"View alerts" — opens the alerts management page.', 'Alerts', 'Bell'),
    cmd('open notifications', 'Open Notifications', 'View your recent notifications', '"Open notifications" — shows notification panel.', 'General', 'Bell'),
    cmd('show pending verifications', 'Navigate to Visitors', 'View visitors waiting for entry verification', '"Show pending verifications" — shows pending visitors.', 'Visitors', 'Eye'),
    cmd('contact admin', 'Open SOS Emergency', 'Send an emergency alert to administrators', '"Contact admin" — opens the SOS emergency panel.', 'Emergency', 'AlertTriangle'),
    cmd('open notice board', 'Navigate to Notices', 'View community announcements and notices', '"Open notice board" — opens the Notice Board page.', 'General', 'Megaphone'),
    cmd('open directory', 'Open User Directory', 'Search for residents and staff', '"Open directory" — opens the user directory.', 'General', 'BookUser'),
    cmd('open surveillance', 'Navigate to Surveillance', 'View live surveillance camera feeds', '"Open surveillance" — opens the surveillance panel.', 'Security', 'Camera'),
    cmd('show dashboard', 'Go to Dashboard', 'Return to security control center', '"Show dashboard" — navigates back to home.', 'General', 'Home'),
  ],

  admin: [
    cmd('create emergency alert', 'Open SOS Emergency', 'Create and broadcast an emergency alert', '"Create emergency alert for power outage in Block B" — creates an emergency alert.', 'Emergency', 'AlertTriangle'),
    cmd('show complaints', 'Navigate to Complaints', 'View all resident complaints', '"Show complaints" — opens the complaints management page.', 'Complaints', 'FileText'),
    cmd('show high-priority complaints', 'Navigate to Complaints', 'View critical and high-priority complaints', '"Show high-priority complaints" — filters complaints by priority.', 'Complaints', 'FileText'),
    cmd('open analytics', 'Navigate to Analytics', 'View community analytics and reports', '"Open analytics" — opens the analytics dashboard.', 'Analytics', 'BarChart3'),
    cmd('send notification', 'Open Notification Composer', 'Send a targeted notification to users', '"Send notification" — opens the notification composer.', 'Notifications', 'Bell'),
    cmd('promote resident to admin', 'Open User Management', 'Promote a resident to administrator role', '"Promote resident to admin" — opens user management for promotion.', 'Users', 'UserPlus'),
    cmd('view user directory', 'Open User Directory', 'Browse and search all community users', '"View user directory" — opens the directory.', 'Users', 'BookUser'),
    cmd('open user management', 'Open User Management', 'Manage users, roles, and reactivation requests', '"Open user management" — full user management panel.', 'Users', 'Users'),
    cmd('view security incidents', 'Navigate to Surveillance', 'Review security incidents and surveillance data', '"View security incidents" — opens surveillance page.', 'Security', 'Camera'),
    cmd('open payments', 'Open Payment Management', 'Manage community payments and fines', '"Open payments" — opens the payment management panel.', 'Payments', 'CreditCard'),
    cmd('open notice board', 'Navigate to Notices', 'Publish and manage community notices', '"Open notice board" — opens the Notice Board page for admins.', 'General', 'Megaphone'),
    cmd('open alerts', 'Navigate to Alerts', 'View and manage security alerts', '"Open alerts" — opens the alerts management page.', 'Alerts', 'Bell'),
    cmd('open directory', 'Open User Directory', 'Search for any community member', '"Open directory" — opens the user directory.', 'General', 'BookUser'),
    cmd('show dashboard', 'Go to Dashboard', 'Return to the admin dashboard', '"Show dashboard" — navigates back to home.', 'General', 'Home'),
  ],
};

export const categoryOrder = ['Emergency', 'Complaints', 'Visitors', 'Alerts', 'Notifications', 'Payments', 'Users', 'Analytics', 'Security', 'General'];

export function getIconComponent(iconName: string): any {
  return ICONS[iconName] || Home;
}

export function getCommandsForRole(role: string): VoiceCommandDef[] {
  return commandsByRole[role] || commandsByRole.resident;
}

export function searchCommands(commands: VoiceCommandDef[], query: string): VoiceCommandDef[] {
  if (!query.trim()) return commands;
  const q = query.toLowerCase();
  return commands.filter(
    (c) =>
      c.phrase.toLowerCase().includes(q) ||
      c.action.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  );
}
