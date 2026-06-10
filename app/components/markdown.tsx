import React, { useMemo, useCallback, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
// import "katex/dist/katex.min.css";
import type { PluggableList } from "unified";
import { Download, ExternalLink, Copy, Check } from "lucide-react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { cn } from "~/lib/utils";

// Types
interface StyleConfig {
  codeTheme?: "light" | "dark" | "github" | "monokai";
  mathTheme?: "default" | "colorful";
  linkTarget?: "_blank" | "_self" | "_parent" | "_top";
  showLineNumbers?: boolean;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  config?: StyleConfig;
  onLinkClick?: (url: string, event: React.MouseEvent) => void;
  onDownloadClick?: (url: string, filename: string) => void;
  enableMermaid?: boolean;
  enableMath?: boolean;
  enableEmoji?: boolean;
  maxWidth?: string;
}

// Helper Components
const CodeBlockHeader: React.FC<{
  language: string;
  onCopy: () => void;
  copied: boolean;
}> = ({ language, onCopy, copied }) => (
  <div className="flex items-center justify-between rounded-t-lg bg-background px-4 py-2 text-sm">
    <span className="capitalize text-primary/60">{language || "code"}</span>
    <button
      onClick={onCopy}
      className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  </div>
);

const SyntaxHighlighter = React.lazy(() =>
  import("react-syntax-highlighter").then((mod) => ({ default: mod.Prism })),
);

const CodeBlockContent: React.FC<{
  code: string;
  language: string;
  theme: string;
  showLineNumbers: boolean;
}> = ({ code, language, theme, showLineNumbers = false }) => {
  return (
    <Suspense fallback={<div>Loading code...</div>}>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 0.5rem 0.5rem",
          padding: "1rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          fontFamily:
            "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        }}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          textAlign: "right",
          color: theme === "dark" ? "#6b7280" : "#9ca3af",
          borderRight: "1px solid",
          borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
          fontFamily:
            "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Suspense>
  );
};

// Main Code Block Component
const CodeBlock: React.FC<{
  node: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  theme: string;
  showLineNumbers: boolean;
}> = ({ className, children, theme, showLineNumbers = false }) => {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  // Helper function to extract text content from React children
  const extractTextContent = (children: React.ReactNode): string => {
    if (typeof children === "string") {
      return children;
    }
    if (Array.isArray(children)) {
      return children.map((child) => extractTextContent(child)).join("");
    }
    if (React.isValidElement(children)) {
      return extractTextContent((children.props as { children?: React.ReactNode }).children);
    }
    return "";
  };

  // Process code content
  const code = React.useMemo(() => {
    const content = extractTextContent(children).replace(/\n$/, " ");

    // Format JSON if applicable
    if (language === "json" || language === "javascript") {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [children, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Handle Mermaid diagrams
  if (language.toLowerCase() === "mermaid") {
    return <MermaidDiagram content={code} />;
  }

  if (language) {
    // Render code block
    return (
      <div className="group relative my-4">
        <CodeBlockHeader
          language={language}
          onCopy={handleCopy}
          copied={copied}
        />
        <div className="relative font-mono">
          <CodeBlockContent
            code={code}
            language={language}
            theme={theme}
            showLineNumbers={showLineNumbers}
          />
        </div>
      </div>
    );
  }

  return <code className="inline-code">{children}</code>;
};

// Link Component
const LinkRenderer: React.FC<{
  href: string;
  children: React.ReactNode;
  target: string;
  onClick?: (event: React.MouseEvent) => void;
  onDownload?: (url: string, filename: string) => void;
}> = ({ href, children, target, onClick }) => {
  const isDownload = href.match(/\.(pdf|doc|docx|zip|rar|tar|gz)$/i);
  const isExternal = href.startsWith("http") || href.startsWith("https");
  const isInternal = href.startsWith("#");

  return (
    <a
      href={href}
      target={target}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-blue-600 underline decoration-blue-600 transition-colors hover:text-blue-800 hover:decoration-blue-800"
    >
      {children}
      {isDownload && <Download size={14} />}
      {isExternal && !isDownload && <ExternalLink size={14} />}
      {isInternal && <span className="text-xs">🔗</span>}
    </a>
  );
};

// Main Markdown Renderer Component
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  config = {
    codeTheme: "monokai",
    mathTheme: "colorful",
    linkTarget: "_blank",
    showLineNumbers: false,
  },
  onLinkClick = (url, _) => {
    console.log("Link clicked:", url);
  },
  onDownloadClick = (url, filename) => {
    console.log("Download requested:", url, filename);
  },
  enableMath = true,
  enableEmoji = true,
  maxWidth = "100%",
}) => {
  const {
    codeTheme = "dark",
    linkTarget = "_blank",
    showLineNumbers = false,
  } = config;

  // Configure plugins
  const remarkPlugins = useMemo<PluggableList>(() => {
    const plugins: PluggableList = [remarkGfm];
    if (enableMath) plugins.push(remarkMath);
    if (enableEmoji) plugins.push([remarkEmoji, { padSpaceAfter: true }]);
    return plugins;
  }, [enableMath, enableEmoji]);

  const rehypePlugins = useMemo<PluggableList>(() => {
    const plugins: PluggableList = [
      rehypeRaw,
      rehypeSlug,
      [rehypeHighlight, { ignoreMissing: true }],
    ];
    if (enableMath) plugins.push(rehypeKatex);
    return plugins;
  }, [enableMath]);

  // Custom components for react-markdown
  const components = useMemo(
    () => ({
      code: (props: any) => {
        console.log("code block", props);
        return (
          <CodeBlock
            {...props}
            theme={codeTheme}
            showLineNumbers={showLineNumbers}
          />
        );
      },
      a: (props: any) => {
        const { href, children } = props;
        const isDownload = href.match(/\.(pdf|doc|docx|zip|rar|tar|gz)$/i);
        const isExternal = href.startsWith("http") || href.startsWith("https");
        const isInternal = href.startsWith("#");

        const handleClick = (event: React.MouseEvent) => {
          if (isDownload && onDownloadClick) {
            event.preventDefault();
            onDownloadClick(href, href.split("/").pop() || "download");
          } else if (isInternal) {
            event.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: "smooth" });
            }
            if (onLinkClick) {
              onLinkClick(href, event);
            }
          } else if (onLinkClick) {
            onLinkClick(href, event);
          }
        };

        return (
          <LinkRenderer
            href={href}
            target={isExternal ? "_blank" : isInternal ? "_self" : linkTarget}
            onClick={handleClick}
            onDownload={onDownloadClick}
          >
            {children}
          </LinkRenderer>
        );
      },
      // Basic markdown elements with consistent styling

      table: (props: any) => (
        <div className="my-4 overflow-x-auto">
          <table
            {...props}
            className="min-w-full border-collapse rounded-lg border"
          />
        </div>
      ),
      thead: (props: any) => <thead {...props} className="bg-background" />,
      tbody: (props: any) => <tbody {...props} />,
      tr: (props: any) => <tr {...props} className="border-b" />,
      th: (props: any) => (
        <th
          {...props}
          className="border px-4 py-2 text-left text-sm font-semibold text-primary/70"
        />
      ),
      td: (props: any) => (
        <td {...props} className="border px-4 py-2 text-sm text-primary/70" />
      ),
      blockquote: (props: any) => (
        <blockquote
          {...props}
          className="border-l-4 border-muted-foreground pl-4 italic text-primary/60"
        />
      ),
    }),
    [codeTheme, showLineNumbers, linkTarget, onLinkClick, onDownloadClick],
  );

  return (
    <div className={cn("markdown-renderer markdown max-w-none text-primary", className)} style={{ maxWidth }}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Keep the MermaidDiagram component as is
const MermaidDiagram: React.FC<{ content: string }> = ({ content }) => {
  const diagramId = useMemo(
    () => `mermaid-${Math.random().toString(36).substr(2, 9)}`,
    [],
  );

  const renderMermaidDiagram = useCallback(
    (mermaidContent: string) => {
      const lines = mermaidContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      if (lines[0]?.includes("graph")) {
        // Parse flowchart
        const direction = lines[0].includes("TD") ? "vertical" : "horizontal";
        const connections: Array<{ from: string; to: string; label?: string }> =
          [];
        const nodeLabels: Record<string, string> = {};

        lines.slice(1).forEach((line) => {
          const trimmed = line.trim();

          // Parse connections like A-->B or A-->|label|B
          const connectionMatch = trimmed.match(/(\w+)-->([\|\w]*)\|?(\w+)/);
          if (connectionMatch) {
            const [, from, label, to] = connectionMatch;
            connections.push({
              from,
              to: to || label,
              label: label && label !== to ? label : undefined,
            });
          }

          // Parse node labels like A[Label]
          const labelMatch = trimmed.match(/(\w+)\[([^\]]+)\]/);
          if (labelMatch) {
            nodeLabels[labelMatch[1]] = labelMatch[2];
          }
        });

        const allNodes = [
          ...new Set(connections.flatMap((conn) => [conn.from, conn.to])),
        ];

        return (
          <div className="mermaid-flowchart my-6 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
            <svg
              width="100%"
              height="300"
              viewBox="0 0 800 300"
              className="overflow-visible"
            >
              <defs>
                <marker
                  id={`arrowhead-${diagramId}`}
                  markerWidth="12"
                  markerHeight="8"
                  refX="11"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,8 L12,4 z" fill="#3b82f6" />
                </marker>
                <filter
                  id={`shadow-${diagramId}`}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="2"
                    dy="2"
                    stdDeviation="2"
                    floodOpacity="0.3"
                  />
                </filter>
              </defs>

              {/* Render nodes */}
              {allNodes.map((node, index) => {
                const x =
                  direction === "horizontal"
                    ? 100 + index * 150
                    : 150 + (index % 3) * 200;
                const y =
                  direction === "horizontal"
                    ? 150
                    : 80 + Math.floor(index / 3) * 100;
                const label = nodeLabels[node] || node;

                return (
                  <g key={node}>
                    <rect
                      x={x - 40}
                      y={y - 20}
                      width={80}
                      height={40}
                      rx="8"
                      fill="#3b82f6"
                      filter={`url(#shadow-${diagramId})`}
                      className="cursor-pointer transition-colors hover:fill-blue-600"
                    />
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="600"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Render connections */}
              {connections.map((conn, index) => {
                const fromIndex = allNodes.indexOf(conn.from);
                const toIndex = allNodes.indexOf(conn.to);

                const fromX =
                  direction === "horizontal"
                    ? 100 + fromIndex * 150
                    : 150 + (fromIndex % 3) * 200;
                const fromY =
                  direction === "horizontal"
                    ? 150
                    : 80 + Math.floor(fromIndex / 3) * 100;
                const toX =
                  direction === "horizontal"
                    ? 100 + toIndex * 150
                    : 150 + (toIndex % 3) * 200;
                const toY =
                  direction === "horizontal"
                    ? 150
                    : 80 + Math.floor(toIndex / 3) * 100;

                const startX = fromX + (toX > fromX ? 40 : -40);
                const startY = fromY;
                const endX = toX + (toX > fromX ? -40 : 40);
                const endY = toY;

                return (
                  <g key={`${conn.from}-${conn.to}-${index}`}>
                    <path
                      d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${startY - 30} ${endX} ${endY}`}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#arrowhead-${diagramId})`}
                      className="transition-colors hover:stroke-blue-600"
                    />
                    {conn.label && (
                      <text
                        x={(startX + endX) / 2}
                        y={startY - 35}
                        textAnchor="middle"
                        fill="#374151"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {conn.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      } else {
        // Generic diagram fallback
        return (
          <div className="mermaid-diagram rounded-lg border border-primary/20 bg-muted p-4">
            <div className="text-center">
              <div className="whitespace-pre-line font-mono text-sm text-primary/70">
                {mermaidContent}
              </div>
            </div>
          </div>
        );
      }
    },
    [diagramId],
  );

  return renderMermaidDiagram(content);
};

// Example usage component
export const MarkdownSample: React.FC = () => {
  const sampleMarkdown = `# Advanced Markdown Renderer

This is a **bold** statement and this is *italic* text.

## Code Examples

Here's some JavaScript code:

\`\`\`bash
  curl -X POST 'https://agent-dev.test.studio.lyzr.ai/v3/inference/chat/' \

    -H 'Content-Type: application/json' \

    -H 'x-api-key: sk-default-kV24Jp1tH4ixYE0usOyaTZKFMsy9aaEk' \

    -d '{
      "user_id": "joel+freeplan1@lyzr.ai",
      "agent_id": "682f8d7932bcc6cf98a456dc",
      "session_id": "682f8d7932bcc6cf98a456dc-mzgxt2633mi",
      "message": ""
    }'
\`\`\`

## Table Examples

### Basic Table
| Name | Age | Role |
|------|-----|------|
| John | 25 | Developer |
| Jane | 30 | Designer |
| Bob | 28 | Manager |

### Table Without Header
| Alice | Engineer | 5 years |
| Carol | Designer | 3 years |
| Dave | Developer | 4 years |

### Table with Inline Formatting
| Feature | Description | Status |
|---------|-------------|--------|
| **Bold** | *Italic* text | \u2705 |
| \`\`\`Code\`\`\` | Inline code | 🔄 |
| [Link](https://example.com) | External link | ⭐ |

## Bullet Points

* First bullet point with **bold** text
* Second bullet point with *italic* text
* Third bullet point with \`code\` inline

## Math Examples

Inline math: $E = mc^2$

Block math: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$

## Links and Downloads

- [External Link](https://example.com)
- [Download PDF](sample.pdf)
- [Internal Link](#code-examples)

## Emojis

Hey there! :wave: This is :fire: and I :heart: this component! :rocket:

## Mermaid Diagram

\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`

## Inline Elements

This has \`inline code\` and **bold** and *italic* text mixed together.
`;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">
        Markdown Renderer Demo
      </h1>

      <MarkdownRenderer
        content={sampleMarkdown}
        config={{
          codeTheme: "monokai",
          mathTheme: "colorful",
          linkTarget: "_blank",
          showLineNumbers: true,
        }}
        onLinkClick={(url, _) => {
          console.log("Link clicked:", url);
        }}
        onDownloadClick={(url, filename) => {
          console.log("Download requested:", url, filename);
        }}
        enableMermaid={true}
        enableMath={true}
        enableEmoji={true}
        maxWidth="100%"
        className="markdown rounded-lg bg-white p-6 shadow-lg"
      />
    </div>
  );
};

export default MarkdownRenderer;
