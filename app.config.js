const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  };
}; 