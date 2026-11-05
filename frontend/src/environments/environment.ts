export const environment = {
  production: false,
  /** Base URL of the Flask REST API (includes the /api/v1 prefix). */
  apiUrl: 'http://localhost:5000/api/v1',
  /** Signed-in user shown in the header menu. The API has no auth endpoint yet, so it is configured here. */
  currentUser: { username: 'shahzaddeveloper704', email: 'shahzaddeveloper704@gmail.com' },
};
