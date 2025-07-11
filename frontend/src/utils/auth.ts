// utils/auth.ts
import {jwtDecode} from 'jwt-decode';

type JwtPayload = {
  exp: number; // expiration time in seconds
  iat?: number; // issued at (optional)
  [key: string]: any;
};

export const isTokenValid = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000; // in seconds
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};
