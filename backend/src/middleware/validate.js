// src/middleware/validate.js
// Validates req.body against a zod schema. Unknown keys are stripped
// (schemas use z.object({...}).strip()), so req.body is replaced with
// the parsed, cleaned result on success.

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(root)';
        return `${path}: ${issue.message}`;
      });
      return res.status(400).json({ error: 'Invalid input', details });
    }

    req.body = result.data;
    next();
  };
}

module.exports = { validate };
