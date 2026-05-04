export const roleLabels = {
  super_admin: 'Super Admin',
  marketing_manager: 'Marketing Manager',
  content_editor: 'Content Editor',
  analyst: 'Analyst',
  read_only: 'Read Only',
  team_member: 'Team Member',
}

export const rolePermissions = {
  super_admin: [
    'view_dashboard',
    'manage_campaigns',
    'edit_content',
    'manage_audience',
    'manage_automations',
    'view_analytics',
    'view_reports',
    'export_reports',
    'manage_team_access',
    'manage_settings',
  ],
  marketing_manager: [
    'view_dashboard',
    'manage_campaigns',
    'edit_content',
    'manage_audience',
    'manage_automations',
    'view_analytics',
    'view_reports',
    'export_reports',
  ],
  content_editor: ['view_dashboard', 'manage_campaigns', 'edit_content', 'view_analytics', 'view_reports'],
  analyst: ['view_dashboard', 'view_analytics', 'view_reports', 'export_reports'],
  read_only: ['view_dashboard', 'view_analytics', 'view_reports'],
  team_member: [],
}

export const canAccess = (admin, permission) => {
  if (!permission) {
    return true
  }

  if (admin?.permissions?.includes(permission)) {
    return true
  }

  return rolePermissions[admin?.role || 'read_only']?.includes(permission) || false
}
