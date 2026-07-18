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
