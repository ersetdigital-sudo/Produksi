import fs from "node:fs";
import path from "node:path";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("Usage: node scripts/render-mockup.mjs <mockup.dc.html> <out.html>");
  process.exit(1);
}

const root = process.cwd();
const source = fs.readFileSync(path.resolve(root, input), "utf8");
const samaqu = fs.readFileSync(path.resolve(root, "samaqu.css"), "utf8");

const helmet = source.match(/<helmet>([\s\S]*?)<\/helmet>/)?.[1] ?? "";
const markupStart = source.indexOf('<div class="ui');
const markupEnd = source.indexOf("</x-dc>");
if (markupStart < 0 || markupEnd < 0) {
  throw new Error("Markup mockup tidak ditemukan");
}
const markup = source.slice(markupStart, markupEnd);
const script =
  source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1] ??
  "";

const DCLogic = class {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  setState() {}
};

const component = new Function(
  "DCLogic",
  `${script}; return new Component({});`,
)(DCLogic);
const values = component.renderVals();

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const stripBraces = (value) =>
  String(value ?? "")
    .replace(/^\{\{/, "")
    .replace(/\}\}$/, "")
    .trim();

const evaluate = (expression, scope) => {
  try {
    const fn = new Function("scope", `with (scope) { return (${expression}); }`);
    return fn(scope);
  } catch {
    return "";
  }
};

const interpolate = (text, scope) =>
  text.replace(/\{\{([\s\S]*?)\}\}/g, (_, expression) => {
    const value = evaluate(expression, scope);
    if (value === undefined || value === null) return "";
    return escapeHtml(value);
  });

const postProcess = (html) =>
  html
    .replace(/\schecked="false"/g, "")
    .replace(/\schecked="true"/g, " checked");

const parseTree = (html) => {
  const rootNode = { type: "text", children: [] };
  const stack = [rootNode];
  const tagPattern = /<\/?sc-(if|for)\b[^>]*>/gi;
  let lastIndex = 0;

  for (const match of html.matchAll(tagPattern)) {
    const text = html.slice(lastIndex, match.index);
    if (text) {
      stack[stack.length - 1].children.push({ type: "text", value: text });
    }

    const raw = match[0];
    if (raw.startsWith("</")) {
      if (stack.length > 1) stack.pop();
    } else {
      const attrs = {};
      const attrPattern = /([a-zA-Z0-9:_-]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrPattern.exec(raw))) {
        attrs[attrMatch[1]] = attrMatch[2];
      }
      const node = {
        type: match[1].toLowerCase(),
        attrs,
        children: [],
      };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    lastIndex = match.index + raw.length;
  }

  const tail = html.slice(lastIndex);
  if (tail) {
    stack[stack.length - 1].children.push({ type: "text", value: tail });
  }
  return rootNode;
};

const renderNodes = (nodes, scope) =>
  nodes
    .map((node) => {
      if (node.type === "text") {
        return postProcess(interpolate(node.value, scope));
      }
      if (node.type === "if") {
        const value = evaluate(
          stripBraces(node.attrs.value ?? ""),
          scope,
        );
        return value ? renderNodes(node.children, scope) : "";
      }
      if (node.type === "for") {
        const list =
          evaluate(stripBraces(node.attrs.list ?? ""), scope) || [];
        const as = node.attrs.as ?? "item";
        return Array.from(list)
          .map((item) =>
            renderNodes(node.children, { ...scope, [as]: item }),
          )
          .join("");
      }
      return "";
    })
    .join("");

const tree = parseTree(markup);
const body = renderNodes(tree.children, values);
const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
${helmet}
<style>${samaqu}</style>
<style>body{margin:0}</style>
</head>
<body>${body}</body>
</html>`;

fs.mkdirSync(path.dirname(path.resolve(root, output)), { recursive: true });
fs.writeFileSync(path.resolve(root, output), html, "utf8");
console.log(`Rendered ${input} -> ${output}`);
