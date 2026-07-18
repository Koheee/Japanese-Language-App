import { LessonOutline } from '../models/content';

const curriculumPlan: LessonOutline[] = [
  {
    id: 'lesson-01', number: 1, title: 'A first introduction', japaneseTitle: 'はじめまして',
    summary: 'Introduce yourself, identify people, and ask simple yes-or-no questions.',
    grammarFocus: ['A は B です', 'じゃありません', 'か', 'も', 'の'],
    vocabularyTheme: 'People, roles, countries, and polite introductions', availability: 'ready',
  },
  {
    id: 'lesson-02', number: 2, title: 'Whose is this?', japaneseTitle: 'これは だれの？',
    summary: 'Point out nearby things, name them, and ask who owns them.',
    grammarFocus: ['これ・それ・あれ', 'この・その・あの', 'そうです', 'A の'],
    vocabularyTheme: 'Everyday objects, stationery, and belongings', availability: 'outline',
  },
  {
    id: 'lesson-03', number: 3, title: 'Finding your way', japaneseTitle: 'どこですか',
    summary: 'Ask where places and facilities are, from here to over there.',
    grammarFocus: ['ここ・そこ・あそこ', 'どこ', 'N は place です', 'こちら・そちら'],
    vocabularyTheme: 'Buildings, floors, counters, and city facilities', availability: 'outline',
  },
  {
    id: 'lesson-04', number: 4, title: 'A day in motion', japaneseTitle: 'まいにちの リズム',
    summary: 'Tell the time and describe when regular activities begin and end.',
    grammarFocus: ['ます・ません', 'ました・ませんでした', 'time に', 'から・まで'],
    vocabularyTheme: 'Clock time, weekdays, routines, and schedules', availability: 'outline',
  },
  {
    id: 'lesson-05', number: 5, title: 'Going places', japaneseTitle: 'まちへ いきます',
    summary: 'Say where, how, when, and with whom you travel.',
    grammarFocus: ['place へ・に', 'transport で', 'person と', 'いつ'],
    vocabularyTheme: 'Transport, destinations, dates, and travel', availability: 'outline',
  },
  {
    id: 'lesson-06', number: 6, title: 'Plans after work', japaneseTitle: 'いっしょに どう？',
    summary: 'Describe actions, invite someone, and suggest doing something together.',
    grammarFocus: ['object を', 'place で', 'ませんか', 'ましょう'],
    vocabularyTheme: 'Food, leisure activities, and social plans', availability: 'outline',
  },
  {
    id: 'lesson-07', number: 7, title: 'Gifts and helpful tools', japaneseTitle: 'プレゼントを どうぞ',
    summary: 'Explain how you do something and talk about giving or receiving.',
    grammarFocus: ['tool/language で', 'あげます', 'もらいます', 'もう・まだ'],
    vocabularyTheme: 'Tools, languages, gifts, and family', availability: 'outline',
  },
  {
    id: 'lesson-08', number: 8, title: 'What is it like?', japaneseTitle: 'どんな ところ？',
    summary: 'Describe people, objects, and places with two kinds of adjectives.',
    grammarFocus: ['い-adjectives', 'な-adjectives', 'とても・あまり', 'どんな'],
    vocabularyTheme: 'Appearance, character, weather, and places', availability: 'outline',
  },
  {
    id: 'lesson-09', number: 9, title: 'Things I enjoy', japaneseTitle: 'すきな こと',
    summary: 'Talk about likes, abilities, understanding, and simple reasons.',
    grammarFocus: ['N が すきです', 'じょうず・へた', 'わかります', 'から'],
    vocabularyTheme: 'Hobbies, music, sports, and personal strengths', availability: 'outline',
  },
  {
    id: 'lesson-10', number: 10, title: 'What is where?', japaneseTitle: 'へやの なか',
    summary: 'Say that people or objects exist and describe their positions.',
    grammarFocus: ['あります・います', 'place に N が', 'N は place に', 'position words'],
    vocabularyTheme: 'Rooms, furniture, animals, and spatial positions', availability: 'outline',
  },
  {
    id: 'lesson-11', number: 11, title: 'How many, how often?', japaneseTitle: 'いくつ ありますか',
    summary: 'Count common things and say how long or how often activities happen.',
    grammarFocus: ['basic counters', 'duration', 'frequency に times', 'どのくらい'],
    vocabularyTheme: 'Quantities, counters, postage, and frequency', availability: 'outline',
  },
  {
    id: 'lesson-12', number: 12, title: 'Looking back, comparing', japaneseTitle: 'どちらが いい？',
    summary: 'Describe past impressions and compare two or more choices.',
    grammarFocus: ['past adjectives', 'N より', 'どちらが', 'いちばん'],
    vocabularyTheme: 'Trips, seasons, events, and impressions', availability: 'outline',
  },
  {
    id: 'lesson-13', number: 13, title: 'What do you want?', japaneseTitle: 'ほしいもの',
    summary: 'Express what you want and say you are going somewhere to do something.',
    grammarFocus: ['N が ほしい', 'verb stem たい', 'place へ purpose に', 'どこか・なにか'],
    vocabularyTheme: 'Shopping, outings, wishes, and weekend plans', availability: 'outline',
  },
  {
    id: 'lesson-14', number: 14, title: 'Requests in the moment', japaneseTitle: 'ちょっと まって',
    summary: 'Build the て-form to make requests and describe actions in progress.',
    grammarFocus: ['て-form', 'てください', 'ています', 'ましょうか'],
    vocabularyTheme: 'Immediate actions, directions, and small requests', availability: 'outline',
  },
  {
    id: 'lesson-15', number: 15, title: 'Rules and ongoing states', japaneseTitle: 'ここで いいですか',
    summary: 'Ask permission, explain prohibitions, and describe lasting states.',
    grammarFocus: ['てもいいです', 'てはいけません', 'ています (state)', 'しっています'],
    vocabularyTheme: 'Public rules, work, residence, and knowledge', availability: 'outline',
  },
  {
    id: 'lesson-16', number: 16, title: 'First this, then that', japaneseTitle: 'つぎに なにを？',
    summary: 'Connect a sequence of actions and combine descriptions naturally.',
    grammarFocus: ['て、て sequencing', 'てから', 'adjective linking', 'どうやって'],
    vocabularyTheme: 'Procedures, services, body parts, and directions', availability: 'outline',
  },
  {
    id: 'lesson-17', number: 17, title: 'What must be done', japaneseTitle: 'わすれないで',
    summary: 'Use the ない-form for warnings, obligations, and optional actions.',
    grammarFocus: ['ない-form', 'ないでください', 'なければなりません', 'なくてもいい'],
    vocabularyTheme: 'Health, medicine, documents, and responsibilities', availability: 'outline',
  },
  {
    id: 'lesson-18', number: 18, title: 'Skills and hobbies', japaneseTitle: 'できること',
    summary: 'Say what you can do, describe hobbies, and place one event before another.',
    grammarFocus: ['dictionary form', 'ことができます', 'しゅみは V こと', 'V/N の まえに'],
    vocabularyTheme: 'Abilities, hobbies, devices, and preparation', availability: 'outline',
  },
  {
    id: 'lesson-19', number: 19, title: 'Experiences and changes', japaneseTitle: 'やったことが ある',
    summary: 'Share experiences, list representative actions, and describe change.',
    grammarFocus: ['た-form', 'たことがあります', 'たり〜たり', 'く・に なります'],
    vocabularyTheme: 'Experiences, exercise, nature, and personal change', availability: 'outline',
  },
  {
    id: 'lesson-20', number: 20, title: 'Talking with friends', japaneseTitle: 'ふつうの はなし',
    summary: 'Recognize and use plain forms in relaxed, everyday conversation.',
    grammarFocus: ['plain verb forms', 'plain adjective forms', 'casual questions', 'よ・ね'],
    vocabularyTheme: 'Friendship, casual plans, opinions, and conversation', availability: 'outline',
  },
  {
    id: 'lesson-21', number: 21, title: 'Thoughts and reports', japaneseTitle: 'どう おもう？',
    summary: 'State what you think, report what someone said, and seek agreement.',
    grammarFocus: ['plain + と おもいます', 'と いいます', 'でしょう', 'N について'],
    vocabularyTheme: 'Opinions, news, society, and future predictions', availability: 'outline',
  },
  {
    id: 'lesson-22', number: 22, title: 'The person who…', japaneseTitle: 'どんな ひと？',
    summary: 'Use a whole clause before a noun to identify or describe it.',
    grammarFocus: ['relative clauses', 'clause + noun', 'N が clause', 'time for doing'],
    vocabularyTheme: 'People, clothing, homes, and descriptions', availability: 'outline',
  },
  {
    id: 'lesson-23', number: 23, title: 'When this happens', japaneseTitle: 'こんな とき',
    summary: 'Describe what happens at a time or as an automatic consequence.',
    grammarFocus: ['V/A/N とき', 'dictionary form + と', 'past vs non-past とき', 'direction terms'],
    vocabularyTheme: 'Machines, instructions, roads, and everyday situations', availability: 'outline',
  },
  {
    id: 'lesson-24', number: 24, title: 'Kind things people do', japaneseTitle: 'てつだって くれた',
    summary: 'Show who benefits when someone gives help or performs a favor.',
    grammarFocus: ['てあげます', 'てもらいます', 'てくれます', 'beneficiary viewpoint'],
    vocabularyTheme: 'Helping, fixing, carrying, and personal favors', availability: 'outline',
  },
  {
    id: 'lesson-25', number: 25, title: 'If plans change', japaneseTitle: 'もし〜たら',
    summary: 'Discuss conditions, hypotheticals, and results that hold despite a condition.',
    grammarFocus: ['たら', 'ても・でも', 'もし', 'conditional sequencing'],
    vocabularyTheme: 'Life changes, uncertainty, decisions, and farewells', availability: 'outline',
  },
];

// Every planned unit now has a full authored lesson module.
export const curriculum: LessonOutline[] = curriculumPlan.map((lesson) => ({
  ...lesson,
  availability: 'ready',
}));

export const getLessonOutline = (lessonId: string) =>
  curriculum.find((lesson) => lesson.id === lessonId);
