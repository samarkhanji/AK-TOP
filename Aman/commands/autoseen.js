const axios = require("axios");

module.exports.config = {
  name: "autoseen",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Aman - Fixed",
  description: "Automatically marks messages as seen with rate limiting",
  commandCategory: "no prefix",
  usages: "automatic",
  cooldowns: 0
};

// Global storage for rate limiting
global.autoSeenData = global.autoSeenData || {
  lastMarkTime: 0,
  pendingThreads: new Set(),
  isProcessing: false,
  rateLimitDelay: 3000, // 3 seconds between calls
  batchDelay: 10000,    // 10 seconds for batch processing
  errorCount: 0,
  maxErrors: 5
};

module.exports.handleEvent = async function ({ api, event }) {
  const { senderID, threadID, type } = event;

  // Only process message events
  if (!['message', 'message_reply'].includes(type)) return;
  
  // Don't mark own messages as seen
  if (senderID == api.getCurrentUserID()) return;

  const currentTime = Date.now();
  const seenData = global.autoSeenData;

  // Add thread to pending list
  seenData.pendingThreads.add(threadID);

  // Rate limiting check
  if (currentTime - seenData.lastMarkTime < seenData.rateLimitDelay) {
    return; // Too soon, skip this call
  }

  // If already processing, wait
  if (seenData.isProcessing) return;

  // Start processing
  seenData.isProcessing = true;
  
  try {
    // Method 1: Mark specific thread as read (more efficient)
    if (seenData.pendingThreads.size === 1) {
      await api.markAsRead(threadID);
      console.log(`[AutoSeen] Marked thread ${threadID} as read`);
    }
    // Method 2: Batch mark multiple threads
    else if (seenData.pendingThreads.size > 1) {
      // Mark all pending threads individually
      const threadsToMark = Array.from(seenData.pendingThreads);
      
      for (let i = 0; i < Math.min(threadsToMark.length, 5); i++) {
        try {
          await api.markAsRead(threadsToMark[i]);
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between marks
        } catch (error) {
          console.log(`[AutoSeen] Error marking thread ${threadsToMark[i]}:`, error.message);
        }
      }
      
      console.log(`[AutoSeen] Batch marked ${Math.min(threadsToMark.length, 5)} threads`);
    }

    // Update timing
    seenData.lastMarkTime = currentTime;
    seenData.pendingThreads.clear();
    seenData.errorCount = 0; // Reset error count on success

  } catch (error) {
    seenData.errorCount++;
    console.log(`[AutoSeen] Error (${seenData.errorCount}/${seenData.maxErrors}):`, error.message);
    
    // If too many errors, increase delay
    if (seenData.errorCount >= seenData.maxErrors) {
      seenData.rateLimitDelay = Math.min(seenData.rateLimitDelay * 2, 30000); // Max 30 seconds
      console.log(`[AutoSeen] Increased delay to ${seenData.rateLimitDelay}ms due to errors`);
      seenData.errorCount = 0;
    }
    
    // Handle specific errors
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      seenData.rateLimitDelay = 15000; // 15 seconds on rate limit
      console.log("[AutoSeen] Rate limited - increasing delay");
    }
  } finally {
    seenData.isProcessing = false;
  }
};

// Alternative method using markAsDelivered (lighter on API)
module.exports.handleEventAlt = async function ({ api, event }) {
  const { senderID, threadID, messageID, type } = event;

  // Only process message events
  if (!['message', 'message_reply'].includes(type)) return;
  
  // Don't mark own messages
  if (senderID == api.getCurrentUserID()) return;

  const currentTime = Date.now();
  const seenData = global.autoSeenData;

  // Rate limiting
  if (currentTime - seenData.lastMarkTime < seenData.rateLimitDelay) return;
  if (seenData.isProcessing) return;

  seenData.isProcessing = true;

  try {
    // Use markAsDelivered instead (lighter API call)
    await api.markAsDelivered(threadID, messageID);
    console.log(`[AutoSeen] Message delivered in thread ${threadID}`);
    
    seenData.lastMarkTime = currentTime;
    seenData.errorCount = 0;

  } catch (error) {
    seenData.errorCount++;
    console.log(`[AutoSeen] Delivery mark error:`, error.message);
    
    if (seenData.errorCount >= 3) {
      seenData.rateLimitDelay = Math.min(seenData.rateLimitDelay * 1.5, 20000);
      seenData.errorCount = 0;
    }
  } finally {
    seenData.isProcessing = false;
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  
  if (!args[0]) {
    const seenData = global.autoSeenData;
    return api.sendMessage(
      `🔍 **AutoSeen Status**\n\n` +
      `⚡ Rate Limit Delay: ${seenData.rateLimitDelay}ms\n` +
      `📊 Error Count: ${seenData.errorCount}\n` +
      `🔄 Is Processing: ${seenData.isProcessing}\n` +
      `📝 Pending Threads: ${seenData.pendingThreads.size}\n\n` +
      `**Commands:**\n` +
      `/autoseen status - Show this info\n` +
      `/autoseen reset - Reset error counters\n` +
      `/autoseen delay [ms] - Set custom delay`,
      threadID, messageID
    );
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'status':
      // Already handled above
      break;
      
    case 'reset':
      global.autoSeenData = {
        lastMarkTime: 0,
        pendingThreads: new Set(),
        isProcessing: false,
        rateLimitDelay: 3000,
        batchDelay: 10000,
        errorCount: 0,
        maxErrors: 5
      };
      return api.sendMessage("✅ AutoSeen data reset successfully!", threadID, messageID);
      
    case 'delay':
      if (!args[1] || isNaN(args[1])) {
        return api.sendMessage("⚠️ Please provide delay in milliseconds\nExample: /autoseen delay 5000", threadID, messageID);
      }
      
      const newDelay = parseInt(args[1]);
      if (newDelay < 1000 || newDelay > 60000) {
        return api.sendMessage("⚠️ Delay should be between 1000ms (1s) and 60000ms (60s)", threadID, messageID);
      }
      
      global.autoSeenData.rateLimitDelay = newDelay;
      return api.sendMessage(`✅ Rate limit delay set to ${newDelay}ms`, threadID, messageID);
      
    default:
      return api.sendMessage("❌ Invalid command! Use: status, reset, or delay", threadID, messageID);
  }
};

// Initialize on load
module.exports.onLoad = function() {
  console.log("[AutoSeen] Enhanced AutoSeen v2.0 loaded with rate limiting!");
  
  // Clean up pending threads every minute
  setInterval(() => {
    if (global.autoSeenData && global.autoSeenData.pendingThreads.size > 100) {
      global.autoSeenData.pendingThreads.clear();
      console.log("[AutoSeen] Cleared pending threads cache");
    }
  }, 60000);
};
