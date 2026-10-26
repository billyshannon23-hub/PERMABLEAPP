# Making videos with an AI assistant

The framework was built with Claude, and it works well for an assistant that can run commands and look at images. Give the assistant the whole framework folder and a prompt like the one below.

## Prompt to start a video

> You're working in the Permeable Framework (this folder). Read README.md and every file in docs/ first, then look at examples/yawning and examples/goosebumps.
>
> Make a video about **[topic]**.
> 1. Research it from reliable sources and list the facts, with links. Flag anything that is debated.
> 2. Write 10–13 captions and matching narration lines, following docs/STYLE.md.
> 3. Plan the scenes, then create the project with `python3 tools/kit.py new NAME`.
> 4. Build the scenes one at a time. After each one, run `kit.py preview` and look at the image before moving on.
> 5. Run `kit.py check`, then `kit.py make`, then look at the contact sheet.
> 6. Go through docs/CHECKLIST.md, fix anything that fails, and give me the video, a posting description and the sources.

## Prompts for changes

- "The labels cover his face around 20 seconds. Move them."
- "The cat looks wrong. Make it look like a Bellhead, just smaller."
- "Use the detective outfit for the narrator and give him the magnifier."
- "The ending drags. Shorten the last two lines."

## What helps

- Ask for previews along the way, so problems get caught before a full render.
- Point at a specific example scene when you want something similar ("like the x-ray in otzi").
- Keep the style rules strict. That's what makes the series feel consistent.
