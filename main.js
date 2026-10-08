const VERSION = "0.2.3";

let terminal = null;
let inputPrompt = null;

function cacheElements() {
    if (!terminal) {
        terminal = document.getElementById('console');
    }

    if (!inputPrompt) {
        inputPrompt = document.getElementById('prompt')
    }
}

cacheElements();

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
}

function safeText(value) {
    const text = String(value);
    const regex = /\\([<>])|<\/?(primary|secondary|tertiary)>/gi;

    let result = '';
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
        result += escapeHtml(text.slice(lastIndex, match.index));

        if (match[1]) {
            result += escapeHtml(match[1]);
        } else {
            result += match[0];
        }

        lastIndex = match.index + match[0].length;
    }

    result += escapeHtml(text.slice(lastIndex));

    return result;
}

const output = {
    html: (html) => {
        // trusted html only. NEVER pass user input here.
        cacheElements();
        terminal.insertAdjacentHTML('beforeend', html);
    },
    print: (text, color=null) => {
        if (color) {
            output.html(`<${color}>${escapeHtml(text)}</${color}>`);
        } else {
            output.html(escapeHtml(text));
        }
    },
    format: (text) => {
        output.html(safeText(text));
    }
}

const commands = {
    help: {
        desc: "Show information about commands",
        params: [
            {
                name: "command",
                desc: "Command to look up",
                optional: true
            }
        ],
        run: async (cmd = null) => {
            function formatCommand(command, name) {
                if (command.params) {
                    const params = command.params.map((param) => 
                        param.optional ? `[${param.name}]` : `\\<${param.name}\\>`
                    ).join(' ');
                    return `<primary>${name}</primary> <secondary>${params}</secondary> - ${command.desc}`;
                } else {
                    return `<primary>${name}</primary> - ${command.desc}`;
                }
            }

            if (cmd) {
                const command = commands[cmd];

                if (!command) {
                    output.print(`${cmd} is not a command`, 'tertiary');
                    return;
                }

                output.format(formatCommand(command, cmd));
                if (command.details) {
                    output.format(`\n  ${command.details}`)
                }
                if (command.params) {
                    command.params.forEach((param) => {
                        output.format(`\n    <secondary>${param.name}</secondary>: ${param.desc}`);
                        if (param.optional) {
                            output.print(` (optional)`)
                        }
                    });
                }
                return;
            }

            output.print("Available commands:")
            Object.entries(commands)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([name, command]) => {
                    output.print(`\n  `);
                    output.format(formatCommand(command, name))
                });
        }
    },
    echo: {
        desc: "Display a message",
        details: "Allows for <primary>\\<primary></primary>, <secondary>\\<secondary></secondary>, " +
            "and <tertiary>\\<tertiary></tertiary> color tags.",
        params: [
            {
                name: "message",
                desc: "Message to display"
            }
        ],
        run: async (...params) => {
            const message = params.join(' ');
            output.format(`${message || ' '}`);
        }
    },
    clear: {
        desc: "Clear the terminal output",
        run: async () => {
            const terminal = document.getElementById('console');
            if (terminal) {
                terminal.innerHTML = "";
            }
        }
    },
    date: {
        desc: "Display the current date",
        run: async () => {
            output.print(new Date().toDateString());
        }
    },
    time: {
        desc: "Display the current time",
        run: async () => {
            output.print(new Date().toTimeString());
        }
    },
    about: {
        desc: "Show information about Vanade",
        run: async () => {
            output.print(`-= Vanade Terminal ver. ${VERSION} =-\n`);
            output.print(`A terminal app that runs in your browser\n\n`);
            output.print(`Copyright (c) 2026 i rember; MIT License\n`);
            output.html(`<a href="https://github.com/i-rember/vanade">This app is open-source</a>`);
        }
    },
    random: {
        desc: "Generate a random integer between two values",
        params: [
            { name: "min", desc: "Minimum value" },
            { name: "max", desc: "Maximum value" }
        ],
        run: async (min = 0, max = 100) => {
            const a = Number(min);
            const b = Number(max);
            if (a > b) {
                output.print("Minimum cannot be greater than maximum", "tertiary");
                return;
            }
            if (isNaN(a) || isNaN(b)) {
                output.print(`Please provide valid numeric values`, 'tertiary');
                return;
            }
            const value = Math.floor(Math.random() * (b - a + 1)) + a;
            output.print(String(value));
        }
    }
};

let commandHistory = [];
let historyIndex = 0;

async function handleCmd(value) {
    const args = value.match(/"[^"]*"|'[^']*'|[^\s]+/g)?.map((arg) => arg.replace(/^['"]|['"]$/g, '')) ?? [];
    const [name, ...params] = args;

    if (!name) {
        return;
    }

    name = name.toLowerCase()

    commandHistory.push(value);
    historyIndex = commandHistory.length;

    const command = Object.hasOwn(commands, name) ? commands[name] : null;

    if (!command) {
        output.print(`${name} is not a command`, 'tertiary');
        return;
    }

    await command.run(...params);
}

function start() {
    cacheElements();

    output.print(`-= Vanade Terminal ver. ${VERSION} =-\n`);
    output.print(`Type 'help' for a list of available commands.\n\n`);

    async function promptForCommand() {
        inputPrompt.focus();

        await new Promise((resolve, reject) => {
            const handleKeydown = (event) => {
                if (event.ctrlKey) {
                    if (event.key.toLowerCase() === 'c') {
                        if (event.shiftKey) return;
                        event.preventDefault();
                        output.print(document.getElementById('preprompt').textContent)
                        output.print(inputPrompt.value)
                        output.print('^C\n');
                        inputPrompt.value = '';
                        inputPrompt.removeEventListener('keydown', handleKeydown);
                        return;
                    }

                    if (event.key.toLowerCase() === 'l') {
                        event.preventDefault();
                        inputPrompt.removeEventListener('keydown', handleKeydown);
                        resolve();
                        terminal.innerHTML = '';
                        return;
                    }
                }

                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();

                    if (event.key === 'ArrowUp' && historyIndex > 0) {
                        historyIndex--;
                        inputPrompt.value = commandHistory[historyIndex];
                    } else if (event.key === 'ArrowDown' && historyIndex < commandHistory.length) {
                        historyIndex++;
                        inputPrompt.value = commandHistory[historyIndex] ?? '';
                    }
                    return;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();

                    output.print(document.getElementById('preprompt').textContent)
                    output.print(inputPrompt.value + `\n`)
                    
                    const value = inputPrompt.value.trim();

                    inputPrompt.value = ''

                    try {
                        if (value) {
                            handleCmd(value);
                            output.print(`\n`);
                        }

                        resolve();
                    } catch (error) {
                        reject(error);
                    } finally {
                        inputPrompt.removeEventListener('keydown', handleKeydown);
                    }
                }

                if (event.key === 'Tab') {
                    event.preventDefault();

                    const commandToken = inputPrompt.value.trimStart().split(/\s+/)[0] ?? '';
                    const matches = Object.keys(commands)
                        .filter((name) => name.startsWith(commandToken))
                        .sort((a, b) => a.localeCompare(b));

                    if (matches.length != 1) {
                        return;
                    }

                    inputPrompt.value = matches[0];
                }
            };

            inputPrompt.addEventListener('keydown', handleKeydown);
        });
    }

    (async () => {
        while (true) {
            try {
                await promptForCommand();
            } catch (e) {
                output.print(`Uncaught ${String(e)}`, 'tertiary');
                output.print(`\n`);
                console.error(e);
            }
        }
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}