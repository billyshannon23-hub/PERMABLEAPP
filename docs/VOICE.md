# The narrator

The narrator is a robot voice built for this series:
- **Pronunciation and rhythm** come from the Flite speech engine's English dictionary.
- **The sound itself** is rebuilt from scratch in `voice/deepvoice.py`: a deep, even, slightly vintage-computer voice.

The settings in `voice/voice.json` are shared by every video, so the series sounds the same throughout. Change them there, not per video.

## narration.json

```json
{
  "preset": "calm",
  "lines": [
    "Your heart beats about one hundred thousand times a day.",
    "Each beat starts in a small patch of cells called the {sinoatrial|S AY1 N OW0 EY1 T R IY0 AH0 L} node.",
    null
  ]
}
```

- Write **one line per caption**, in the same order. `null` means "say the caption as written".
- Write **numbers as words** ("nineteen twenty-two", "four hundred and thirty million") so they are read the way you mean.

### Markup inside a line

| Markup | Effect |
|---|---|
| `*word*` | Stresses a word. |
| `[pause 150]` | Pauses for that many milliseconds. |
| `[rate 0.9]` | Slows down from that point. |
| `[pitch -2]` | Goes deeper from that point. |
| `{word\|ARPABET}` | Sets an exact pronunciation (see below). |

Punctuation pauses on its own, so commas and full stops matter.

## Fixing a pronunciation

Pronunciations use ARPAbet: `AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH`. Put a stress number on vowels, **1** for stressed and **0** for unstressed. Use only 0 and 1.

- **For one line**: `{Otzi|ER1 T S IY0}`.
- **For every video**: add the word to `voice/user_lexicon.txt`, like `OTZI  ER1 T S IY0`.

Examples that needed fixing: Osborne `AA1 Z B AO0 R N`, Nebraska `N AH0 B R AE1 S K AH0`, diaphragm `D AY1 AH0 F R AE0 M`, arrector pili `AH0 R EH1 K T ER0` / `P AY1 L AY0`, H. pylori `EY1 CH` / `P AY0 L AO1 R IY0`.

## Listening to the voice on its own

```
cd voice
python3 robovoice.py say "Your heart beats about one hundred thousand times a day." -o test.wav
python3 robovoice.py phonemes "diaphragm arrector pili"
```

The `phonemes` command shows how each word will be said. Words marked `[rules]` are guesses, so check those.

## How the voice fits the video

`kit.py make` speaks every line and places it at its caption. It speeds a line up slightly if needed, up to 1.1×. If a line still runs long, it slows the video down just before the next caption rather than talking over it. The captions then type out word by word in step with the voice, and the music ducks under the speech.

If a video ends up much longer than planned, tighten the narration lines or give long captions more time in `caps.js`.

## Without Flite

If the Flite libraries can't be found, the narrator says so and uses the "classic" voice instead. See [SETUP](SETUP.md) to install Flite, or use Docker.
