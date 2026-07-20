import { Lesson } from '../../models/content';

export const lesson01: Lesson = {
  id: 'lesson-01',
  number: 1,
  title: 'A first introduction',
  japaneseTitle: 'はじめまして',
  description: 'Build a polite first conversation by introducing topics instead of translating English word for word.',
  durationMinutes: 35,
  theme: 'Meeting people at a community studio',
  availability: 'ready',
  goals: [
    'Introduce yourself with your name and role',
    'Identify another person politely',
    'Ask and answer a simple identity question',
    'Connect a person to a group, place, or field',
  ],
  grammar: [
    {
      id: 'l1-topic-copula',
      title: 'Make a noun the topic, then identify it',
      pattern: 'A は B です',
      plainEnglish: '“As for A, it is B.”',
      explanation:
        'Put the shared topic before は and the identifying noun before です. The topic frames what the comment is about; です closes the noun sentence politely.',
      whyItWorks:
        'Japanese first establishes a conversational frame and then supplies the comment. It does not need an English-style subject plus “am/is/are” in every clause, so information already clear from context can stay unspoken.',
      usageBoundary:
        'Do not replace every English subject with は: は marks the chosen topic, while が has a different identifying role that this lesson only previews.',
      formation: [
        {
          label: 'Polite noun sentence',
          formula: 'topic + は + identity/category + です',
          explanation: 'Choose what the conversation is about, then finish with the noun that identifies or classifies it.',
        },
      ],
      contrast: {
        with: 'は compared with が',
        explanation: 'Use は to choose or contrast a topic as the message frame; が can single out which person or thing fits an identity, a role only previewed here.',
      },
      notes: [
        'Literal frame: “As for A, B.”',
        'Keep the polite ending at the end of the complete sentence.',
      ],
      examples: [
        { japanese: 'わたしは がくせいです。', reading: 'わたしは がくせいです。', english: 'I am a student.' },
        { japanese: 'エマさんは けんきゅうしゃです。', reading: 'エマさんは けんきゅうしゃです。', english: 'Emma is a researcher.' },
      ],
      commonMistake: {
        avoid: 'わたし は です エマ。',
        prefer: 'わたしは エマです。',
        reason: 'The description comes before です; Japanese does not copy English “I am Emma” word order piece by piece.',
      },
    },
    {
      id: 'l1-negative',
      title: 'Politely say what something is not',
      pattern: 'A は B じゃありません',
      plainEnglish: '“A is not B.”',
      explanation:
        'Use じゃありません instead of です to deny a noun identity politely. The whole ending marks the noun sentence as negative; it is not a separate action meaning “do not.”',
      whyItWorks:
        'Japanese keeps the identifying noun as the comment and changes the copular ending that evaluates it. Treat です and じゃありません as contrasting sentence endings rather than inserting an English “not.”',
      usageBoundary:
        'Use this form to deny an identity or category; negative action verbs use their own conjugation, which begins in Lesson 4.',
      formation: [
        {
          label: 'Polite noun denial',
          formula: 'identity/category + じゃありません',
          explanation: 'Keep the noun being denied and replace the affirmative ending with the complete polite negative ending.',
        },
      ],
      contrast: {
        with: 'じゃありません compared with です',
        explanation: 'です affirms the noun description, while じゃありません rejects it; they are alternative endings, so do not combine them.',
      },
      examples: [
        { japanese: 'ルカさんは きょうしじゃありません。', reading: 'ルカさんは きょうしじゃありません。', english: 'Luca is not a teacher.' },
        { japanese: 'エマさんは デザイナーじゃありません。', reading: 'エマさんは デザイナーじゃありません。', english: 'Emma is not a designer.' },
      ],
      commonMistake: {
        avoid: 'せんせい です じゃありません',
        prefer: 'せんせいじゃありません',
        reason: 'Use one ending or the other; do not keep です before the negative ending.',
      },
    },
    {
      id: 'l1-question',
      title: 'Turn a statement into a question',
      pattern: 'A は B ですか',
      plainEnglish: '“Is A B?”',
      explanation:
        'Add sentence-final か after the complete polite noun sentence. The topic and comment stay in statement order because か, rather than word inversion, marks the utterance as a question.',
      whyItWorks:
        'Japanese lets the listener process the same topic-comment frame used for a statement and reveals the question at the end. This keeps the sentence structure stable while the final particle sets its conversational function.',
      usageBoundary:
        'In this lesson, attach か to a polite ending such as です; do not move the noun or omit the taught polite ending to imitate English question order.',
      formation: [
        {
          label: 'Polite yes-no question',
          formula: 'polite noun sentence + か',
          explanation: 'Build the complete polite statement first, then attach か at the very end to ask whether it is true.',
        },
      ],
      contrast: {
        with: 'sentence-final か compared with English word-order inversion',
        explanation: 'Japanese keeps the topic and description in statement order and lets final か mark the question instead of moving words around.',
      },
      notes: ['Answer はい for yes and いいえ for no, then repeat the useful part of the answer.', 'Avoid あなた when the person’s name or role is known.'],
      examples: [
        { japanese: 'サラさんは スタッフですか。', reading: 'サラさんは スタッフですか。', english: 'Sara, are you a staff member?' },
        { japanese: 'ノアさんは エンジニアですか。', reading: 'ノアさんは エンジニアですか。', english: 'Noah, are you an engineer?' },
      ],
    },
    {
      id: 'l1-also',
      title: 'Include another matching topic',
      pattern: 'A も B です',
      plainEnglish: '“A is also B.”',
      explanation:
        'Replace the topic particle は with も when the newly mentioned item belongs with an earlier item under the same comment. The particle attaches directly to the item being included.',
      whyItWorks:
        'Japanese marks the participant that joins an established set instead of placing a free-floating word for “also” elsewhere. The listener therefore looks backward for the description that both items share.',
      usageBoundary:
        'Use も only when the intended description truly matches the earlier one; keep は when you are introducing or contrasting a different comment.',
      formation: [
        {
          label: 'Matching addition',
          formula: 'additional item + も + shared comment',
          explanation: 'Replace the earlier topic marker with も on the new item, then give the description it shares with the established item.',
        },
      ],
      contrast: {
        with: 'も compared with は',
        explanation: 'Use も when the new item joins the same description; use は when it needs its own topic frame or a contrasting comment.',
      },
      examples: [
        { japanese: 'ミナさんは デザイナーです。ユイさんも デザイナーです。', reading: 'ミナさんは デザイナーです。ユイさんも デザイナーです。', english: 'Mina is a designer. Yui is a designer too.' },
        { japanese: 'わたしも シンガポールじんです。', reading: 'わたしも シンガポールじんです。', english: 'I am also Singaporean.' },
      ],
    },
    {
      id: 'l1-connection',
      title: 'Link two nouns with の',
      pattern: 'A の B',
      plainEnglish: '“B connected with A”',
      explanation:
        'Place noun A before の to describe noun B. The final noun B is the head of the whole phrase, while A supplies a relationship such as organization, field, origin, category, or ownership.',
      whyItWorks:
        'Japanese builds the description before naming the central thing. Reading toward the final noun prevents the English-speaking habit of treating the first noun as the phrase head or translating every の as an apostrophe.',
      usageBoundary:
        'Do not assume の always signals possession; this lesson uses noun-to-noun relationships only and defers explanatory の and nominalization.',
      formation: [
        {
          label: 'Noun relationship',
          formula: 'describing noun + の + main noun',
          explanation: 'Place the relationship label first and finish with the noun that names the person or thing the whole phrase refers to.',
        },
      ],
      contrast: {
        with: 'の compared with English possessive ’s',
        explanation: 'English possession is only one possible reading; の can also connect a role, field, origin, or organization to the final noun.',
      },
      notes: ['In A の B, B is the head noun.', 'Choose the natural English relationship from context rather than assigning one fixed translation to の.'],
      examples: [
        { japanese: 'ひかりだいがくの けんきゅうしゃです。', reading: 'ひかりだいがくの けんきゅうしゃです。', english: 'I am a researcher at Hikari University.' },
        { japanese: 'にほんごの きょうしです。', reading: 'にほんごの きょうしです。', english: 'I am a Japanese-language teacher.' },
      ],
    },
  ],
  vocabulary: [
    { id: 'l1-v01', japanese: 'わたし', reading: 'わたし', english: 'I; me', partOfSpeech: 'pronoun', note: 'Often omitted after your identity is clear.' },
    { id: 'l1-v02', japanese: 'ひと', reading: 'ひと', english: 'person', partOfSpeech: 'noun' },
    { id: 'l1-v03', japanese: 'かた', reading: 'かた', english: 'person (respectful)', partOfSpeech: 'noun' },
    { id: 'l1-v04', japanese: 'みなさん', reading: 'みなさん', english: 'everyone', partOfSpeech: 'noun' },
    { id: 'l1-v05', japanese: 'がくせい', reading: 'がくせい', english: 'student', partOfSpeech: 'noun' },
    { id: 'l1-v06', japanese: 'せんせい', reading: 'せんせい', english: 'teacher; expert addressed with respect', partOfSpeech: 'noun', note: 'Do not normally use せんせい for your own job title.' },
    { id: 'l1-v07', japanese: 'きょうし', reading: 'きょうし', english: 'teacher (one’s profession)', partOfSpeech: 'noun' },
    { id: 'l1-v08', japanese: 'かいしゃいん', reading: 'かいしゃいん', english: 'company employee', partOfSpeech: 'noun' },
    { id: 'l1-v09', japanese: 'エンジニア', reading: 'エンジニア', english: 'engineer', partOfSpeech: 'noun' },
    { id: 'l1-v10', japanese: 'デザイナー', reading: 'デザイナー', english: 'designer', partOfSpeech: 'noun' },
    { id: 'l1-v11', japanese: 'スタッフ', reading: 'スタッフ', english: 'staff member', partOfSpeech: 'noun' },
    { id: 'l1-v12', japanese: 'けんきゅうしゃ', reading: 'けんきゅうしゃ', english: 'researcher', partOfSpeech: 'noun' },
    { id: 'l1-v13', japanese: 'だいがく', reading: 'だいがく', english: 'university', partOfSpeech: 'noun' },
    { id: 'l1-v14', japanese: 'スタジオ', reading: 'スタジオ', english: 'studio', partOfSpeech: 'noun' },
    { id: 'l1-v15', japanese: 'にほん', reading: 'にほん', english: 'Japan', partOfSpeech: 'proper noun' },
    { id: 'l1-v16', japanese: 'カナダ', reading: 'カナダ', english: 'Canada', partOfSpeech: 'proper noun' },
    { id: 'l1-v17', japanese: 'シンガポール', reading: 'シンガポール', english: 'Singapore', partOfSpeech: 'proper noun' },
    { id: 'l1-v18', japanese: '〜じん', reading: '〜じん', english: 'person from; nationality suffix', partOfSpeech: 'suffix', note: 'Attach to a country name: カナダじん.' },
    { id: 'l1-v19', japanese: 'だれ', reading: 'だれ', english: 'who', partOfSpeech: 'question word' },
    { id: 'l1-v20', japanese: 'はい', reading: 'はい', english: 'yes', partOfSpeech: 'response' },
    { id: 'l1-v21', japanese: 'いいえ', reading: 'いいえ', english: 'no', partOfSpeech: 'response' },
    { id: 'l1-v22', japanese: 'はじめまして', reading: 'はじめまして', english: 'How do you do? (first meeting)', partOfSpeech: 'expression' },
    { id: 'l1-v23', japanese: 'よろしく おねがいします', reading: 'よろしく おねがいします', english: 'I look forward to knowing/working with you', partOfSpeech: 'expression', note: 'A relationship-opening phrase; not a literal “nice to meet you.”' },
    { id: 'l1-v24', japanese: 'こちらは', reading: 'こちらは', english: 'this person is…', partOfSpeech: 'expression', note: 'A polite way to introduce someone beside you.' },
  ],
  dialogue: [
    { id: 'l1-d01', speaker: 'Aki', japanese: 'はじめまして。さくらスタジオの あきです。', reading: 'はじめまして。さくらスタジオの あきです。', english: 'How do you do? I’m Aki from Sakura Studio.', grammarIds: ['l1-topic-copula', 'l1-connection'], grammarNotes: [
      { grammarId: 'l1-topic-copula', explanation: 'Aki politely identifies themself with あきです while leaving the obvious first-person topic unspoken.' },
      { grammarId: 'l1-connection', explanation: 'さくらスタジオの labels Aki by studio affiliation, so the person’s name remains the phrase’s main noun.' },
    ] },
    { id: 'l1-d02', speaker: 'Emma', japanese: 'はじめまして。エマです。よろしく おねがいします。', reading: 'はじめまして。エマです。よろしく おねがいします。', english: 'How do you do? I’m Emma. I look forward to working with you.', grammarIds: ['l1-topic-copula'], grammarNotes: [
      { grammarId: 'l1-topic-copula', explanation: 'Emma gives the new identifying information エマです without repeating わたしは in this first-meeting context.' },
    ] },
    { id: 'l1-d03', speaker: 'Aki', japanese: 'エマさんは みどりだいがくの がくせいですか。', reading: 'エマさんは みどりだいがくの がくせいですか。', english: 'Emma, are you a student at Midori University?', grammarIds: ['l1-question', 'l1-connection'], grammarNotes: [
      { grammarId: 'l1-question', explanation: 'Aki keeps the proposed identity in statement order and adds final か to ask Emma to confirm it.' },
      { grammarId: 'l1-connection', explanation: 'みどりだいがくの narrows がくせい to a student connected with Midori University.' },
    ] },
    { id: 'l1-d04', speaker: 'Emma', japanese: 'いいえ、がくせいじゃありません。けんきゅうしゃです。', reading: 'いいえ、がくせいじゃありません。けんきゅうしゃです。', english: 'No, I’m not a student. I’m a researcher.', grammarIds: ['l1-negative'], grammarNotes: [
      { grammarId: 'l1-negative', explanation: 'Emma rejects only the proposed student identity with じゃありません, then supplies the corrected role in a new sentence.' },
    ] },
    { id: 'l1-d05', speaker: 'Aki', japanese: 'そうですか。こちらは ノアさんです。', reading: 'そうですか。こちらは ノアさんです。', english: 'I see. This is Noah.' },
    { id: 'l1-d06', speaker: 'Noah', japanese: 'ノアです。わたしも けんきゅうしゃです。', reading: 'ノアです。わたしも けんきゅうしゃです。', english: 'I’m Noah. I’m a researcher too.', grammarIds: ['l1-also'], grammarNotes: [
      { grammarId: 'l1-also', explanation: 'Noah uses わたしも to join Emma under the researcher description she has just established.' },
    ] },
    { id: 'l1-d07', speaker: 'Emma', japanese: 'ノアさんも カナダじんですか。', reading: 'ノアさんも カナダじんですか。', english: 'Are you Canadian too, Noah?', grammarIds: ['l1-also', 'l1-question'], grammarNotes: [
      { grammarId: 'l1-also', explanation: 'Emma uses も to compare Noah with an unstated Canadian person supplied by the wider context, not by the visible exchange.' },
      { grammarId: 'l1-question', explanation: 'Final か turns the proposed shared nationality into a polite confirmation question.' },
    ] },
    { id: 'l1-d08', speaker: 'Noah', japanese: 'はい、カナダじんです。よろしく おねがいします。', reading: 'はい、カナダじんです。よろしく おねがいします。', english: 'Yes, I’m Canadian. I look forward to working with you.' },
  ],
  exercises: [
    {
      id: 'l1-e01', type: 'fill-blank', prompt: 'Add the topic particle.',
      sentence: 'わたし ___ エマです。', acceptedAnswers: ['は', 'wa'], hint: 'It is written は but pronounced wa.',
      explanation: 'は marks わたし as the topic: “As for me, I’m Emma.”',
    },
    {
      id: 'l1-e02', type: 'multiple-choice', prompt: 'Choose the natural polite question: “Is Lee a designer?”',
      options: [
        { id: 'a', label: 'リーさんは デザイナーですか。' },
        { id: 'b', label: 'リーさんか デザイナーは です。' },
        { id: 'c', label: 'リーさんは デザイナーかです。' },
      ], correctOptionId: 'a',
      explanation: 'Keep the statement order and add か after です.',
    },
    {
      id: 'l1-e03', type: 'translation', direction: 'en-ja', prompt: 'Translate: “I am not a teacher.”',
      acceptedAnswers: ['わたしはせんせいじゃありません', 'わたしはきょうしじゃありません', 'せんせいじゃありません', 'きょうしじゃありません'],
      wordBank: ['わたし', 'は', 'せんせい', 'じゃありません'],
      explanation: 'The negative polite noun ending is じゃありません. The obvious topic may be omitted.',
    },
    {
      id: 'l1-e04', type: 'fill-blank', prompt: 'Emma is a researcher. Noah is one too. Complete the reply.',
      sentence: 'ノアさん ___ けんきゅうしゃです。', acceptedAnswers: ['も', 'mo'], hint: 'Use the particle meaning “also.”',
      explanation: 'も replaces は because Noah shares the description already given for Emma.',
    },
    {
      id: 'l1-e05', type: 'multiple-choice', prompt: 'What is the head noun in みどりだいがくの がくせい?',
      options: [
        { id: 'a', label: 'みどり (green)' },
        { id: 'b', label: 'だいがく (university)' },
        { id: 'c', label: 'がくせい (student)' },
      ], correctOptionId: 'c',
      explanation: 'In A の B, the final noun B is the main thing: a student connected with Midori University.',
    },
    {
      id: 'l1-e06', type: 'translation', direction: 'ja-en', prompt: 'Translate: “さくらスタジオの スタッフです。”',
      acceptedAnswers: ['i am a staff member at sakura studio', "i'm a staff member at sakura studio", 'a sakura studio staff member', 'i work at sakura studio'],
      explanation: 'の connects Sakura Studio to staff member; the unspoken topic is understood from context.',
    },
    {
      id: 'l1-e07', type: 'listening', prompt: 'Listen and choose Emma’s job.',
      audioId: 'l1-listen-01', audioPath: 'assets/audio/lesson-01/emma-job.mp3', transcript: 'いいえ、がくせいじゃありません。けんきゅうしゃです。',
      options: [
        { id: 'a', label: 'Student' },
        { id: 'b', label: 'Researcher' },
        { id: 'c', label: 'Designer' },
      ], correctOptionId: 'b',
      explanation: 'Emma first rejects “student,” then identifies herself as a researcher.',
    },
    {
      id: 'l1-e08', type: 'listening', prompt: 'Listen and choose the relationship that の expresses.',
      audioId: 'l1-listen-02', audioPath: 'assets/audio/lesson-01/aki-intro.mp3', transcript: 'さくらスタジオの あきです。',
      options: [
        { id: 'a', label: 'Aki is from/with Sakura Studio' },
        { id: 'b', label: 'Aki owns a cherry tree' },
        { id: 'c', label: 'The studio is named Aki' },
      ], correctOptionId: 'a',
      explanation: 'Here の links Aki with their organization; it does not indicate literal ownership.',
    },
  ],
};
