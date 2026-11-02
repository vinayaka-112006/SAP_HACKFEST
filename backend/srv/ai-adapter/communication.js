const { createHash } = require('node:crypto');
const { error } = require('./validation');
const VERSION = 'communication-1';
const copy = {
  en: { incident: 'Incident', tool: 'Tool', report: 'Original report', category: 'Category', nc: 'Suggested NC code', state: 'Recorded status', unknown: 'Unknown: no recognized record', review: 'Review this card before confirming. Listening does not confirm or approve it.', caution: 'Potentially exposed units only. This does not determine product quality or authorize an action.', total: 'Total units', gaps: 'Missing or conflicting records', draft: 'DRAFT — human review required; not sent.', dealer: 'Dealer', batches: 'Approved batch scope', notice: 'A quality review concerns potentially exposed products in the listed batches. Product quality has not been determined. Contact the quality team for approved next steps.' },
  hi: { incident: 'घटना', tool: 'टूल', report: 'मूल रिपोर्ट', category: 'श्रेणी', nc: 'सुझाया गया NC कोड', state: 'दर्ज स्थिति', unknown: 'अज्ञात: कोई मान्य रिकॉर्ड नहीं', review: 'पुष्टि से पहले यह कार्ड जाँचें। सुनने से पुष्टि या अनुमोदन नहीं होता।', caution: 'केवल संभावित रूप से प्रभावित इकाइयाँ। यह उत्पाद की गुणवत्ता तय नहीं करता और किसी कार्रवाई की अनुमति नहीं देता।', total: 'कुल इकाइयाँ', gaps: 'गुम या विरोधी रिकॉर्ड', draft: 'मसौदा — मानव समीक्षा आवश्यक; भेजा नहीं गया।', dealer: 'डीलर', batches: 'अनुमोदित बैच दायरा', notice: 'सूचीबद्ध बैचों के संभावित रूप से प्रभावित उत्पादों की गुणवत्ता समीक्षा हो रही है। उत्पाद की गुणवत्ता तय नहीं हुई है। अनुमोदित अगले कदमों के लिए गुणवत्ता टीम से संपर्क करें।' },
  kn: { incident: 'ಘಟನೆ', tool: 'ಟೂಲ್', report: 'ಮೂಲ ವರದಿ', category: 'ವರ್ಗ', nc: 'ಸೂಚಿಸಿದ NC ಕೋಡ್', state: 'ದಾಖಲಾದ ಸ್ಥಿತಿ', unknown: 'ಅಜ್ಞಾತ: ಮಾನ್ಯ ದಾಖಲೆ ಇಲ್ಲ', review: 'ದೃಢೀಕರಿಸುವ ಮೊದಲು ಈ ಕಾರ್ಡ್ ಪರಿಶೀಲಿಸಿ. ಕೇಳುವುದರಿಂದ ದೃಢೀಕರಣ ಅಥವಾ ಅನುಮೋದನೆ ಆಗುವುದಿಲ್ಲ.', caution: 'ಸಂಭಾವ್ಯವಾಗಿ ಪ್ರಭಾವಿತ ಘಟಕಗಳು ಮಾತ್ರ. ಇದು ಉತ್ಪನ್ನದ ಗುಣಮಟ್ಟವನ್ನು ನಿರ್ಧರಿಸುವುದಿಲ್ಲ ಅಥವಾ ಕ್ರಮಕ್ಕೆ ಅನುಮತಿ ನೀಡುವುದಿಲ್ಲ.', total: 'ಒಟ್ಟು ಘಟಕಗಳು', gaps: 'ಕಾಣೆಯಾದ ಅಥವಾ ವಿರೋಧಾತ್ಮಕ ದಾಖಲೆಗಳು', draft: 'ಕರಡು — ಮಾನವ ಪರಿಶೀಲನೆ ಅಗತ್ಯ; ಕಳುಹಿಸಿಲ್ಲ.', dealer: 'ಡೀಲರ್', batches: 'ಅನುಮೋದಿತ ಬ್ಯಾಚ್ ವ್ಯಾಪ್ತಿ', notice: 'ಪಟ್ಟಿಯಲ್ಲಿರುವ ಬ್ಯಾಚ್‌ಗಳ ಸಂಭಾವ್ಯವಾಗಿ ಪ್ರಭಾವಿತ ಉತ್ಪನ್ನಗಳ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿದೆ. ಉತ್ಪನ್ನದ ಗುಣಮಟ್ಟ ನಿರ್ಧರಿಸಿಲ್ಲ. ಅನುಮೋದಿತ ಮುಂದಿನ ಕ್ರಮಗಳಿಗೆ ಗುಣಮಟ್ಟ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ.' },
};
const states = {
  Reported: ['Reported', 'रिपोर्ट दर्ज', 'ವರದಿ ದಾಖಲಾಗಿದೆ'], Confirmed: ['Confirmed', 'पुष्टि हुई', 'ದೃಢೀಕರಿಸಲಾಗಿದೆ'],
  'Under review': ['Under review', 'समीक्षा जारी', 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ'], 'Containment proposed': ['Containment proposed', 'नियंत्रण प्रस्तावित', 'ನಿಯಂತ್ರಣ ಪ್ರಸ್ತಾಪಿಸಲಾಗಿದೆ'],
  Approved: ['Approved', 'अनुमोदित', 'ಅನುಮೋದಿಸಲಾಗಿದೆ'], Rejected: ['Rejected', 'अस्वीकृत', 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ'],
  Repairing: ['Repairing', 'मरम्मत जारी', 'ದುರಸ್ತಿಯಲ್ಲಿದೆ'], 'Awaiting verification': ['Awaiting verification', 'सत्यापन की प्रतीक्षा', 'ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ'],
  Closed: ['Closed', 'बंद', 'ಮುಚ್ಚಲಾಗಿದೆ'], 'Closed with insufficient evidence': ['Closed with insufficient evidence', 'अपर्याप्त साक्ष्य के साथ बंद', 'ಸಾಕಷ್ಟು ಸಾಕ್ಷ್ಯವಿಲ್ಲದೆ ಮುಚ್ಚಲಾಗಿದೆ'],
};
function language(value) { if (!Object.hasOwn(copy, value)) throw error('AI_INVALID_INPUT', 'Select language kn, hi or en.'); return value; }
function clean(value, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || /defective/i.test(value))
    throw error('AI_INVALID_INPUT', 'A required communication field is invalid.');
  return value;
}
function result(text, lang, sources) {
  return { _label: 'SIMULATED', _stub: false, language: lang, text, sourceIds: sources, modelVersion: VERSION,
    contentVersion: createHash('sha256').update(JSON.stringify({ text, lang, sources, VERSION })).digest('hex'), requiresHumanReview: true };
}
function readback(card, lang) {
  const c = copy[language(lang)];
  clean(card.toolId); clean(card.rawText, 2000);
  for (const key of ['category', 'suggestedNcCode']) if (card[key]) clean(card[key]);
  for (const [key, max] of [['translatedText', 4000], ['reporterId', 120], ['reportedAt', 120]]) if (card[key]) clean(card[key], max);
  const value = result(`${c.tool}: ${card.toolId}. ${c.report}: ${card.rawText}. ${card.translatedText ? `English: ${card.translatedText}. ` : ''}${c.category}: ${card.category || c.unknown}. ${c.nc}: ${card.suggestedNcCode || c.unknown}. Reporter ID: ${card.reporterId || c.unknown}. Reported at: ${card.reportedAt || c.unknown}. ${c.review}`, lang, []);
  if (value.text.length > 2400) throw error('AI_INVALID_INPUT', 'This card is too long for one readback. Review the complete card on screen; no fields were truncated.');
  return value;
}
function status(incident, lang) {
  const c = copy[language(lang)], index = { en: 0, hi: 1, kn: 2 }[lang];
  return { ...result(`${c.incident}: ${clean(incident.incidentId)}. ${c.tool}: ${clean(incident.toolId)}. ${c.state}: ${states[incident.state]?.[index] || c.unknown}. ${c.caution}`, lang, [incident.incidentId]),
    recordedState: incident.state, asOf: new Date().toISOString() };
}
function explain(trace, lang) {
  const c = copy[language(lang)];
  if (!Array.isArray(trace.units) || !Array.isArray(trace.gaps) || !trace.tiers || !Number.isInteger(trace.version)) throw error('AI_SOURCE_INVALID', 'Trace snapshot is incomplete. Generate a new trace.');
  const counts = { CONFIRMED: 0, PROBABLE: 0, UNKNOWN: 0 };
  for (const unit of trace.units) {
    if (!Object.hasOwn(counts, unit.tier)) throw error('AI_SOURCE_INVALID', 'Trace tier is unrecognized.');
    counts[unit.tier]++;
  }
  if (Object.keys(counts).some(key => trace.tiers[key] !== counts[key])) throw error('AI_SOURCE_INVALID', 'Trace counts are inconsistent. Generate a new trace.');
  return { ...result(`${c.incident}: ${trace.incidentId}. ${c.total}: ${trace.units.length}. CONFIRMED: ${counts.CONFIRMED}; PROBABLE: ${counts.PROBABLE}; UNKNOWN: ${counts.UNKNOWN}. ${c.gaps}: ${trace.gaps.length}. ${c.caution}`, lang, [trace.traceId]),
    traceId: trace.traceId, traceVersion: trace.version, windowHours: trace.windowHours, snapshotTime: trace.snapshotTime,
    generatedAt: trace.generatedAt, counts, gaps: trace.gaps, tierMeaning: { CONFIRMED: 'Recorded tool-use linkage; not product quality confirmation.', PROBABLE: 'Time-window linkage; needs review.', UNKNOWN: 'Missing or conflicting evidence; never assume unaffected.' } };
}
function dealerNotice({ incidentId, dealerId, batchIds, approvalId }, lang) {
  const c = copy[language(lang)];
  return { ...result(`${c.draft}\n${c.incident}: ${clean(incidentId)}\n${c.dealer}: ${clean(dealerId)}\n${c.batches}: ${batchIds.map(id => clean(id)).join(', ')}\n${c.notice}`, lang, [incidentId, dealerId, approvalId, ...batchIds]), sent: false, approvalId, dealerId, batchIds };
}
module.exports = { VERSION, language, clean, readback, status, explain, dealerNotice };
