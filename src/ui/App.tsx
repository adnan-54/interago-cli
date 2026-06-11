import React, { useState, useCallback, useRef } from "react";
import { Box, useApp } from "ink";
import { StatusBar } from "./StatusBar.js";
import { Terminal } from "./Terminal.js";
import { dispatch, listCommands } from "../commands/registry.js";
import { state } from "../core/state.js";

export function App() {
  const { exit } = useApp();
  const [lines, setLines] = useState<string[]>([
    'Interago CLI — type "help" for commands, "exit" to quit.',
  ]);
  const [, forceUpdate] = useState(0);
  const [promptQuestion, setPromptQuestion] = useState<string | null>(null);
  const resolveRef = useRef<((s: string) => void) | null>(null);

  state.onStateChange = useCallback(() => forceUpdate(n => n + 1), []);

  const log = useCallback((msg: string) => {
    setLines(prev => [...prev, msg]);
  }, []);

  const prompt = useCallback((question: string): Promise<string> => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setPromptQuestion(question);
    });
  }, []);

  const handleSubmit = useCallback(
    async (input: string) => {
      if (resolveRef.current) {
        const resolve = resolveRef.current;
        resolveRef.current = null;
        setPromptQuestion(null);
        setLines(prev => [...prev, input]);
        resolve(input);
        return;
      }

      if (!input.trim()) return;
      setLines(prev => [...prev, `> ${input}`]);

      const cmd = input.trim().toLowerCase();
      if (cmd === "exit" || cmd === "quit") {
        exit();
        return;
      }
      if (cmd === "help") {
        const cmds = listCommands()
          .map(c => `  ${c.name.padEnd(20)} ${c.description}`)
          .join("\n");
        setLines(prev => [...prev, "Commands:\n" + cmds]);
        return;
      }

      try {
        await dispatch(input, { log, prompt });
      } catch (err: any) {
        log(`Error: ${err?.message ?? String(err)}`);
      }
    },
    [log, prompt, exit]
  );

  const statusBar = (
    <StatusBar projectId={state.projectId} serverPort={state.serverPort} />
  );

  return (
    <Box flexDirection="column" height="100%">
      <Terminal
        lines={lines}
        onSubmit={handleSubmit}
        promptQuestion={promptQuestion}
        statusBar={statusBar}
      />
    </Box>
  );
}
