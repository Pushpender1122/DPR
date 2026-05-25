import { type Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  siteId?: string | null;
  siteName?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "demo-jwt-secret";

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

export function getAuthFromRequest(request: NextRequest): AuthTokenPayload | null {
  const token = getTokenFromRequest(request);

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
