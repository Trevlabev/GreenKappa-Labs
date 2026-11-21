# FAULT // ANNOUNCER — recorded voice pack

Status: recording interface ready; final voice recordings require approval. Browser synthesis is the fallback until the complete recording pack is added.

## Voice direction

Original androgynous synthetic host; neutral American English; clear articulation; slightly self-important, bright, dryly comic, with understated irony. The voice should sound like a professional game-show host produced by a malfunctioning corporate AI, not a novelty robotic monotone. No imitation of an identifiable actor. Use one consistent voice, rate, microphone character, and processing across every line. Let jokes land through a small pause or restrained inflection, never exaggerated laughter. Say “Agent Fault” and pronounce AI as the separate letters A and I.

## Delivery specification
- Twenty standalone MP3s (9 Classic, 11 Cascade); preserve the exact text in voice-cues.json.
- Filename: <edition>-<phase>.mp3, lower case, with underscores retained in phase identifiers.
- One cue per file; mono, 44.1 or 48 kHz, approximately 96–128 kbps; target -16 LUFS integrated, true peak at or below -1 dBTP. No music or effects beyond gentle voice coloration.
- Put all twenty approved files under audio/narration/recordings/. Do not put preview files in production without explicit approval.
- The unified build uses recording files first; an explicitly chosen browser voice or playback error uses browser speech instead. A partially populated recording folder fails the build.
- Round numbers are shown in the game UI. Recorded setup announcements are static; browser fallback includes the round number.
- All cues contain only fixed public phase guidance, not card values or hidden information.
