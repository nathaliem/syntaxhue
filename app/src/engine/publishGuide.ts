import { slugify, type ExtensionOptions } from "./extension";
import { vsixFileName } from "./vsix";
import type { ThemeState } from "./theme";

export interface GuideStep {
  title: string;
  body: string;
  /** Shell commands to copy, already filled in. */
  commands?: string[];
  link?: { href: string; label: string };
}

export interface Failure {
  problem: string;
  fix: string;
}

const TOKEN = "<your-token>";

/** The publishing walk-through with the user's own values filled in. Pure, so it can be tested. */
export function publishGuide(theme: ThemeState, o: ExtensionOptions) {
  const publisher = o.publisher || "<publisher-id>";
  const file = vsixFileName(theme, o);
  const fullId = `${publisher}.${o.id ?? slugify(theme.name)}`;
  const steps: GuideStep[] = [
    {
      title: "Create a publisher",
      body: `Sign in with a Microsoft account and create a publisher whose ID is exactly "${publisher}". The ID cannot be changed later.`,
      link: { href: "https://marketplace.visualstudio.com/manage", label: "Marketplace publisher page" },
    },
    {
      title: "Create a Personal Access Token",
      body: "In Azure DevOps open User settings, then Personal access tokens, and create one. Set Organization to “All accessible organizations” and choose the custom scope Marketplace → Manage. Copy it now: it is shown once. Never paste it into SyntaxHue or share it.",
      link: { href: "https://dev.azure.com", label: "Azure DevOps" },
    },
    {
      title: "Publish to the Visual Studio Marketplace",
      body: `Run this next to the downloaded ${file}. It asks for nothing else, and ${fullId} appears after a short check.`,
      commands: ["npm install --global @vscode/vsce", `vsce publish --packagePath ${file} --pat ${TOKEN}`],
    },
    {
      title: "Optional: publish to Open VSX",
      body: "VSCodium, Gitpod and some other editors read from Open VSX instead. This needs a separate account, namespace and token.",
      commands: [`npx ovsx create-namespace ${publisher} --pat ${TOKEN}`, `npx ovsx publish ${file} --pat ${TOKEN}`],
      link: { href: "https://open-vsx.org", label: "Open VSX" },
    },
  ];
  const failures: Failure[] = [
    {
      problem: "The extension id is already taken",
      fix: `The Marketplace needs ${fullId} to be unique. Change the extension id above (or the publisher) and download again.`,
    },
    {
      problem: "401 or 403 when publishing",
      fix: "The token has the wrong scope or organization. Create a new one with Organization “All accessible organizations” and scope Marketplace → Manage, and check it belongs to the publisher's owner.",
    },
    {
      problem: "That version is already published",
      fix: "A version can only be published once. Raise the version above and download again.",
    },
    {
      problem: "A warning about a missing repository",
      fix: "Add a GitHub or GitLab address above. It is also needed if you want screenshots in the README.",
    },
  ];
  return { steps, failures, fullId, file };
}
