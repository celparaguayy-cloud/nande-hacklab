import { useRef, useState } from "react";
import { VirtualKernel } from "../../core/VirtualKernel";
import { VirtualTerminal } from "../../core/terminal/VirtualTerminal";

const kernel = new VirtualKernel();
const terminal = new VirtualTerminal(kernel);

export default function Terminal() {
const [lines, setLines] = useState<string[]>([
"ÑANDE OS Terminal",
"Escribe 'help' para ver los comandos disponibles.",
"",
]);
const [input, setInput] = useState("");
const inputRef = useRef<HTMLInputElement>(null);

function executeCommand() {
const command = input.trim();

if (!command) return;

const output = terminal.execute(command);

setLines((previous) => [
  ...previous,
  `student@nande-os:~$ ${command}`,
  ...(output === "\x1b[CLEAR" ? [] : output.split("\n")),
]);

setInput("");

if (output === "\x1b[CLEAR") {
  setLines([
    "ÑANDE OS Terminal",
    "Escribe 'help' para ver los comandos disponibles.",
    "",
  ]);
}

setTimeout(() => inputRef.current?.focus(), 0);

}

function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
if (event.key === "Enter") {
executeCommand();
}
}

return (
<div
style={{
width: "100%",
height: "100%",
background: "#0b0f14",
color: "#d7f9e9",
fontFamily: "monospace",
padding: "16px",
boxSizing: "border-box",
overflow: "auto",
}}
onClick={() => inputRef.current?.focus()}
>
{lines.map((line, index) => (
<div key={index} style={{ whiteSpace: "pre-wrap" }}>
{line}
</div>
))}

  <div style={{ display: "flex" }}>
    <span>student@nande-os:~$&nbsp;</span>

    <input
      ref={inputRef}
      value={input}
      onChange={(event) => setInput(event.target.value)}
      onKeyDown={handleKeyDown}
      autoFocus
      spellCheck={false}
      style={{
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        color: "inherit",
        fontFamily: "inherit",
        fontSize: "inherit",
      }}
    />
  </div>
</div>

);
}
