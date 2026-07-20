import { createLatestAttemptCoordinator } from '../components/latestAttemptCoordinator';

export const referenceInfluences = {
  heading: 'Reference influences',
  body: "Tae Kim's Guide to Japanese Grammar and Tofugu Japanese Grammar informed this course's coverage and teaching-approach research.",
  license: "Tae Kim's guide identifies its content as CC BY-NC-SA 3.0 US.",
  originality: "Nihongo Path's explanations, examples, dialogues, and exercises are independently written.",
  nonEndorsement: 'Tae Kim, the Saeris project, and Tofugu do not endorse Nihongo Path.',
  links: [
    {
      title: "Tae Kim's Guide to Japanese Grammar",
      url: 'https://guidetojapanese.org/learn/grammar/',
    },
    {
      title: 'Tofugu Japanese Grammar',
      url: 'https://www.tofugu.com/japanese-grammar/',
    },
    {
      title: 'Saeris guide-to-japanese port',
      url: 'https://github.com/Saeris/guide-to-japanese',
    },
  ],
} as const;

export const openReferenceInfluence = async (
  url: string,
  openUrl: (url: string) => Promise<unknown>,
): Promise<string | null> => {
  try {
    await openUrl(url);
    return null;
  } catch {
    return 'Could not open this reference link. Please try again.';
  }
};

export interface LatestReferenceAttemptCoordinator {
  open: (
    url: string,
    openUrl: (url: string) => Promise<unknown>,
    applyResult: (result: string | null) => void,
  ) => Promise<void>;
  deactivate: () => void;
}

export const createLatestReferenceAttemptCoordinator = (
): LatestReferenceAttemptCoordinator => {
  const coordinator = createLatestAttemptCoordinator<string | null>();

  return {
    open: (url, openUrl, applyResult) => coordinator.run(
      () => openReferenceInfluence(url, openUrl),
      applyResult,
    ),
    deactivate: coordinator.deactivate,
  };
};
