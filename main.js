const console = document.getElementById('console');

function log(html) {
	console.innerHTML += html;
}

log(`-= Vanad Terminal ver. 0.1.0 =-<br/>`);
log(`Type 'help' or '?' for a list of available commands.<br/><br/>`);

function handleCmd(value) {
    if (value) {
        log(`${value}<br/>`);
    }
}

async function promptForCommand() {
    log(`>> `);
    log(`<x id="input" contenteditable="true" autofocus></x><br/>`);

    const input = document.getElementById('input');

    await new Promise((resolve) => {
        const handleKeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                input.contentEditable = false;
                input.id = null;

                const value = input.textContent.trim();

                if (value) {
                    handleCmd(value)
                }

                input.removeEventListener('keydown', handleKeydown);
                input.remove();
                resolve();
            }
        };

        input.addEventListener('keydown', handleKeydown);
    });
}

(async () => {
    while (true) {
        await promptForCommand();
    }
})();