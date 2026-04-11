export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number | string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  type?: string;
  user?: UserResponse;
  message?: string;
}