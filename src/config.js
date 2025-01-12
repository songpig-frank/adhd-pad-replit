
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  }
};