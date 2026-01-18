module.exports.config = {
  name: "setnickall",
  version: "1.0",
  hasPermssion: 1,
  credits: "Raj",
  description: "Sabhi members ka nickname ek saath change kare",
  commandCategory: "group",
  usages: "[new nickname]",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const newNickname = args.join(" ");
  if (!newNickname)
    return api.sendMessage("⚠️ | कृपया कोई नया nickname दें।\nउदाहरण: setnickall Raj Army", event.threadID);

  const threadInfo = await api.getThreadInfo(event.threadID);
  const allParticipants = threadInfo.participantIDs;

  const excludedUIDs = ["100001150741675", "100010480685789"]; // जिनका nickname नहीं बदलेगा

  let success = 0, failed = 0;

  for (const userID of allParticipants) {
    if (excludedUIDs.includes(userID)) continue;

    try {
      await api.changeNickname(newNickname, event.threadID, userID);
      success++;
    } catch (e) {
      failed++;
    }
  }

  return api.sendMessage(
    `✅ Nickname ${success} members ke liye change hua.\n❌ ${failed} members ka change fail hua.`,
    event.threadID
  );
};
