import { NavigatorScreenParams } from '@react-navigation/native';
import type { SearchSubsection } from '../search/types';

export interface SearchLandingTarget {
  tab: 'grammar' | 'dialogue';
  contentId: string;
  subsection: SearchSubsection;
  grammarId?: string;
  query: string;
  requestToken: string;
}

export type LearnStackParamList = {
  Lessons: undefined;
  LessonDetail: { lessonId: string; searchTarget?: SearchLandingTarget };
  Search: undefined;
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
