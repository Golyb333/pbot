const axios = require('axios');

async function getRandomGelbooruMedia(tags, count) {
  let url = 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&limit=1000';
  if (tags) {
    url += `&tags=${encodeURIComponent(tags)}`;
  }

  try {
    const response = await axios.get(url);
    const posts = response.data.posts;

    if (posts.length === 0) {
      throw new Error('No posts found');
    }

    const mediaUrls = [];
    let foundCount = 0;
    while (foundCount < count) {
      const randomIndex = Math.floor(Math.random() * posts.length);
      const randomPost = posts[randomIndex];
      const mediaUrl = randomPost.file_url;

      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
        foundCount++;
      }
    }

    if (mediaUrls.length === 0) {
      throw new Error('No media URLs found');
    }

    return mediaUrls;
  } catch (error) {
    console.error('Error fetching media from Gelbooru:', error);
    throw error;
  }
}

function handleR34(bot) {
  bot.onText(/\/r34(\s+.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const count = 1;
    const tags = match[1] ? match[1].trim() : '';
    const userId = msg.from.id;

    try {
      const mediaUrls = await getRandomGelbooruMedia(tags, count);
      const mediaGroup = mediaUrls.map(url => ({
        type: url.endsWith('.mp4') || url.endsWith('.webm') ? 'video' : 'photo',
        media: url,
      }));

      bot.sendMediaGroup(chatId, mediaGroup);
    } catch (error) {
      bot.sendMessage(chatId, 'Ошибка при получении контента с Gelbooru.');
    }
  });
}

module.exports = handleR34;
