export const mobileEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "",
  passwordResetUrl: process.env.EXPO_PUBLIC_PASSWORD_RESET_URL?.trim() ?? "",
};

export function hasMobileBackendConfig() {
  return Boolean(mobileEnv.supabaseUrl && mobileEnv.supabaseAnonKey);
}
