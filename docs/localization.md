# Localization coverage

`frontend/src/features/v2/locale.jsx` contains separate English, Hindi and Kannada
resources. The persistent navbar selector stores language independently from the
incident's reporting language. New workspace controls, seven interview questions,
safety guidance and assistant fallback messages are translated. Existing Kannada
and Devanagari font packages remain in the build. Original incident text is never
translated in place or overwritten when the website language changes.

Browser checks execute a Kannada typed interview and confirmation, reload the
preference, switch to Hindi, then return to English. Live ASR/TTS language quality
is not verified. Dynamic record text and provider errors retain the original
wording when no verified translation exists.

Whole-website localization is partial: older landing/console/history/kitchen,
legacy workflow buttons, technical record labels and some validation messages
remain English. The selector does not falsely claim these pages have been fully
translated. Plant-native translation review and completion of legacy resources
remain necessary for full master-prompt acceptance.
