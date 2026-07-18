// GitHub Pages serves project sites from /<repository-name>. The deployment
// workflow injects that path while local development stays at the site root.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
