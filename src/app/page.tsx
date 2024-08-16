"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useRef, useState } from "react";
import { MoonLoader } from "react-spinners";
import { codegenAction, getBrowserbasePage } from "./actions";

export default function Codegen() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [state, setState] = useState<"ready" | "connecting" | "generating">(
    "ready",
  );
  const staticToast = useRef<ReturnType<typeof toast> | null>(null);

  const appendCode = (newLines: string) => {
    setScript((prev) => prev + newLines);
  };

  const handleExecute = async () => {
    if (!websiteUrl) {
      toast({
        title: "Empty Browserbase URL",
        description: "Please enter a Browserbase URL",
      });
      return;
    }
    if (!prompt) {
      toast({
        title: "Empty prompt",
        description: "Please write a prompt and hit execute",
      });
      return;
    }
    try {
      setState("connecting");
      const page = await getBrowserbasePage(websiteUrl);
      if (!page) {
        toast({
          title: "Failed to connect to Browserbase page",
          description:
            'Ensure you have added your "BROWSERBASE_API_KEY" to the .env file',
        });
        return;
      }

      // Cleanup HTML to make context smaller
      const cleanedHTML = cleanupHTML(page.pageHTML);

      // Make the codegen request
      setState("generating");
      const response = await codegenAction(prompt, script, cleanedHTML);

      if (!response) {
        toast({
          title: "Codegen error 😢",
          description: "Failed to generate code.",
        });
        return;
      }

      // Append code to the text editor
      appendCode(response);
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to execute the action (see console)",
      });
      setState("ready");
    } finally {
      setState("ready");
    }
  };

  // Handle different loading states
  useEffect(() => {
    let t;
    switch (state) {
      case "ready": {
        if (staticToast.current) {
          staticToast.current?.dismiss();
          staticToast.current = null;
        }
        break;
      }
      case "connecting": {
        t = {
          description: (
            <div className="flex gap-x-2">
              <MoonLoader color="#000000" size={16} /> Connecting to session...
            </div>
          ),
        };
        break;
      }
      case "generating": {
        t = {
          description: (
            <div className="flex gap-x-2">
              <MoonLoader color="#000000" size={16} /> Generating code...
            </div>
          ),
        };
        break;
      }
    }
    if (!t) {
      return;
    }
    if (staticToast.current) {
      staticToast.current.update({
        id: staticToast.current.id,
        duration: 30000,
        ...t,
      });
    } else {
      staticToast.current = toast({ duration: 30000, ...t });
    }
  }, [state, toast]);

  return (
    <>
      <div className="hidden h-full flex-col md:flex">
        <div className="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
          <h2 className="text-lg font-semibold">🅱️ AI Codegen</h2>
        </div>
        <Separator />
        <div className="container h-full py-6">
          <div className="grid h-full items-stretch gap-6 md:grid-cols-[300px_1fr]">
            <div className="hidden flex-col space-y-4 sm:flex md:order-1">
              <div className="grid gap-2">
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Target website
                </span>
                <Input
                  placeholder="https://"
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  value={websiteUrl}
                  disabled={state !== "ready"}
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Write a simple prompt
                </span>
                <Textarea
                  placeholder="Press the 'sign up' button"
                  onChange={(e) => setPrompt(e.target.value)}
                  value={prompt}
                  disabled={state !== "ready"}
                />
              </div>
              <footer>
                <Button onClick={handleExecute} disabled={state !== "ready"}>
                  Execute
                </Button>
              </footer>
            </div>
            <div className="md:order-2">
              <div className="flex h-full flex-col space-y-4">
                <Textarea
                  placeholder="// Playwright JS"
                  className="min-h-[400px] flex-1 p-4 md:min-h-[700px] lg:min-h-[700px]"
                  onChange={(e) => setScript(e.target.value)}
                  value={script}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Remove unnecessary elements and attributes from a HTML document string
function cleanupHTML(html: string) {
  const strippedDOM = html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "")
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style\s*>/gi, "")
    // Remove meta and link tags
    // eslint-disable-next-line prefer-named-capture-group
    .replace(/<(meta|link)\s+[^>]*?\/?>\s*(?:<\/\1>)?/gi, "")
    // Remove base64 strings
    // eslint-disable-next-line prefer-named-capture-group
    .replace(/^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/gi, "")
    // Remove consecutive whitespace characters
    .replace(/\s+/g, " ")
    // Remove spaces before / after elements
    .replace(/>\s+</g, "><")
    // Remove whitespace from before / after the string
    .trim();

  const parser = new DOMParser();
  const doc = parser.parseFromString(strippedDOM, "text/html");
  const allowedAttributes = [
    "class",
    "id",
    "data-testid",
    "name",
    "rel",
    "type",
    "value",
    "title",
    "href",
    "alt",
    /aria-*/,
  ];
  const cleanElement = (el: Element) => {
    // Remove unneeded attributes
    const attrs = el.attributes;
    for (let i = attrs.length - 1; i >= 0; i--) {
      const a = attrs[i];
      if (!a.name.match(allowedAttributes[i])) {
        el.removeAttribute(a.name);
      }
    }
    // Recursively walk the DOM
    for (const child of Array.from(el.children)) {
      cleanElement(child);
    }
  };

  cleanElement(doc.body);

  // Serialize the entire document back to a string
  const serializer = new XMLSerializer();
  const htmlString = serializer.serializeToString(doc);
  return htmlString;
}
