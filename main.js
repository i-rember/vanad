const VERSION = "0.2.1";

let terminal = null;
let inputPrompt = null;

function ensureTerminal() {
    if (!terminal) {
        terminal = document.getElementById('console');
    }

    if (!inputPrompt) {
        inputPrompt = document.getElementById('prompt')
    }
}

ensureTerminal();

function log(html) {
    ensureTerminal();

    terminal.insertAdjacentHTML('beforeend', html);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function safeText(value) {
    const allowedTags = ['primary', 'secondary', 'tertiary'];
    const replacements = [];
    const protectedValue = String(value).replace(/<\/?(primary|secondary|tertiary)>/gi, (match) => {
        const token = `__VANADE_ALLOWED_TAG_${replacements.length}__`;
        replacements.push(match);
        return token;
    });

    const escaped = escapeHtml(protectedValue);

    return allowedTags.reduce((result, _, index) => {
        const token = `__VANADE_ALLOWED_TAG_${index}__`;
        if (replacements[index]) {
            return result.replace(token, replacements[index]);
        }
        return result;
    }, escaped);
}

function textlog(text) {
    ensureTerminal();

    terminal.insertAdjacentHTML('beforeend', safeText(text));
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
        run: (cmd = null) => {
            function formatCommand(command, name) {
                if (command.params) {
                    const params = command.params.map((param) => 
                        param.optional ? `[${escapeHtml(param.name)}]` : `&lt;${escapeHtml(param.name)}&gt;`
                    ).join(' ');
                    return `<primary>${escapeHtml(name)}</primary> <secondary>${params}</secondary> - ` +
                        `${escapeHtml(command.desc)}`;
                } else {
                    return `<primary>${escapeHtml(name)}</primary> - ${escapeHtml(command.desc)}`;
                }
            }

            if (cmd) {
                const command = commands[cmd];

                if (!command) {
                    log(`<tertiary>${escapeHtml(cmd)} is not a command</tertiary>`);
                    return;
                }

                log(formatCommand(command, cmd));
                if (command.details) {
                    log(`<br/>  ${command.details}`)
                }
                if (command.params) {
                    command.params.forEach((param) => {
                        log(`<br/>    <secondary>${escapeHtml(param.name)}</secondary>: ${escapeHtml(param.desc)}`);
                        if (param.optional) {
                            log(` (optional)`)
                        }
                    });
                }
                return;
            }

            log("Available commands:")
            Object.entries(commands)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([name, command]) => {
                    log(`<br/>  ` + formatCommand(command, name));
                });
        }
    },
    echo: {
        desc: "Display a message",
        details: "Allows for <primary>&lt;primary&gt;</primary>, <secondary>&lt;secondary&gt;</secondary>, " +
            "and <tertiary>&lt;tertiary&gt;</tertiary> color tags.",
        params: [
            {
                name: "message",
                desc: "Message to display"
            }
        ],
        run: (...params) => {
            const message = params.join(' ');
            textlog(`${message || ' '}`);
        }
    },
    clear: {
        desc: "Clear the terminal output",
        run: () => {
            const terminal = document.getElementById('console');
            if (terminal) {
                terminal.innerHTML = "";
            }
        }
    },
    date: {
        desc: "Display the current date",
        run: () => {
            log(`Today is ${new Date().toDateString()}`);
        }
    },
    time: {
        desc: "Display the current time",
        run: () => {
            log(`It's currently ${new Date().toTimeString()}`);
        }
    },
    about: {
        desc: "Show information about Vanade",
        run: () => {
            log(`-= Vanade Terminal ver. ${VERSION} =-<br/>`);
            log(`A terminal app that runs in your browser<br/><br/>`);
            log(`Copyright (c) 2026 i rember; MIT License<br/>`);
            log(`<a href="https://github.com/i-rember/vanade">This app is open-source</a>`);
        }
    },
    random: {
        desc: "Generate a random number between two values",
        params: [
            { name: "min", desc: "Minimum value" },
            { name: "max", desc: "Maximum value" }
        ],
        run: (min = 0, max = 100) => {
            const a = Number(min);
            const b = Number(max);
            if (isNaN(a) || isNaN(b)) {
                log(`<tertiary>Please provide valid numeric values</tertiary>`);
                return;
            }
            const value = Math.floor(Math.random() * (b - a + 1)) + a;
            log(String(value));
        }
    }
};

function handleCmd(value) {
    const args = value.match(/"[^"]*"|'[^']*'|[^\s]+/g)?.map((arg) => arg.replace(/^['"]|['"]$/g, '')) ?? [];
    const [name, ...params] = args;

    if (!name) {
        return;
    }

    const command = commands[name];

    if (!command) {
        log(`<tertiary>${escapeHtml(name)} is not a command</tertiary>`);
        return;
    }

    command.run(...params);
}

function start() {
    ensureTerminal();

    log(`-= Vanade Terminal ver. ${VERSION} =-<br/>`);
    log(`Type 'help' for a list of available commands.<br/><br/>`);

    async function promptForCommand() {
        inputPrompt.focus();

        await new Promise((resolve, reject) => {
            const handleKeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    log(document.getElementById('preprompt').textContent)
                    log(escapeHtml(inputPrompt.value) + `<br/>`)
                    
                    const value = inputPrompt.value.trim();

                    inputPrompt.value = ''

                    try {
                        if (value) {
                            handleCmd(value);
                            log(`<br/>`);
                        }

                        resolve();
                    } catch (error) {
                        reject(error);
                    } finally {
                        inputPrompt.removeEventListener('keydown', handleKeydown);
                    }
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
                log(`<tertiary>Uncaught ${escapeHtml(String(e))}</tertiary><br/>`);
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