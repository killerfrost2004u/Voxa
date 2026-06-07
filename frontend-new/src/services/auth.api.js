import { fetchClient } from './httpClient';

export const authApi = {
  login: (email, password) => 
    fetchClient('/api/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password }) 
    }),

  signup: (fullName, email, password) => 
    fetchClient('/api/signup', { 
      method: 'POST', 
      body: JSON.stringify({ fullName, email, password }) 
    }),

  oauthLogin: (fullName, email) => 
    fetchClient('/api/oauth-login', { 
      method: 'POST', 
      body: JSON.stringify({ fullName, email }) 
    })
};
