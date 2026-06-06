import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const CANDIDATE_LOGO_PATHS = [
  path.resolve(process.cwd(), "assets", "company-logo.png"),
  path.resolve(process.cwd(), "assets", "company-logo.jpg"),
  path.resolve(process.cwd(), "assets", "company-logo.jpeg"),

  path.resolve(currentDir, "../../assets/company-logo.png"),
  path.resolve(currentDir, "../../assets/company-logo.jpg"),
  path.resolve(currentDir, "../../assets/company-logo.jpeg"),
];

function findLogoPath(): string | null {
  for (const logoPath of CANDIDATE_LOGO_PATHS) {
    if (fs.existsSync(logoPath)) {
      return logoPath;
    }
  }

  console.warn(
    "[PDF LOGO] Logo not found. Checked paths:",
    CANDIDATE_LOGO_PATHS
  );

  return null;
}

export function drawCompanyLogo(
  doc: any,
  options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  } = {}
) {
  const logoPath = findLogoPath();

  if (!logoPath) {
    return false;
  }

  const x = options.x ?? 40;
  const y = options.y ?? 30;
  const width = options.width ?? 135;
  const height = options.height ?? 70;

  doc.image(logoPath, x, y, {
    fit: [width, height],
  });

  return true;
}