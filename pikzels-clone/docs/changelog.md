# Changelog

## [Unreleased]

### Added
- Advanced Analytics Dashboard with detailed metrics
  - Timeframe filtering capabilities (daily, weekly, monthly)
  - Comparative analytics showing current vs previous period data
  - Detailed metrics visualizations including creation trends, edit distribution, and platform distribution
  - New API endpoints for detailed and comparative analytics
  - Frontend AdvancedAnalyticsDashboard component with interactive visualizations
  - Integration with existing analytics dashboard
  - Comprehensive documentation for the advanced analytics feature
- User settings/preferences management feature
  - API endpoints for getting and updating user settings
  - Database schema update with JSON settings field
  - Frontend UserSettings component with comprehensive UI
  - Support for theme, language, notifications, thumbnail defaults, and privacy settings
  - Complete test coverage for both frontend and backend
  - API documentation for settings endpoints
  - Developer guide for extending user settings
  - Component documentation for UserSettings
- Template Marketplace for sharing thumbnail templates
  - Database schema with Template model for storing template metadata
  - Backend API endpoints for template creation, retrieval, updating, and deletion
  - Frontend components for browsing and using templates
  - Template creation functionality from existing thumbnails
  - Public and private template visibility options
  - Template tagging and search functionality
  - Usage tracking with downloads and likes metrics
  - Comprehensive documentation for the template marketplace feature
- Collaboration features for team-based thumbnail creation
  - Database schema with Team, TeamMember, and TeamInvitation models
  - Backend API endpoints for team management, membership, and invitations
  - Team ownership for projects
  - Comprehensive documentation for the collaboration feature
- Mobile application version of the thumbnail maker
  - React Native mobile app with Expo
  - Shared codebase with web application
  - Authentication and thumbnail management features
  - Native mobile UI components
  - Comprehensive documentation for mobile development

### Changed
- Updated Dashboard to include link to User Settings
- Enhanced existing AnalyticsDashboard with navigation to Advanced Analytics
- Added route for User Settings page in App component
- Added route for Advanced Analytics Dashboard in App component
- Added navigation link to Template Marketplace in Dashboard

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [1.0.0] - 2025-09-07

### Added
- Initial project setup
- Authentication system (register, login, profile)
- Thumbnail generation and management
- Thumbnail editing capabilities
- Thumbnail sharing feature
- Batch editing functionality
- Image processing enhancements