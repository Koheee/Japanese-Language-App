export const referenceInfluences = {
  heading: 'Reference influences',
  body: "Tae Kim's Guide to Japanese Grammar informed this course's Japanese-first coverage review.",
  license: 'The guide identifies its content as CC BY-NC-SA 3.0 US.',
  originality: "Nihongo Path's explanations, examples, dialogues, and exercises are independently written.",
  nonEndorsement: 'Neither Tae Kim nor the Saeris project endorses Nihongo Path.',
  links: [
    {
      title: "Tae Kim's Guide to Japanese Grammar",
      url: 'https://guidetojapanese.org/learn/grammar/',
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
