# Klypp - Subscription Management App

Klypp is a mobile application that helps users manage their personal and shared subscriptions. It provides features for tracking subscription costs, renewal dates, and sharing subscriptions with others.

## Features

- **User Authentication**: Secure signup, login, and password reset
- **Subscription Management**: Add, edit, and delete subscriptions
- **Subscription Sharing**: Invite others to share subscriptions and split costs
- **Notifications**: Real-time notifications for subscription invites
- **Dashboard**: Overview of all subscriptions with filtering and sorting options
- **Profile Management**: Update user profile and preferences

## Tech Stack

- **Frontend**: React Native with TypeScript
- **UI Library**: Gluestack UI
- **State Management**: Zustand
- **Backend**: Supabase (Authentication, Database, Storage, Realtime)
- **Navigation**: React Navigation

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/klypp.git
   cd klypp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a Supabase project and set up environment variables:
   - Create a new project in Supabase
   - Copy `.env.example` to `.env` and update with your Supabase credentials:
     ```
     cp .env.example .env
     ```
   - Edit the `.env` file with your Supabase URL and anon key
   - Run the SQL script in `database_setup.sql` in the Supabase SQL editor to set up tables and RLS policies

4. Start the development server:
   ```
   npm start
   ```

5. Run on a device or emulator:
   ```
   npm run android
   # or
   npm run ios
   ```

## Project Structure

- `src/screens/`: Screen components
- `src/components/`: Reusable UI components
- `src/navigation/`: Navigation configuration
- `src/services/`: API services (Supabase)
- `src/store/`: State management (Zustand)
- `src/utils/`: Utility functions
- `src/hooks/`: Custom React hooks
- `src/types/`: TypeScript type definitions

## Environment Variables

The application uses the following environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

These can be set in the `.env` file at the root of the project. A template is provided in `.env.example`.

## Database Schema

The application uses the following tables in Supabase:

- `users`: User profiles
- `subscriptions`: Subscription details
- `subscription_members`: Junction table for shared subscriptions
- `notifications`: User notifications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Supabase](https://supabase.io/) for the backend infrastructure
- [React Native](https://reactnative.dev/) for the mobile framework
- [Gluestack UI](https://gluestack.io/) for the UI components
- [Zustand](https://github.com/pmndrs/zustand) for state management 