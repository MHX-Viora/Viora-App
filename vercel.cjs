const base = require('./server/developer/vercel-base.json');
const { configureSandboxPolicy } = require('./server/developer/sandbox-policy.cjs');

exports.config = configureSandboxPolicy(base, process.env);
