import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../services/game.service.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../config/env.js";

const registerSchema = z.object({
  email: z.email("Email inválido").max(254, "Email inválido"),
  password: z
    .string("Email y contraseña requeridos")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    // bcrypt trunca a 72 bytes; más allá de eso los caracteres extra no cuentan
    .max(72, "La contraseña no puede exceder 72 caracteres"),
});

// El login no re-valida formato/longitud: solo presencia, para no bloquear
// credenciales existentes que no cumplan reglas nuevas.
const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// bcrypt trunca a 72 bytes: un JWT completo lo supera de sobra, así que
// hashearlo directo colisionaría entre refresh tokens del mismo usuario
// (mismo payload al inicio). Se reduce primero a un digest SHA-256 de largo
// fijo antes de guardar/comparar. Mismo patrón que veya_backend.
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshTokenMatches(presented: string, storedHash: string): boolean {
  const presentedHash = Buffer.from(hashRefreshToken(presented), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (presentedHash.length !== stored.length) return false;
  return timingSafeEqual(presentedHash, stored);
}

async function issueTokens(userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: "30d"
  });
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: hashRefreshToken(refreshToken) }
  });
  return { token, refreshToken };
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "El email ya está registrado" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed }
    });

    const tokens = await issueTokens(user.id);
    res
      .status(201)
      .json({ ...tokens, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email y contraseña requeridos" });
      return;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const tokens = await issueTokens(user.id);
    res.json({ ...tokens, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "refreshToken requerido" });
      return;
    }
    const { refreshToken: presented } = parsed.data;

    let userId: string;
    try {
      const decoded = jwt.verify(presented, JWT_REFRESH_SECRET) as {
        userId: string;
      };
      userId = decoded.userId;
    } catch {
      res.status(401).json({ error: "Refresh token inválido" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash || !refreshTokenMatches(presented, user.refreshTokenHash)) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }

    // Rotación: cada refresh invalida el token anterior y emite uno nuevo.
    const tokens = await issueTokens(userId);
    res.json({ ...tokens, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null }
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
