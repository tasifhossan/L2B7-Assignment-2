

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/app.ts
import express from "express";
import cors from "cors";
import dotenv2 from "dotenv";

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import { StatusCodes } from "http-status-codes";

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// src/config/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
var db_default = pool;

// src/modules/auth/auth.service.ts
var SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10");
var registerUser = async (name, email, password, role) => {
  const existing = await db_default.query("SELECT id FROM users WHERE email = $1", [
    email
  ]);
  if (existing.rows.length > 0)
    throw { status: 400, message: "Email already registered" };
  const hashed = await bcrypt.hash(password, SALT);
  const result = await db_default.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role || "contributor"]
  );
  return result.rows[0];
};
var loginUser = async (email, password) => {
  const result = await db_default.query("SELECT * FROM users WHERE email = $1", [
    email
  ]);
  const user = result.rows[0];
  if (!user) throw { status: 401, message: "Invalid credentials" };
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw { status: 401, message: "Invalid credentials" };
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

// src/utils/response.ts
var sendSuccess = (res, statusCode, message, data) => {
  res.status(statusCode).json({ success: true, message, data });
};
var sendError = (res, statusCode, message, errors) => {
  res.status(statusCode).json({ success: false, message, errors });
};

// src/modules/auth/auth.controller.ts
var signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return sendError(res, StatusCodes.BAD_REQUEST, "All fields required");
    const data = await registerUser(name, email, password, role);
    sendSuccess(res, StatusCodes.CREATED, "User registered successfully", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return sendError(res, StatusCodes.BAD_REQUEST, "All fields required");
    const data = await loginUser(email, password);
    sendSuccess(res, StatusCodes.OK, "Login successful", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// src/modules/auth/auth.routes.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
var auth_routes_default = router;

// src/modules/issues/issues.routes.ts
import { Router as Router2 } from "express";

// src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
import { StatusCodes as StatusCodes2 } from "http-status-codes";
var authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return sendError(res, StatusCodes2.UNAUTHORIZED, "No token provided");
  }
  if (!authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      StatusCodes2.UNAUTHORIZED,
      "Invalid authorization format"
    );
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return sendError(res, StatusCodes2.UNAUTHORIZED, "Token missing");
  }
  try {
    const decoded = jwt2.verify(
      token,
      process.env.JWT_SECRET
    );
    req.user = decoded;
    next();
  } catch (err) {
    return sendError(res, StatusCodes2.UNAUTHORIZED, "Invalid or expired token");
  }
};
var requireMaintainer = (req, res, next) => {
  if (req.user?.role !== "maintainer") {
    return sendError(res, StatusCodes2.FORBIDDEN, "Maintainer access required");
  }
  next();
};

// src/modules/issues/issues.controller.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";

// src/modules/issues/issues.service.ts
var createIssue = async (title, description, type, reporterId) => {
  if (!title || title.length > 150)
    throw { status: 400, message: "Title required, max 150 chars" };
  if (!description || description.length < 20)
    throw { status: 400, message: "Description min 20 chars" };
  if (!["bug", "feature_request"].includes(type))
    throw { status: 400, message: "Type must be bug or feature_request" };
  const userCheck = await db_default.query("SELECT id FROM users WHERE id = $1", [
    reporterId
  ]);
  if (userCheck.rows.length === 0)
    throw { status: 400, message: "Reporter not found" };
  const result = await db_default.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, description, type, reporterId]
  );
  return result.rows[0];
};
var getAllIssues = async (sort = "newest", type, status) => {
  let query = "SELECT * FROM issues WHERE 1=1";
  const params = [];
  let idx = 1;
  if (type) {
    query += ` AND type = $${idx++}`;
    params.push(type);
  }
  if (status) {
    query += ` AND status = $${idx++}`;
    params.push(status);
  }
  query += sort === "oldest" ? " ORDER BY created_at ASC" : " ORDER BY created_at DESC";
  const result = await db_default.query(query, params);
  const issues = result.rows;
  if (issues.length === 0) return [];
  const ids = [...new Set(issues.map((i) => i.reporter_id))];
  const reporters = await db_default.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [ids]
  );
  const rMap = {};
  reporters.rows.forEach((r) => rMap[r.id] = r);
  return issues.map(({ reporter_id, ...issue }) => ({
    ...issue,
    reporter: rMap[reporter_id] || null
  }));
};
var getSingleIssue = async (id) => {
  const result = await db_default.query("SELECT * FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };
  const issue = result.rows[0];
  const reporter = await db_default.query(
    "SELECT id, name, role FROM users WHERE id = $1",
    [issue.reporter_id]
  );
  const { reporter_id, ...rest } = issue;
  return { ...rest, reporter: reporter.rows[0] || null };
};
var updateIssue = async (id, updates, requesterId, requesterRole) => {
  const result = await db_default.query("SELECT * FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };
  const issue = result.rows[0];
  if (requesterRole === "contributor") {
    if (issue.reporter_id !== requesterId)
      throw { status: 403, message: "You can only edit your own issues" };
    if (issue.status !== "open")
      throw { status: 409, message: "Contributors can only edit open issues" };
  }
  const title = updates.title ?? issue.title;
  const description = updates.description ?? issue.description;
  const type = updates.type ?? issue.type;
  const status = updates.status ?? issue.status;
  const updated = await db_default.query(
    `UPDATE issues SET title=$1, description=$2, type=$3,
     status=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
    [title, description, type, status, id]
  );
  return updated.rows[0];
};
var deleteIssue = async (id) => {
  const result = await db_default.query("SELECT id FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };
  await db_default.query("DELETE FROM issues WHERE id = $1", [id]);
};

// src/modules/issues/issues.controller.ts
var createIssue2 = async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const data = await createIssue(
      title,
      description,
      type,
      req.user.id
    );
    sendSuccess(res, StatusCodes3.CREATED, "Issue created successfully", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
var getAllIssues2 = async (req, res) => {
  try {
    const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
    const type = typeof req.query.type === "string" ? req.query.type : void 0;
    const status = typeof req.query.status === "string" ? req.query.status : void 0;
    const data = await getAllIssues(sort, type, status);
    sendSuccess(res, StatusCodes3.OK, "Issues fetched successfully", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
var getSingleIssue2 = async (req, res) => {
  try {
    const data = await getSingleIssue(
      parseInt(req.params.id)
    );
    sendSuccess(res, StatusCodes3.OK, "Issue fetched successfully", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
var updateIssue2 = async (req, res) => {
  try {
    const data = await updateIssue(
      parseInt(req.params.id),
      req.body,
      req.user.id,
      req.user.role
    );
    sendSuccess(res, StatusCodes3.OK, "Issue updated successfully", data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
var deleteIssue2 = async (req, res) => {
  try {
    await deleteIssue(parseInt(req.params.id));
    sendSuccess(res, StatusCodes3.OK, "Issue deleted successfully");
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// src/modules/issues/issues.routes.ts
var router2 = Router2();
router2.post("/", authenticate, createIssue2);
router2.get("/", getAllIssues2);
router2.get("/:id", getSingleIssue2);
router2.patch("/:id", authenticate, updateIssue2);
router2.delete("/:id", authenticate, requireMaintainer, deleteIssue2);
var issues_routes_default = router2;

// src/middleware/error.middleware.ts
var globalErrorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
};

// src/app.ts
dotenv2.config();
var app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", auth_routes_default);
app.use("/api/issues", issues_routes_default);
app.use(globalErrorHandler);
var app_default = app;

// src/server.ts
import dotenv3 from "dotenv";
dotenv3.config();
var PORT = process.env.PORT || 5e3;
app_default.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=server.mjs.map