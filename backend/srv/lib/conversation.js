const questions = {
  en: { symptom:'What did you observe?', onset:'When did you first notice the problem?', equipmentStopped:'Has the equipment been stopped?', productionStopped:'Has production been stopped?', safety:'Is there an immediate safety concern?', actionTaken:'What action have you already taken?', errorCode:'Any visible error code or abnormal measurement?' },
  hi: { symptom:'आपने क्या समस्या देखी?', onset:'समस्या पहली बार कब देखी?', equipmentStopped:'क्या उपकरण रोक दिया गया है?', productionStopped:'क्या उत्पादन रोक दिया गया है?', safety:'क्या तत्काल सुरक्षा का खतरा है?', actionTaken:'आपने अब तक क्या कार्रवाई की है?', errorCode:'क्या कोई त्रुटि कोड या असामान्य माप दिखा?' },
  kn: { symptom:'ನೀವು ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ಗಮನಿಸಿದ್ದೀರಿ?', onset:'ಸಮಸ್ಯೆಯನ್ನು ಮೊದಲು ಯಾವಾಗ ಗಮನಿಸಿದಿರಿ?', equipmentStopped:'ಉಪಕರಣವನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆಯೇ?', productionStopped:'ಉತ್ಪಾದನೆಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆಯೇ?', safety:'ತಕ್ಷಣದ ಸುರಕ್ಷತಾ ಅಪಾಯ ಇದೆಯೇ?', actionTaken:'ನೀವು ಈಗಾಗಲೇ ಯಾವ ಕ್ರಮ ತೆಗೆದುಕೊಂಡಿದ್ದೀರಿ?', errorCode:'ಯಾವುದೇ ದೋಷ ಕೋಡ್ ಅಥವಾ ಅಸಾಮಾನ್ಯ ಅಳತೆ ಇದೆಯೇ?' },
};
const fields = Object.keys(questions.en);
function next(facts, language) {
  const missingFields = fields.filter(f => facts[f] === undefined);
  const field = missingFields[0] || null;
  return { field, question: field ? questions[language][field] : null, missingFields,
    ready: !missingFields.length, safetyEscalation: facts.safety === true || facts.safety === 'yes' || /\b(fire|smoke|injur|danger)|आग|धुआँ|खतरा|ಬೆಂಕಿ|ಹೊಗೆ|ಅಪಾಯ/i.test(facts.symptom||'') ? {
      en:'Stop reporting and follow plant emergency and isolation procedures. Contact the plant safety supervisor immediately.',
      hi:'संयंत्र की आपातकालीन और अलगाव प्रक्रियाओं का पालन करें। सुरक्षा पर्यवेक्षक से तुरंत संपर्क करें।',
      kn:'ಸ್ಥಾವರದ ತುರ್ತು ಮತ್ತು ಪ್ರತ್ಯೇಕೀಕರಣ ಕ್ರಮಗಳನ್ನು ಅನುಸರಿಸಿ. ಸುರಕ್ಷತಾ ಮೇಲ್ವಿಚಾರಕರನ್ನು ತಕ್ಷಣ ಸಂಪರ್ಕಿಸಿ.',
    }[language] : null };
}
module.exports = { next, fields };
