# voice/

The series narrator. Instructions are in ../docs/VOICE.md.

- `voice.json`: the one voice every video uses
- `user_lexicon.txt`: your pronunciation fixes (WORD  ARPABET, stress 0/1)
- `lexicon.txt`, `abbreviations.txt`, `overrides.txt`: built-in pronunciations
- `robovoice.py`: the synthesizer (`python3 robovoice.py say "text" -o test.wav`)
- `deepvoice.py`: the deep engine (Flite pronunciation, our own sound)
- `narrate.py`: fits the voice to a project's captions, mixes and encodes (run by `kit.py make`)
- `previews/`: what the presets sound like
