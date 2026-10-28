// Exam blueprints, modeled on the Career Service Examination - Pen and Paper Test (CSE-PPT)
// as announced by the Civil Service Commission:
//   Professional: 170 items, 3 hours 10 minutes
//   Subprofessional: 165 items, 2 hours 40 minutes
// CSC does not publish an exact item split per subject, so the split below is an
// approximation based on the published scope of each exam. Passing rate is 80%.

const SUBJECTS = {
  verbal: { name: 'Verbal Ability', desc: 'Vocabulary, grammar, analogy, reading comprehension (English at Filipino)' },
  numerical: { name: 'Numerical Ability', desc: 'Basic operations, word problems, number series, percentage, ratio' },
  analytical: { name: 'Analytical Ability', desc: 'Logic, series, analogy, coding, data interpretation' },
  clerical: { name: 'Clerical Ability', desc: 'Filing, alphabetizing, spelling, pagtutugma ng datos' },
  general: { name: 'General Information', desc: '1987 Constitution, RA 6713, human rights, kapaligiran, peace' },
};

const EXAMS = {
  pro: {
    key: 'pro',
    title: 'Professional Level Mock Exam',
    items: 170,
    minutes: 190,
    passing: 80,
    sections: [
      { subject: 'verbal', count: 60 },
      { subject: 'analytical', count: 45 },
      { subject: 'numerical', count: 45 },
      { subject: 'general', count: 20 },
    ],
  },
  subpro: {
    key: 'subpro',
    title: 'Subprofessional Level Mock Exam',
    items: 165,
    minutes: 160,
    passing: 80,
    sections: [
      { subject: 'verbal', count: 50 },
      { subject: 'clerical', count: 45 },
      { subject: 'numerical', count: 40 },
      { subject: 'general', count: 30 },
    ],
  },
};

module.exports = { SUBJECTS, EXAMS };
