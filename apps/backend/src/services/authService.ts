import { supabase } from "../supabase";

interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  role: "client" | "partner";
  document?: string;
  crc?: string;
  phone?: string;
}

interface LoginUserData {
  email: string;
  password: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export async function registerUser(data: RegisterUserData) {
  const { email, password, name, role, document, crc, phone } = data;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        document,
        crc,
        phone,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  return {
    user: authData.user,
    session: authData.session,
  };
}

export async function loginUser(data: LoginUserData) {
  const { email, password } = data;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  return {
    user: authData.user,
    session: authData.session,
  };
}

export async function verifyOTP(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function resendOTP(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { message: "OTP reenviado com sucesso" };
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { message: "Email de recuperação enviado com sucesso" };
}

export async function resetPassword(data: ResetPasswordData) {
  const { newPassword } = data;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { message: "Senha alterada com sucesso" };
}
