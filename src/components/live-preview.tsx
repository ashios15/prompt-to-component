"use client";

import dynamic from "next/dynamic";

const SandpackProvider = dynamic(
  () => import("@codesandbox/sandpack-react").then((m) => m.SandpackProvider),
  { ssr: false }
);

const SandpackPreview = dynamic(
  () => import("@codesandbox/sandpack-react").then((m) => m.SandpackPreview),
  { ssr: false }
);

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  // Wrap the component code in an App.js that renders it
  const appCode = `import Component from "./Component";\n\nexport default function App() {\n  return <Component />;\n}`;

  return (
    <div className="h-full">
      <SandpackProvider
        template="react"
        files={{
          "/App.js": appCode,
          "/Component.js": code,
        }}
        theme="dark"
        options={{
          externalResources: [],
        }}
      >
        <SandpackPreview
          style={{ height: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
        />
      </SandpackProvider>
    </div>
  );
}
