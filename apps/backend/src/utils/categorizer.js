/**
 * Rule-Based Categorization Module (UC0013)
 * Automatically assigns tags/categories based on event description keywords.
 */

// Basic dictionary mapping categories to keywords
const CATEGORY_DICTIONARY = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network', 'llm', 'nlp', 'gpt'],
  'Web Development': ['web', 'frontend', 'backend', 'fullstack', 'react', 'node', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript', 'api'],
  'Mobile App': ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin'],
  'Blockchain': ['blockchain', 'crypto', 'web3', 'smart contract', 'ethereum', 'solidity', 'bitcoin', 'defi'],
  'Data Science': ['data science', 'analytics', 'big data', 'pandas', 'sql', 'statistics', 'visualization'],
  'Cybersecurity': ['security', 'cybersecurity', 'hacking', 'infosec', 'penetration testing', 'encryption', 'cryptography'],
  'Game Development': ['game', 'gaming', 'unity', 'unreal engine', 'godot', 'gamedev'],
  'IoT': ['iot', 'internet of things', 'hardware', 'arduino', 'raspberry pi', 'robotics'],
  'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'docker', 'kubernetes', 'devops'],
};

/**
 * Scans a description text and returns an array of matching tags.
 * 
 * @param {string} description 
 * @returns {Array<{tag: string, isPending: boolean}>}
 */
function categorizeDescription(description) {
  if (!description) return [];

  const text = description.toLowerCase();
  const results = [];

  for (const [category, keywords] of Object.entries(CATEGORY_DICTIONARY)) {
    let matchCount = 0;

    for (const keyword of keywords) {
      // Use regex to find whole words/phrases
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    }

    if (matchCount > 0) {
      // AF1: Low Confidence Tagging. 
      // If we only have 1 or 2 keyword matches, we flag it as pending.
      // If we have 3 or more, we are confident.
      results.push({
        tag: category,
        isPending: matchCount < 3
      });
    }
  }

  return results;
}

module.exports = {
  categorizeDescription,
  CATEGORY_DICTIONARY
};
