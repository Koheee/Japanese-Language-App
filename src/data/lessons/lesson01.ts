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
      title: 'Frame a topic, then describe it',
      pattern: 'A は B です',
      plainEnglish: '“As for A, it is B.”',
      explanation:
        'は marks what the sentence is about. です politely presents the description that follows. In this use, B can be a name, role, nationality, or other noun. The written は is pronounced “wa” when it is the topic particle.',
      whyItWorks:
        'English usually starts with a grammatical subject and uses “am/is/are.” Japanese first places A on the conversation table, then comments on it. Think “Speaking of A…” rather than forcing は to mean “is.”',
      notes: [
        'There is normally no “a” or “the” before B.',
        'Once the topic is obvious, Japanese often leaves A unspoken.',
        'です adds politeness; it is not a word-for-word match for every use of “is.”',
      ],
      examples: [
        { japanese: 'わたしは エマです。', reading: 'Watashi wa Ema desu.', english: 'I’m Emma.' },
        { japanese: 'リーさんは デザイナーです。', reading: 'Rii-san wa dezainaa desu.', english: 'Lee is a designer.' },
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
        'Replace です with じゃありません to make a polite negative noun sentence. ではありません is a more formal alternative; じゃありません is natural in ordinary polite conversation.',
      whyItWorks:
        'English inserts “not” after a form of “be.” Japanese changes the polite ending as one unit. Learn です and じゃありません as sentence endings instead of translating each piece.',
      examples: [
        { japanese: 'わたしは せんせいじゃありません。', reading: 'Watashi wa sensei ja arimasen.', english: 'I’m not a teacher.' },
        { japanese: 'ミナさんは がくせいじゃありません。', reading: 'Mina-san wa gakusei ja arimasen.', english: 'Mina is not a student.' },
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
        'Add か to the polite sentence ending. The word order stays the same. In careful speech, the final か already signals a question, so you do not need English-style inversion.',
      whyItWorks:
        'English moves words around: “You are…” becomes “Are you…?” Japanese keeps the information in place and adds a clear question signal at the end. Listen to the whole sentence before deciding its function.',
      notes: ['Answer はい for yes and いいえ for no, then repeat the useful part of the answer.', 'Avoid あなた when the person’s name or role is known.'],
      examples: [
        { japanese: 'ノアさんは エンジニアですか。', reading: 'Noa-san wa enjinia desu ka.', english: 'Noah, are you an engineer?' },
        { japanese: 'はい、エンジニアです。', reading: 'Hai, enjinia desu.', english: 'Yes, I am.' },
      ],
    },
    {
      id: 'l1-also',
      title: 'Include another matching topic',
      pattern: 'A も B です',
      plainEnglish: '“A is also B.”',
      explanation:
        'Use も in place of は when the new topic shares the same description as something already mentioned. It carries the sense of “too” or “also.”',
      whyItWorks:
        'English can place “also” in several spots. Japanese marks the matching item itself. Swapping は for も shows that A joins an existing category.',
      examples: [
        { japanese: 'わたしは カナダじんです。サムさんも カナダじんです。', reading: 'Watashi wa Kanada-jin desu. Samu-san mo Kanada-jin desu.', english: 'I’m Canadian. Sam is Canadian too.' },
        { japanese: 'アキさんも スタッフです。', reading: 'Aki-san mo sutaffu desu.', english: 'Aki is also a staff member.' },
      ],
    },
    {
      id: 'l1-connection',
      title: 'Link two nouns with の',
      pattern: 'A の B',
      plainEnglish: '“B connected with A”',
      explanation:
        'の places one noun in front of another to show a relationship. Depending on context, A may be B’s organization, home country, subject area, owner, or category.',
      whyItWorks:
        'English often puts the main noun first (“a teacher from the studio”) or uses apostrophe-s. Japanese consistently puts the describing noun first. Find the final noun—B—to discover what the whole phrase actually is.',
      notes: ['Do not assume の always means possession.', 'The phrase さくらスタジオの スタッフ means “a Sakura Studio staff member.”'],
      examples: [
        { japanese: 'みどりだいがくの がくせいです。', reading: 'Midori daigaku no gakusei desu.', english: 'I’m a student at Midori University.' },
        { japanese: 'にほんごの せんせいです。', reading: 'Nihongo no sensei desu.', english: 'I’m a Japanese-language teacher.' },
      ],
    },
  ],
  vocabulary: [
    { id: 'l1-v01', japanese: 'わたし', reading: 'watashi', english: 'I; me', partOfSpeech: 'pronoun', note: 'Often omitted after your identity is clear.' },
    { id: 'l1-v02', japanese: 'ひと', reading: 'hito', english: 'person', partOfSpeech: 'noun' },
    { id: 'l1-v03', japanese: 'かた', reading: 'kata', english: 'person (respectful)', partOfSpeech: 'noun' },
    { id: 'l1-v04', japanese: 'みなさん', reading: 'minasan', english: 'everyone', partOfSpeech: 'noun' },
    { id: 'l1-v05', japanese: 'がくせい', reading: 'gakusei', english: 'student', partOfSpeech: 'noun' },
    { id: 'l1-v06', japanese: 'せんせい', reading: 'sensei', english: 'teacher; expert addressed with respect', partOfSpeech: 'noun', note: 'Do not normally use せんせい for your own job title.' },
    { id: 'l1-v07', japanese: 'きょうし', reading: 'kyoushi', english: 'teacher (one’s profession)', partOfSpeech: 'noun' },
    { id: 'l1-v08', japanese: 'かいしゃいん', reading: 'kaishain', english: 'company employee', partOfSpeech: 'noun' },
    { id: 'l1-v09', japanese: 'エンジニア', reading: 'enjinia', english: 'engineer', partOfSpeech: 'noun' },
    { id: 'l1-v10', japanese: 'デザイナー', reading: 'dezainaa', english: 'designer', partOfSpeech: 'noun' },
    { id: 'l1-v11', japanese: 'スタッフ', reading: 'sutaffu', english: 'staff member', partOfSpeech: 'noun' },
    { id: 'l1-v12', japanese: 'けんきゅうしゃ', reading: 'kenkyuusha', english: 'researcher', partOfSpeech: 'noun' },
    { id: 'l1-v13', japanese: 'だいがく', reading: 'daigaku', english: 'university', partOfSpeech: 'noun' },
    { id: 'l1-v14', japanese: 'スタジオ', reading: 'sutajio', english: 'studio', partOfSpeech: 'noun' },
    { id: 'l1-v15', japanese: 'にほん', reading: 'Nihon', english: 'Japan', partOfSpeech: 'proper noun' },
    { id: 'l1-v16', japanese: 'カナダ', reading: 'Kanada', english: 'Canada', partOfSpeech: 'proper noun' },
    { id: 'l1-v17', japanese: 'シンガポール', reading: 'Shingapooru', english: 'Singapore', partOfSpeech: 'proper noun' },
    { id: 'l1-v18', japanese: '〜じん', reading: '~jin', english: 'person from; nationality suffix', partOfSpeech: 'suffix', note: 'Attach to a country name: カナダじん.' },
    { id: 'l1-v19', japanese: 'だれ', reading: 'dare', english: 'who', partOfSpeech: 'question word' },
    { id: 'l1-v20', japanese: 'はい', reading: 'hai', english: 'yes', partOfSpeech: 'response' },
    { id: 'l1-v21', japanese: 'いいえ', reading: 'iie', english: 'no', partOfSpeech: 'response' },
    { id: 'l1-v22', japanese: 'はじめまして', reading: 'hajimemashite', english: 'How do you do? (first meeting)', partOfSpeech: 'expression' },
    { id: 'l1-v23', japanese: 'よろしく おねがいします', reading: 'yoroshiku onegai shimasu', english: 'I look forward to knowing/working with you', partOfSpeech: 'expression', note: 'A relationship-opening phrase; not a literal “nice to meet you.”' },
    { id: 'l1-v24', japanese: 'こちらは', reading: 'kochira wa', english: 'this person is…', partOfSpeech: 'expression', note: 'A polite way to introduce someone beside you.' },
  ],
  dialogue: [
    { id: 'l1-d01', speaker: 'Aki', japanese: 'はじめまして。さくらスタジオの あきです。', reading: 'Hajimemashite. Sakura Sutajio no Aki desu.', english: 'How do you do? I’m Aki from Sakura Studio.', grammarIds: ['l1-topic-copula', 'l1-connection'] },
    { id: 'l1-d02', speaker: 'Emma', japanese: 'はじめまして。エマです。よろしく おねがいします。', reading: 'Hajimemashite. Ema desu. Yoroshiku onegai shimasu.', english: 'How do you do? I’m Emma. I look forward to working with you.', grammarIds: ['l1-topic-copula'] },
    { id: 'l1-d03', speaker: 'Aki', japanese: 'エマさんは みどりだいがくの がくせいですか。', reading: 'Ema-san wa Midori daigaku no gakusei desu ka.', english: 'Emma, are you a student at Midori University?', grammarIds: ['l1-question', 'l1-connection'] },
    { id: 'l1-d04', speaker: 'Emma', japanese: 'いいえ、がくせいじゃありません。けんきゅうしゃです。', reading: 'Iie, gakusei ja arimasen. Kenkyuusha desu.', english: 'No, I’m not a student. I’m a researcher.', grammarIds: ['l1-negative'] },
    { id: 'l1-d05', speaker: 'Aki', japanese: 'そうですか。こちらは ノアさんです。', reading: 'Sou desu ka. Kochira wa Noa-san desu.', english: 'I see. This is Noah.' },
    { id: 'l1-d06', speaker: 'Noah', japanese: 'ノアです。わたしも けんきゅうしゃです。', reading: 'Noa desu. Watashi mo kenkyuusha desu.', english: 'I’m Noah. I’m a researcher too.', grammarIds: ['l1-also'] },
    { id: 'l1-d07', speaker: 'Emma', japanese: 'ノアさんも カナダじんですか。', reading: 'Noa-san mo Kanada-jin desu ka.', english: 'Are you Canadian too, Noah?', grammarIds: ['l1-also', 'l1-question'] },
    { id: 'l1-d08', speaker: 'Noah', japanese: 'はい、カナダじんです。よろしく おねがいします。', reading: 'Hai, Kanada-jin desu. Yoroshiku onegai shimasu.', english: 'Yes, I’m Canadian. I look forward to working with you.' },
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
