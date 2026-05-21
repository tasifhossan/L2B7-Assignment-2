import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../config/db";

const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10");

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: string,
) => {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0)
    throw { status: 400, message: "Email already registered" };

  const hashed = await bcrypt.hash(password, SALT); // ← 8-8
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role || "contributor"],
  );
  return result.rows[0];
};

export const loginUser = async (email: string, password: string) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = result.rows[0];
  if (!user) throw { status: 401, message: "Invalid credentials" };

  const match = await bcrypt.compare(password, user.password); // ← 8-8
  if (!match) throw { status: 401, message: "Invalid credentials" };

  // JWT signing — include id, name, role in payload ← 8-9
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );

  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};
