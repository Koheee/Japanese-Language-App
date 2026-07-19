import { NavigatorScreenParams } from '@react-navigation/native';

export type LearnStackParamList = {
  Lessons: undefined;
  LessonDetail: { lessonId: string };
  Exercise: { lessonId: string };
};

export type RootTabParamList = {
  Learn: NavigatorScreenParams<LearnStackParamList>;
  Review: undefined;
  Progress: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  VocabularyManager: { lessonId: string };
  WordEditor: { lessonId: string; vocabularyId?: string };
  ImportPreview: undefined;
};
