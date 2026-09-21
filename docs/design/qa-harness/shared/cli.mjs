// Minimal argument parsing shared by every runner (no dependencies).
//   --flag              -> { flag: true }
//   --key value         -> { key: "value" }
//   --key=value         -> { key: "value" }
//   --list a,b,c        -> use listArg(args.list) to get ["a","b","c"]
// Positional arguments are collected in `_`.

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    if (eq !== -1) {
      args[toCamel(token.slice(2, eq))] = token.slice(eq + 1);
      continue;
    }
    const key = toCamel(token.slice(2));
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

export function toCamel(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** "a,b,c" -> ["a","b","c"]; undefined/true -> null (meaning "no filter"). */
export function listArg(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function numberArg(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && value !== true && value !== undefined
    ? n
    : fallback;
}
