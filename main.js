let terminal = document.getElementById('console');

function ensureTerminal() {
    if (!terminal) {
        terminal = document.getElementById('console');
    }

    if (!terminal && document.body) {
        terminal = document.createElement('div');
        terminal.id = 'console';
        document.body.appendChild(terminal);
    }

    return terminal;
}

function log(html) {
    const element = ensureTerminal();

    if (element) {
        element.insertAdjacentHTML('beforeend', html);
    }
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
        const token = `__VANAD_ALLOWED_TAG_${replacements.length}__`;
        replacements.push(match);
        return token;
    });

    const escaped = escapeHtml(protectedValue);

    return allowedTags.reduce((result, _, index) => {
        const token = `__VANAD_ALLOWED_TAG_${index}__`;
        if (replacements[index]) {
            return result.replace(token, replacements[index]);
        }
        return result;
    }, escaped);
}

function textlog(text) {
    const element = ensureTerminal();

    if (element) {
        element.insertAdjacentHTML('beforeend', safeText(text));
    }
}

const commands = {
    help: {
        desc: "Show information about commands",
        params: [
            {
                name: "command",
                desc: "Command to look up"
            }
        ],
        run: (cmd = null) => {
            function formatCommand(command, name) {
                if (command.params) {
                    const params = command.params.map(({ name }) => `&lt;${escapeHtml(name)}&gt;`).join(' ');
                    return `<primary>${escapeHtml(name)}</primary> <secondary>${params}</secondary> - ${escapeHtml(command.desc)}`;
                } else {
                    return `<primary>${escapeHtml(name)}</primary> - ${escapeHtml(command.desc)}`;
                }
            }

            if (cmd) {
                const command = commands[cmd];

                if (!command) {
                    log(`<tertiary>${escapeHtml(cmd)}</tertiary> is not a command`);
                    return;
                }

                log(formatCommand(command, cmd));
                if (command.params) {
                    command.params.forEach(({ name, desc }) => log(`<br/>  <secondary>${escapeHtml(name)}</secondary>: ${escapeHtml(desc)}`));
                }
                return;
            }

            log("Available commands:")
            Object.entries(commands).forEach(([name, command]) => {
                log(`<br/>  ` + formatCommand(command, name));
            });
        }
    },
    echo: {
        desc: "Display a message",
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
    crash: {
        desc: "Trigger a terminal error",
        run: () => {
            throw new Error('Terminal crash requested');
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
        log(`<tertiary>${escapeHtml(name)}</tertiary> is not a command`);
        return;
    }

    command.run(...params);
}

function start() {
    ensureTerminal();

    log(`-= Vanad Terminal ver. 0.1.0 =-<br/>`);
    log(`Type 'help' for a list of available commands.<br/><br/>`);

    document.addEventListener('click', () => {
        const input = document.getElementById('input');

        if (input) {
            input.focus();
        }
    });

    async function promptForCommand() {
        log(`>> `);
        log(`<x id="input" contenteditable="true" spellcheck="false"></x><br/>`);

        const input = document.getElementById('input');

        if (!input) {
            return;
        }

        input.focus();

        await new Promise((resolve, reject) => {
            const handleKeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    input.contentEditable = false;
                    input.id = null;

                    const value = input.textContent.trim();

                    try {
                        if (value) {
                            handleCmd(value);
                            log(`<br/>`);
                        }

                        resolve();
                    } catch (error) {
                        reject(error);
                    } finally {
                        input.removeEventListener('keydown', handleKeydown);
                    }
                }
            };

            input.addEventListener('keydown', handleKeydown);
        });
    }

    (async () => {
        while (true) {
            try {
                await promptForCommand();
            } catch (e) {
                log(`<tertiary>AN UNCAUGHT ERROR HAS OCCURRED</tertiary><br/>${e}<br/>please refresh the page`);
                console.error(e);
                break;
            }
        }
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}