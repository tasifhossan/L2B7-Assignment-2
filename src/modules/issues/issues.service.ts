import pool from "../../config/db";

// POST
export const createIssue = async (
  title: string,
  description: string,
  type: string,
  reporterId: number,
) => {
  if (!title || title.length > 150)
    throw { status: 400, message: "Title required, max 150 chars" };
  if (!description || description.length < 20)
    throw { status: 400, message: "Description min 20 chars" };
  if (!["bug", "feature_request"].includes(type))
    throw { status: 400, message: "Type must be bug or feature_request" };

  const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
    reporterId,
  ]);
  if (userCheck.rows.length === 0)
    throw { status: 400, message: "Reporter not found" };

  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, description, type, reporterId],
  );
  return result.rows[0];
};

// GET ALL with sort/filter
export const getAllIssues = async (
  sort = "newest",
  type?: string,
  status?: string,
) => {
  let query = "SELECT * FROM issues WHERE 1=1";
  const params: unknown[] = [];
  let idx = 1;

  if (type) {
    query += ` AND type = $${idx++}`;
    params.push(type);
  }
  if (status) {
    query += ` AND status = $${idx++}`;
    params.push(status);
  }
  query +=
    sort === "oldest"
      ? " ORDER BY created_at ASC"
      : " ORDER BY created_at DESC";

  const result = await pool.query(query, params);
  const issues = result.rows;
  if (issues.length === 0) return [];

  // Fetch reporters separately (NO JOIN rule!)
  const ids = [...new Set(issues.map((i) => i.reporter_id))];
  const reporters = await pool.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [ids],
  );
  const rMap: Record<number, object> = {};
  reporters.rows.forEach((r) => (rMap[r.id] = r));

  return issues.map(({ reporter_id, ...issue }) => ({
    ...issue,
    reporter: rMap[reporter_id] || null,
  }));
};

// GET SINGLE with params
export const getSingleIssue = async (id: number) => {
  const result = await pool.query("SELECT * FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };

  const issue = result.rows[0];
  const reporter = await pool.query(
    "SELECT id, name, role FROM users WHERE id = $1",
    [issue.reporter_id],
  );
  const { reporter_id, ...rest } = issue;
  return { ...rest, reporter: reporter.rows[0] || null };
};

// PUT method
export const updateIssue = async (
  id: number,
  updates: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
  },
  requesterId: number,
  requesterRole: string,
) => {
  const result = await pool.query("SELECT * FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };

  const issue = result.rows[0];

  // Permission check
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

  const updated = await pool.query(
    `UPDATE issues SET title=$1, description=$2, type=$3,
     status=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
    [title, description, type, status, id],
  );
  return updated.rows[0];
};

// DELETE
export const deleteIssue = async (id: number) => {
  const result = await pool.query("SELECT id FROM issues WHERE id = $1", [id]);
  if (result.rows.length === 0)
    throw { status: 404, message: "Issue not found" };
  await pool.query("DELETE FROM issues WHERE id = $1", [id]);
};
